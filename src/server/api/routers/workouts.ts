import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { workoutRateLimit } from "~/lib/rate-limit-middleware";
import {
  workoutSessions,
  sessionExercises,
  workoutTemplates,
  templateExercises,
  exerciseLinks,
} from "~/server/db/schema";
import {
  eq,
  desc,
  and,
  ne,
  inArray,
  gte,
  or,
  asc,
  type SQL,
  sql,
} from "drizzle-orm";

const setInputSchema = z.object({
  id: z.string(),
  weight: z.number().optional(),
  reps: z.number().int().positive().optional(),
  sets: z.number().int().positive().default(1),
  unit: z.enum(["kg", "lbs"]).default("kg"),
  // Phase 2 additions (optional on input)
  rpe: z.number().int().min(1).max(10).optional(),
  rest: z.number().int().positive().optional(), // seconds
  isEstimate: z.boolean().optional(),
  isDefaultApplied: z.boolean().optional(),
});

const exerciseInputSchema = z.object({
  templateExerciseId: z.number().optional(),
  exerciseName: z.string().min(1).max(256),
  sets: z.array(setInputSchema),
  unit: z.enum(["kg", "lbs"]).default("kg"),
});

import { logger } from "~/lib/logger";
import { generateAndPersistDebrief } from "~/server/api/services/session-debrief";
import { monitoredDbQuery } from "~/server/db/monitoring";
import {
  calculateOneRM,
  calculateVolumeLoad,
} from "~/server/api/utils/exercise-calculations";

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

