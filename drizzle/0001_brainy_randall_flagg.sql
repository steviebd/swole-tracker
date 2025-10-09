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
CREATE UNIQUE INDEX `exercise_link_templateExerciseId_unique` ON `exercise_link` (`templateExerciseId`);