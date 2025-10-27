CREATE TABLE `ai_suggestion_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`sessionId` integer NOT NULL,
	`exerciseName` text NOT NULL,
	`setId` text NOT NULL,
	`setIndex` integer NOT NULL,
	`suggested_weight_kg` real,
	`suggested_reps` integer,
	`suggested_rest_seconds` integer,
	`suggestion_rationale` text,
	`action` text NOT NULL,
	`accepted_weight_kg` real,
	`accepted_reps` integer,
	`progression_type` text,
	`readiness_score` real,
	`plateau_detected` integer DEFAULT false NOT NULL,
	`interaction_time_ms` integer,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`sessionId`) REFERENCES `workout_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_suggestion_history_user_id_idx` ON `ai_suggestion_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `ai_suggestion_history_session_idx` ON `ai_suggestion_history` (`sessionId`);--> statement-breakpoint
CREATE INDEX `ai_suggestion_history_exercise_idx` ON `ai_suggestion_history` (`exerciseName`);--> statement-breakpoint
CREATE INDEX `ai_suggestion_history_action_idx` ON `ai_suggestion_history` (`action`);--> statement-breakpoint
CREATE INDEX `ai_suggestion_history_created_at_idx` ON `ai_suggestion_history` (`createdAt`);--> statement-breakpoint
CREATE INDEX `ai_suggestion_history_user_created_idx` ON `ai_suggestion_history` (`user_id`,`createdAt`);--> statement-breakpoint
CREATE TABLE `exercise_link` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`templateExerciseId` integer NOT NULL,
	`masterExerciseId` integer NOT NULL,
	`user_id` text NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`templateExerciseId`) REFERENCES `template_exercise`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`masterExerciseId`) REFERENCES `master_exercise`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_link_templateExerciseId_unique` ON `exercise_link` (`templateExerciseId`);--> statement-breakpoint
CREATE INDEX `exercise_link_template_exercise_idx` ON `exercise_link` (`templateExerciseId`);--> statement-breakpoint
CREATE INDEX `exercise_link_master_exercise_idx` ON `exercise_link` (`masterExerciseId`);--> statement-breakpoint
CREATE INDEX `exercise_link_user_id_idx` ON `exercise_link` (`user_id`);--> statement-breakpoint
CREATE INDEX `exercise_link_user_master_idx` ON `exercise_link` (`user_id`,`masterExerciseId`);--> statement-breakpoint
CREATE TABLE `whoop_workout` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`whoopWorkoutId` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`timezone_offset` text,
	`sport_name` text,
	`score_state` text,
	`score` text,
	`during` text,
	`zone_duration` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `whoop_workout_whoopWorkoutId_unique` ON `whoop_workout` (`whoopWorkoutId`);--> statement-breakpoint
CREATE INDEX `external_workout_whoop_user_id_idx` ON `whoop_workout` (`user_id`);--> statement-breakpoint
CREATE INDEX `external_workout_whoop_workout_id_idx` ON `whoop_workout` (`whoopWorkoutId`);--> statement-breakpoint
CREATE INDEX `external_workout_whoop_start_idx` ON `whoop_workout` (`start`);--> statement-breakpoint
CREATE INDEX `external_workout_whoop_user_start_idx` ON `whoop_workout` (`user_id`,`start`);--> statement-breakpoint
CREATE INDEX `external_workout_whoop_user_workout_id_idx` ON `whoop_workout` (`user_id`,`whoopWorkoutId`);--> statement-breakpoint
CREATE TABLE `health_advice` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`sessionId` integer NOT NULL,
	`request` text NOT NULL,
	`response` text NOT NULL,
	`readiness_rho` real,
	`overload_multiplier` real,
	`session_predicted_chance` real,
	`user_accepted_suggestions` integer DEFAULT 0 NOT NULL,
	`total_suggestions` integer NOT NULL,
	`response_time_ms` integer,
	`model_used` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`sessionId`) REFERENCES `workout_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `health_advice_user_id_idx` ON `health_advice` (`user_id`);--> statement-breakpoint
