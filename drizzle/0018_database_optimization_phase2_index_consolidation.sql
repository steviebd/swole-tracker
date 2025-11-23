-- Database Optimization Phase 2: Index Consolidation & Optimization
-- Migration to remove redundant indexes and add missing critical indexes
-- Based on TODO_DATABASE.md Phase 1.1

-- Remove redundant single-column indexes that are covered by composite indexes
-- These indexes consume storage and slow down writes without providing query benefits

-- Note: Many of these redundant indexes may not exist in current schema
-- as they were already consolidated, but we include them for completeness

DROP INDEX IF EXISTS session_exercise_user_id_idx;
DROP INDEX IF EXISTS session_exercise_session_id_idx; 
DROP INDEX IF EXISTS session_exercise_name_idx;
DROP INDEX IF EXISTS session_exercise_template_exercise_id_idx;
DROP INDEX IF EXISTS session_exercise_resolved_exercise_name_idx;

-- Add missing critical index for workout queries
-- This index covers the common pattern of user + session + date queries
CREATE INDEX IF NOT EXISTS session_exercise_user_session_date_idx 
ON session_exercise(user_id, sessionId, date(workoutDate));

-- Add composite index for dashboard queries (user + date + exercise)
-- This optimizes the common dashboard query pattern
CREATE INDEX IF NOT EXISTS session_exercise_user_date_exercise_composite_idx 
ON session_exercise(user_id, date(workoutDate), exerciseName);

-- Add index for volume aggregation queries
-- This optimizes volume and strength progression queries
CREATE INDEX IF NOT EXISTS session_exercise_user_volume_date_idx 
ON session_exercise(user_id, volume_load, date(workoutDate));

-- Add index for 1RM progression queries
-- This optimizes strength progression and personal record queries  
CREATE INDEX IF NOT EXISTS session_exercise_user_one_rm_date_idx 
ON session_exercise(user_id, one_rm_estimate, date(workoutDate));

-- Consolidate redundant performance indexes
-- Remove indexes that are covered by more comprehensive composite indexes

-- The following indexes are redundant because they're covered by existing composite indexes:
-- - session_exercise_user_weight_idx (covered by session_exercise_user_exercise_weight_idx)
-- - session_exercise_user_one_rm_idx (covered by session_exercise_user_exercise_one_rm_idx) 
-- - session_exercise_user_volume_idx (covered by session_exercise_user_exercise_volume_idx)

-- Note: We keep the composite indexes as they provide better query performance
-- for the specific multi-column query patterns used throughout the application

-- Update statistics for query optimizer
ANALYZE session_exercise;

-- Log completion
INSERT OR IGNORE INTO migration_log (migration_name, executed_at, status)
VALUES ('database_optimization_phase2_index_consolidation', datetime('now'), 'completed');