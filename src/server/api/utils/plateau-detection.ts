import { eq, and, desc, sql } from "drizzle-orm";
import type { db } from "~/server/db";
import {
  sessionExercises,
  workoutSessions,
  keyLifts,
  plateaus,
  masterExercises,
  templateExercises,
  exerciseLinks,
} from "~/server/db/schema";
import type {
  PlateauDetectionResponse,
  PlateauDetectionContext,
} from "~/server/api/types/plateau-milestone";
import type { ExperienceLevel } from "~/server/api/schemas/plateau-milestone";

// Internal type for detection result
interface PlateauDetectionResult {
  isPlateaued: boolean;
  sessionCount: number;
  stalledWeight: number;
  stalledReps: number;
  confidenceLevel: "low" | "medium" | "high";
  detectedAt: Date;
}

/**
 * Detect plateaus for a specific exercise and user
 *
 * A plateau is detected when:
 * 1. User has at least 3 sessions for the exercise
 * 2. Weight AND reps have not progressed in the last 3 sessions
 * 3. Exercise is not in maintenance mode
 *
 * @param userId - User ID
 * @param masterExerciseId - Master exercise ID
 * @returns Plateau detection result
 */
export async function detectPlateau(
  database: typeof db,
  userId: string,
  masterExerciseId: number,
): Promise<PlateauDetectionResponse> {
  console.log(
    `🔍 [Plateau Detection] Starting detection for user ${userId}, master exercise ${masterExerciseId}`,
  );

  // Check if exercise is being tracked and not in maintenance mode
  const keyLift = await database
    .select()
    .from(keyLifts)
    .where(
      and(
        eq(keyLifts.userId, userId),
        eq(keyLifts.masterExerciseId, masterExerciseId),
        eq(keyLifts.isTracking, true),
        eq(keyLifts.maintenanceMode, false),
      ),
    )
    .limit(1);

  if (keyLift.length === 0) {
    console.log(
      `❌ [Plateau Detection] No key lift found for master exercise ${masterExerciseId}`,
    );
    return {
      plateauDetected: false,
      recommendations: [],
    };
  }

  // Get last 3 sessions for this exercise
  // Use templateExerciseId to join to exerciseLinks and filter by masterExerciseId
  const recentSessions = await database
    .select({
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
      exerciseLinks,
      eq(exerciseLinks.templateExerciseId, sessionExercises.templateExerciseId),
    )
    .where(
      and(
        eq(sessionExercises.user_id, userId),
        eq(exerciseLinks.masterExerciseId, masterExerciseId),
      ),
    )
    .orderBy(desc(workoutSessions.workoutDate))
    .limit(3);

  if (recentSessions.length < 3) {
    console.log(
      `❌ [Plateau Detection] Only ${recentSessions.length} sessions found (need 3+)`,
    );
    return {
      plateauDetected: false,
      recommendations: [],
    };
  }

  // Check for plateau: no progression in weight AND reps across 3 sessions
  const weights = recentSessions.map((s) => Number(s.weight) || 0);
  const reps = recentSessions.map((s) => Number(s.reps) || 0);

  // For plateau detection, we want to see if all weights and reps are the same
  // Sessions are ordered by most recent first, so we check if they're all equal
  const allWeightsSame = weights.every((w, i, arr) => i === 0 || w === arr[0]);
  const allRepsSame = reps.every((r, i, arr) => i === 0 || r === arr[0]);

  const isPlateaued = allWeightsSame && allRepsSame;

  console.log(
    `📊 [Plateau Detection] Weights: [${weights.join(", ")}], Reps: [${reps.join(", ")}]`,
  );
  console.log(
    `📊 [Plateau Detection] All weights same: ${allWeightsSame}, All reps same: ${allRepsSame}`,
  );
  console.log(`🎯 [Plateau Detection] Plateau detected: ${isPlateaued}`);

  if (isPlateaued) {
    return {
      plateauDetected: true,
      plateau: {
        id: 0, // Will be set when stored
        exerciseName: "", // Will be filled by caller
        masterExerciseId,
        stalledWeight: weights[0] || 0,
        stalledReps: reps[0] || 0,
        sessionCount: recentSessions.length,
        durationWeeks: 0, // Will be calculated
        severity:
          confidenceLevel === "high"
            ? "high"
            : confidenceLevel === "medium"
              ? "medium"
              : "low",
        status: "active" as const,
        detectedAt: new Date(),
        recommendations: [], // Will be generated
      },
      recommendations: [], // Will be generated based on duration
    };
  }

  return {
    plateauDetected: false,
    recommendations: [],
  };
}

/**
 * Store detected plateau in database
 */
export async function storePlateau(
  database: typeof db,
  userId: string,
  masterExerciseId: number,
  detectionResult: PlateauDetectionResult,
): Promise<number> {
  if (!detectionResult.isPlateaued) {
    throw new Error("Cannot store non-detected plateau");
  }

  // Check if active plateau already exists for this exercise
  const existingPlateau = await database
    .select()
    .from(plateaus)
    .where(
      and(
        eq(plateaus.userId, userId),
        eq(plateaus.masterExerciseId, masterExerciseId),
        eq(plateaus.status, "active"),
      ),
    )
    .limit(1);

  if (existingPlateau.length > 0) {
    return existingPlateau[0]!.id;
  }

  // Create new plateau record
  const result = await database
    .insert(plateaus)
    .values({
      userId,
      masterExerciseId,
      stalledWeight: detectionResult.stalledWeight,
      stalledReps: detectionResult.stalledReps,
      sessionCount: detectionResult.sessionCount,
      status: "active",
      metadata: JSON.stringify({
        confidenceLevel: detectionResult.confidenceLevel,
        detectedAt: detectionResult.detectedAt.toISOString(),
      }),
    })
    .returning({ id: plateaus.id });

  return result[0]!.id;
}

/**
 * Get active plateaus for a user
 */
export async function getActivePlateaus(
  database: typeof db,
  userId: string,
): Promise<
  Array<PlateauDetectionResult & { masterExerciseId: number; id: number }>
> {
  const activePlateaus = await database
    .select({
      id: plateaus.id,
      masterExerciseId: plateaus.masterExerciseId,
      stalledWeight: plateaus.stalledWeight,
      stalledReps: plateaus.stalledReps,
      sessionCount: plateaus.sessionCount,
      detectedAt: plateaus.detectedAt,
      metadata: plateaus.metadata,
    })
    .from(plateaus)
    .where(and(eq(plateaus.userId, userId), eq(plateaus.status, "active")))
    .orderBy(desc(plateaus.detectedAt));

  return activePlateaus.map((p) => {
    const metadata = p.metadata ? JSON.parse(p.metadata) : {};
    return {
      id: p.id,
      masterExerciseId: p.masterExerciseId,
      isPlateaued: true,
      sessionCount: p.sessionCount,
      stalledWeight: p.stalledWeight,
      stalledReps: p.stalledReps,
      confidenceLevel: metadata.confidenceLevel || "medium",
      detectedAt: p.detectedAt,
    };
  });
}

/**
 * Resolve a plateau (mark as resolved)
 */
export async function resolvePlateau(
  database: typeof db,
  userId: string,
  plateauId: number,
): Promise<void> {
  await database
    .update(plateaus)
    .set({
      status: "resolved",
      resolvedAt: new Date(),
    })
    .where(and(eq(plateaus.id, plateauId), eq(plateaus.userId, userId)));
}

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  const squaredDiffs = numbers.map((num) => Math.pow(num - mean, 2));
  const variance =
    squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;

  return variance;
}

