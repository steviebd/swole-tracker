import { eq, sql } from "drizzle-orm";
import { integer, real, sqliteView, text } from "drizzle-orm/sqlite-core";
import {
  sessionExercises,
  workoutSessions,
} from "~/server/db/schema";

export const sessionExerciseMetricsView = sqliteView(
  "view_session_exercise_metrics",
  {
    sessionExerciseId: integer("sessionExerciseId"),
    sessionId: integer("sessionId"),
    userId: text("userId"),
    templateExerciseId: integer("templateExerciseId"),
    exerciseName: text("exerciseName"),
    resolvedExerciseName: text("resolvedExerciseName"),
    workoutDate: text("workoutDate"),
    weight: real("weight"),
    reps: integer("reps"),
    sets: integer("sets"),
    unit: text("unit"),
    oneRmEstimate: real("oneRmEstimate"),
    volumeLoad: real("volumeLoad"),
  },
).as(sql`
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
`);
