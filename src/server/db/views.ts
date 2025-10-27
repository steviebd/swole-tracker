import { eq, sql } from "drizzle-orm";
import { integer, real, sqliteView, text } from "drizzle-orm/sqlite-core";
import {
  sessionExercises,
  workoutSessions,
  templateExercises,
  exerciseLinks,
  masterExercises,
  whoopRecovery,
  whoopSleep,
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

// Exercise name resolution view - pre-computes resolved exercise names
export const exerciseNameResolutionView = sqliteView(
  "view_exercise_name_resolution",
  {
    templateExerciseId: integer("templateExerciseId"),
    exerciseName: text("exerciseName"),
    resolvedName: text("resolvedName"),
    masterExerciseId: integer("masterExerciseId"),
  },
).as(sql`
  SELECT
    te.id AS templateExerciseId,
    te.exerciseName,
    COALESCE(me.name, te.exerciseName) AS resolvedName,
    el.masterExerciseId
  FROM template_exercise te
  LEFT JOIN exercise_link el ON el.templateExerciseId = te.id
  LEFT JOIN master_exercise me ON me.id = el.masterExerciseId
`);

// WHOOP metrics aggregation view - combines recovery and sleep data
export const whoopMetricsView = sqliteView("view_whoop_metrics", {
  userId: text("userId"),
  date: text("date"),
  recoveryScore: real("recoveryScore"),
  sleepPerformance: real("sleepPerformance"),
  hrvNow: real("hrvNow"),
  hrvBaseline: real("hrvBaseline"),
  rhrNow: real("rhrNow"),
  rhrBaseline: real("rhrBaseline"),
}).as(sql`
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
`);