CREATE INDEX `health_advice_session_id_idx` ON `health_advice` (`sessionId`);--> statement-breakpoint
CREATE INDEX `health_advice_created_at_idx` ON `health_advice` (`createdAt`);--> statement-breakpoint
CREATE INDEX `health_advice_user_created_idx` ON `health_advice` (`user_id`,`createdAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `health_advice_user_session_unique` ON `health_advice` (`user_id`,`sessionId`);--> statement-breakpoint
CREATE TABLE `master_exercise` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`normalizedName` text NOT NULL,
	`tags` text,
	`muscleGroup` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
CREATE INDEX `master_exercise_user_id_idx` ON `master_exercise` (`user_id`);--> statement-breakpoint
CREATE INDEX `master_exercise_name_idx` ON `master_exercise` (`name`);--> statement-breakpoint
CREATE INDEX `master_exercise_normalized_name_idx` ON `master_exercise` (`normalizedName`);--> statement-breakpoint
CREATE INDEX `master_exercise_user_normalized_idx` ON `master_exercise` (`user_id`,`normalizedName`);--> statement-breakpoint
CREATE TABLE `oauth_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`state` text NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`client_ip` text,
	`user_agent_hash` text,
	`expiresAt` text DEFAULT (datetime('now', '+10 minutes')) NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_state_state_unique` ON `oauth_state` (`state`);--> statement-breakpoint
CREATE INDEX `oauth_state_user_id_idx` ON `oauth_state` (`user_id`);--> statement-breakpoint
CREATE INDEX `oauth_state_provider_idx` ON `oauth_state` (`provider`);--> statement-breakpoint
CREATE INDEX `oauth_state_expires_at_idx` ON `oauth_state` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `oauth_state_user_provider_idx` ON `oauth_state` (`user_id`,`provider`);--> statement-breakpoint
CREATE TABLE `rate_limit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	`windowStart` text NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
CREATE INDEX `rate_limit_user_endpoint_idx` ON `rate_limit` (`user_id`,`endpoint`);--> statement-breakpoint
CREATE INDEX `rate_limit_window_idx` ON `rate_limit` (`windowStart`);--> statement-breakpoint
CREATE TABLE `session_debrief` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`sessionId` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`parentDebriefId` integer,
	`summary` text NOT NULL,
	`prHighlights` text,
	`adherenceScore` real,
	`focusAreas` text,
	`streakContext` text,
	`overloadDigest` text,
	`metadata` text,
	`isActive` integer DEFAULT true NOT NULL,
	`viewedAt` text,
	`dismissedAt` text,
	`pinnedAt` text,
	`regenerationCount` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text,
	FOREIGN KEY (`sessionId`) REFERENCES `workout_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_debrief_user_id_idx` ON `session_debrief` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_debrief_session_id_idx` ON `session_debrief` (`sessionId`);--> statement-breakpoint
CREATE INDEX `session_debrief_parent_debrief_id_idx` ON `session_debrief` (`parentDebriefId`);--> statement-breakpoint
CREATE INDEX `session_debrief_user_session_active_idx` ON `session_debrief` (`user_id`,`sessionId`,`isActive`);--> statement-breakpoint
CREATE TABLE `session_exercise` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`sessionId` integer NOT NULL,
	`templateExerciseId` integer,
	`exerciseName` text NOT NULL,
	`resolvedExerciseName` text DEFAULT '' NOT NULL,
	`setOrder` integer DEFAULT 0 NOT NULL,
	`weight` real,
	`reps` integer,
	`sets` integer,
	`unit` text DEFAULT 'kg' NOT NULL,
	`rpe` integer,
	`rest_seconds` integer,
	`is_estimate` integer DEFAULT false NOT NULL,
	`is_default_applied` integer DEFAULT false NOT NULL,
	`one_rm_estimate` real,
	`volume_load` real,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`sessionId`) REFERENCES `workout_session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`templateExerciseId`) REFERENCES `template_exercise`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `session_exercise_user_id_idx` ON `session_exercise` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_exercise_session_id_idx` ON `session_exercise` (`sessionId`);--> statement-breakpoint
CREATE INDEX `session_exercise_template_exercise_id_idx` ON `session_exercise` (`templateExerciseId`);--> statement-breakpoint
CREATE INDEX `session_exercise_name_idx` ON `session_exercise` (`exerciseName`);--> statement-breakpoint
CREATE INDEX `session_exercise_user_exercise_idx` ON `session_exercise` (`user_id`,`exerciseName`);--> statement-breakpoint
CREATE INDEX `session_exercise_user_exercise_date_idx` ON `session_exercise` (`user_id`,`exerciseName`,`sessionId`);--> statement-breakpoint
CREATE INDEX `session_exercise_user_resolved_name_idx` ON `session_exercise` (`user_id`,`resolvedExerciseName`);--> statement-breakpoint
CREATE INDEX `session_exercise_user_template_idx` ON `session_exercise` (`user_id`,`templateExerciseId`);--> statement-breakpoint
CREATE INDEX `session_exercise_user_weight_idx` ON `session_exercise` (`user_id`,`weight`);--> statement-breakpoint
CREATE INDEX `session_exercise_user_exercise_weight_idx` ON `session_exercise` (`user_id`,`exerciseName`,`weight`);--> statement-breakpoint
CREATE INDEX `session_exercise_user_one_rm_idx` ON `session_exercise` (`user_id`,`one_rm_estimate`);--> statement-breakpoint
CREATE INDEX `session_exercise_user_volume_idx` ON `session_exercise` (`user_id`,`volume_load`);--> statement-breakpoint
CREATE INDEX `session_exercise_user_exercise_one_rm_idx` ON `session_exercise` (`user_id`,`exerciseName`,`one_rm_estimate`);--> statement-breakpoint
CREATE INDEX `session_exercise_user_exercise_volume_idx` ON `session_exercise` (`user_id`,`exerciseName`,`volume_load`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`organizationId` text,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`expiresAt` integer NOT NULL,
	`accessTokenExpiresAt` integer,
	`sessionExpiresAt` integer,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE INDEX `session_expires_at_idx` ON `session` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `session_access_expires_idx` ON `session` (`accessTokenExpiresAt`);--> statement-breakpoint
CREATE INDEX `session_session_expires_idx` ON `session` (`sessionExpiresAt`);--> statement-breakpoint
CREATE TABLE `template_exercise` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`templateId` integer NOT NULL,
	`exerciseName` text NOT NULL,
	`orderIndex` integer DEFAULT 0 NOT NULL,
	`linkingRejected` integer DEFAULT false NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`templateId`) REFERENCES `workout_template`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `template_exercise_user_id_idx` ON `template_exercise` (`user_id`);--> statement-breakpoint
CREATE INDEX `template_exercise_template_id_idx` ON `template_exercise` (`templateId`);--> statement-breakpoint
CREATE INDEX `template_exercise_user_template_name_idx` ON `template_exercise` (`user_id`,`templateId`,`exerciseName`);--> statement-breakpoint
CREATE TABLE `user_integration` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`externalUserId` text,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`expiresAt` text,
	`scope` text,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
CREATE INDEX `user_integration_user_id_idx` ON `user_integration` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_integration_provider_idx` ON `user_integration` (`provider`);--> statement-breakpoint
CREATE INDEX `user_integration_user_provider_idx` ON `user_integration` (`user_id`,`provider`);--> statement-breakpoint
CREATE INDEX `user_integration_external_user_idx` ON `user_integration` (`externalUserId`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`defaultWeightUnit` text DEFAULT 'kg' NOT NULL,
	`predictive_defaults_enabled` integer DEFAULT false NOT NULL,
	`right_swipe_action` text DEFAULT 'collapse_expand' NOT NULL,
	`enable_manual_wellness` integer DEFAULT false NOT NULL,
	`progression_type` text DEFAULT 'adaptive' NOT NULL,
	`linear_progression_kg` real DEFAULT 2.5,
	`percentage_progression` real DEFAULT 2.5,
	`targetWorkoutsPerWeek` real DEFAULT 3 NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_preferences_user_id_unique` ON `user_preferences` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_preferences_user_id_idx` ON `user_preferences` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`firstName` text,
	`lastName` text,
	`profilePictureUrl` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
CREATE INDEX `user_email_idx` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `webhook_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`eventType` text NOT NULL,
	`userId` text,
	`externalUserId` text,
	`externalEntityId` text,
	`payload` text,
	`headers` text,
	`status` text DEFAULT 'received' NOT NULL,
	`error` text,
	`processingTime` integer,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`processedAt` text
);
--> statement-breakpoint
CREATE INDEX `webhook_event_provider_idx` ON `webhook_event` (`provider`);--> statement-breakpoint
CREATE INDEX `webhook_event_type_idx` ON `webhook_event` (`eventType`);--> statement-breakpoint
CREATE INDEX `webhook_event_user_id_idx` ON `webhook_event` (`userId`);--> statement-breakpoint
CREATE INDEX `webhook_event_external_user_id_idx` ON `webhook_event` (`externalUserId`);--> statement-breakpoint
CREATE INDEX `webhook_event_status_idx` ON `webhook_event` (`status`);--> statement-breakpoint
CREATE INDEX `webhook_event_created_at_idx` ON `webhook_event` (`createdAt`);--> statement-breakpoint
CREATE TABLE `wellness_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`sessionId` integer,
	`date` text NOT NULL,
	`energy_level` integer,
	`sleep_quality` integer,
	`device_timezone` text,
	`submitted_at` text DEFAULT (datetime('now')) NOT NULL,
	`has_whoop_data` integer DEFAULT false NOT NULL,
	`whoop_data` text,
	`notes` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text,
	FOREIGN KEY (`sessionId`) REFERENCES `workout_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wellness_data_user_id_idx` ON `wellness_data` (`user_id`);--> statement-breakpoint
CREATE INDEX `wellness_data_user_date_idx` ON `wellness_data` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `wellness_data_user_session_idx` ON `wellness_data` (`user_id`,`sessionId`);--> statement-breakpoint
CREATE INDEX `wellness_data_submitted_at_idx` ON `wellness_data` (`user_id`,`submitted_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `wellness_data_user_session_unique` ON `wellness_data` (`user_id`,`sessionId`);--> statement-breakpoint
CREATE TABLE `whoop_body_measurement` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`whoop_measurement_id` text NOT NULL,
	`height_meter` real,
	`weight_kilogram` real,
	`max_heart_rate` integer,
	`measurement_date` text,
	`raw_data` text,
	`webhook_received_at` text DEFAULT (datetime('now')) NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `whoop_body_measurement_whoop_measurement_id_unique` ON `whoop_body_measurement` (`whoop_measurement_id`);--> statement-breakpoint
CREATE INDEX `whoop_body_measurement_user_id_idx` ON `whoop_body_measurement` (`user_id`);--> statement-breakpoint
CREATE INDEX `whoop_body_measurement_date_idx` ON `whoop_body_measurement` (`user_id`,`measurement_date`);--> statement-breakpoint
CREATE INDEX `whoop_body_measurement_whoop_id_idx` ON `whoop_body_measurement` (`whoop_measurement_id`);--> statement-breakpoint
CREATE TABLE `whoop_cycle` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`whoop_cycle_id` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`timezone_offset` text,
	`day_strain` real,
	`average_heart_rate` integer,
	`max_heart_rate` integer,
	`kilojoule` real,
	`percent_recorded` real,
	`distance_meter` integer,
	`altitude_gain_meter` integer,
	`altitude_change_meter` integer,
	`raw_data` text,
	`webhook_received_at` text DEFAULT (datetime('now')) NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `whoop_cycle_whoop_cycle_id_unique` ON `whoop_cycle` (`whoop_cycle_id`);--> statement-breakpoint
CREATE INDEX `whoop_cycle_user_id_idx` ON `whoop_cycle` (`user_id`);--> statement-breakpoint
CREATE INDEX `whoop_cycle_user_start_idx` ON `whoop_cycle` (`user_id`,`start`);--> statement-breakpoint
CREATE INDEX `whoop_cycle_whoop_id_idx` ON `whoop_cycle` (`whoop_cycle_id`);--> statement-breakpoint
CREATE INDEX `whoop_cycle_strain_idx` ON `whoop_cycle` (`user_id`,`day_strain`);--> statement-breakpoint
CREATE TABLE `whoop_profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`whoop_user_id` text NOT NULL,
	`email` text,
	`first_name` text,
	`last_name` text,
	`raw_data` text,
	`webhook_received_at` text DEFAULT (datetime('now')) NOT NULL,
	`last_updated` text DEFAULT (datetime('now')) NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
CREATE INDEX `whoop_profile_user_id_idx` ON `whoop_profile` (`user_id`);--> statement-breakpoint
CREATE INDEX `whoop_profile_whoop_user_id_idx` ON `whoop_profile` (`whoop_user_id`);--> statement-breakpoint
CREATE TABLE `whoop_recovery` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`whoop_recovery_id` text NOT NULL,
	`cycle_id` text,
	`date` text NOT NULL,
	`recovery_score` integer,
	`hrv_rmssd_milli` real,
	`hrv_rmssd_baseline` real,
	`resting_heart_rate` integer,
	`resting_heart_rate_baseline` integer,
	`respiratory_rate` real,
	`respiratory_rate_baseline` real,
	`raw_data` text,
	`timezone_offset` text,
	`webhook_received_at` text DEFAULT (datetime('now')) NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `whoop_recovery_whoop_recovery_id_unique` ON `whoop_recovery` (`whoop_recovery_id`);--> statement-breakpoint
CREATE INDEX `whoop_recovery_user_id_idx` ON `whoop_recovery` (`user_id`);--> statement-breakpoint
CREATE INDEX `whoop_recovery_user_date_idx` ON `whoop_recovery` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `whoop_recovery_whoop_id_idx` ON `whoop_recovery` (`whoop_recovery_id`);--> statement-breakpoint
CREATE INDEX `whoop_recovery_cycle_id_idx` ON `whoop_recovery` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `whoop_recovery_user_received_idx` ON `whoop_recovery` (`user_id`,`webhook_received_at`);--> statement-breakpoint
CREATE TABLE `whoop_sleep` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`whoop_sleep_id` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`timezone_offset` text,
	`sleep_performance_percentage` integer,
	`total_sleep_time_milli` integer,
	`sleep_efficiency_percentage` real,
	`slow_wave_sleep_time_milli` integer,
	`rem_sleep_time_milli` integer,
	`light_sleep_time_milli` integer,
	`wake_time_milli` integer,
	`arousal_time_milli` integer,
	`disturbance_count` integer,
	`sleep_latency_milli` integer,
	`sleep_consistency_percentage` real,
	`sleep_need_baseline_milli` integer,
	`sleep_need_from_sleep_debt_milli` integer,
	`sleep_need_from_recent_strain_milli` integer,
	`sleep_need_from_recent_nap_milli` integer,
	`raw_data` text,
	`webhook_received_at` text DEFAULT (datetime('now')) NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `whoop_sleep_whoop_sleep_id_unique` ON `whoop_sleep` (`whoop_sleep_id`);--> statement-breakpoint
CREATE INDEX `whoop_sleep_user_id_idx` ON `whoop_sleep` (`user_id`);--> statement-breakpoint
CREATE INDEX `whoop_sleep_user_start_idx` ON `whoop_sleep` (`user_id`,`start`);--> statement-breakpoint
CREATE INDEX `whoop_sleep_whoop_id_idx` ON `whoop_sleep` (`whoop_sleep_id`);--> statement-breakpoint
CREATE INDEX `whoop_sleep_performance_idx` ON `whoop_sleep` (`user_id`,`sleep_performance_percentage`);--> statement-breakpoint
CREATE TABLE `workout_session` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`templateId` integer,
	`workoutDate` text DEFAULT (datetime('now')) NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text,
	FOREIGN KEY (`templateId`) REFERENCES `workout_template`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workout_session_user_id_idx` ON `workout_session` (`user_id`);--> statement-breakpoint
CREATE INDEX `workout_session_template_id_idx` ON `workout_session` (`templateId`);--> statement-breakpoint
CREATE INDEX `workout_session_workout_date_idx` ON `workout_session` (`workoutDate`);--> statement-breakpoint
CREATE INDEX `workout_session_user_date_idx` ON `workout_session` (`user_id`,`workoutDate`);--> statement-breakpoint
CREATE TABLE `workout_template` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`user_id` text NOT NULL,
	`dedupeKey` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text
);
--> statement-breakpoint
CREATE INDEX `template_user_id_idx` ON `workout_template` (`user_id`);--> statement-breakpoint
CREATE INDEX `template_name_idx` ON `workout_template` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `template_user_dedupe_idx` ON `workout_template` (`user_id`,`dedupeKey`);