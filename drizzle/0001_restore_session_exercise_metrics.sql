-- Rebuild session_exercise so progression metrics are stored columns

-- Drop existing indexes to avoid referencing columns while we rebuild
DROP INDEX IF EXISTS `session_exercise_user_one_rm_idx`;
DROP INDEX IF EXISTS `session_exercise_user_volume_idx`;
DROP INDEX IF EXISTS `session_exercise_user_exercise_one_rm_idx`;
DROP INDEX IF EXISTS `session_exercise_user_exercise_volume_idx`;
DROP INDEX IF EXISTS `session_exercise_user_exercise_idx`;
DROP INDEX IF EXISTS `session_exercise_user_exercise_date_idx`;
DROP INDEX IF EXISTS `session_exercise_user_template_idx`;
DROP INDEX IF EXISTS `session_exercise_user_weight_idx`;
DROP INDEX IF EXISTS `session_exercise_user_exercise_weight_idx`;
DROP INDEX IF EXISTS `session_exercise_user_id_idx`;
DROP INDEX IF EXISTS `session_exercise_session_id_idx`;
DROP INDEX IF EXISTS `session_exercise_template_exercise_id_idx`;
DROP INDEX IF EXISTS `session_exercise_name_idx`;

CREATE TABLE `session_exercise__new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`sessionId` integer NOT NULL,
	`templateExerciseId` integer,
	`exerciseName` text NOT NULL,
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

INSERT INTO `session_exercise__new` (
	`id`,
	`user_id`,
	`sessionId`,
	`templateExerciseId`,
	`exerciseName`,
	`setOrder`,
	`weight`,
	`reps`,
	`sets`,
	`unit`,
	`rpe`,
	`rest_seconds`,
	`is_estimate`,
	`is_default_applied`,
	`one_rm_estimate`,
	`volume_load`,
	`createdAt`
)
SELECT
	`id`,
	`user_id`,
	`sessionId`,
	`templateExerciseId`,
	`exerciseName`,
	`setOrder`,
	`weight`,
	`reps`,
	`sets`,
	`unit`,
	`rpe`,
	`rest_seconds`,
	`is_estimate`,
	`is_default_applied`,
	CASE
		WHEN `weight` IS NOT NULL AND `reps` IS NOT NULL AND `weight` > 0 AND `reps` > 0
			THEN `weight` * (1 + `reps` / 30.0)
		ELSE NULL
	END AS `one_rm_estimate`,
	CASE
		WHEN `weight` IS NOT NULL AND `reps` IS NOT NULL AND `sets` IS NOT NULL
			AND `weight` > 0 AND `reps` > 0 AND `sets` > 0
			THEN `sets` * `reps` * `weight`
		ELSE NULL
	END AS `volume_load`,
	`createdAt`
FROM `session_exercise`;

DROP TABLE `session_exercise`;
ALTER TABLE `session_exercise__new` RENAME TO `session_exercise`;

CREATE INDEX `session_exercise_user_id_idx` ON `session_exercise` (`user_id`);
CREATE INDEX `session_exercise_session_id_idx` ON `session_exercise` (`sessionId`);
CREATE INDEX `session_exercise_template_exercise_id_idx` ON `session_exercise` (`templateExerciseId`);
CREATE INDEX `session_exercise_name_idx` ON `session_exercise` (`exerciseName`);
CREATE INDEX `session_exercise_user_exercise_idx` ON `session_exercise` (`user_id`,`exerciseName`);
CREATE INDEX `session_exercise_user_exercise_date_idx` ON `session_exercise` (`user_id`,`exerciseName`,`sessionId`);
CREATE INDEX `session_exercise_user_template_idx` ON `session_exercise` (`user_id`,`templateExerciseId`);
CREATE INDEX `session_exercise_user_weight_idx` ON `session_exercise` (`user_id`,`weight`);
CREATE INDEX `session_exercise_user_exercise_weight_idx` ON `session_exercise` (`user_id`,`exerciseName`,`weight`);
CREATE INDEX `session_exercise_user_one_rm_idx` ON `session_exercise` (`user_id`,`one_rm_estimate`);
CREATE INDEX `session_exercise_user_volume_idx` ON `session_exercise` (`user_id`,`volume_load`);
CREATE INDEX `session_exercise_user_exercise_one_rm_idx` ON `session_exercise` (`user_id`,`exerciseName`,`one_rm_estimate`);
CREATE INDEX `session_exercise_user_exercise_volume_idx` ON `session_exercise` (`user_id`,`exerciseName`,`volume_load`);
