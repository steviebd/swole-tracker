/**
 * Playbook Context Aggregation Helper
 *
 * Gathers all necessary data for playbook generation including:
 * - Recent session history (minimum 4 sessions for target templates/exercises)
 * - Current estimated 1RMs
 * - Volume trends
 * - User preferences
 * - Equipment constraints
 *
 * Handles missing data gracefully for new users.
 */

import { desc, eq, inArray, sql, and, gte } from "drizzle-orm";
import { type DrizzleDb } from "~/server/db";
import {
  workoutSessions,
  sessionExercises,
  workoutTemplates,
  templateExercises,
  userPreferences,
  masterExercises,
  exerciseLinks,
} from "~/server/db/schema";
import { whereInChunks } from "~/server/db/chunk-utils";
import { calculateOneRM } from "./exercise-calculations";
import type {
  PlaybookGenerationContext,
  SessionHistoryForPlaybook,
  ExerciseHistoryForPlaybook,
  VolumeProgressionData,
} from "../types/playbook";
import type { PlaybookCreateInput } from "../schemas/playbook";

/**
 * Build complete context for playbook generation
 */
export async function buildPlaybookContext(
  db: DrizzleDb,
  userId: string,
  input: PlaybookCreateInput,
): Promise<PlaybookGenerationContext> {
  const { targetType, targetIds, goalText, goalPreset, duration, metadata } =
    input;

  // Fetch user preferences
  const [userPrefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.user_id, userId))
    .limit(1);

  const preferences = {
    defaultWeightUnit: userPrefs?.defaultWeightUnit ?? "kg",
    progressionType: userPrefs?.progression_type ?? "adaptive",
    trainingDaysPerWeek:
      metadata?.trainingDaysPerWeek ?? userPrefs?.targetWorkoutsPerWeek ?? 3,
  };

  // Fetch recent sessions based on target type
  let recentSessions: SessionHistoryForPlaybook[] = [];

  if (targetType === "template") {
    recentSessions = await fetchRecentSessionsByTemplate(db, userId, targetIds);
  } else {
    recentSessions = await fetchRecentSessionsByExercise(db, userId, targetIds);
  }

  // Calculate current 1RM estimates from recent sessions
  const currentOneRmEstimates = calculateCurrentOneRMs(recentSessions);

  // Merge with user-provided 1RM inputs
  if (metadata?.oneRmInputs) {
    Object.assign(currentOneRmEstimates, metadata.oneRmInputs);
  }

  // Calculate volume trends
  const volumeTrends = calculateVolumeTrends(recentSessions);

  // Fetch warm-up patterns for exercises with 1RM data
  const exerciseNames = Object.keys(currentOneRmEstimates);

  // Build context
  const context: PlaybookGenerationContext = {
    userId,
    targetType,
    targetIds,
    ...(goalText && { goalText }),
    ...(goalPreset && { goalPreset }),
    duration,
    recentSessions,
    currentOneRmEstimates,
    preferences,
    volumeTrends,
    ...(metadata?.availableEquipment && {
      availableEquipment: metadata.availableEquipment,
    }),
  };

  return context;
}

/**
 * Fetch recent sessions filtered by template IDs
 */
async function fetchRecentSessionsByTemplate(
  db: DrizzleDb,
  userId: string,
  templateIds: number[],
): Promise<SessionHistoryForPlaybook[]> {
  const sessions: SessionHistoryForPlaybook[] = [];

  // Handle empty templateIds
  if (templateIds.length === 0) {
    return sessions;
  }

  // Use whereInChunks to handle large templateId arrays safely
  const sessionRows = await whereInChunks(templateIds, async (idChunk) => {
    const rows = await db
      .select({
        sessionId: workoutSessions.id,
        workoutDate: workoutSessions.workoutDate,
        templateId: workoutSessions.templateId,
        templateName: workoutTemplates.name,
      })
      .from(workoutSessions)
      .leftJoin(
        workoutTemplates,
        eq(workoutTemplates.id, workoutSessions.templateId),
      )
      .where(
        and(
          eq(workoutSessions.user_id, userId),
          inArray(workoutSessions.templateId, idChunk),
        ),
      )
      .orderBy(desc(workoutSessions.workoutDate))
      .limit(20); // Get 20 most recent sessions

    return rows;
  });

  // Fetch exercises for these sessions
  for (const session of sessionRows) {
    const exercises = await db
      .select({
        exerciseName: sessionExercises.exerciseName,
        resolvedExerciseName: sessionExercises.resolvedExerciseName,
        weight: sessionExercises.weight,
        reps: sessionExercises.reps,
        sets: sessionExercises.sets,
        unit: sessionExercises.unit,
        volumeLoad: sessionExercises.volume_load,
        oneRmEstimate: sessionExercises.one_rm_estimate,
      })
      .from(sessionExercises)
      .where(eq(sessionExercises.sessionId, session.sessionId));

    const totalVolume = exercises.reduce(
      (sum, ex) => sum + (ex.volumeLoad ?? 0),
      0,
    );

    sessions.push({
      sessionId: session.sessionId,
      workoutDate: session.workoutDate,
      templateId: session.templateId,
      templateName: session.templateName,
      exercises: exercises as ExerciseHistoryForPlaybook[],
      totalVolume,
    });
  }

  return sessions;
}

