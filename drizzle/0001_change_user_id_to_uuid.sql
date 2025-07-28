-- Migration: Change user_id from varchar to uuid
-- This migration will convert all user_id columns from varchar(255) to uuid

-- First, ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Change user_id columns to uuid type
-- Note: This assumes existing data can be cast to uuid format
-- If data is not uuid compatible, you'll need data transformation first

ALTER TABLE "swole-tracker_workout_template" 
ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;

ALTER TABLE "swole-tracker_template_exercise" 
ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;

ALTER TABLE "swole-tracker_workout_session" 
ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;

ALTER TABLE "swole-tracker_session_exercise" 
ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;

ALTER TABLE "swole-tracker_user_preferences" 
ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