export const workoutsRouter = createTRPCRouter({
  // Get recent workouts for the current user
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().default(10) }))
    .query(async ({ input, ctx }) => {
      logger.debug("Getting recent workouts", { limit: input.limit });
      return monitoredDbQuery(
        "workouts.getRecent",
        () =>
          ctx.db.query.workoutSessions.findMany({
            where: eq(workoutSessions.user_id, ctx.user.id),
            orderBy: [desc(workoutSessions.workoutDate)],
            limit: input.limit,
            columns: {
              id: true,
              workoutDate: true,
              templateId: true,
              createdAt: true,
            },
            with: {
              template: {
                columns: {
                  id: true,
                  name: true,
                },
              },
              exercises: true,
            },
          }),
        ctx,
      );
    }),

  // Get workout by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const workout = await monitoredDbQuery(
        "workouts.getById",
        () =>
          ctx.db.query.workoutSessions.findFirst({
            where: eq(workoutSessions.id, input.id),
            with: {
              template: {
                with: {
                  exercises: {
                    orderBy: (exercises, { asc }) => [
                      asc(exercises.orderIndex),
                    ],
                  },
                },
              },
              exercises: {
                orderBy: (exercises, { asc }) => [asc(exercises.setOrder)],
              },
            },
          }),
        ctx,
      );

      if (!workout || workout.user_id !== ctx.user.id) {
        throw new Error("Workout not found");
      }

      return workout;
    }),

  // Get last exercise data for a given exercise name
  getLastExerciseData: protectedProcedure
    .input(
      z.object({
        exerciseName: z.string(),
        templateExerciseId: z.number().optional(),
        excludeSessionId: z.number().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const sets = (await monitoredDbQuery(
        "workouts.getLastExerciseData",
        () =>
          ctx.db.all(
            sql`
          SELECT se.weight, se.reps, se.sets, se.unit, se.setOrder, ws.workoutDate
          FROM session_exercise se
          INNER JOIN workout_session ws ON se.sessionId = ws.id
          WHERE se.user_id = ${ctx.user.id}
          AND se.exerciseName = ${input.exerciseName}
          ORDER BY ws.workoutDate DESC, se.setOrder ASC
          LIMIT 10
        `,
          ),
        ctx,
      )) as Array<{
        weight: number | null;
        reps: number;
        sets: number;
        unit: string;
        setOrder: number;
        workoutDate: Date;
      }>;

      if (sets.length === 0) {
        return null;
      }

      const bestSet = sets.reduce<(typeof sets)[number] | undefined>(
        (currentBest, set) => {
          if (set.weight == null) {
            return currentBest;
          }

          if (currentBest?.weight == null) {
            return set;
          }

          // Prefer higher weight, then higher reps
          if (set.weight > currentBest.weight) {
            return set;
          }

          if (
            set.weight === currentBest.weight &&
            set.reps > currentBest.reps
          ) {
            return set;
          }

          return currentBest;
        },
        undefined,
      );

      return {
        sets: sets.map((set, index) => ({
          id: `prev-${index}`,
          weight: set.weight,
          reps: set.reps,
          sets: set.sets,
          unit: set.unit,
        })),
        best: bestSet
          ? {
              weight: bestSet.weight,
              reps: bestSet.reps,
              sets: bestSet.sets,
              unit: bestSet.unit,
            }
          : undefined,
      };
    }),

  // Get latest performance data for template exercise using exercise linking
  getLatestPerformanceForTemplateExercise: protectedProcedure
    .input(
      z.object({
        templateExerciseId: z.number(),
        excludeSessionId: z.number().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      // Use a parameterized CTE query to get the best set in one round trip
      const result = await monitoredDbQuery(
        "workouts.getLatestPerformanceForTemplateExercise",
        () =>
          ctx.db.all(
            sql`
          WITH template_ex AS (
            SELECT id, exerciseName FROM template_exercise WHERE id = ${input.templateExerciseId} AND user_id = ${ctx.user.id}
          ),
          equivalent AS (
            SELECT te.exerciseName, el.templateExerciseId
            FROM exercise_link el
            LEFT JOIN template_exercise te ON te.id = el.templateExerciseId
            WHERE el.user_id = ${ctx.user.id} AND el.templateExerciseId = ${input.templateExerciseId}
            UNION ALL
            SELECT exerciseName, id FROM template_ex
          ),
          latest_session AS (
            SELECT ws.id as session_id, ws.workoutDate
            FROM session_exercise se
            INNER JOIN workout_session ws ON se.sessionId = ws.id
            WHERE se.user_id = ${ctx.user.id}
            AND (se.exerciseName IN (SELECT exerciseName FROM equivalent) OR se.templateExerciseId IN (SELECT templateExerciseId FROM equivalent))
            AND (${input.excludeSessionId} IS NULL OR se.sessionId != ${input.excludeSessionId})
            ORDER BY ws.workoutDate DESC
            LIMIT 1
          )
          SELECT se.weight, se.reps, se.sets, se.unit, ls.workoutDate
          FROM session_exercise se
          CROSS JOIN latest_session ls
          WHERE se.user_id = ${ctx.user.id}
          AND se.sessionId = ls.session_id
          AND (se.exerciseName IN (SELECT exerciseName FROM equivalent) OR se.templateExerciseId IN (SELECT templateExerciseId FROM equivalent))
          ORDER BY se.weight DESC
          LIMIT 1
        `,
          ),
        ctx,
      );

      if (!result || result.length === 0) {
        return null;
      }

      const bestSet = result[0] as any;

      return {
        weight: bestSet.weight,
        reps: bestSet.reps,
        sets: bestSet.sets,
        unit: bestSet.unit,
        workoutDate: bestSet.workout_date,
      };
    }),

  // Start a new workout session
  start: protectedProcedure
    .use(workoutRateLimit)
    .input(
      z.object({
        templateId: z.number().optional(),
        workoutDate: z.date().default(() => new Date()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        logger.debug("Starting workout session", {
          templateId: input.templateId,
        });

        // Use transaction to collapse sequential queries into single round-trip
        const result = await monitoredDbQuery(
          "workouts.start",
          () =>
            ctx.db.transaction(async (tx) => {
              let template = null;

              if (input.templateId) {
                // Check for recent duplicate session (within last 2 minutes)
                const recentSession = await tx.query.workoutSessions.findFirst({
                  where: and(
                    eq(workoutSessions.user_id, ctx.user.id),
                    eq(workoutSessions.templateId, input.templateId),
                    gte(
                      workoutSessions.workoutDate,
                      new Date(Date.now() - 120000),
                    ), // Within last 2 minutes
                  ),
                  orderBy: [desc(workoutSessions.workoutDate)],
                  with: {
                    exercises: true,
                  },
                });

                // If we found a recent session with the same template and no exercises (just started), return it
                if (recentSession && recentSession.exercises.length === 0) {
                  logger.debug("Returning existing recent session", {
                    sessionId: recentSession.id,
                  });

                  // Get the template info for the response
                  template = await tx.query.workoutTemplates.findFirst({
                    where: eq(workoutTemplates.id, input.templateId),
                    with: {
                      exercises: {
                        orderBy: (exercises, { asc }) => [
                          asc(exercises.orderIndex),
                        ],
                      },
                    },
                  });

                  return {
                    sessionId: recentSession.id,
                    template,
                  };
                }

                // Verify template ownership
                template = await tx.query.workoutTemplates.findFirst({
                  where: eq(workoutTemplates.id, input.templateId),
                  with: {
                    exercises: {
                      orderBy: (exercises, { asc }) => [
                        asc(exercises.orderIndex),
                      ],
                    },
                  },
                });

                logger.debug("Found template", { templateId: template?.id });
                if (!template || template.user_id !== ctx.user.id) {
                  throw new Error("Template not found");
                }
              }

              // Create workout session
              logger.debug("Inserting workout session");
              const [session] = await tx
                .insert(workoutSessions)
                .values({
                  user_id: ctx.user.id,
                  templateId: input.templateId || null,
                  workoutDate: input.workoutDate,
                })
                .returning();

              logger.debug("Inserted session", { sessionId: session?.id });
              if (!session) {
                throw new Error("Failed to create workout session");
              }

              return {
                sessionId: session.id,
                template,
              };
            }),
          ctx,
        );

        logger.debug("Start workout complete", { sessionId: result.sessionId });
        return result;
      } catch (err: any) {
        const { TRPCError } = await import("@trpc/server");
        const message = err?.message ?? "workouts.start failed";
        const meta = {
          name: err?.name,
          cause: err?.cause,
          stack: err?.stack,
          err,
        };
        logger.error("Start workout error", new Error(message), meta);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
          cause: meta,
        });
      }
    }),

  // Save workout session with exercises
  save: protectedProcedure
    .use(workoutRateLimit)
    .input(
      z.object({
        sessionId: z.number(),
        exercises: z.array(exerciseInputSchema),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Verify session ownership
      const session = await monitoredDbQuery("workouts.save.verify", () =>
        ctx.db.query.workoutSessions.findFirst({
          where: eq(workoutSessions.id, input.sessionId),
        }),
      );

      if (!session || session.user_id !== ctx.user.id) {
        throw new Error("Workout session not found");
      }

      // Delete existing exercises for this session
      await monitoredDbQuery("workouts.save.delete", () =>
        ctx.db
          .delete(sessionExercises)
          .where(eq(sessionExercises.sessionId, input.sessionId)),
      );

      // Flatten exercises into individual sets and filter out empty ones
      const setsToInsert = input.exercises.flatMap(
        (exercise) =>
          exercise.sets
            .filter(
              (set) =>
                set.weight !== undefined ||
                set.reps !== undefined ||
                set.sets !== undefined ||
                set.rpe !== undefined ||
                set.rest !== undefined,
            )
            .map((set, setIndex) => {
              const weight = set.weight ?? null;
              const reps = set.reps ?? null;
              const sets = set.sets ?? null;
              const oneRmEstimate = computeOneRmEstimate(weight, reps);
              const volumeLoad = computeVolumeLoad(weight, reps, sets);
              return {
                user_id: ctx.user.id,
                sessionId: input.sessionId,
                templateExerciseId: exercise.templateExerciseId,
                exerciseName: exercise.exerciseName,
                setOrder: setIndex,
                weight,
                reps,
                sets,
                unit: set.unit,
                // Phase 2 mappings
                rpe: set.rpe, // maps to session_exercise.rpe
                rest_seconds: set.rest, // maps to session_exercise.rest_seconds
                is_estimate: set.isEstimate ?? false,
                is_default_applied: set.isDefaultApplied ?? false,
                one_rm_estimate: oneRmEstimate,
                volume_load: volumeLoad,
              };
            }),
        ctx,
      );

      if (setsToInsert.length > 0) {
        await monitoredDbQuery("workouts.save.insert", () =>
          ctx.db.insert(sessionExercises).values(setsToInsert),
        );
      }

      if (setsToInsert.length > 0) {
        const acceptLanguage = ctx.headers.get("accept-language") ?? undefined;
        const locale = acceptLanguage?.split(",")[0];

        void (async () => {
          try {
            await generateAndPersistDebrief({
              dbClient: ctx.db,
              userId: ctx.user.id,
              sessionId: input.sessionId,
              locale,
              trigger: "auto",
              requestId: ctx.requestId,
            });
          } catch (error) {
            logger.warn("session_debrief.auto_generation_failed", {
              userId: ctx.user.id,
              sessionId: input.sessionId,
              error: error instanceof Error ? error.message : "unknown",
            });
          }
        })();
      }

      return { success: true };
    }),

  // Update specific sets in a workout session (for accepting AI suggestions)
  updateSessionSets: protectedProcedure
    .use(workoutRateLimit)
    .input(
      z.object({
        sessionId: z.number(),
        updates: z.array(
          z.object({
            setId: z.string(), // Format: "{templateExerciseId}_{setIndex}"
            exerciseName: z.string(),
            setIndex: z.number().int().min(0).optional(), // 0-based index for direct targeting
            weight: z.number().optional(),
            reps: z.number().int().positive().optional(),
            unit: z.enum(["kg", "lbs"]).default("kg"),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Verify session ownership
      const session = await monitoredDbQuery(
        "workouts.updateSessionSets.verify",
        () =>
          ctx.db.query.workoutSessions.findFirst({
            where: eq(workoutSessions.id, input.sessionId),
          }),
        ctx,
      );

      if (!session || session.user_id !== ctx.user.id) {
        throw new Error("Workout session not found");
      }

      if (input.updates.length === 0) {
        return { success: true, updatedCount: 0 };
      }

      const exerciseNames = Array.from(
        new Set(input.updates.map((update) => update.exerciseName)),
      );

      if (exerciseNames.length === 0) {
        return { success: true, updatedCount: 0 };
      }

      const existingSets = await monitoredDbQuery(
        "workouts.updateSessionSets.select",
        () =>
          ctx.db
            .select({
              id: sessionExercises.id,
              exerciseName: sessionExercises.exerciseName,
              setOrder: sessionExercises.setOrder,
            })
            .from(sessionExercises)
            .where(
              and(
                eq(sessionExercises.user_id, ctx.user.id),
                eq(sessionExercises.sessionId, input.sessionId),
                inArray(sessionExercises.exerciseName, exerciseNames),
              ),
            )
            .orderBy(sessionExercises.setOrder),
      );

      const setsByExercise = new Map<
        string,
        { id: number; setOrder: number }[]
      >();
      const setIdIndex = new Map<string, number>();

      for (const set of existingSets) {
        const buckets = setsByExercise.get(set.exerciseName) ?? [];
        const normalizedSetOrder = set.setOrder ?? 0;
        buckets.push({ id: set.id, setOrder: normalizedSetOrder });
        setsByExercise.set(set.exerciseName, buckets);
      }

      for (const [exerciseName, sets] of setsByExercise) {
        sets.sort((a, b) => a.setOrder - b.setOrder);
        for (const set of sets) {
          setIdIndex.set(`${exerciseName}:${set.setOrder}`, set.id);
        }
      }

      const updatesMap = new Map<number, (typeof input.updates)[0]>();

      for (const update of input.updates) {
        let setIndex: number | undefined = update.setIndex;

        if (setIndex === undefined) {
          const setIdMatch = /_set_(\d+)$/.exec(update.setId);
          if (!setIdMatch?.[1]) {
            logger.warn("workout.update.invalid_set_id", {
              sessionId: input.sessionId,
              setId: update.setId,
            });
            continue;
          }

          setIndex = Number.parseInt(setIdMatch[1] ?? "1", 10) - 1;
        }

        if (Number.isNaN(setIndex) || setIndex < 0) {
          logger.warn("workout.update.invalid_set_index", {
            sessionId: input.sessionId,
            setIndex,
            exerciseName: update.exerciseName,
          });
          continue;
        }

        const setsForExercise = setsByExercise.get(update.exerciseName) ?? [];
        if (setIndex >= setsForExercise.length) {
          logger.warn("workout.update.set_index_out_of_range", {
            sessionId: input.sessionId,
            setIndex,
            exerciseName: update.exerciseName,
            availableSets: setsForExercise.length,
          });
          continue;
        }

        const targetSetOrder = setsForExercise[setIndex]!.setOrder;
        const targetId = setIdIndex.get(
          `${update.exerciseName}:${targetSetOrder}`,
        );

        if (!targetId) {
          logger.warn("workout.update.target_not_found", {
            sessionId: input.sessionId,
            setIndex,
            exerciseName: update.exerciseName,
          });
          continue;
        }

        updatesMap.set(targetId, update);
      }

      if (updatesMap.size === 0) {
        return { success: true, updatedCount: 0 };
      }

      const ids = Array.from(updatesMap.keys());

      const weightCases = Array.from(updatesMap.entries())
        .map(([id, update]) => sql`WHEN ${id} THEN ${update.weight}`)
        .join(" ");
      const repsCases = Array.from(updatesMap.entries())
        .map(([id, update]) => sql`WHEN ${id} THEN ${update.reps}`)
        .join(" ");
      const unitCases = Array.from(updatesMap.entries())
        .map(([id, update]) => sql`WHEN ${id} THEN ${update.unit}`)
        .join(" ");

      await monitoredDbQuery("workouts.updateSessionSets.update", () =>
        ctx.db
          .update(sessionExercises)
          .set({
            weight: sql`CASE id ${weightCases} END`,
            reps: sql`CASE id ${repsCases} END`,
            unit: sql`CASE id ${unitCases} END`,
          })
          .where(
            and(
              inArray(sessionExercises.id, ids),
              eq(sessionExercises.user_id, ctx.user.id),
            ),
          ),
      );

      const rowsForRecalc = await monitoredDbQuery(
        "workouts.updateSessionSets.recomputeFetch",
        () =>
          ctx.db
            .select({
              id: sessionExercises.id,
              weight: sessionExercises.weight,
              reps: sessionExercises.reps,
              sets: sessionExercises.sets,
            })
            .from(sessionExercises)
            .where(
              and(
                inArray(sessionExercises.id, ids),
                eq(sessionExercises.user_id, ctx.user.id),
              ),
            ),
        ctx,
      );

      if (rowsForRecalc.length > 0) {
        const oneRmCases = sql.join(
          rowsForRecalc.map(
            (row) =>
              sql`WHEN ${row.id} THEN ${computeOneRmEstimate(
                row.weight,
                row.reps,
              )}`,
          ),
          sql` `,
        );
        const volumeCases = sql.join(
          rowsForRecalc.map(
            (row) =>
              sql`WHEN ${row.id} THEN ${computeVolumeLoad(
                row.weight,
                row.reps,
                row.sets,
              )}`,
          ),
          sql` `,
        );

        await monitoredDbQuery("workouts.updateSessionSets.recompute", () =>
          ctx.db
            .update(sessionExercises)
            .set({
              one_rm_estimate: sql`CASE id ${oneRmCases} ELSE one_rm_estimate END`,
              volume_load: sql`CASE id ${volumeCases} ELSE volume_load END`,
            })
            .where(
              and(
                inArray(sessionExercises.id, ids),
                eq(sessionExercises.user_id, ctx.user.id),
              ),
            ),
        );
      }

      return { success: true, updatedCount: updatesMap.size };
    }),

  // Delete a workout session
  delete: protectedProcedure
    .use(workoutRateLimit)
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership before deleting
      const existingSession = await monitoredDbQuery(
        "workouts.delete.verify",
        () =>
          ctx.db.query.workoutSessions.findFirst({
            where: eq(workoutSessions.id, input.id),
          }),
        ctx,
      );

      if (!existingSession || existingSession.user_id !== ctx.user.id) {
        throw new Error("Workout session not found");
      }

      await monitoredDbQuery("workouts.delete.session", () =>
        ctx.db.delete(workoutSessions).where(eq(workoutSessions.id, input.id)),
      );

      return { success: true };
    }),

  // Batch save multiple workout sessions (for offline queue processing)
  batchSave: protectedProcedure
    .use(workoutRateLimit)
    .input(
      z.object({
        workouts: z.array(
          z.object({
            sessionId: z.number(),
            exercises: z.array(exerciseInputSchema),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.workouts.length === 0) {
        return { success: true, processedCount: 0 };
      }

      const startTime = Date.now();
      let totalSetsInserted = 0;

      try {
        // Process each workout in the batch
        for (const workout of input.workouts) {
          // Verify session ownership
          const session = await monitoredDbQuery(
            "workouts.batchSave.verify",
            () =>
              ctx.db.query.workoutSessions.findFirst({
                where: eq(workoutSessions.id, workout.sessionId),
              }),
            ctx,
          );

          if (!session || session.user_id !== ctx.user.id) {
            throw new Error(`Workout session ${workout.sessionId} not found`);
          }

          // Delete existing exercises for this session
          await monitoredDbQuery("workouts.batchSave.delete", () =>
            ctx.db
              .delete(sessionExercises)
              .where(eq(sessionExercises.sessionId, workout.sessionId)),
          );

          // Flatten exercises into individual sets and filter out empty ones
          const setsToInsert = workout.exercises.flatMap((exercise) =>
            exercise.sets
              .filter(
                (set) =>
                  set.weight !== undefined ||
                  set.reps !== undefined ||
                  set.sets !== undefined ||
                  set.rpe !== undefined ||
                  set.rest !== undefined,
              )
              .map((set, setIndex) => {
                const weight = set.weight ?? null;
                const reps = set.reps ?? null;
                const sets = set.sets ?? null;
                const oneRmEstimate = computeOneRmEstimate(weight, reps);
                const volumeLoad = computeVolumeLoad(weight, reps, sets);

                return {
                  user_id: ctx.user.id,
                  sessionId: workout.sessionId,
                  templateExerciseId: exercise.templateExerciseId,
                  exerciseName: exercise.exerciseName,
                  setOrder: setIndex,
                  weight,
                  reps,
                  sets,
                  unit: set.unit,
                  rpe: set.rpe,
                  rest_seconds: set.rest,
                  is_estimate: set.isEstimate ?? false,
                  is_default_applied: set.isDefaultApplied ?? false,
                  one_rm_estimate: oneRmEstimate,
                  volume_load: volumeLoad,
                };
              }),
          );

          if (setsToInsert.length > 0) {
            await monitoredDbQuery("workouts.batchSave.insert", () =>
              ctx.db.insert(sessionExercises).values(setsToInsert),
            );
            totalSetsInserted += setsToInsert.length;
          }

          // Generate debrief for workouts with sets
          if (setsToInsert.length > 0) {
            const acceptLanguage =
              ctx.headers.get("accept-language") ?? undefined;
            const locale = acceptLanguage?.split(",")[0];

            void (async () => {
              try {
                await generateAndPersistDebrief({
                  dbClient: ctx.db,
                  userId: ctx.user.id,
                  sessionId: workout.sessionId,
                  locale,
                  trigger: "auto",
                  requestId: ctx.requestId,
                });
              } catch (error) {
                logger.warn("session_debrief.batch_auto_generation_failed", {
                  userId: ctx.user.id,
                  sessionId: workout.sessionId,
                  error: error instanceof Error ? error.message : "unknown",
                });
              }
            })();
          }
        }

        const duration = Date.now() - startTime;
        logger.info("Batch workout save completed", {
          workoutCount: input.workouts.length,
          totalSetsInserted,
          durationMs: duration,
          requestId: ctx.requestId,
        });

        return { success: true, processedCount: input.workouts.length };
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error("Batch workout save failed", error, {
          workoutCount: input.workouts.length,
          durationMs: duration,
          requestId: ctx.requestId,
        });
        throw error;
      }
    }),
});
