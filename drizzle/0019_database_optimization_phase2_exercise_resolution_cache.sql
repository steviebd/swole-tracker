-- Database Optimization Phase 2: Exercise Resolution Cache
-- Migration to create exercise resolution cache table for N+1 query optimization
-- Based on TODO_DATABASE.md Phase 1.2

-- Create exercise resolution cache table with explicit schema (D1-compatible)
CREATE TABLE IF NOT EXISTS exercise_resolution_cache (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  resolved_name TEXT NOT NULL,
  master_exercise_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS exercise_resolution_cache_id_idx 
ON exercise_resolution_cache(id);

CREATE INDEX IF NOT EXISTS exercise_resolution_cache_user_idx 
ON exercise_resolution_cache(user_id);

CREATE INDEX IF NOT EXISTS exercise_resolution_cache_user_name_idx 
ON exercise_resolution_cache(user_id, resolved_name);

-- Populate cache with existing data
INSERT OR REPLACE INTO exercise_resolution_cache (id, user_id, resolved_name, master_exercise_id)
SELECT
  se.id,
  se.user_id,
  COALESCE(me.name, te.exerciseName, se.exerciseName) as resolved_name,
  me.id as master_exercise_id
FROM session_exercises se
LEFT JOIN template_exercises te ON se.templateExerciseId = te.id
LEFT JOIN exercise_links el ON te.id = el.templateExerciseId
LEFT JOIN master_exercises me ON el.masterExerciseId = me.id
WHERE se.id NOT IN (
  SELECT id FROM exercise_resolution_cache
);

-- Update statistics for query optimizer
ANALYZE exercise_resolution_cache;

-- Log completion
INSERT OR IGNORE INTO migration_log (migration_name, executed_at, status)
VALUES ('database_optimization_phase2_exercise_resolution_cache', datetime('now'), 'completed');