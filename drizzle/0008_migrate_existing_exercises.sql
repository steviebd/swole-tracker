-- Migration: Convert existing template exercises to master exercises and create links
-- This migration handles existing data by creating master exercises and linking them

-- Create master exercises for all existing unique exercise names per user
INSERT INTO "swole-tracker_master_exercise" ("user_id", "name", "normalized_name")
SELECT DISTINCT 
    "user_id",
    "exerciseName" as "name",
    LOWER(TRIM(REGEXP_REPLACE("exerciseName", '\s+', ' ', 'g'))) as "normalized_name"
FROM "swole-tracker_template_exercise"
ON CONFLICT ("user_id", "normalized_name") DO NOTHING;

-- Create exercise links for all existing template exercises
INSERT INTO "swole-tracker_exercise_link" ("template_exercise_id", "master_exercise_id", "user_id")
SELECT 
    te."id" as "template_exercise_id",
    me."id" as "master_exercise_id",
    te."user_id"
FROM "swole-tracker_template_exercise" te
JOIN "swole-tracker_master_exercise" me ON (
    te."user_id" = me."user_id" 
    AND LOWER(TRIM(REGEXP_REPLACE(te."exerciseName", '\s+', ' ', 'g'))) = me."normalized_name"
)
ON CONFLICT ("template_exercise_id") DO NOTHING;