/**
 * Fetch recent sessions filtered by exercise IDs (master exercises)
 */
async function fetchRecentSessionsByExercise(
  db: DrizzleDb,
  userId: string,
  exerciseIds: number[],
): Promise<SessionHistoryForPlaybook[]> {
  // Handle empty exerciseIds
  if (exerciseIds.length === 0) {
    return [];
  }

  // First, resolve master exercise IDs to exercise names
  const masterExerciseRows = await whereInChunks(
    exerciseIds,
    async (idChunk) => {
      const rows = await db
        .select({
          id: masterExercises.id,
          name: masterExercises.name,
        })
        .from(masterExercises)
        .where(
          and(
            eq(masterExercises.user_id, userId),
            inArray(masterExercises.id, idChunk),
          ),
        );

      return rows;
    },
  );

  const exerciseNames = masterExerciseRows.map((ex) => ex.name);

  if (exerciseNames.length === 0) {
    return [];
  }

  // Fetch sessions containing these exercises using whereInChunks
  const sessionExerciseRows = await whereInChunks(
    exerciseNames,
    async (nameChunk) => {
      const rows = await db
        .select({
          sessionId: sessionExercises.sessionId,
          exerciseName: sessionExercises.exerciseName,
          resolvedExerciseName: sessionExercises.resolvedExerciseName,
          weight: sessionExercises.weight,
          reps: sessionExercises.reps,
          sets: sessionExercises.sets,
          unit: sessionExercises.unit,
          volumeLoad: sessionExercises.volume_load,
          oneRmEstimate: sessionExercises.one_rm_estimate,
        })
        .from(sessionExercises)
        .where(
          and(
            eq(sessionExercises.user_id, userId),
            inArray(sessionExercises.resolvedExerciseName, nameChunk),
          ),
        )
        .orderBy(desc(sessionExercises.sessionId))
        .limit(100); // Get more to ensure we have enough data

      return rows;
    },
  );

  // Group exercises by session
  const sessionMap = new Map<number, ExerciseHistoryForPlaybook[]>();
  for (const ex of sessionExerciseRows) {
    if (!sessionMap.has(ex.sessionId)) {
      sessionMap.set(ex.sessionId, []);
    }
    sessionMap.get(ex.sessionId)!.push({
      exerciseName: ex.exerciseName,
      resolvedExerciseName: ex.resolvedExerciseName,
      weight: ex.weight,
      reps: ex.reps,
      sets: ex.sets,
      unit: ex.unit,
      volumeLoad: ex.volumeLoad,
      oneRmEstimate: ex.oneRmEstimate,
    });
  }

  // Fetch session details
  const sessionIds = Array.from(sessionMap.keys()).slice(0, 20); // Limit to 20 sessions

  if (sessionIds.length === 0) {
    return [];
  }

  const sessionRows = await whereInChunks(sessionIds, async (idChunk) => {
    const rows = await db
      .select({
        sessionId: workoutSessions.id,
        workoutDate: workoutSessions.workoutDate,
        templateId: workoutSessions.templateId,
        templateName: workoutTemplates.name,
      })
      .from(workoutSessions)
      .leftJoin(
        workoutTemplates,
        eq(workoutTemplates.id, workoutSessions.templateId),
      )
      .where(
        and(
          eq(workoutSessions.user_id, userId),
          inArray(workoutSessions.id, idChunk),
        ),
      )
      .orderBy(desc(workoutSessions.workoutDate));

    return rows;
  });

  const sessions: SessionHistoryForPlaybook[] = sessionRows.map((session) => {
    const exercises = sessionMap.get(session.sessionId) ?? [];
    const totalVolume = exercises.reduce(
      (sum, ex) => sum + (ex.volumeLoad ?? 0),
      0,
    );

    return {
      sessionId: session.sessionId,
      workoutDate: session.workoutDate,
      templateId: session.templateId,
      templateName: session.templateName,
      exercises,
      totalVolume,
    };
  });

  return sessions;
}

