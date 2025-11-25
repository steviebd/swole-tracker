-- Migration: Seed default milestones for existing users
-- This migration creates default milestones for all existing users who don't have them yet

-- Insert default milestones for existing users
-- Only create milestones for users who have workout sessions but no milestones
INSERT INTO milestones (
  user_id,
  master_exercise_id,
  type,
  target_value,
  target_multiplier,
  experience_level,
  is_system_default,
  created_at,
  updated_at
)
SELECT DISTINCT
  ws.user_id,
  se.master_exercise_id,
  m.type,
  m.target_value,
  m.target_multiplier,
  COALESCE(up.experience_level, 'intermediate') as experience_level,
  true as is_system_default,
  datetime('now') as created_at,
  datetime('now') as updated_at
FROM workout_sessions ws
JOIN session_exercises se ON ws.id = se.session_id
CROSS JOIN (
  -- Generate default milestone types for each exercise
  SELECT 'absolute_weight' as type, NULL as target_value, NULL as target_multiplier
  UNION ALL SELECT 'bodyweight_multiplier', NULL, NULL
  UNION ALL SELECT 'volume', NULL, NULL
  UNION ALL SELECT 'reps', NULL, NULL
) m
LEFT JOIN user_preferences up ON ws.user_id = up.user_id
LEFT JOIN milestones existing ON ws.user_id = existing.user_id 
  AND se.master_exercise_id = existing.master_exercise_id 
  AND m.type = existing.type
WHERE existing.id IS NULL
  AND ws.user_id IS NOT NULL
  AND se.master_exercise_id IS NOT NULL;

-- Update absolute weight targets based on exercise type and user experience
UPDATE milestones 
SET target_value = CASE 
  -- Beginner targets (conservative)
  WHEN experience_level = 'beginner' THEN
    CASE 
      -- Compound lifts
      WHEN master_exercise_id IN (1, 2, 3) THEN 60 -- Squat/Bench/Deadlift: 60kg
      WHEN master_exercise_id IN (4, 5) THEN 40 -- Overhead Press/Rows: 40kg
      -- Isolation lifts
      WHEN master_exercise_id IN (6, 7, 8) THEN 20 -- Bicep Curls/Tricep Extensions/Lateral Raises: 20kg
      ELSE 30 -- Default for other exercises
    END
  -- Intermediate targets (moderate)
  WHEN experience_level = 'intermediate' THEN
    CASE 
      WHEN master_exercise_id IN (1, 2, 3) THEN 120 -- Squat/Bench/Deadlift: 120kg
      WHEN master_exercise_id IN (4, 5) THEN 80 -- Overhead Press/Rows: 80kg
      WHEN master_exercise_id IN (6, 7, 8) THEN 40 -- Bicep Curls/Tricep Extensions/Lateral Raises: 40kg
      ELSE 60 -- Default for other exercises
    END
  -- Advanced targets (ambitious)
  WHEN experience_level = 'advanced' THEN
    CASE 
      WHEN master_exercise_id IN (1, 2, 3) THEN 180 -- Squat/Bench/Deadlift: 180kg
      WHEN master_exercise_id IN (4, 5) THEN 120 -- Overhead Press/Rows: 120kg
      WHEN master_exercise_id IN (6, 7, 8) THEN 60 -- Bicep Curls/Tricep Extensions/Lateral Raises: 60kg
      ELSE 90 -- Default for other exercises
    END
  ELSE 80 -- Default intermediate target
END
WHERE type = 'absolute_weight';

-- Update bodyweight multiplier targets
UPDATE milestones 
SET target_multiplier = CASE 
  WHEN experience_level = 'beginner' THEN 1.0
  WHEN experience_level = 'intermediate' THEN 1.5
  WHEN experience_level = 'advanced' THEN 2.0
  ELSE 1.5 -- Default intermediate
END,
target_value = CASE 
  WHEN experience_level = 'beginner' THEN 1.0
  WHEN experience_level = 'intermediate' THEN 1.5
  WHEN experience_level = 'advanced' THEN 2.0
  ELSE 1.5 -- Default intermediate
END
WHERE type = 'bodyweight_multiplier';

-- Update volume targets (total weight x reps in a session)
UPDATE milestones 
SET target_value = CASE 
  WHEN experience_level = 'beginner' THEN 1000
  WHEN experience_level = 'intermediate' THEN 2500
  WHEN experience_level = 'advanced' THEN 5000
  ELSE 2500 -- Default intermediate
END
WHERE type = 'volume';

-- Update rep targets (max reps at a given weight)
UPDATE milestones 
SET target_value = CASE 
  WHEN experience_level = 'beginner' THEN 10
  WHEN experience_level = 'intermediate' THEN 15
  WHEN experience_level = 'advanced' THEN 20
  ELSE 15 -- Default intermediate
END
WHERE type = 'reps';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milestones_user_exercise_type ON milestones(user_id, master_exercise_id, type);
CREATE INDEX IF NOT EXISTS idx_milestones_system_default ON milestones(is_system_default, experience_level);

-- Log migration results
SELECT 
  COUNT(DISTINCT user_id) as users_with_milestones,
  COUNT(*) as total_milestones_created,
  experience_level,
  type,
  AVG(target_value) as avg_target_value
FROM milestones 
WHERE is_system_default = true
  AND created_at >= datetime('now', '-1 minute')
GROUP BY experience_level, type
ORDER BY experience_level, type;