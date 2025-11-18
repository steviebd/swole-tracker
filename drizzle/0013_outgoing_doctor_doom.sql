CREATE TABLE `playbook_regeneration` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`playbookId` integer NOT NULL,
	`triggeredBySessionId` integer,
	`regenerationReason` text NOT NULL,
	`affectedWeekStart` integer NOT NULL,
	`affectedWeekEnd` integer NOT NULL,
	`previousPlanSnapshot` text,
	`newPlanSnapshot` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`playbookId`) REFERENCES `playbook`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`triggeredBySessionId`) REFERENCES `playbook_session`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `playbook_regeneration_playbook_id_idx` ON `playbook_regeneration` (`playbookId`);--> statement-breakpoint
CREATE INDEX `playbook_regeneration_session_id_idx` ON `playbook_regeneration` (`triggeredBySessionId`);--> statement-breakpoint
CREATE INDEX `playbook_regeneration_created_at_idx` ON `playbook_regeneration` (`playbookId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `playbook_session` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`playbookWeekId` integer NOT NULL,
	`sessionNumber` integer NOT NULL,
	`sessionDate` text,
	`prescribedWorkoutJson` text NOT NULL,
	`actualWorkoutId` integer,
	`adherenceScore` real,
	`rpe` integer,
	`rpeNotes` text,
	`deviation` text,
	`isCompleted` integer DEFAULT false NOT NULL,
	`completedAt` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text,
	FOREIGN KEY (`playbookWeekId`) REFERENCES `playbook_week`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actualWorkoutId`) REFERENCES `workout_session`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `playbook_session_week_id_idx` ON `playbook_session` (`playbookWeekId`);--> statement-breakpoint
CREATE INDEX `playbook_session_date_idx` ON `playbook_session` (`sessionDate`);--> statement-breakpoint
CREATE INDEX `playbook_session_workout_id_idx` ON `playbook_session` (`actualWorkoutId`);--> statement-breakpoint
CREATE INDEX `playbook_session_week_number_idx` ON `playbook_session` (`playbookWeekId`,`sessionNumber`);--> statement-breakpoint
CREATE UNIQUE INDEX `playbook_session_unique` ON `playbook_session` (`playbookWeekId`,`sessionNumber`);--> statement-breakpoint
CREATE TABLE `playbook_week` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`playbookId` integer NOT NULL,
	`weekNumber` integer NOT NULL,
	`weekType` text DEFAULT 'training' NOT NULL,
	`aiPlanJson` text,
	`algorithmicPlanJson` text,
	`volumeTarget` real,
	`status` text DEFAULT 'pending' NOT NULL,
	`metadata` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text,
	FOREIGN KEY (`playbookId`) REFERENCES `playbook`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `playbook_week_playbook_id_idx` ON `playbook_week` (`playbookId`);--> statement-breakpoint
CREATE INDEX `playbook_week_number_idx` ON `playbook_week` (`playbookId`,`weekNumber`);--> statement-breakpoint
CREATE INDEX `playbook_week_status_idx` ON `playbook_week` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `playbook_week_unique` ON `playbook_week` (`playbookId`,`weekNumber`);--> statement-breakpoint
CREATE TABLE `playbook` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`goalText` text,
	`goalPreset` text,
	`targetType` text NOT NULL,
	`targetIds` text NOT NULL,
	`duration` integer DEFAULT 6 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`metadata` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text,
	`startedAt` text,
	`completedAt` text
);
--> statement-breakpoint
CREATE INDEX `playbook_user_id_idx` ON `playbook` (`userId`);--> statement-breakpoint
CREATE INDEX `playbook_status_idx` ON `playbook` (`status`);--> statement-breakpoint
CREATE INDEX `playbook_user_status_idx` ON `playbook` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `playbook_created_at_idx` ON `playbook` (`createdAt`);--> statement-breakpoint
CREATE INDEX `session_exercise_user_session_name_idx` ON `session_exercise` (`user_id`,`sessionId`,`exerciseName`);