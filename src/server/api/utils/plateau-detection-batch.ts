import { eq, and, desc, inArray, sql } from "drizzle-orm";
import type { db } from "~/server/db";
import {
  sessionExercises,
  workoutSessions,
  keyLifts,
} from "~/server/db/schema";
import type { PlateauDetectionResponse } from "~/server/api/types/plateau-milestone";

/**
 * Detect plateaus for multiple exercises in batch (optimized version)
 *
 * This function fetches all necessary data in 2 queries regardless of exercise count:
 * 1. All key lifts for user and exercises
 * 2. All recent sessions for those exercises
 *
 * @param database - Database instance
 * @param userId - User ID
 * @param masterExerciseIds - Array of master exercise IDs
 * @returns Map of masterExerciseId -> PlateauDetectionResponse
 */
export async function detectPlateausBatch(
  database: typeof db,
  userId: string,
  masterExerciseIds: number[],
): Promise<Map<number, PlateauDetectionResponse>> {
  console.log(
    `🔍 [Plateau Detection] Starting batch detection for user ${userId}, ${masterExerciseIds.length} exercises`,
  );

  if (masterExerciseIds.length === 0) {
    return new Map();
  }

  // 1. Batch fetch all key lifts for these exercises
  const keyLiftRecords = await database
    .select()
    .from(keyLifts)
    .where(
      and(
        eq(keyLifts.userId, userId),
        inArray(keyLifts.masterExerciseId, masterExerciseIds),
        eq(keyLifts.isTracking, true),
        eq(keyLifts.maintenanceMode, false),
      ),
    );

  // Create map of masterExerciseId -> keyLift for quick lookup
  const keyLiftsByExercise = new Map(
    keyLiftRecords.map((kl) => [kl.masterExerciseId, kl]),
  );

  // 2. Batch fetch all recent sessions for these exercises (last 5 sessions per exercise)
  const recentSessions = await database
    .select({
      masterExerciseId: sql<number>`el.master_exercise_id`.as(
        "masterExerciseId",
      ),
      weight: sessionExercises.weight,
      reps: sessionExercises.reps,
      workoutDate: workoutSessions.workoutDate,
      oneRMEstimate: sessionExercises.one_rm_estimate,
      exerciseName: sessionExercises.exerciseName,
    })
    .from(sessionExercises)
    .innerJoin(
      workoutSessions,
      eq(workoutSessions.id, sessionExercises.sessionId),
    )
    .innerJoin(
      sql`exercise_links el ON el.template_exercise_id = ${sessionExercises.templateExerciseId} AND el.user_id = ${userId}`,
      sql`true`,
    )
    .where(
      and(
        eq(sessionExercises.user_id, userId),
        inArray(sql`el.master_exercise_id`, masterExerciseIds),
      ),
    )
    .orderBy(desc(workoutSessions.workoutDate));

  // Group sessions by masterExerciseId
  const sessionsByExercise = recentSessions.reduce((acc, session) => {
    const exerciseId = session.masterExerciseId;
    if (!acc.has(exerciseId)) {
      acc.set(exerciseId, []);
    }
    acc.get(exerciseId)!.push(session);
    return acc;
  }, new Map<number, typeof recentSessions>());

  // 3. Process each exercise in memory
  const results = new Map<number, PlateauDetectionResponse>();

  for (const masterExerciseId of masterExerciseIds) {
    const keyLift = keyLiftsByExercise.get(masterExerciseId);
    const sessions = sessionsByExercise.get(masterExerciseId) || [];

    if (!keyLift) {
      console.log(
        `❌ [Plateau Detection] No key lift found for master exercise ${masterExerciseId}`,
      );
      results.set(masterExerciseId, {
        plateauDetected: false,
        recommendations: [],
      });
      continue;
    }

    if (sessions.length < 3) {
      console.log(
        `❌ [Plateau Detection] Only ${sessions.length} sessions found for master exercise ${masterExerciseId} (need 3+)`,
      );
      results.set(masterExerciseId, {
        plateauDetected: false,
        recommendations: [],
      });
      continue;
    }

    // Take only last 3 sessions for plateau detection
    const lastThreeSessions = sessions.slice(0, 3);

    // Check for plateau: no progression in weight AND reps across 3 sessions
    const weights = lastThreeSessions.map((s) => Number(s.weight) || 0);
    const reps = lastThreeSessions.map((s) => Number(s.reps) || 0);

    const allWeightsSame = weights.every(
      (w, i, arr) => i === 0 || w === arr[0],
    );
    const allRepsSame = reps.every((r, i, arr) => i === 0 || r === arr[0]);

    const isPlateaued = allWeightsSame && allRepsSame;

    // Calculate confidence level based on total session count
    const confidenceLevel: "low" | "medium" | "high" =
      sessions.length >= 5 ? "high" : sessions.length >= 3 ? "medium" : "low";

    console.log(
      `📊 [Plateau Detection] Exercise ${masterExerciseId} - Weights: [${weights.join(", ")}], Reps: [${reps.join(", ")}]`,
    );
    console.log(
      `📊 [Plateau Detection] Exercise ${masterExerciseId} - All weights same: ${allWeightsSame}, All reps same: ${allRepsSame}`,
    );
    console.log(
      `🎯 [Plateau Detection] Exercise ${masterExerciseId} - Plateau detected: ${isPlateaued}`,
    );

    if (isPlateaued) {
      // Get exercise name from first session
      const exerciseName =
        lastThreeSessions[0]?.exerciseName || "Unknown Exercise";

      // Calculate duration in weeks (approximate)
      const oldestSession = lastThreeSessions[lastThreeSessions.length - 1];
      const newestSession = lastThreeSessions[0];
      const durationWeeks =
        oldestSession && newestSession
          ? Math.max(
              1,
              Math.round(
                (newestSession.workoutDate.getTime() -
                  oldestSession.workoutDate.getTime()) /
                  (7 * 24 * 60 * 60 * 1000),
              ),
            )
          : 1;

      const plateau: PlateauDetectionResponse["plateau"] = {
        id: 0, // Will be set when stored
        exerciseName,
        masterExerciseId,
        sessionCount: sessions.length,
        stalledWeight: weights[0] || 0,
        stalledReps: reps[0] || 0,
        durationWeeks,
        severity: confidenceLevel,
        status: "active" as const,
        detectedAt: new Date(),
        recommendations: [], // Will be filled by recommendation generation
      };

      results.set(masterExerciseId, {
        plateauDetected: true,
        plateau,
        recommendations: [],
      });
    } else {
      results.set(masterExerciseId, {
        plateauDetected: false,
        recommendations: [],
      });
    }
  }

  return results;
}
