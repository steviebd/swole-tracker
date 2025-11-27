import { eq, and, inArray } from "drizzle-orm";

/* eslint-disable @typescript-eslint/no-unsafe-return */
import { logger } from "~/lib/logger";
import {
  sessionExercises,
  exerciseLinks,
  playbookSessions,
} from "~/server/db/schema";
import {
  loadResolvedExerciseNameMap,
  resolveExerciseNameWithLookup,
} from "~/server/db/utils";
import { chunkedBatch, getInsertChunkSize } from "~/server/db/chunk-utils";
import { triggerExerciseAggregation } from "~/server/db/incremental-aggregation";
import {
  generateAndPersistDebrief,
  type GenerateDebriefOptions,
} from "~/server/api/services/session-debrief";
import { checkAndRecordMilestoneAchievements } from "~/server/api/utils/milestone-checking";
import { detectPlateausBatch } from "~/server/api/utils/plateau-detection-batch";
import { storePlateau } from "~/server/api/utils/plateau-detection";

export interface WorkoutSaveInput {
  sessionId: number;
  exercises: Array<{
    templateExerciseId?: number;
    exerciseName: string;
    sets: Array<{
      id: string;
      weight?: number;
      reps?: number;
      sets?: number;
      unit?: "kg" | "lbs";
      rpe?: number;
      rest?: number;
      isEstimate?: boolean;
      isDefaultApplied?: boolean;
    }>;
    unit?: "kg" | "lbs";
  }>;
}

export interface WorkoutSaveContext {
  db: any;
  userId: string;
  requestId: string;
  headers: Headers;
}

export interface WorkoutSaveResult {
  success: boolean;
  playbookSessionId: number | null;
  notifications: {
    plateaus: Array<{
      type: "plateau_detected";
      exerciseName: string;
      stalledWeight: number;
      stalledReps: number;
    }>;
    milestones: Array<{
      type: "milestone_achieved";
      exerciseName: string;
      milestoneType: string;
      achievedValue: number;
      targetValue: number | null;
      achievedDate: string;
    }>;
  };
}

/**
 * Verify session ownership and return session data
 */
export async function verifyWorkoutSession(
  db: any,
  userId: string,
  sessionId: number,
) {
  const { workoutSessions } = await import("~/server/db/schema");
  const session = await db.query.workoutSessions.findFirst({
    where: eq(workoutSessions.id, sessionId),
  });

  if (!session || session?.user_id !== userId) {
    throw new Error("Workout session not found");
  }

  return session as any;
}

/**
 * Delete existing exercises and trigger aggregation for cleanup
 */
