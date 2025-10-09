DELETE FROM `health_advice`
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM `health_advice`
  GROUP BY `user_id`, `sessionId`
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `health_advice_user_session_unique`
ON `health_advice` (`user_id`,`sessionId`);
--> statement-breakpoint
DELETE FROM `wellness_data`
WHERE `sessionId` IS NOT NULL
  AND rowid NOT IN (
    SELECT MIN(rowid)
    FROM `wellness_data`
    WHERE `sessionId` IS NOT NULL
    GROUP BY `user_id`, `sessionId`
  );
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `wellness_data_user_session_unique`
ON `wellness_data` (`user_id`,`sessionId`);