/**
 * Get plateau detection context for analysis
 */
export async function getPlateauDetectionContext(
  database: typeof db,
  userId: string,
  masterExerciseId: number,
): Promise<PlateauDetectionContext> {
  // Get key lift info
  const keyLift = await database
    .select({
      isTracking: keyLifts.isTracking,
      maintenanceMode: keyLifts.maintenanceMode,
    })
    .from(keyLifts)
    .where(
      and(
        eq(keyLifts.userId, userId),
        eq(keyLifts.masterExerciseId, masterExerciseId),
      ),
    )
    .limit(1);

  // Get recent sessions for analysis
  // Use templateExerciseId to join to exerciseLinks and filter by masterExerciseId
  const sessions = await database
    .select({
      weight: sessionExercises.weight,
      reps: sessionExercises.reps,
      workoutDate: workoutSessions.workoutDate,
      oneRMEstimate: sessionExercises.one_rm_estimate,
    })
    .from(sessionExercises)
    .innerJoin(
      workoutSessions,
      eq(workoutSessions.id, sessionExercises.sessionId),
    )
    .innerJoin(
      exerciseLinks,
      eq(exerciseLinks.templateExerciseId, sessionExercises.templateExerciseId),
    )
    .where(
      and(
        eq(sessionExercises.user_id, userId),
        eq(exerciseLinks.masterExerciseId, masterExerciseId),
      ),
    )
    .orderBy(desc(workoutSessions.workoutDate))
    .limit(10);

  return {
    userId,
    masterExerciseId,
    sessions: sessions.map((s) => ({
      weight: Number(s.weight) || 0,
      reps: Number(s.reps) || 0,
      date: s.workoutDate,
      oneRMEstimate: Number(s.oneRMEstimate) || 0,
    })),
    maintenanceMode: keyLift[0]?.maintenanceMode || false,
    experienceLevel: "intermediate", // TODO: Get from user preferences
  };
}
