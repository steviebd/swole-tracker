import { eq, and, inArray } from "drizzle-orm";
import { db } from ".";
import {
  workoutSessions,
  sessionExercises,
  masterExercises,
  exerciseLinks,
} from "./schema";
import { logger } from "~/lib/logger";

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

  try {
    return await db.transaction(async (tx) => {
      const insertedSessions = [];

      // Insert all workout sessions
      const sessionsToInsert = workouts.map((workout) => ({
        user_id: workout.user_id,
        templateId: workout.templateId,
        workoutDate: workout.workoutDate,
      }));

      const sessions = await tx
        .insert(workoutSessions)
        .values(sessionsToInsert)
        .returning({ id: workoutSessions.id });

      // Prepare all exercises for batch insert
      const allExercises = [];
      for (let i = 0; i < workouts.length; i++) {
        const workout = workouts[i]!;
        const sessionId = sessions[i]!.id;

        for (const exercise of workout.exercises) {
          allExercises.push({
            user_id: workout.user_id,
            sessionId,
            templateExerciseId: exercise.templateExerciseId,
            exerciseName: exercise.exerciseName,
            setOrder: exercise.setOrder,
            weight: exercise.weight,
            reps: exercise.reps,
            sets: exercise.sets,
            unit: exercise.unit || "kg",
            rpe: exercise.rpe,
            rest_seconds: exercise.rest_seconds,
            is_estimate: exercise.is_estimate ?? false,
            is_default_applied: exercise.is_default_applied ?? false,
          });
        }
      }

      // Batch insert all exercises
      if (allExercises.length > 0) {
        await tx.insert(sessionExercises).values(allExercises);
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
          await tx.insert(exerciseLinks).values(linksToCreate);
        } catch {
          // Handle duplicate key constraint - update existing links
          for (const link of linksToCreate) {
            await tx
              .update(exerciseLinks)
              .set({ masterExerciseId: link.masterExerciseId })
              .where(
                eq(exerciseLinks.templateExerciseId, link.templateExerciseId),
              );
          }
        }

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
export const batchDeleteWorkouts = async (
  userId: string,
  sessionIds: number[],
) => {
  if (sessionIds.length === 0) return { success: true, deletedCount: 0 };

  const startTime = Date.now();
  logger.debug("Starting batch workout deletion", {
    userId,
    count: sessionIds.length,
  });

  try {
    return await db.transaction(async (tx) => {
      // Verify ownership of all sessions first
      const ownedSessions = await tx.query.workoutSessions.findMany({
        where: and(
          eq(workoutSessions.user_id, userId),
          inArray(workoutSessions.id, sessionIds),
        ),
        columns: { id: true },
      });

      const validSessionIds = ownedSessions.map((s) => s.id);

      if (validSessionIds.length === 0) {
        throw new Error("No valid sessions found for deletion");
      }

      const deleteResult = await tx
        .delete(workoutSessions)
        .where(inArray(workoutSessions.id, validSessionIds));

      const deletedCount =
        typeof deleteResult === "object" &&
        deleteResult !== null &&
        "changes" in deleteResult &&
        typeof deleteResult.changes === "number"
          ? deleteResult.changes
          : validSessionIds.length;

      const duration = Date.now() - startTime;
      logger.debug("Batch workout deletion completed", {
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
    logger.error("Batch workout deletion failed", error, {
      userId,
      count: sessionIds.length,
      durationMs: duration,
    });
    throw error;
  }
};
