CREATE TABLE `exercise_set` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionExerciseId` integer NOT NULL,
	`userId` text NOT NULL,
	`setNumber` integer NOT NULL,
	`setType` text DEFAULT 'working' NOT NULL,
	`weight` real,
	`reps` integer NOT NULL,
	`rpe` integer,
	`restSeconds` integer,
	`completed` integer DEFAULT false NOT NULL,
	`notes` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`completedAt` text,
	FOREIGN KEY (`sessionExerciseId`) REFERENCES `session_exercise`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exercise_set_session_exercise_idx` ON `exercise_set` (`sessionExerciseId`);--> statement-breakpoint
CREATE INDEX `exercise_set_user_idx` ON `exercise_set` (`userId`);--> statement-breakpoint
CREATE INDEX `exercise_set_number_idx` ON `exercise_set` (`sessionExerciseId`,`setNumber`);--> statement-breakpoint
CREATE INDEX `exercise_set_user_created_idx` ON `exercise_set` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `exercise_set_type_idx` ON `exercise_set` (`setType`);--> statement-breakpoint
ALTER TABLE `session_exercise` ADD `usesSetTable` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `session_exercise` ADD `totalSets` integer;--> statement-breakpoint
ALTER TABLE `session_exercise` ADD `workingSets` integer;--> statement-breakpoint
ALTER TABLE `session_exercise` ADD `warmupSets` integer;--> statement-breakpoint
ALTER TABLE `session_exercise` ADD `topSetWeight` real;--> statement-breakpoint
ALTER TABLE `session_exercise` ADD `totalVolume` real;--> statement-breakpoint
ALTER TABLE `session_exercise` ADD `workingVolume` real;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `warmupStrategy` text DEFAULT 'history' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `warmupSetsCount` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `warmupPercentages` text DEFAULT '[40, 60, 80]' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `warmupRepsStrategy` text DEFAULT 'match_working' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `warmupFixedReps` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `enableMovementPatternSharing` integer DEFAULT false NOT NULL;