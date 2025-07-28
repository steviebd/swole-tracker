-- Fix user_id column types from UUID to VARCHAR to support Clerk user IDs
-- This converts all user_id columns from UUID to VARCHAR(256) to support Clerk's string-based user IDs

-- Update workout_template table
ALTER TABLE swole-tracker_workout_template 
ALTER COLUMN user_id TYPE VARCHAR(256);

-- Update template_exercise table  
ALTER TABLE swole-tracker_template_exercise 
ALTER COLUMN user_id TYPE VARCHAR(256);

-- Update workout_session table
ALTER TABLE swole-tracker_workout_session 
ALTER COLUMN user_id TYPE VARCHAR(256);

-- Update session_exercise table
ALTER TABLE swole-tracker_session_exercise 
ALTER COLUMN user_id TYPE VARCHAR(256);

-- Update user_preferences table
ALTER TABLE swole-tracker_user_preferences 
ALTER COLUMN user_id TYPE VARCHAR(256);
