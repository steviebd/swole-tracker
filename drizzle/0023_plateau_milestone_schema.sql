-- Plateau & Milestone Alerts - Database Schema
-- Add tables for tracking key lifts, plateaus, milestones, and PR forecasts

-- Extend user_preferences table with experience level and bodyweight
ALTER TABLE `user_preferences` ADD `experienceLevel` text not null default 'intermediate';
ALTER TABLE `user_preferences` ADD `bodyweight` real;
ALTER TABLE `user_preferences` ADD `bodyweightSource` text;

-- Create key_lifts table for tracking exercises users want to monitor
CREATE TABLE `key_lifts` (
	`id` integer primary key autoincrement not null,
	`userId` text not null,
	`masterExerciseId` integer not null,
	`isTracking` integer not null default true,
	`maintenanceMode` integer not null default false,
	`createdAt` text not null default (datetime('now')),
	`updatedAt` text,
	FOREIGN KEY (`masterExerciseId`) REFERENCES `master_exercises`(`id`) ON DELETE cascade
);

-- Create plateaus table to track detected plateaus
CREATE TABLE `plateaus` (
	`id` integer primary key autoincrement not null,
	`userId` text not null,
	`masterExerciseId` integer not null,
	`keyLiftId` integer,
	`detectedAt` text not null default (datetime('now')),
	`resolvedAt` text,
	`stalledWeight` real not null,
	`stalledReps` integer not null,
	`sessionCount` integer not null default 3,
	`status` text not null default 'active',
	`metadata` text,
	`createdAt` text not null default (datetime('now')),
	FOREIGN KEY (`masterExerciseId`) REFERENCES `master_exercises`(`id`) ON DELETE cascade,
	FOREIGN KEY (`keyLiftId`) REFERENCES `key_lifts`(`id`) ON DELETE set null
);

-- Create milestones table for exercise-specific goals
CREATE TABLE `milestones` (
	`id` integer primary key autoincrement not null,
	`userId` text not null,
	`masterExerciseId` integer,
	`type` text not null,
	`targetValue` real not null,
	`targetMultiplier` real,
	`isSystemDefault` integer not null default false,
	`isCustomized` integer not null default false,
	`experienceLevel` text not null,
	`createdAt` text not null default (datetime('now')),
	FOREIGN KEY (`masterExerciseId`) REFERENCES `master_exercises`(`id`) ON DELETE cascade
);

-- Create milestone_achievements table to track completed milestones
CREATE TABLE `milestone_achievements` (
	`id` integer primary key autoincrement not null,
	`userId` text not null,
	`milestoneId` integer not null,
	`achievedAt` text not null default (datetime('now')),
	`achievedValue` real not null,
	`workoutId` integer,
	`metadata` text,
	FOREIGN KEY (`milestoneId`) REFERENCES `milestones`(`id`) ON DELETE cascade,
	FOREIGN KEY (`workoutId`) REFERENCES `workout_session`(`id`) ON DELETE set null
);

-- Create pr_forecasts table for PR predictions
CREATE TABLE `pr_forecasts` (
	`id` integer primary key autoincrement not null,
	`userId` text not null,
	`masterExerciseId` integer not null,
	`forecastedWeight` real not null,
	`estimatedWeeksLow` integer not null,
	`estimatedWeeksHigh` integer not null,
	`confidencePercent` integer not null,
	`whoopRecoveryFactor` real,
	`calculatedAt` text not null default (datetime('now')),
	`metadata` text,
	FOREIGN KEY (`masterExerciseId`) REFERENCES `master_exercises`(`id`) ON DELETE cascade
);

-- Create indexes for performance optimization
CREATE INDEX `key_lifts_user_master_idx` ON `key_lifts`(`userId`, `masterExerciseId`);
CREATE INDEX `key_lifts_user_tracking_idx` ON `key_lifts`(`userId`, `isTracking`);

CREATE INDEX `plateaus_user_status_detected_idx` ON `plateaus`(`userId`, `status`, `detectedAt`);
CREATE INDEX `plateaus_master_exercise_idx` ON `plateaus`(`masterExerciseId`);
CREATE INDEX `plateaus_key_lift_idx` ON `plateaus`(`keyLiftId`);

CREATE INDEX `milestones_user_master_idx` ON `milestones`(`userId`, `masterExerciseId`);
CREATE INDEX `milestones_user_type_level_idx` ON `milestones`(`userId`, `type`, `experienceLevel`);
CREATE INDEX `milestones_system_default_idx` ON `milestones`(`isSystemDefault`, `experienceLevel`);

CREATE INDEX `milestone_achievements_user_achieved_idx` ON `milestone_achievements`(`userId`, `achievedAt`);
CREATE INDEX `milestone_achievements_milestone_idx` ON `milestone_achievements`(`milestoneId`);
CREATE INDEX `milestone_achievements_workout_idx` ON `milestone_achievements`(`workoutId`);

CREATE INDEX `pr_forecasts_user_master_calculated_idx` ON `pr_forecasts`(`userId`, `masterExerciseId`, `calculatedAt`);
CREATE INDEX `pr_forecasts_master_exercise_idx` ON `pr_forecasts`(`masterExerciseId`);
CREATE INDEX `pr_forecasts_confidence_idx` ON `pr_forecasts`(`confidencePercent`);

-- Create unique constraints to prevent duplicates
CREATE UNIQUE INDEX `key_lifts_user_master_unique` ON `key_lifts`(`userId`, `masterExerciseId`);
CREATE UNIQUE INDEX `milestone_achievements_user_milestone_unique` ON `milestone_achievements`(`userId`, `milestoneId`);