-- Database Performance Optimization - Phase 1
-- Index Consolidation & Critical Missing Indexes

-- Create exercise resolution cache table
CREATE TABLE exercise_resolution_cache (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  resolved_name TEXT NOT NULL,
  master_exercise_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')) NOT NULL,
  updated_at TEXT
);

-- Create indexes for exercise resolution cache
CREATE INDEX exercise_resolution_cache_id_idx ON exercise_resolution_cache(id);
CREATE INDEX exercise_resolution_cache_user_idx ON exercise_resolution_cache(user_id);
CREATE INDEX exercise_resolution_cache_user_name_idx ON exercise_resolution_cache(user_id, resolved_name);

-- Populate cache with existing data
INSERT INTO exercise_resolution_cache (id, user_id, resolved_name, master_exercise_id)
SELECT
  se.id,
  se.user_id,
  COALESCE(me.name, te.exerciseName) as resolved_name,
  me.id as master_exercise_id
FROM session_exercises se
LEFT JOIN template_exercises te ON se.templateExerciseId = te.id
LEFT JOIN exercise_links el ON te.id = el.templateExerciseId
LEFT JOIN master_exercises me ON el.masterExerciseId = me.id;

-- Add missing critical index for workout queries (mentioned in TODO)
-- This composite index covers the most common dashboard query pattern
CREATE INDEX session_exercise_user_session_date_idx
ON session_exercises(user_id, sessionId, workoutDate);

-- Additional optimization: Create index for exercise resolution cache queries
CREATE INDEX session_exercise_user_template_exercise_idx
ON session_exercises(user_id, templateExerciseId);

-- This index supports fast lookups when resolving exercise names through templates