export async function deleteExistingExercises(
  db: any,
  userId: string,
  sessionId: number,
) {
  // Get exercise IDs that will be deleted for aggregation
  const exercisesToDelete = await db.query.sessionExercises.findMany({
    where: eq(sessionExercises.sessionId, sessionId),
    columns: { id: true },
  });

  // Delete existing exercises
  await db
    .delete(sessionExercises)
    .where(eq(sessionExercises.sessionId, sessionId));

  // Trigger incremental aggregation for deleted exercises
  if (exercisesToDelete.length > 0) {
    const deletedExerciseIds = exercisesToDelete.map((ex: any) => ex.id);
    try {
      await triggerExerciseAggregation(db, userId, deletedExerciseIds);
    } catch (error) {
      logger.warn("incremental_aggregation_failed", {
        userId,
        exerciseIds: deletedExerciseIds,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return exercisesToDelete as any;
}

/**
 * Transform input exercises into session exercise rows
 */
export function transformExercisesToSessionRows(
  input: WorkoutSaveInput,
  userId: string,
  resolvedNameLookup: Map<number, any>,
) {
  const invalidTemplateExerciseIds = new Set<number>();

  const setsToInsert = input.exercises.flatMap((exercise) =>
    exercise.sets
      .filter(
        (set) =>
          set.weight !== undefined ||
          set.reps !== undefined ||
          set.rpe !== undefined ||
          set.rest !== undefined,
      )
      .map((set, setIndex) => {
        const templateExerciseId = exercise.templateExerciseId ?? null;
        const hasValidTemplateExercise =
          templateExerciseId !== null &&
          resolvedNameLookup.has(templateExerciseId);

        if (
          templateExerciseId !== null &&
          !hasValidTemplateExercise &&
          !invalidTemplateExerciseIds.has(templateExerciseId)
        ) {
          invalidTemplateExerciseIds.add(templateExerciseId);
          logger.warn("workouts.save.template_exercise_missing", {
            sessionId: input.sessionId,
            templateExerciseId,
            exerciseName: exercise.exerciseName,
            userId,
          });
        }

        const resolvedTemplateExerciseId = hasValidTemplateExercise
          ? templateExerciseId
          : null;

        const weight = typeof set.weight === "number" ? set.weight : null;
        const reps = typeof set.reps === "number" ? set.reps : null;
        const sets =
          typeof set.sets === "number"
            ? set.sets
            : reps !== null || weight !== null
              ? 1
              : null;
        const unit = set.unit ?? exercise.unit ?? "kg";

        const { name: resolvedExerciseName } = resolveExerciseNameWithLookup(
          templateExerciseId,
          exercise.exerciseName,
          resolvedNameLookup,
        );

        const numericWeight = weight ?? 0;
        const numericReps = reps ?? 0;
        const numericSets = sets ?? 0;

        return {
          user_id: userId,
          sessionId: input.sessionId,
          templateExerciseId: resolvedTemplateExerciseId,
          exerciseName: exercise.exerciseName,
          resolvedExerciseName,
          setOrder: setIndex,
          weight,
          reps,
          sets,
          unit,
          // Phase 2 mappings
          rpe: set.rpe ?? null,
          rest_seconds: set.rest ?? null,
          is_estimate: set.isEstimate ?? false,
          is_default_applied: set.isDefaultApplied ?? false,
          // Computed columns
          one_rm_estimate:
            numericWeight > 0 && numericReps > 0
              ? numericWeight * (1 + numericReps / 30)
              : null,
          volume_load:
            numericWeight > 0 && numericReps > 0 && numericSets > 0
              ? numericSets * numericReps * numericWeight
              : null,
        };
      }),
  );

  return { setsToInsert, invalidTemplateExerciseIds };
}

/**
 * Insert session exercises in chunks
 */
export async function insertSessionExercises(
  db: any,
  userId: string,
  sessionId: number,
  setsToInsert: any[],
  invalidTemplateExerciseIds: Set<number>,
) {
  if (setsToInsert.length === 0) return [];

  const chunkSize = getInsertChunkSize(setsToInsert);
  try {
    await chunkedBatch(db, setsToInsert, (chunk) =>
      db.insert(sessionExercises).values(chunk),
    );
  } catch (error) {
    logger.error(
      "workouts.save.insert_failed",
      error instanceof Error ? error : new Error(String(error)),
      {
        sessionId,
        userId,
        setsCount: setsToInsert.length,
        chunkSize,
        invalidTemplateExerciseIds: Array.from(invalidTemplateExerciseIds),
        firstSet: setsToInsert[0],
      },
    );
    throw error;
  }

  // Return inserted exercise IDs for aggregation (simplified - in real implementation would get actual IDs)
  return setsToInsert.map((_, index) => sessionId + index) as any;
}

/**
 * Trigger async debrief generation
 */
export function triggerDebriefGeneration(
  db: any,
  userId: string,
  sessionId: number,
  requestId: string,
  headers: Headers,
) {
  const acceptLanguage = headers.get("accept-language") ?? undefined;
  const locale = acceptLanguage?.split(",")[0];

  void (async () => {
    try {
      const debriefOptions: GenerateDebriefOptions = {
        dbClient: db,
        userId,
        sessionId,
        trigger: "auto",
        requestId,
        ...(locale !== undefined && { locale }),
      };

      await generateAndPersistDebrief(debriefOptions);
    } catch (error) {
      logger.warn("session_debrief.auto_generation_failed", {
        userId,
        sessionId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  })();
}

/**
 * Check and update playbook session completion
 */
export async function updatePlaybookSessionCompletion(
  db: any,
  userId: string,
  sessionId: number,
  exercises: WorkoutSaveInput["exercises"],
): Promise<number | null> {
  try {
    const linkedPlaybookSession = await db.query.playbookSessions.findFirst({
      where: (sessions: any, { eq, and }: any) =>
        and(
          eq(sessions.actualWorkoutId, sessionId),
          eq(sessions.isCompleted, false),
        ),
    });

    if (!linkedPlaybookSession) return null;

    // Calculate adherence score if there are exercises
    let adherenceScore = 100; // Default to perfect if no prescription

    if (exercises.length > 0) {
      const prescription = (
        linkedPlaybookSession.prescribedWorkoutJson
          ? JSON.parse(linkedPlaybookSession.prescribedWorkoutJson)
          : null
      ) as {
        exercises: Array<{
          exerciseName: string;
          sets: number;
          reps: number;
          weight: number | null;
        }>;
      } | null;

      if (prescription?.exercises) {
        const prescribedExerciseNames = new Set(
          prescription.exercises.map((e) => e.exerciseName.toLowerCase()),
        );
        const completedExerciseNames = new Set(
          exercises.map((e) => e.exerciseName.toLowerCase()),
        );

        // Calculate overlap
        const matchingExercises = Array.from(prescribedExerciseNames).filter(
          (name) => completedExerciseNames.has(name),
        ).length;

        adherenceScore = Math.round(
          (matchingExercises / prescribedExerciseNames.size) * 100,
        );
      }
    }

    // Mark playbook session as completed
    await db
      .update(playbookSessions)
      .set({
        isCompleted: true,
        completedAt: new Date(),
        adherenceScore,
        updatedAt: new Date(),
      })
      .where(eq(playbookSessions.id, linkedPlaybookSession.id));

    logger.info("Marked playbook session as completed", {
      playbookSessionId: linkedPlaybookSession.id,
      adherenceScore,
    });

    return linkedPlaybookSession.id;
  } catch (error) {
    logger.info("Failed to check for playbook session", {
      sessionId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

/**
 * Trigger async plateau detection and storage
 */
export function triggerPlateauDetection(
  db: any,
  userId: string,
  sessionId: number,
  exercises: WorkoutSaveInput["exercises"],
  resolvedNameLookup: Map<number, any>,
) {
  void (async () => {
    try {
      console.log(
        `🚀 [Workout Service] Starting plateau detection for ${exercises.length} exercises`,
      );

      // Get master exercise IDs from the saved exercises
      const masterExerciseIds = Array.from(
        new Set(
          exercises
            .map((exercise) => exercise.templateExerciseId)
            .filter((id): id is number => typeof id === "number")
            .map((templateId) => {
              // Get master exercise ID from template exercise
              const templateExercise = resolvedNameLookup.get(templateId);
              return templateExercise?.masterExerciseId;
            })
            .filter((id): id is number => id !== undefined),
        ),
      );

      // Use batch plateau detection for optimization
      const plateauResults = await detectPlateausBatch(
        db,
        userId,
        masterExerciseIds,
      );

      for (const [masterExerciseId, plateauResult] of plateauResults) {
        if (plateauResult.plateauDetected && plateauResult.plateau) {
          // Transform PlateauDetectionResponse to PlateauDetectionResult for storage
          const detectionResult = {
            isPlateaued: true,
            sessionCount: plateauResult.plateau.sessionCount,
            stalledWeight: plateauResult.plateau.stalledWeight,
            stalledReps: plateauResult.plateau.stalledReps,
            confidenceLevel: plateauResult.plateau.severity,
            detectedAt: plateauResult.plateau.detectedAt,
          };

          await storePlateau(db, userId, masterExerciseId, detectionResult);
        }
      }
    } catch (error) {
      logger.warn("plateau_detection_failed", {
        userId,
        sessionId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  })();
}

/**
 * Generate notifications for plateaus and milestones
 */
export async function generateNotifications(
  db: any,
  userId: string,
  sessionId: number,
  exercises: WorkoutSaveInput["exercises"],
  resolvedNameLookup: Map<number, any>,
) {
  const plateauNotifications: Array<{
    type: "plateau_detected";
    exerciseName: string;
    stalledWeight: number;
    stalledReps: number;
  }> = [];

  // Get template exercise IDs
  const templateExerciseIds = Array.from(
    new Set(
      exercises
        .map((e) => e.templateExerciseId)
        .filter((id): id is number => id !== undefined),
    ),
  );

  // Get master exercise IDs via exerciseLinks lookup
  const exerciseLinkResults =
    templateExerciseIds.length > 0
      ? await db
          .select({
            templateExerciseId: exerciseLinks.templateExerciseId,
            masterExerciseId: exerciseLinks.masterExerciseId,
          })
          .from(exerciseLinks)
          .where(
            and(
              eq(exerciseLinks.user_id, userId),
              inArray(exerciseLinks.templateExerciseId, templateExerciseIds),
            ),
          )
      : [];

  const masterExerciseIds = Array.from(
    new Set(
      exerciseLinkResults.map((el: any) => el.masterExerciseId).filter(Boolean),
    ),
  ) as number[];

  // Use batch milestone checking for optimization
  const milestoneNotifications = await checkAndRecordMilestoneAchievements({
    db,
    userId,
    workoutId: sessionId,
    masterExerciseIds,
    resolvedNameLookup,
  });

  // Check for plateaus (individual detection for notifications)
  for (const masterExerciseId of masterExerciseIds) {
    const { detectPlateau } = await import(
      "~/server/api/utils/plateau-detection"
    );
    const plateauResult = await detectPlateau(db, userId, masterExerciseId);

    if (plateauResult.plateauDetected && plateauResult.plateau) {
      const exerciseName =
        resolvedNameLookup.get(
          Array.from(resolvedNameLookup.keys()).find(
            (key) =>
              resolvedNameLookup.get(key)?.masterExerciseId ===
              masterExerciseId,
          ) || 0,
        )?.name || "Unknown exercise";

      plateauNotifications.push({
        type: "plateau_detected" as const,
        exerciseName,
        stalledWeight: plateauResult.plateau.stalledWeight,
        stalledReps: plateauResult.plateau.stalledReps,
      });
    }
  }

  return {
    plateaus: plateauNotifications,
    milestones: milestoneNotifications,
  };
}

/**
 * Main service function to save a workout session
 */
export async function saveWorkoutSession(
  input: WorkoutSaveInput,
  ctx: WorkoutSaveContext,
): Promise<WorkoutSaveResult> {
  // Verify session ownership
  await verifyWorkoutSession(ctx.db, ctx.userId, input.sessionId);

  // Delete existing exercises
  await deleteExistingExercises(ctx.db, ctx.userId, input.sessionId);

  // Get template exercise IDs for name resolution
  const templateExerciseIds = Array.from(
    new Set(
      input.exercises
        .map((exercise) => exercise.templateExerciseId)
        .filter((id): id is number => typeof id === "number"),
    ),
  );

  const resolvedNameLookup = await loadResolvedExerciseNameMap(
    ctx.db,
    templateExerciseIds,
  );

  // Transform exercises to session rows
  const { setsToInsert, invalidTemplateExerciseIds } =
    transformExercisesToSessionRows(input, ctx.userId, resolvedNameLookup);

  // Insert session exercises
  const insertedExerciseIds = await insertSessionExercises(
    ctx.db,
    ctx.userId,
    input.sessionId,
    setsToInsert,
    invalidTemplateExerciseIds,
  );

  // Trigger aggregation for new exercises
  if (insertedExerciseIds.length > 0) {
    try {
      await triggerExerciseAggregation(ctx.db, ctx.userId, insertedExerciseIds);
    } catch (error) {
      logger.warn("incremental_aggregation_failed", {
        userId: ctx.userId,
        exerciseIds: insertedExerciseIds,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  let playbookSessionId: number | null = null;
  let notifications: {
    plateaus: Array<{
      type: "plateau_detected";
      exerciseName: string;
      stalledWeight: number;
      stalledReps: number;
    }>;
    milestones: Array<{
      type: "milestone_achieved";
      exerciseName: string;
      milestoneType: string;
      achievedValue: number;
      targetValue: number | null;
      achievedDate: string;
    }>;
  } = { plateaus: [], milestones: [] };

  if (setsToInsert.length > 0) {
    // Trigger async processes
    triggerDebriefGeneration(
      ctx.db,
      ctx.userId,
      input.sessionId,
      ctx.requestId,
      ctx.headers,
    );

    // Update playbook session completion
    playbookSessionId = await updatePlaybookSessionCompletion(
      ctx.db,
      ctx.userId,
      input.sessionId,
      input.exercises,
    );

    // Trigger plateau detection
    triggerPlateauDetection(
      ctx.db,
      ctx.userId,
      input.sessionId,
      input.exercises,
      resolvedNameLookup,
    );

    // Generate notifications
    notifications = await generateNotifications(
      ctx.db,
      ctx.userId,
      input.sessionId,
      input.exercises,
      resolvedNameLookup,
    );
  }

  return {
    success: true,
    playbookSessionId,
    notifications,
  };
}
