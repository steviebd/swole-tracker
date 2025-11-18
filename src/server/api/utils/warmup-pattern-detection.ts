import { db } from "~/server/db";
import { exerciseSets, sessionExercises, workoutSessions } from "~/server/db/schema";
import { eq, and, desc, isNull, isNotNull } from "drizzle-orm";
import { whereInChunks } from "~/server/db/chunk-utils";
import type {
  WarmupPattern,
  WarmupDetectionOptions,
  WarmupProtocolConfig,
  WarmupSetData,
} from "../types/warmup";

/**
 * Detects user's warm-up pattern for a specific exercise
 *
 * Strategy:
 * 1. Fetch recent sessions with this exercise (up to lookbackSessions)
 * 2. Extract warm-up sets (setType='warmup') from exercise_sets table
 * 3. Use most recent pattern (user's latest preference)
 * 4. Scale to target working weight
 * 5. Return confidence score based on session count
 *
 * @param options - Detection parameters
 * @returns WarmupPattern with confidence, sets, source, and session count
 */
export async function detectWarmupPattern(
  options: Omit<WarmupDetectionOptions, 'minSessions' | 'lookbackSessions'> & {
    minSessions?: number;
    lookbackSessions?: number;
  }
): Promise<WarmupPattern> {
  const {
    userId,
    exerciseName,
    targetWorkingWeight,
    targetWorkingReps,
    minSessions = 2,
    lookbackSessions = 10,
  } = options;

  // Fetch recent sessions with this exercise (only migrated data using exercise_sets)
  const recentSessions = await db
    .select({
      id: sessionExercises.id,
      topSetWeight: sessionExercises.topSetWeight,
      warmupSets: sessionExercises.warmupSets,
      workingSets: sessionExercises.workingSets,
      createdAt: sessionExercises.createdAt,
    })
    .from(sessionExercises)
    .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
    .where(
      and(
        eq(sessionExercises.user_id, userId),
        eq(sessionExercises.exerciseName, exerciseName),
        eq(sessionExercises.usesSetTable, true) // Only migrated data
      )
    )
    .orderBy(desc(workoutSessions.workoutDate))
    .limit(lookbackSessions);

  // Not enough history
  if (recentSessions.length < minSessions) {
    return {
      confidence: "low",
      sets: [],
      source: "protocol",
      sessionCount: 0,
    };
  }

  // Find sessions with warm-up sets
  const sessionsWithWarmups = recentSessions.filter(s => (s.warmupSets ?? 0) > 0);

  if (sessionsWithWarmups.length === 0) {
    return {
      confidence: "low",
      sets: [],
      source: "protocol",
      sessionCount: recentSessions.length,
    };
  }

  // Fetch actual warm-up sets for the most recent session with warm-ups
  const mostRecentSessionId = sessionsWithWarmups[0]!.id;
  const warmupSetsData = await db
    .select({
      setNumber: exerciseSets.setNumber,
      weight: exerciseSets.weight,
      reps: exerciseSets.reps,
    })
    .from(exerciseSets)
    .where(
      and(
        eq(exerciseSets.sessionExerciseId, mostRecentSessionId),
        eq(exerciseSets.setType, "warmup")
      )
    )
    .orderBy(exerciseSets.setNumber);

  if (warmupSetsData.length === 0) {
    return {
      confidence: "low",
      sets: [],
      source: "protocol",
      sessionCount: recentSessions.length,
    };
  }

  // Scale pattern to target working weight
  const topWeightLastSession = sessionsWithWarmups[0]!.topSetWeight ?? targetWorkingWeight;

  const scaledSets: WarmupSetData[] = warmupSetsData.map((warmup) => {
    const weight = warmup.weight ?? 0;
    const percentageOfTop = topWeightLastSession > 0 ? weight / topWeightLastSession : 0;
    const scaledWeight = Math.round((percentageOfTop * targetWorkingWeight) / 2.5) * 2.5; // Round to 2.5kg

    return {
      setNumber: warmup.setNumber,
      weight: scaledWeight,
      reps: warmup.reps,
      percentageOfTop,
    };
  });

  // Determine confidence based on how many sessions have warm-ups
  let confidence: "low" | "medium" | "high" = "low";
  if (sessionsWithWarmups.length >= 5) {
    confidence = "high";
  } else if (sessionsWithWarmups.length >= 2) {
    confidence = "medium";
  }

  return {
    confidence,
    sets: scaledSets,
    source: "history",
    sessionCount: sessionsWithWarmups.length,
  };
}

