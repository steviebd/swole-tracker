CREATE INDEX `session_exercise_user_date_exercise_idx` ON `session_exercise` (`user_id`,date("workoutDate"),`exerciseName`);--> statement-breakpoint
CREATE INDEX `session_exercise_user_resolved_exercise_idx` ON `session_exercise` (`user_id`,`resolvedExerciseName`);--> statement-breakpoint
CREATE INDEX `session_exercise_user_template_exercise_idx` ON `session_exercise` (`user_id`,`templateExerciseId`);--> statement-breakpoint
CREATE VIEW `view_exercise_name_resolution` AS 
  SELECT
    te.id AS templateExerciseId,
    te.exerciseName,
    COALESCE(me.name, te.exerciseName) AS resolvedName,
    el.masterExerciseId
  FROM template_exercise te
  LEFT JOIN exercise_link el ON el.templateExerciseId = te.id
  LEFT JOIN master_exercise me ON me.id = el.masterExerciseId
;--> statement-breakpoint
CREATE VIEW `view_session_exercise_metrics` AS 
  SELECT
    se.id AS sessionExerciseId,
    se.sessionId AS sessionId,
    se.user_id AS userId,
    se.templateExerciseId AS templateExerciseId,
    se.exerciseName AS exerciseName,
    COALESCE(NULLIF(se.resolvedExerciseName, ''), se.exerciseName) AS resolvedExerciseName,
    ws.workoutDate AS workoutDate,
    se.weight AS weight,
    se.reps AS reps,
    se.sets AS sets,
    se.unit AS unit,
    se.one_rm_estimate AS oneRmEstimate,
    se.volume_load AS volumeLoad
  FROM session_exercise se
  INNER JOIN workout_session ws ON ws.id = se.sessionId
;--> statement-breakpoint
CREATE VIEW `view_whoop_metrics` AS 
  SELECT
    wr.user_id AS userId,
    wr.date,
    wr.recovery_score AS recoveryScore,
    ws.sleep_performance_percentage AS sleepPerformance,
    wr.hrv_rmssd_milli AS hrvNow,
    wr.hrv_rmssd_baseline AS hrvBaseline,
    wr.resting_heart_rate AS rhrNow,
    wr.resting_heart_rate_baseline AS rhrBaseline
  FROM whoop_recovery wr
  LEFT JOIN whoop_sleep ws ON ws.user_id = wr.user_id
    AND date(ws.start) = wr.date
;