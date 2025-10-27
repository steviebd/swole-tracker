-- Create view for session exercise metrics to optimize progress queries
CREATE VIEW view_session_exercise_metrics AS
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
INNER JOIN workout_session ws ON ws.id = se.sessionId;