/**
 * Generates default warm-up protocol when no history exists
 *
 * Supports:
 * - Percentage-based: 40% → 60% → 80% of working weight
 * - Fixed weights: User-defined absolute weights
 *
 * @param workingWeight - Target working weight
 * @param workingReps - Target working reps
 * @param preferences - User's warm-up preferences
 * @returns Array of warm-up sets
 */
export function generateDefaultWarmupProtocol(
  workingWeight: number,
  workingReps: number,
  preferences: WarmupProtocolConfig
): WarmupSetData[] {
  const {
    strategy,
    percentages = [40, 60, 80],
    setsCount = 3,
    repsStrategy = "match_working",
    fixedReps = 5,
  } = preferences;

  const sets: WarmupSetData[] = [];

  for (let i = 0; i < setsCount; i++) {
    const percentage = percentages[i] ?? percentages[percentages.length - 1] ?? 80;
    const weight = Math.round((workingWeight * (percentage / 100)) / 2.5) * 2.5; // Round to 2.5kg

    let reps: number;
    if (repsStrategy === "match_working") {
      reps = workingReps;
    } else if (repsStrategy === "descending") {
      reps = Math.max(5, 10 - i * 2); // 10, 8, 6, 5, 5...
    } else {
      reps = fixedReps;
    }

    sets.push({
      setNumber: i + 1,
      weight,
      reps,
      percentageOfTop: percentage / 100,
    });
  }

  return sets;
}

/**
 * ML-based exercise similarity (future feature)
 * Returns similar exercises that could share warm-up patterns
 *
 * Currently returns simple string-based variants.
 * TODO: Implement ML-based similarity using exercise embeddings
 *
 * @param exerciseName - Exercise to find similar exercises for
 * @param userId - User ID (for future personalized similarity)
 * @returns Array of similar exercises with similarity scores
 */
export async function findSimilarExercises(
  exerciseName: string,
  userId: string
): Promise<Array<{ exerciseName: string; similarity: number }>> {
  // Simple pattern matching for common exercise variants
  const variants: Array<{ pattern: RegExp; related: string[] }> = [
    {
      pattern: /barbell bench press/i,
      related: ["dumbbell bench press", "incline bench press", "decline bench press"],
    },
    {
      pattern: /squat/i,
      related: ["front squat", "goblet squat", "hack squat", "box squat"],
    },
    {
      pattern: /deadlift/i,
      related: ["romanian deadlift", "sumo deadlift", "trap bar deadlift"],
    },
    {
      pattern: /overhead press/i,
      related: ["military press", "push press", "dumbbell shoulder press"],
    },
    {
      pattern: /row/i,
      related: ["barbell row", "dumbbell row", "cable row", "t-bar row"],
    },
  ];

  for (const variant of variants) {
    if (variant.pattern.test(exerciseName)) {
      return variant.related.map((name) => ({
        exerciseName: name,
        similarity: 0.8, // Fixed similarity for now
      }));
    }
  }

  return [];
}

/**
 * Helper: Calculate volume breakdown by set type
 *
 * @param sets - Array of exercise sets with weight, reps, and setType
 * @returns Volume breakdown by set type
 */
export function calculateVolumeBreakdown(
  sets: Array<{ weight: number | null; reps: number; setType: string }>
): {
  total: number;
  working: number;
  warmup: number;
  backoff: number;
  drop: number;
} {
  const breakdown = {
    total: 0,
    working: 0,
    warmup: 0,
    backoff: 0,
    drop: 0,
  };

  for (const set of sets) {
    const volume = (set.weight ?? 0) * set.reps;
    breakdown.total += volume;

    switch (set.setType) {
      case "warmup":
        breakdown.warmup += volume;
        break;
      case "working":
        breakdown.working += volume;
        break;
      case "backoff":
        breakdown.backoff += volume;
        break;
      case "drop":
        breakdown.drop += volume;
        break;
    }
  }

  return breakdown;
}
