-- Phase 2 migration: add RPE/Rest fields, preferences, and session metadata

-- 1) session_exercise: rpe, rest_seconds, is_estimate, is_default_applied
ALTER TABLE "swole-tracker_session_exercise"
  ADD COLUMN IF NOT EXISTS "rpe" SMALLINT NULL,
  ADD COLUMN IF NOT EXISTS "rest_seconds" INTEGER NULL,
  ADD COLUMN IF NOT EXISTS "is_estimate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_default_applied" BOOLEAN NOT NULL DEFAULT false;

-- 2) user_preferences: predictive_defaults_enabled, right_swipe_action
ALTER TABLE "swole-tracker_user_preferences"
  ADD COLUMN IF NOT EXISTS "predictive_defaults_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "right_swipe_action" VARCHAR(32) NOT NULL DEFAULT 'collapse_expand';

-- 3) workout_session: theme_used, device_type, perf_metrics
ALTER TABLE "swole-tracker_workout_session"
  ADD COLUMN IF NOT EXISTS "theme_used" VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS "device_type" VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS "perf_metrics" JSONB NULL;

-- Notes:
-- - Enums are represented as VARCHAR with app-level validation to keep migration simple.
-- - Right swipe action supported values: 'collapse_expand', 'none' (validated at app level).
-- - Theme options: 'CalmDark', 'BoldDark', 'PlayfulDark'.
-- - Device types: 'android', 'ios', 'desktop', 'ipad', 'other'.
