ALTER TABLE `swole-tracker_workout_template` ADD `clientId` text;--> statement-breakpoint
CREATE INDEX `template_user_client_id_idx` ON `swole-tracker_workout_template` (`user_id`,`clientId`);