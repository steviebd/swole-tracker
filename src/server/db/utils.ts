import { eq, and, inArray, sql } from "drizzle-orm";
import { db, type DrizzleDb } from ".";
import {
  workoutSessions,
  sessionExercises,
  masterExercises,
  exerciseLinks,
  templateExercises,
  userPreferences,
} from "./schema";
import { logger } from "~/lib/logger";
import {
  calculateOneRM,
  calculateVolumeLoad,
} from "~/server/api/utils/exercise-calculations";
import { chunkedBatch, whereInChunks } from "./chunk-utils";

const computeOneRmEstimate = (
  weight: number | null | undefined,
  reps: number | null | undefined,
): number | null => {
  if (weight == null || reps == null) return null;
  if (weight <= 0 || reps <= 0) return null;
  return calculateOneRM(weight, reps);
};

const computeVolumeLoad = (
  weight: number | null | undefined,
  reps: number | null | undefined,
  sets: number | null | undefined,
): number | null => {
  if (weight == null || reps == null || sets == null) return null;
  if (weight <= 0 || reps <= 0 || sets <= 0) return null;
  return calculateVolumeLoad(sets, reps, weight);
};

export type ResolvedExerciseNameMap = Map<
  number,
  {
    name: string;
    masterExerciseId: number | null;
  }
>;

