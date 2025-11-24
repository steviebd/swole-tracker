-- Recovery-Guided Session Planner Schema
-- Add recovery planner preferences to user_preferences table
ALTER TABLE `user_preferences` ADD `enableRecoveryPlanner` integer not null default false;
ALTER TABLE `user_preferences` ADD `recoveryPlannerStrategy` text not null default 'adaptive';
ALTER TABLE `user_preferences` ADD `recoveryPlannerSensitivity` integer not null default 5;
ALTER TABLE `user_preferences` ADD `autoAdjustIntensity` integer not null default true;
ALTER TABLE `user_preferences` ADD `recoveryPlannerPreferences` text;

-- Create recovery_session_planner table
CREATE TABLE `recovery_session_planner` (
	`id` integer primary key autoincrement not null,
	`user_id` text not null,
	`sessionId` integer not null,
	`templateId` integer,
	`recoveryScore` integer,
	`sleepPerformance` integer,
	`hrvStatus` text,
	`rhrStatus` text,
	`readinessScore` real,
	`recommendation` text not null,
	`intensityAdjustment` real,
	`volumeAdjustment` real,
	`suggestedModifications` text,
	`reasoning` text,
	`userAction` text,
	`appliedAdjustments` text,
	`userFeedback` text,
	`plannedWorkoutJson` text,
	`adjustedWorkoutJson` text,
	`metadata` text,
	`createdAt` text not null default (datetime('now')),
	`updatedAt` text,
	FOREIGN KEY (`sessionId`) REFERENCES `workout_session`(`id`) ON DELETE cascade,
	FOREIGN KEY (`templateId`) REFERENCES `workout_template`(`id`) ON DELETE set null
);

-- Create indexes for recovery_session_planner table
CREATE INDEX `recovery_session_planner_user_id_idx` ON `recovery_session_planner`(`user_id`);
CREATE INDEX `recovery_session_planner_session_id_idx` ON `recovery_session_planner`(`sessionId`);
CREATE INDEX `recovery_session_planner_template_id_idx` ON `recovery_session_planner`(`templateId`);
CREATE INDEX `recovery_session_planner_recommendation_idx` ON `recovery_session_planner`(`recommendation`);
CREATE INDEX `recovery_session_planner_user_created_idx` ON `recovery_session_planner`(`user_id`, `createdAt`);
CREATE UNIQUE INDEX `recovery_session_planner_user_session_unique` ON `recovery_session_planner`(`user_id`, `sessionId`);