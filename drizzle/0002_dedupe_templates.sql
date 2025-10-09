ALTER TABLE `workout_template` ADD COLUMN `dedupeKey` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `template_user_dedupe_idx` ON `workout_template` (`user_id`, `dedupeKey`);