// Simple in-memory cache for exercise name mappings
const exerciseNameCache = new Map<
  string,
  { data: ResolvedExerciseNameMap; expires: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const loadResolvedExerciseNameMap = async (
  database: DrizzleDb,
  templateExerciseIds: number[],
): Promise<ResolvedExerciseNameMap> => {
  if (templateExerciseIds.length === 0) {
    return new Map();
  }

  // Create cache key from sorted template exercise IDs
  const cacheKey = templateExerciseIds.sort().join(",");
  const cached = exerciseNameCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  type Row = {
    templateExerciseId: number;
    templateName: string | null;
    masterName: string | null;
    masterExerciseId: number | null;
  };

  const rows: Row[] = [];

  await whereInChunks(templateExerciseIds, async (idChunk) => {
    const chunkRows = await database
      .select({
        templateExerciseId: templateExercises.id,
        templateName: templateExercises.exerciseName,
        masterName: masterExercises.name,
        masterExerciseId: exerciseLinks.masterExerciseId,
      })
      .from(templateExercises)
      .leftJoin(
        exerciseLinks,
        eq(exerciseLinks.templateExerciseId, templateExercises.id),
      )
      .leftJoin(
        masterExercises,
        eq(masterExercises.id, exerciseLinks.masterExerciseId),
      )
      .where(inArray(templateExercises.id, idChunk));

    rows.push(...chunkRows);
  });

  const map: ResolvedExerciseNameMap = new Map();

  for (const row of rows) {
    const templateExerciseId = Number(row.templateExerciseId);
    if (!Number.isFinite(templateExerciseId)) continue;

    const resolvedName = row.masterName ?? row.templateName;
    map.set(templateExerciseId, {
      name: resolvedName ?? "",
      masterExerciseId: row.masterExerciseId ?? null,
    });
  }

  // Cache the result
  exerciseNameCache.set(cacheKey, {
    data: map,
    expires: Date.now() + CACHE_TTL,
  });

  return map;
};

export const resolveExerciseNameWithLookup = (
  templateExerciseId: number | null | undefined,
  fallback: string,
  lookup: ResolvedExerciseNameMap,
): { name: string; masterExerciseId: number | null } => {
  if (templateExerciseId == null) {
    return { name: fallback, masterExerciseId: null };
  }

  const entry = lookup.get(templateExerciseId);
  if (!entry) {
    return { name: fallback, masterExerciseId: null };
  }

  return {
    name: entry.name || fallback,
    masterExerciseId: entry.masterExerciseId,
  };
};

/**
 * Batch operation utilities for improved database performance
 */

export interface BatchWorkoutData {
  sessionId?: number;
  user_id: string;
  templateId: number;
  workoutDate: Date;
  exercises: Array<{
    templateExerciseId?: number;
    exerciseName: string;
    setOrder: number;
    weight?: number;
    reps?: number;
    sets?: number;
    unit?: string;
    rpe?: number;
    rest_seconds?: number;
    is_estimate?: boolean;
    is_default_applied?: boolean;
  }>;
}

/**
 * Batch insert workout sessions with all exercises in a single transaction
 * This reduces database round-trips and improves performance significantly
 */
export const batchInsertWorkouts = async (workouts: BatchWorkoutData[]) => {
  if (workouts.length === 0) return [];

  const startTime = Date.now();
  logger.debug("Starting batch workout insert", { count: workouts.length });

  const templateExerciseIds = new Set<number>();
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      if (
        typeof exercise.templateExerciseId === "number" &&
        Number.isInteger(exercise.templateExerciseId)
      ) {
        templateExerciseIds.add(exercise.templateExerciseId);
      }
    }
  }

  const resolvedNameLookup = await loadResolvedExerciseNameMap(
    db,
    Array.from(templateExerciseIds),
  );

  try {
    return await db.transaction(async (tx) => {
      const insertedSessions = [];

      // Insert all workout sessions
      const sessionsToInsert = workouts.map((workout) => ({
        user_id: workout.user_id,
        templateId: workout.templateId,
        workoutDate: workout.workoutDate,
      }));

      let sessions: Array<{ id: number }> = [];
      if (sessionsToInsert.length > 0) {
        const sessionResults = await chunkedBatch(
          tx as unknown as DrizzleDb,
          sessionsToInsert,
          (chunk) =>
            tx
              .insert(workoutSessions)
              .values(chunk)
              .returning({ id: workoutSessions.id }),
        );
        sessions = (sessionResults as Array<Array<{ id: number }>>).flat();

        if (sessions.length !== workouts.length) {
          throw new Error("Mismatch between inserted sessions and payload");
        }
      }

      // Prepare all exercises for batch insert
      const allExercises = [];
      for (let i = 0; i < workouts.length; i++) {
        const workout = workouts[i]!;
        const sessionId = sessions[i]!.id;

        for (const exercise of workout.exercises) {
          const weight = exercise.weight ?? null;
          const reps = exercise.reps ?? null;
          const sets = exercise.sets ?? null;
          const oneRmEstimate = computeOneRmEstimate(weight, reps);
          const volumeLoad = computeVolumeLoad(weight, reps, sets);
          const { name: resolvedExerciseName } = resolveExerciseNameWithLookup(
            exercise.templateExerciseId ?? null,
            exercise.exerciseName,
            resolvedNameLookup,
          );

          allExercises.push({
            user_id: workout.user_id,
            sessionId,
            templateExerciseId: exercise.templateExerciseId,
            exerciseName: exercise.exerciseName,
            resolvedExerciseName,
            setOrder: exercise.setOrder,
            weight,
            reps,
            sets,
            unit: exercise.unit || "kg",
            rpe: exercise.rpe,
            rest_seconds: exercise.rest_seconds,
            is_estimate: exercise.is_estimate ?? false,
            is_default_applied: exercise.is_default_applied ?? false,
            one_rm_estimate: oneRmEstimate,
            volume_load: volumeLoad,
          });
        }
      }

      // Batch insert all exercises
      if (allExercises.length > 0) {
        await chunkedBatch(tx as unknown as DrizzleDb, allExercises, (chunk) =>
          tx.insert(sessionExercises).values(chunk),
        );
      }

      // Return session IDs with workout data
      for (let i = 0; i < sessions.length; i++) {
        insertedSessions.push({
          sessionId: sessions[i]!.id,
          ...workouts[i]!,
        });
      }

      const duration = Date.now() - startTime;
      logger.debug("Batch workout insert completed", {
        count: workouts.length,
        exerciseCount: allExercises.length,
        durationMs: duration,
      });

      return insertedSessions;
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Batch workout insert failed", error, {
      count: workouts.length,
      durationMs: duration,
    });
    throw error;
  }
};

/**
 * Batch update session exercises - useful for applying AI suggestions to multiple sets
 */
