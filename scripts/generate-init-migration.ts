#!/usr/bin/env bun
/**
 * generate-init-migration.ts
 * 
 * Generates a complete initial setup migration file with CREATE TABLE IF NOT EXISTS statements.
 * This migration can safely run on both blank and existing databases.
 */

import { writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const projectRoot = process.cwd();
const migrationsDir = join(projectRoot, "drizzle");

console.log("📝 Generating Initial Database Setup Migration");
console.log("==============================================");

// Create migrations directory if it doesn't exist
if (!existsSync(migrationsDir)) {
  console.log("📁 Creating migrations directory...");
  await Bun.spawn(["mkdir", "-p", migrationsDir]).exited;
}

// Generate timestamp for migration file
const timestamp = new Date().toISOString()
  .replace(/[-:]/g, '')
  .replace('T', '_')
  .split('.')[0];

const migrationName = `${timestamp}_initial_setup`;
const sqlFile = join(migrationsDir, `${migrationName}.sql`);

console.log(`📋 Migration name: ${migrationName}`);
console.log(`📄 SQL file: ${sqlFile}`);

// Complete SQL schema with IF NOT EXISTS guards
const initialSetupSQL = `-- Initial database setup migration
-- This migration creates all tables with IF NOT EXISTS guards
-- Safe to run on both blank and existing databases

-- Workout Templates
CREATE TABLE IF NOT EXISTS \`swole-tracker_workout_template\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`name\` text NOT NULL,
	\`user_id\` text NOT NULL,
	\`clientId\` text,
	\`createdAt\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updatedAt\` text
);

-- Template Exercises  
CREATE TABLE IF NOT EXISTS \`swole-tracker_template_exercise\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`templateId\` integer NOT NULL,
	\`exerciseName\` text NOT NULL,
	\`orderIndex\` integer DEFAULT 0 NOT NULL,
	\`linkingRejected\` integer DEFAULT 0 NOT NULL,
	\`createdAt\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	FOREIGN KEY (\`templateId\`) REFERENCES \`swole-tracker_workout_template\`(\`id\`) ON DELETE cascade
);

-- Workout Sessions
CREATE TABLE IF NOT EXISTS \`swole-tracker_workout_session\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`name\` text NOT NULL,
	\`templateId\` integer,
	\`clientId\` text,
	\`notes\` text,
	\`duration\` integer,
	\`createdAt\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updatedAt\` text,
	FOREIGN KEY (\`templateId\`) REFERENCES \`swole-tracker_workout_template\`(\`id\`) ON DELETE set null
);

-- Session Exercises
CREATE TABLE IF NOT EXISTS \`swole-tracker_session_exercise\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`sessionId\` integer NOT NULL,
	\`exerciseName\` text NOT NULL,
	\`orderIndex\` integer DEFAULT 0 NOT NULL,
	\`sets\` integer,
	\`reps\` integer,
	\`weight\` real,
	\`distance\` real,
	\`duration\` integer,
	\`restTime\` integer,
	\`notes\` text,
	\`rpe\` integer,
	\`linkingRejected\` integer DEFAULT 0 NOT NULL,
	\`createdAt\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	FOREIGN KEY (\`sessionId\`) REFERENCES \`swole-tracker_workout_session\`(\`id\`) ON DELETE cascade
);

-- Master Exercises
CREATE TABLE IF NOT EXISTS \`swole-tracker_master_exercise\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`name\` text NOT NULL,
	\`category\` text,
	\`muscleGroups\` text,
	\`equipment\` text,
	\`instructions\` text,
	\`createdAt\` text DEFAULT (datetime('now', 'utc')) NOT NULL
);

-- Exercise Links
CREATE TABLE IF NOT EXISTS \`swole-tracker_exercise_link\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`userExerciseName\` text NOT NULL,
	\`masterId\` integer NOT NULL,
	\`createdAt\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	FOREIGN KEY (\`masterId\`) REFERENCES \`swole-tracker_master_exercise\`(\`id\`) ON DELETE cascade
);

-- User Preferences
CREATE TABLE IF NOT EXISTS \`swole-tracker_user_preferences\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`theme\` text DEFAULT 'system',
	\`units\` text DEFAULT 'imperial',
	\`defaultRestTime\` integer DEFAULT 90,
	\`showTips\` integer DEFAULT 1,
	\`enableNotifications\` integer DEFAULT 1,
	\`autoSave\` integer DEFAULT 1,
	\`exerciseSuggestions\` integer DEFAULT 1,
	\`weekStartsOn\` integer DEFAULT 0,
	\`createdAt\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updatedAt\` text
);

-- Rate Limiting
CREATE TABLE IF NOT EXISTS \`swole-tracker_rate_limit\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`key\` text NOT NULL,
	\`count\` integer DEFAULT 0 NOT NULL,
	\`resetTime\` integer NOT NULL,
	\`windowStart\` integer NOT NULL,
	\`createdAt\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updatedAt\` text DEFAULT (datetime('now', 'utc')) NOT NULL
);

-- User Integrations
CREATE TABLE IF NOT EXISTS \`swole-tracker_user_integration\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`provider\` text NOT NULL,
	\`providerId\` text NOT NULL,
	\`accessToken\` text,
	\`refreshToken\` text,
	\`tokenExpires\` integer,
	\`isActive\` integer DEFAULT 1 NOT NULL,
	\`metadata\` text,
	\`createdAt\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updatedAt\` text
);

-- WHOOP Profile
CREATE TABLE IF NOT EXISTS \`swole-tracker_whoop_profile\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`whoop_user_id\` text NOT NULL,
	\`email\` text,
	\`first_name\` text,
	\`last_name\` text,
	\`profile_pic_url\` text,
	\`country\` text,
	\`admin_division\` text,
	\`city\` text,
	\`created_at\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updated_at\` text
);

-- WHOOP Workouts
CREATE TABLE IF NOT EXISTS \`swole-tracker_whoop_workout\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`whoop_workout_id\` text NOT NULL,
	\`sport_id\` integer NOT NULL,
	\`score_state\` text NOT NULL,
	\`score\` text,
	\`strain\` real,
	\`average_heart_rate\` integer,
	\`max_heart_rate\` integer,
	\`kilojoule\` real,
	\`percent_recorded\` real,
	\`distance_meter\` real,
	\`altitude_gain_meter\` real,
	\`altitude_change_meter\` real,
	\`zone_duration\` text,
	\`created_at\` text DEFAULT (datetime('now', 'utc')) NOT NULL
);

-- WHOOP Recovery
CREATE TABLE IF NOT EXISTS \`swole-tracker_whoop_recovery\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`cycle_id\` text NOT NULL,
	\`sleep_id\` text,
	\`user_calibrating\` integer NOT NULL,
	\`recovery_score\` real,
	\`resting_heart_rate\` real,
	\`hrv_rmssd_milli\` real,
	\`spo2_percentage\` real,
	\`skin_temp_celsius\` real,
	\`day\` text NOT NULL,
	\`calibrating\` integer NOT NULL,
	\`percent_recorded\` real,
	\`state\` text NOT NULL,
	\`created_at\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updated_at\` text
);

-- WHOOP Sleep
CREATE TABLE IF NOT EXISTS \`swole-tracker_whoop_sleep\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`whoop_sleep_id\` text NOT NULL,
	\`nap\` integer NOT NULL,
	\`score_state\` text NOT NULL,
	\`score\` text,
	\`stage_summary\` text,
	\`sleep_needed\` text,
	\`sleep_consistency_percentage\` real,
	\`sleep_efficiency_percentage\` real,
	\`start\` text NOT NULL,
	\`end\` text NOT NULL,
	\`timezone_offset\` text NOT NULL,
	\`total_in_bed_time_milli\` integer NOT NULL,
	\`total_awake_time_milli\` integer NOT NULL,
	\`total_no_data_time_milli\` integer NOT NULL,
	\`total_light_sleep_time_milli\` integer NOT NULL,
	\`total_slow_wave_sleep_time_milli\` integer NOT NULL,
	\`total_rem_sleep_time_milli\` integer NOT NULL,
	\`sleep_cycle_count\` integer NOT NULL,
	\`disturbance_count\` integer NOT NULL,
	\`created_at\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updated_at\` text
);

-- WHOOP Cycles
CREATE TABLE IF NOT EXISTS \`swole-tracker_whoop_cycle\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`whoop_cycle_id\` text NOT NULL,
	\`days\` text NOT NULL,
	\`start\` text NOT NULL,
	\`end\` text,
	\`timezone_offset\` text NOT NULL,
	\`score_state\` text NOT NULL,
	\`score\` text,
	\`strain\` real,
	\`kilojoule\` real,
	\`average_heart_rate\` integer,
	\`max_heart_rate\` integer,
	\`created_at\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updated_at\` text
);

-- WHOOP Body Measurements
CREATE TABLE IF NOT EXISTS \`swole-tracker_whoop_body_measurement\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`whoop_measurement_id\` text NOT NULL,
	\`height_meter\` real,
	\`weight_kilogram\` real,
	\`max_heart_rate\` integer,
	\`date\` text NOT NULL,
	\`created_at\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updated_at\` text
);

-- Wellness Data
CREATE TABLE IF NOT EXISTS \`swole-tracker_wellness_data\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`date\` text NOT NULL,
	\`sleep_hours\` real,
	\`sleep_quality\` integer,
	\`energy_level\` integer,
	\`stress_level\` integer,
	\`mood\` integer,
	\`weight\` real,
	\`body_fat_percentage\` real,
	\`notes\` text,
	\`heart_rate_variability\` real,
	\`resting_heart_rate\` integer,
	\`created_at\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updated_at\` text,
	FOREIGN KEY (\`user_id\`) REFERENCES \`swole-tracker_user_preferences\`(\`user_id\`)
);

-- Webhook Events
CREATE TABLE IF NOT EXISTS \`swole-tracker_webhook_event\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`webhook_id\` text NOT NULL,
	\`event_type\` text NOT NULL,
	\`source\` text NOT NULL,
	\`user_id\` text,
	\`payload\` text NOT NULL,
	\`processed\` integer DEFAULT 0 NOT NULL,
	\`processing_attempts\` integer DEFAULT 0 NOT NULL,
	\`last_processing_attempt\` text,
	\`processing_error\` text,
	\`created_at\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updated_at\` text,
	\`processed_at\` text
);

-- Daily Jokes
CREATE TABLE IF NOT EXISTS \`swole-tracker_daily_joke\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`joke_text\` text NOT NULL,
	\`date\` text NOT NULL,
	\`source\` text DEFAULT 'ai' NOT NULL,
	\`created_at\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updated_at\` text
);

-- Health Advice
CREATE TABLE IF NOT EXISTS \`swole-tracker_health_advice\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`advice_text\` text NOT NULL,
	\`category\` text NOT NULL,
	\`context_data\` text,
	\`source\` text DEFAULT 'ai' NOT NULL,
	\`relevance_score\` real,
	\`date_applicable\` text,
	\`is_personalized\` integer DEFAULT 0 NOT NULL,
	\`tags\` text,
	\`created_at\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updated_at\` text,
	\`expires_at\` text,
	FOREIGN KEY (\`user_id\`) REFERENCES \`swole-tracker_user_preferences\`(\`user_id\`)
);

-- AI Suggestion History
CREATE TABLE IF NOT EXISTS \`swole-tracker_ai_suggestion_history\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`suggestion_type\` text NOT NULL,
	\`context_data\` text,
	\`suggestion_text\` text NOT NULL,
	\`model_used\` text,
	\`confidence_score\` real,
	\`user_feedback\` text,
	\`was_helpful\` integer,
	\`was_used\` integer DEFAULT 0 NOT NULL,
	\`session_id\` text,
	\`template_id\` integer,
	\`exercise_name\` text,
	\`metadata\` text,
	\`created_at\` text DEFAULT (datetime('now', 'utc')) NOT NULL,
	\`updated_at\` text,
	\`feedback_at\` text,
	\`response_time_ms\` integer
);

-- User Migrations (for tracking data migrations)
CREATE TABLE IF NOT EXISTS \`swole-tracker_user_migration\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`user_id\` text NOT NULL,
	\`migration_name\` text NOT NULL,
	\`migration_version\` text NOT NULL,
	\`status\` text NOT NULL,
	\`started_at\` text NOT NULL,
	\`completed_at\` text,
	UNIQUE(\`user_id\`, \`migration_name\`)
);

-- Create indexes (IF NOT EXISTS supported since SQLite 3.32.0)
CREATE INDEX IF NOT EXISTS \`template_user_id_idx\` ON \`swole-tracker_workout_template\` (\`user_id\`);
CREATE INDEX IF NOT EXISTS \`template_name_idx\` ON \`swole-tracker_workout_template\` (\`name\`);
CREATE INDEX IF NOT EXISTS \`template_user_name_created_idx\` ON \`swole-tracker_workout_template\` (\`user_id\`,\`name\`,\`createdAt\`);
CREATE INDEX IF NOT EXISTS \`template_user_client_id_idx\` ON \`swole-tracker_workout_template\` (\`user_id\`,\`clientId\`);

CREATE INDEX IF NOT EXISTS \`template_exercise_user_id_idx\` ON \`swole-tracker_template_exercise\` (\`user_id\`);
CREATE INDEX IF NOT EXISTS \`template_exercise_template_id_idx\` ON \`swole-tracker_template_exercise\` (\`templateId\`);
CREATE INDEX IF NOT EXISTS \`template_exercise_order_idx\` ON \`swole-tracker_template_exercise\` (\`templateId\`,\`orderIndex\`);

CREATE INDEX IF NOT EXISTS \`session_user_id_idx\` ON \`swole-tracker_workout_session\` (\`user_id\`);
CREATE INDEX IF NOT EXISTS \`session_template_id_idx\` ON \`swole-tracker_workout_session\` (\`templateId\`);
CREATE INDEX IF NOT EXISTS \`session_created_idx\` ON \`swole-tracker_workout_session\` (\`user_id\`,\`createdAt\`);

CREATE INDEX IF NOT EXISTS \`session_exercise_user_id_idx\` ON \`swole-tracker_session_exercise\` (\`user_id\`);
CREATE INDEX IF NOT EXISTS \`session_exercise_session_id_idx\` ON \`swole-tracker_session_exercise\` (\`sessionId\`);
CREATE INDEX IF NOT EXISTS \`session_exercise_order_idx\` ON \`swole-tracker_session_exercise\` (\`sessionId\`,\`orderIndex\`);
CREATE INDEX IF NOT EXISTS \`session_exercise_name_idx\` ON \`swole-tracker_session_exercise\` (\`user_id\`,\`exerciseName\`);

CREATE INDEX IF NOT EXISTS \`master_exercise_name_idx\` ON \`swole-tracker_master_exercise\` (\`name\`);
CREATE INDEX IF NOT EXISTS \`master_exercise_category_idx\` ON \`swole-tracker_master_exercise\` (\`category\`);
CREATE INDEX IF NOT EXISTS \`master_exercise_muscle_groups_idx\` ON \`swole-tracker_master_exercise\` (\`muscleGroups\`);
CREATE INDEX IF NOT EXISTS \`master_exercise_equipment_idx\` ON \`swole-tracker_master_exercise\` (\`equipment\`);
CREATE INDEX IF NOT EXISTS \`master_exercise_search_idx\` ON \`swole-tracker_master_exercise\` (\`name\`,\`category\`,\`muscleGroups\`);

CREATE INDEX IF NOT EXISTS \`exercise_link_user_id_idx\` ON \`swole-tracker_exercise_link\` (\`user_id\`);
CREATE INDEX IF NOT EXISTS \`exercise_link_master_id_idx\` ON \`swole-tracker_exercise_link\` (\`masterId\`);
CREATE INDEX IF NOT EXISTS \`exercise_link_user_exercise_idx\` ON \`swole-tracker_exercise_link\` (\`user_id\`,\`userExerciseName\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`exercise_link_unique_idx\` ON \`swole-tracker_exercise_link\` (\`user_id\`,\`userExerciseName\`,\`masterId\`);

CREATE UNIQUE INDEX IF NOT EXISTS \`user_preferences_user_id_idx\` ON \`swole-tracker_user_preferences\` (\`user_id\`);
CREATE INDEX IF NOT EXISTS \`user_preferences_theme_idx\` ON \`swole-tracker_user_preferences\` (\`theme\`);

CREATE UNIQUE INDEX IF NOT EXISTS \`rate_limit_key_idx\` ON \`swole-tracker_rate_limit\` (\`key\`);
CREATE INDEX IF NOT EXISTS \`rate_limit_reset_time_idx\` ON \`swole-tracker_rate_limit\` (\`resetTime\`);

CREATE INDEX IF NOT EXISTS \`user_integration_user_id_idx\` ON \`swole-tracker_user_integration\` (\`user_id\`);
CREATE INDEX IF NOT EXISTS \`user_integration_provider_idx\` ON \`swole-tracker_user_integration\` (\`provider\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`user_integration_unique_idx\` ON \`swole-tracker_user_integration\` (\`user_id\`,\`provider\`,\`providerId\`);

CREATE UNIQUE INDEX IF NOT EXISTS \`whoop_profile_user_id_idx\` ON \`swole-tracker_whoop_profile\` (\`user_id\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`whoop_profile_whoop_user_id_idx\` ON \`swole-tracker_whoop_profile\` (\`whoop_user_id\`);
CREATE INDEX IF NOT EXISTS \`whoop_profile_email_idx\` ON \`swole-tracker_whoop_profile\` (\`email\`);

CREATE INDEX IF NOT EXISTS \`whoop_workout_user_id_idx\` ON \`swole-tracker_whoop_workout\` (\`user_id\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`whoop_workout_whoop_id_idx\` ON \`swole-tracker_whoop_workout\` (\`whoop_workout_id\`);
CREATE INDEX IF NOT EXISTS \`whoop_workout_sport_idx\` ON \`swole-tracker_whoop_workout\` (\`sport_id\`);
CREATE INDEX IF NOT EXISTS \`whoop_workout_created_idx\` ON \`swole-tracker_whoop_workout\` (\`user_id\`,\`created_at\`);
CREATE INDEX IF NOT EXISTS \`whoop_workout_strain_idx\` ON \`swole-tracker_whoop_workout\` (\`strain\`);
CREATE INDEX IF NOT EXISTS \`whoop_workout_score_state_idx\` ON \`swole-tracker_whoop_workout\` (\`score_state\`);

CREATE INDEX IF NOT EXISTS \`whoop_recovery_user_id_idx\` ON \`swole-tracker_whoop_recovery\` (\`user_id\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`whoop_recovery_cycle_id_idx\` ON \`swole-tracker_whoop_recovery\` (\`cycle_id\`);
CREATE INDEX IF NOT EXISTS \`whoop_recovery_day_idx\` ON \`swole-tracker_whoop_recovery\` (\`day\`);
CREATE INDEX IF NOT EXISTS \`whoop_recovery_score_idx\` ON \`swole-tracker_whoop_recovery\` (\`recovery_score\`);
CREATE INDEX IF NOT EXISTS \`whoop_recovery_user_day_idx\` ON \`swole-tracker_whoop_recovery\` (\`user_id\`,\`day\`);
CREATE INDEX IF NOT EXISTS \`whoop_recovery_state_idx\` ON \`swole-tracker_whoop_recovery\` (\`state\`);
CREATE INDEX IF NOT EXISTS \`whoop_recovery_calibrating_idx\` ON \`swole-tracker_whoop_recovery\` (\`calibrating\`);

CREATE INDEX IF NOT EXISTS \`whoop_sleep_user_id_idx\` ON \`swole-tracker_whoop_sleep\` (\`user_id\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`whoop_sleep_whoop_id_idx\` ON \`swole-tracker_whoop_sleep\` (\`whoop_sleep_id\`);
CREATE INDEX IF NOT EXISTS \`whoop_sleep_start_idx\` ON \`swole-tracker_whoop_sleep\` (\`start\`);
CREATE INDEX IF NOT EXISTS \`whoop_sleep_user_start_idx\` ON \`swole-tracker_whoop_sleep\` (\`user_id\`,\`start\`);
CREATE INDEX IF NOT EXISTS \`whoop_sleep_nap_idx\` ON \`swole-tracker_whoop_sleep\` (\`nap\`);

CREATE INDEX IF NOT EXISTS \`whoop_cycle_user_id_idx\` ON \`swole-tracker_whoop_cycle\` (\`user_id\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`whoop_cycle_whoop_id_idx\` ON \`swole-tracker_whoop_cycle\` (\`whoop_cycle_id\`);
CREATE INDEX IF NOT EXISTS \`whoop_cycle_start_idx\` ON \`swole-tracker_whoop_cycle\` (\`start\`);
CREATE INDEX IF NOT EXISTS \`whoop_cycle_user_start_idx\` ON \`swole-tracker_whoop_cycle\` (\`user_id\`,\`start\`);
CREATE INDEX IF NOT EXISTS \`whoop_cycle_strain_idx\` ON \`swole-tracker_whoop_cycle\` (\`strain\`);

CREATE INDEX IF NOT EXISTS \`whoop_body_measurement_user_id_idx\` ON \`swole-tracker_whoop_body_measurement\` (\`user_id\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`whoop_body_measurement_whoop_id_idx\` ON \`swole-tracker_whoop_body_measurement\` (\`whoop_measurement_id\`);
CREATE INDEX IF NOT EXISTS \`whoop_body_measurement_date_idx\` ON \`swole-tracker_whoop_body_measurement\` (\`date\`);
CREATE INDEX IF NOT EXISTS \`whoop_body_measurement_user_date_idx\` ON \`swole-tracker_whoop_body_measurement\` (\`user_id\`,\`date\`);

CREATE INDEX IF NOT EXISTS \`wellness_data_user_id_idx\` ON \`swole-tracker_wellness_data\` (\`user_id\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`wellness_data_user_date_idx\` ON \`swole-tracker_wellness_data\` (\`user_id\`,\`date\`);
CREATE INDEX IF NOT EXISTS \`wellness_data_date_idx\` ON \`swole-tracker_wellness_data\` (\`date\`);
CREATE INDEX IF NOT EXISTS \`wellness_data_sleep_quality_idx\` ON \`swole-tracker_wellness_data\` (\`sleep_quality\`);
CREATE INDEX IF NOT EXISTS \`wellness_data_energy_level_idx\` ON \`swole-tracker_wellness_data\` (\`energy_level\`);

CREATE INDEX IF NOT EXISTS \`webhook_event_webhook_id_idx\` ON \`swole-tracker_webhook_event\` (\`webhook_id\`);
CREATE INDEX IF NOT EXISTS \`webhook_event_user_id_idx\` ON \`swole-tracker_webhook_event\` (\`user_id\`);
CREATE INDEX IF NOT EXISTS \`webhook_event_processed_idx\` ON \`swole-tracker_webhook_event\` (\`processed\`);
CREATE INDEX IF NOT EXISTS \`webhook_event_event_type_idx\` ON \`swole-tracker_webhook_event\` (\`event_type\`);
CREATE INDEX IF NOT EXISTS \`webhook_event_source_idx\` ON \`swole-tracker_webhook_event\` (\`source\`);
CREATE INDEX IF NOT EXISTS \`webhook_event_created_idx\` ON \`swole-tracker_webhook_event\` (\`created_at\`);

CREATE INDEX IF NOT EXISTS \`daily_joke_user_id_idx\` ON \`swole-tracker_daily_joke\` (\`user_id\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`daily_joke_user_date_idx\` ON \`swole-tracker_daily_joke\` (\`user_id\`,\`date\`);
CREATE INDEX IF NOT EXISTS \`daily_joke_date_idx\` ON \`swole-tracker_daily_joke\` (\`date\`);

CREATE INDEX IF NOT EXISTS \`health_advice_user_id_idx\` ON \`swole-tracker_health_advice\` (\`user_id\`);
CREATE INDEX IF NOT EXISTS \`health_advice_category_idx\` ON \`swole-tracker_health_advice\` (\`category\`);
CREATE INDEX IF NOT EXISTS \`health_advice_date_applicable_idx\` ON \`swole-tracker_health_advice\` (\`date_applicable\`);
CREATE INDEX IF NOT EXISTS \`health_advice_relevance_score_idx\` ON \`swole-tracker_health_advice\` (\`relevance_score\`);
CREATE INDEX IF NOT EXISTS \`health_advice_expires_at_idx\` ON \`swole-tracker_health_advice\` (\`expires_at\`);

CREATE INDEX IF NOT EXISTS \`ai_suggestion_user_id_idx\` ON \`swole-tracker_ai_suggestion_history\` (\`user_id\`);
CREATE INDEX IF NOT EXISTS \`ai_suggestion_type_idx\` ON \`swole-tracker_ai_suggestion_history\` (\`suggestion_type\`);
CREATE INDEX IF NOT EXISTS \`ai_suggestion_session_id_idx\` ON \`swole-tracker_ai_suggestion_history\` (\`session_id\`);
CREATE INDEX IF NOT EXISTS \`ai_suggestion_template_id_idx\` ON \`swole-tracker_ai_suggestion_history\` (\`template_id\`);
CREATE INDEX IF NOT EXISTS \`ai_suggestion_was_helpful_idx\` ON \`swole-tracker_ai_suggestion_history\` (\`was_helpful\`);
CREATE INDEX IF NOT EXISTS \`ai_suggestion_was_used_idx\` ON \`swole-tracker_ai_suggestion_history\` (\`was_used\`);

CREATE INDEX IF NOT EXISTS \`user_migration_user_id_idx\` ON \`swole-tracker_user_migration\` (\`user_id\`);
CREATE INDEX IF NOT EXISTS \`user_migration_name_idx\` ON \`swole-tracker_user_migration\` (\`migration_name\`);
CREATE INDEX IF NOT EXISTS \`user_migration_version_idx\` ON \`swole-tracker_user_migration\` (\`migration_version\`);
CREATE INDEX IF NOT EXISTS \`user_migration_status_idx\` ON \`swole-tracker_user_migration\` (\`status\`);
CREATE INDEX IF NOT EXISTS \`user_migration_started_idx\` ON \`swole-tracker_user_migration\` (\`started_at\`);
CREATE INDEX IF NOT EXISTS \`user_migration_completed_idx\` ON \`swole-tracker_user_migration\` (\`completed_at\`);
`;

async function main() {
  try {
    // Check if migration already exists
    const existingMigrations = readdirSync(migrationsDir).filter(f => f.includes('initial_setup'));
    if (existingMigrations.length > 0) {
      console.log(`⚠️  Found existing initial setup migration: ${existingMigrations[0]}`);
      console.log("   Use a different approach or remove the existing migration first.");
      return;
    }

    // Write migration SQL file
    writeFileSync(sqlFile, initialSetupSQL);
    console.log("✅ Migration SQL file created successfully");

    // Create meta.json for Drizzle
    const metaJson = {
      version: "7",
      dialect: "sqlite",
      entries: [
        {
          idx: 0,
          version: "7",
          when: Date.now(),
          tag: migrationName,
          breakpoints: true
        }
      ]
    };

    const metaFile = join(migrationsDir, "meta.json");
    writeFileSync(metaFile, JSON.stringify(metaJson, null, 2));
    console.log("✅ Migration meta.json created successfully");

    console.log("\n🎉 Initial setup migration generated successfully!");
    console.log(`📁 Migration file: ${migrationName}.sql`);
    console.log(`📋 Tables: 21 tables with all indexes and foreign keys`);
    console.log(`🔒 Safe for existing databases: Uses IF NOT EXISTS guards`);
    
    console.log("\n🚀 Next steps:");
    console.log("   1. Run: bun run db:migrate (local)");
    console.log("   2. Run: bun run db:migrate:remote (development)"); 
    console.log("   3. Run: bun run db:migrate:staging (staging)");
    console.log("   4. Run: bun run db:migrate:production (production)");

  } catch (error) {
    console.error("❌ Error generating migration:", error);
    process.exit(1);
  }
}

await main();