/**
 * Calculate current 1RM estimates from recent session history
 * Uses the highest 1RM estimate for each exercise
 */
function calculateCurrentOneRMs(
  sessions: SessionHistoryForPlaybook[],
): Record<string, number> {
  const oneRmMap = new Map<string, number>();

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const exerciseName =
        exercise.resolvedExerciseName || exercise.exerciseName;

      // Use stored 1RM estimate if available
      if (exercise.oneRmEstimate) {
        const current = oneRmMap.get(exerciseName) ?? 0;
        oneRmMap.set(exerciseName, Math.max(current, exercise.oneRmEstimate));
      } else if (exercise.weight && exercise.reps) {
        // Calculate 1RM from weight and reps
        const estimated = calculateOneRM(exercise.weight, exercise.reps);
        const current = oneRmMap.get(exerciseName) ?? 0;
        oneRmMap.set(exerciseName, Math.max(current, estimated));
      }
    }
  }

  return Object.fromEntries(oneRmMap);
}

/**
 * Calculate volume progression trends from session history
 * Groups by week and calculates trends
 */
function calculateVolumeTrends(
  sessions: SessionHistoryForPlaybook[],
): VolumeProgressionData[] {
  // Group exercises by name and week
  const exerciseWeeklyData = new Map<
    string,
    Map<
      string,
      { totalVolume: number; sessionCount: number; intensitySum: number }
    >
  >();

  for (const session of sessions) {
    const weekStart = getWeekStart(session.workoutDate);
    const weekKey = weekStart.toISOString().split("T")[0]!; // ISO date always has 'T' separator

    for (const exercise of session.exercises) {
      const exerciseName =
        exercise.resolvedExerciseName || exercise.exerciseName;

      if (!exerciseWeeklyData.has(exerciseName)) {
        exerciseWeeklyData.set(exerciseName, new Map());
      }

      const weeklyMap = exerciseWeeklyData.get(exerciseName)!;
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          totalVolume: 0,
          sessionCount: 0,
          intensitySum: 0,
        });
      }

      const weekData = weeklyMap.get(weekKey)!;
      weekData.totalVolume += exercise.volumeLoad ?? 0;
      weekData.sessionCount += 1;

      // Calculate intensity as percentage of estimated 1RM
      if (
        exercise.weight &&
        exercise.oneRmEstimate &&
        exercise.oneRmEstimate > 0
      ) {
        weekData.intensitySum += exercise.weight / exercise.oneRmEstimate;
      }
    }
  }

  // Calculate trends for each exercise
  const trends: VolumeProgressionData[] = [];

  for (const [exerciseName, weeklyMap] of exerciseWeeklyData) {
    const weeklyData = Array.from(weeklyMap.entries())
      .map(([weekKey, data]) => ({
        weekStart: new Date(weekKey),
        totalVolume: data.totalVolume,
        sessionCount: data.sessionCount,
        averageIntensity: data.intensitySum / data.sessionCount,
      }))
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

    // Calculate trend slope (simple linear regression)
    const trendSlope = calculateTrendSlope(
      weeklyData.map((w, idx) => [idx, w.totalVolume]),
    );

    trends.push({
      exerciseName,
      weeklyData,
      trendSlope,
    });
  }

  return trends;
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  return new Date(d.setDate(diff));
}

/**
 * Calculate trend slope using simple linear regression
 */
function calculateTrendSlope(dataPoints: Array<[number, number]>): number {
  if (dataPoints.length < 2) return 0;

  const n = dataPoints.length;
  const sumX = dataPoints.reduce((sum, [x]) => sum + x, 0);
  const sumY = dataPoints.reduce((sum, [, y]) => sum + y, 0);
  const sumXY = dataPoints.reduce((sum, [x, y]) => sum + x * y, 0);
  const sumXX = dataPoints.reduce((sum, [x]) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return isFinite(slope) ? slope : 0;
}

/**
 * Get default 1RM estimates for new users (based on Starting Strength benchmarks)
 */
export function getDefaultOneRMs(): Record<string, number> {
  return {
    Squat: 70,
    "Bench Press": 50,
    Deadlift: 80,
    "Overhead Press": 35,
    "Barbell Row": 45,
  };
}