export const batchUpdateSessionExercises = async (
  sessionId: number,
  userId: string,
  updates: Array<{
    exerciseId: number;
    weight?: number;
    reps?: number;
    unit?: string;
  }>,
) => {
  if (updates.length === 0) return { success: true, updatedCount: 0 };

  const startTime = Date.now();
  logger.debug("Starting batch exercise update", {
    sessionId,
    count: updates.length,
  });

  try {
    return await db.transaction(async (tx) => {
      let updatedCount = 0;

      // Verify session ownership first
      const session = await tx.query.workoutSessions.findFirst({
        where: and(
          eq(workoutSessions.id, sessionId),
          eq(workoutSessions.user_id, userId),
        ),
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      // Apply all updates in parallel within the transaction
      const updatePromises = updates.map(async (update) => {
        const result = await tx
          .update(sessionExercises)
          .set({
            weight: update.weight,
            reps: update.reps,
            unit: update.unit,
          })
          .where(
            and(
              eq(sessionExercises.id, update.exerciseId),
              eq(sessionExercises.user_id, userId),
            ),
          );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return result;
      });

      await Promise.all(updatePromises);
      updatedCount = updates.length;

      const duration = Date.now() - startTime;
      logger.debug("Batch exercise update completed", {
        sessionId,
        updatedCount,
        durationMs: duration,
      });

      return { success: true, updatedCount };
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Batch exercise update failed", error, {
      sessionId,
      count: updates.length,
      durationMs: duration,
    });
    throw error;
  }
};

/**
 * Batch create and link master exercises for multiple template exercises
 * This is more efficient than creating them one by one
 */
export const batchCreateMasterExerciseLinks = async (
  userId: string,
  exerciseData: Array<{
    templateExerciseId: number;
    exerciseName: string;
    linkingRejected?: boolean;
  }>,
) => {
  if (exerciseData.length === 0) return [];

  const startTime = Date.now();
  logger.debug("Starting batch master exercise linking", {
    userId,
    count: exerciseData.length,
  });

  try {
    return await db.transaction(async (tx) => {
      const results = [];

      // Group exercises by normalized name to avoid duplicates
      const exerciseGroups = new Map<string, typeof exerciseData>();

      for (const exercise of exerciseData) {
        if (exercise.linkingRejected) continue;

        const normalizedName = exercise.exerciseName.toLowerCase().trim();
        if (!exerciseGroups.has(normalizedName)) {
          exerciseGroups.set(normalizedName, []);
        }
        exerciseGroups.get(normalizedName)!.push(exercise);
      }

      // Process each unique exercise name
      for (const [normalizedName, exercises] of exerciseGroups) {
        const firstExercise = exercises[0]!;

        // Try to find existing master exercise
        let masterExercise = await tx.query.masterExercises.findFirst({
          where: and(
            eq(masterExercises.user_id, userId),
            eq(masterExercises.normalizedName, normalizedName),
          ),
        });

        // Create master exercise if it doesn't exist
        if (!masterExercise) {
          const [created] = await tx
            .insert(masterExercises)
            .values({
              user_id: userId,
              name: firstExercise.exerciseName,
              normalizedName,
            })
            .returning();
          masterExercise = created;
        }

        if (!masterExercise) continue;

        // Create links for all template exercises in this group
        const linksToCreate = exercises.map((exercise) => ({
          templateExerciseId: exercise.templateExerciseId,
          masterExerciseId: masterExercise!.id,
          user_id: userId,
        }));

        // Batch insert links (ignore duplicates)
        try {
          await chunkedBatch(tx, linksToCreate, (chunk) =>
            tx.insert(exerciseLinks).values(chunk),
          );
        } catch {
          // Handle duplicate key constraint - bulk update existing links
          // Group by masterExerciseId to minimize updates
          const grouped = linksToCreate.reduce(
            (acc, link) => {
              if (!acc[link.masterExerciseId]) {
                acc[link.masterExerciseId] = [];
              }
              acc[link.masterExerciseId].push(link.templateExerciseId);
              return acc;
            },
            {} as Record<string, string[]>,
          );

          // Batch update per master exercise
          for (const [masterId, templateIds] of Object.entries(grouped)) {
            await tx
              .update(exerciseLinks)
              .set({ masterExerciseId: masterId })
              .where(inArray(exerciseLinks.templateExerciseId, templateIds));
          }
        }

        const resolvedName = masterExercise.name ?? firstExercise.exerciseName;

        await whereInChunks(
          linksToCreate.map((link) => link.templateExerciseId),
          async (templateIds) => {
            await tx
              .update(sessionExercises)
              .set({ resolvedExerciseName: resolvedName })
              .where(
                and(
                  eq(sessionExercises.user_id, userId),
                  inArray(sessionExercises.templateExerciseId, templateIds),
                ),
              );
          },
        );

        results.push({
          masterExerciseId: masterExercise.id,
          exerciseName: firstExercise.exerciseName,
          linkedCount: exercises.length,
        });
      }

      const duration = Date.now() - startTime;
      logger.debug("Batch master exercise linking completed", {
        userId,
        processedGroups: results.length,
        totalExercises: exerciseData.length,
        durationMs: duration,
      });

      return results;
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Batch master exercise linking failed", error, {
      userId,
      count: exerciseData.length,
      durationMs: duration,
    });
    throw error;
  }
};

/**
 * Batch delete operations with proper cleanup
 */
type BatchDeleteDeps = {
  db: typeof db;
  logger: Pick<typeof logger, "debug" | "error">;
};

export const batchDeleteWorkouts = async (
  userId: string,
  sessionIds: number[],
  deps?: Partial<BatchDeleteDeps>,
) => {
  const dbClient = deps?.db ?? db;
  const log = deps?.logger ?? logger;

  if (sessionIds.length === 0) return { success: true, deletedCount: 0 };

  const startTime = Date.now();
  log.debug("Starting batch workout deletion", {
    userId,
    count: sessionIds.length,
  });

  try {
    return await dbClient.transaction(async (tx) => {
      // Verify ownership of all sessions first
      let ownedSessions: Array<{ id: number }> = [];
      await whereInChunks(sessionIds, async (idChunk) => {
        const chunkSessions = await tx.query.workoutSessions.findMany({
          where: and(
            eq(workoutSessions.user_id, userId),
            inArray(workoutSessions.id, idChunk),
          ),
          columns: { id: true },
        });
        ownedSessions = ownedSessions.concat(chunkSessions);
      });

      const validSessionIds = ownedSessions.map((s) => s.id);

      if (validSessionIds.length === 0) {
        throw new Error("No valid sessions found for deletion");
      }

      let deletedCount = 0;
      await whereInChunks(validSessionIds, async (idChunk) => {
        const deleteResult = await tx
          .delete(workoutSessions)
          .where(inArray(workoutSessions.id, idChunk));

        const changes =
          typeof deleteResult === "object" &&
          deleteResult !== null &&
          "changes" in deleteResult &&
          typeof deleteResult.changes === "number"
            ? deleteResult.changes
            : idChunk.length;

        deletedCount += changes;
      });

      const duration = Date.now() - startTime;
      log.debug("Batch workout deletion completed", {
        userId,
        requestedCount: sessionIds.length,
        deletedCount,
        bulkDelete: true,
        durationMs: duration,
      });

      return { success: true, deletedCount };
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("Batch workout deletion failed", error, {
      userId,
      count: sessionIds.length,
      durationMs: duration,
    });
    throw error;
  }
};

// Simple in-memory cache for user preferences
const userPreferencesCache = new Map<string, { data: any; expires: number }>();

/**
 * Cached user preferences fetcher
 * User preferences change infrequently, so caching them improves performance
 */
export const getCachedUserPreferences = async (
  database: DrizzleDb,
  userId: string,
): Promise<
  ReturnType<typeof database.query.userPreferences.findFirst> | undefined
> => {
  const cacheKey = `user_prefs_${userId}`;
  const cached = userPreferencesCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return cached.data;
  }

  const prefs = await database.query.userPreferences.findFirst({
    where: eq(userPreferences.user_id, userId),
  });

  // Cache for 10 minutes (user preferences don't change often)
  const CACHE_TTL = 10 * 60 * 1000;
  userPreferencesCache.set(cacheKey, {
    data: prefs,
    expires: Date.now() + CACHE_TTL,
  });

  return prefs;
};

/**
 * Clear user preferences cache (call when preferences are updated)
 */
export const clearUserPreferencesCache = (userId: string): void => {
  const cacheKey = `user_prefs_${userId}`;
  userPreferencesCache.delete(cacheKey);
};

/**
 * Retry helper for critical multi-step operations
 *
 * Since D1 doesn't support transactions, use this to add retry logic
 * for important operations that could fail mid-way.
 *
 * @example
 * ```ts
 * await withRetry(async () => {
 *   await db.insert(table1).values(data1);
 *   await db.update(table2).set(data2);
 * });
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 100,
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * (i + 1)),
        );
      }
    }
  }

  throw lastError!;
}
