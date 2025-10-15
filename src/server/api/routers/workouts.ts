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

export const workoutsRouter = createTRPCRouter({
  // Get recent workouts for the current user
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().default(10) }))
    .query(async ({ input, ctx }) => {
      logger.debug("Getting recent workouts", { limit: input.limit });
      return ctx.db.query.workoutSessions.findMany({
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
            with: {
              exercises: {
                columns: {
                  id: true,
                  exerciseName: true,
                  orderIndex: true,
                },
              },
            },
          },
          exercises: {
            columns: {
              id: true,
              exerciseName: true,
              weight: true,
              reps: true,
              sets: true,
              unit: true,
              setOrder: true,
              templateExerciseId: true,
              one_rm_estimate: true,
              volume_load: true,
            },
          },
        },
      });
    }),

  // Get a specific workout session
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const workout = await ctx.db.query.workoutSessions.findFirst({
        where: eq(workoutSessions.id, input.id),
        columns: {
          id: true,
          workoutDate: true,
          templateId: true,
          user_id: true,
          createdAt: true,
        },
        with: {
          template: {
            columns: {
              id: true,
              name: true,
            },
            with: {
              exercises: {
                columns: {
                  id: true,
                  exerciseName: true,
                  orderIndex: true,
                },
              },
            },
          },
          exercises: {
            columns: {
              id: true,
              exerciseName: true,
              weight: true,
              reps: true,
              sets: true,
              unit: true,
              setOrder: true,
              templateExerciseId: true,
              one_rm_estimate: true,
              volume_load: true,
            },
          },
        },
      });

      if (!workout || workout.user_id !== ctx.user.id) {
        throw new Error("Workout not found");
      }

      return workout;
    }),

  // Get last workout data for a specific exercise (for pre-populating)
  getLastExerciseData: protectedProcedure
    .input(
      z.object({
        exerciseName: z.string(),
        templateId: z.number().optional(),
        excludeSessionId: z.number().optional(),
        templateExerciseId: z.number().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const query = sql`
        WITH vars AS (
          SELECT
            ${input.exerciseName} AS exerciseName,
            ${input.templateExerciseId} AS templateExerciseId,
            ${ctx.user.id} AS userId,
            ${input.excludeSessionId} AS excludeSessionId
        ),
         linked AS (
           SELECT el.masterExerciseId, me.name AS exerciseName, el.templateExerciseId
           FROM exercise_link el
           JOIN master_exercise me ON me.id = el.masterExerciseId
           WHERE el.user_id = (SELECT userId FROM vars)
           AND (SELECT templateExerciseId FROM vars) IS NOT NULL
           AND el.templateExerciseId = (SELECT templateExerciseId FROM vars)
         ),
        all_exercises AS (
          SELECT (SELECT exerciseName FROM vars) AS exerciseName
          UNION ALL
          SELECT exerciseName FROM linked WHERE masterExerciseId IS NOT NULL
        ),
         all_template_ids AS (
           SELECT (SELECT templateExerciseId FROM vars) AS templateExerciseId
           WHERE (SELECT templateExerciseId FROM vars) IS NOT NULL
           UNION
           SELECT templateExerciseId FROM linked WHERE masterExerciseId IS NOT NULL
         ),
        latest_session AS (
          SELECT se.sessionId
          FROM session_exercise se
          JOIN workout_session ws ON se.sessionId = ws.id
          WHERE se.user_id = (SELECT userId FROM vars)
          AND (se.exerciseName IN (SELECT exerciseName FROM all_exercises) OR se.templateExerciseId IN (SELECT templateExerciseId FROM all_template_ids))
          AND ((SELECT excludeSessionId FROM vars) IS NULL OR se.sessionId != (SELECT excludeSessionId FROM vars))
          ORDER BY ws.workoutDate DESC
          LIMIT 1
        ),
        sets AS (
          SELECT se.weight, se.reps, se.sets, se.unit, se.setOrder
          FROM session_exercise se
          JOIN latest_session ls ON se.sessionId = ls.sessionId
          WHERE se.user_id = (SELECT userId FROM vars)
          AND (se.exerciseName IN (SELECT exerciseName FROM all_exercises) OR se.templateExerciseId IN (SELECT templateExerciseId FROM all_template_ids))
          ORDER BY se.setOrder
        )
        SELECT * FROM sets
      `;

      const rows = (await ctx.db.all(query)) as any[];

      if (rows.length === 0) {
        return null;
      }

      const sets = rows.map((row: any, index: number) => ({
        id: `prev-${index}`,
        weight: row.weight ?? undefined,
        reps: row.reps ?? undefined,
        sets: row.sets ?? 1,
        unit: row.unit as "kg" | "lbs",
      }));

      const bestSet = sets.reduce<(typeof sets)[number] | undefined>(
        (currentBest, set) => {
          if (set.weight == null) {
            return currentBest;
          }

          if (!currentBest || (currentBest.weight ?? 0) < set.weight) {
            return set;
          }

          return currentBest;
        },
        undefined,
      );

      return {
        sets,
        best: bestSet
          ? {
              weight: bestSet.weight,
              reps: bestSet.reps ?? undefined,
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
      const query = sql`
        WITH vars AS (
          SELECT
            ${input.templateExerciseId} AS templateExerciseId,
            ${ctx.user.id} AS userId,
            ${input.excludeSessionId} AS excludeSessionId
        ),
        linked AS (
          SELECT el.masterExerciseId, te.exerciseName, el.templateExerciseId
          FROM exercise_link el
          LEFT JOIN template_exercise te ON te.id = el.templateExerciseId
          WHERE el.user_id = (SELECT userId FROM vars) AND el.templateExerciseId = (SELECT templateExerciseId FROM vars)
        ),
        all_exercises AS (
          SELECT te.exerciseName FROM template_exercise te WHERE te.id = (SELECT templateExerciseId FROM vars) AND te.user_id = (SELECT userId FROM vars)
          UNION
          SELECT exerciseName FROM linked WHERE masterExerciseId IS NOT NULL
        ),
        all_template_ids AS (
          SELECT (SELECT templateExerciseId FROM vars) AS templateExerciseId
          UNION
          SELECT templateExerciseId FROM linked WHERE masterExerciseId IS NOT NULL
        ),
        latest_session AS (
          SELECT se.sessionId
          FROM session_exercise se
          JOIN workout_session ws ON se.sessionId = ws.id
          WHERE se.user_id = (SELECT userId FROM vars)
          AND (se.exerciseName IN (SELECT exerciseName FROM all_exercises) OR se.templateExerciseId IN (SELECT templateExerciseId FROM all_template_ids))
          AND ((SELECT excludeSessionId FROM vars) IS NULL OR se.sessionId != (SELECT excludeSessionId FROM vars))
          ORDER BY ws.workoutDate DESC
          LIMIT 1
        ),
        performance AS (
          SELECT se.weight, se.reps, se.sets, se.unit, ws.workoutDate AS workoutDate
          FROM session_exercise se
          JOIN workout_session ws ON se.sessionId = ws.id
          JOIN latest_session ls ON se.sessionId = ls.sessionId
          WHERE se.user_id = (SELECT userId FROM vars)
          AND (se.exerciseName IN (SELECT exerciseName FROM all_exercises) OR se.templateExerciseId IN (SELECT templateExerciseId FROM all_template_ids))
          ORDER BY se.weight DESC
          LIMIT 1
        )
        SELECT * FROM performance
      `;

      const rows = (await ctx.db.all(query)) as any[];

      return rows[0]
        ? {
            weight: rows[0].weight,
            reps: rows[0].reps,
            sets: rows[0].sets,
            unit: rows[0].unit,
            workoutDate: rows[0].workoutDate,
          }
        : null;
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

        let template = null;

        if (input.templateId) {
          // Check for recent duplicate session (within last 2 minutes)
          const recentSession = await ctx.db.query.workoutSessions.findFirst({
            where: and(
              eq(workoutSessions.user_id, ctx.user.id),
              eq(workoutSessions.templateId, input.templateId),
              gte(workoutSessions.workoutDate, new Date(Date.now() - 120000)), // Within last 2 minutes
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
            template = await ctx.db.query.workoutTemplates.findFirst({
              where: eq(workoutTemplates.id, input.templateId),
              with: {
                exercises: {
                  orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
                },
              },
            });

            return {
              sessionId: recentSession.id,
              template,
            };
          }

          // Verify template ownership
          template = await ctx.db.query.workoutTemplates.findFirst({
            where: eq(workoutTemplates.id, input.templateId),
            with: {
              exercises: {
                orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
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
        const [session] = await ctx.db
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

        const result = {
          sessionId: session.id,
          template,
        };
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
      const session = await ctx.db.query.workoutSessions.findFirst({
        where: eq(workoutSessions.id, input.sessionId),
      });

      if (!session || session.user_id !== ctx.user.id) {
        throw new Error("Workout session not found");
      }

      // Delete existing exercises for this session
      await ctx.db
        .delete(sessionExercises)
        .where(eq(sessionExercises.sessionId, input.sessionId));

      // Flatten exercises into individual sets and filter out empty ones
      const setsToInsert = input.exercises.flatMap((exercise) =>
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
            const weight = set.weight ?? 0;
            const reps = set.reps ?? 1;
            const sets = set.sets ?? 1;
            return {
              user_id: ctx.user.id,
              sessionId: input.sessionId,
              templateExerciseId: exercise.templateExerciseId,
              exerciseName: exercise.exerciseName,
              setOrder: setIndex,
              weight: set.weight,
              reps: set.reps,
              sets: set.sets,
              unit: set.unit,
              // Phase 2 mappings
              rpe: set.rpe, // maps to session_exercise.rpe
              rest_seconds: set.rest, // maps to session_exercise.rest_seconds
              is_estimate: set.isEstimate ?? false,
              is_default_applied: set.isDefaultApplied ?? false,
              // Computed columns
              one_rm_estimate:
                weight > 0 && reps > 0 ? weight * (1 + reps / 30) : null,
              volume_load:
                weight > 0 && reps > 0 && sets > 0
                  ? sets * reps * weight
                  : null,
            };
          }),
      );

      if (setsToInsert.length > 0) {
        await ctx.db.insert(sessionExercises).values(setsToInsert);
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
      const session = await ctx.db.query.workoutSessions.findFirst({
        where: eq(workoutSessions.id, input.sessionId),
      });

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

      const existingSets = await ctx.db
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
        .orderBy(sessionExercises.setOrder);

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

      await ctx.db
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
        );

      return { success: true, updatedCount: updatesMap.size };
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
      const results = [];

      for (const workout of input.workouts) {
        try {
          // Verify session ownership
          const session = await ctx.db.query.workoutSessions.findFirst({
            where: eq(workoutSessions.id, workout.sessionId),
          });

          if (!session || session.user_id !== ctx.user.id) {
            results.push({
              sessionId: workout.sessionId,
              success: false,
              error: "Workout session not found",
            });
            continue;
          }

          // Delete existing exercises for this session
          await ctx.db
            .delete(sessionExercises)
            .where(eq(sessionExercises.sessionId, workout.sessionId));

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
                const weight = set.weight ?? 0;
                const reps = set.reps ?? 1;
                const sets = set.sets ?? 1;
                return {
                  user_id: ctx.user.id,
                  sessionId: workout.sessionId,
                  templateExerciseId: exercise.templateExerciseId,
                  exerciseName: exercise.exerciseName,
                  setOrder: setIndex,
                  weight: set.weight,
                  reps: set.reps,
                  sets: set.sets,
                  unit: set.unit,
                  // Phase 2 mappings
                  rpe: set.rpe, // maps to session_exercise.rpe
                  rest_seconds: set.rest, // maps to session_exercise.rest_seconds
                  is_estimate: set.isEstimate ?? false,
                  is_default_applied: set.isDefaultApplied ?? false,
                  // Computed columns
                  one_rm_estimate:
                    weight > 0 && reps > 0 ? weight * (1 + reps / 30) : null,
                  volume_load:
                    weight > 0 && reps > 0 && sets > 0
                      ? sets * reps * weight
                      : null,
                };
              }),
          );

          if (setsToInsert.length > 0) {
            await ctx.db.insert(sessionExercises).values(setsToInsert);
          }

          // Generate debrief if there are sets
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
                logger.warn("session_debrief.auto_generation_failed", {
                  userId: ctx.user.id,
                  sessionId: workout.sessionId,
                  error: error instanceof Error ? error.message : "unknown",
                });
              }
            })();
          }

          results.push({
            sessionId: workout.sessionId,
            success: true,
          });
        } catch (error) {
          results.push({
            sessionId: workout.sessionId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return { results };
    }),

  // Delete a workout session
  delete: protectedProcedure
    .use(workoutRateLimit)
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership before deleting
      const existingSession = await ctx.db.query.workoutSessions.findFirst({
        where: eq(workoutSessions.id, input.id),
      });

      if (!existingSession || existingSession.user_id !== ctx.user.id) {
        throw new Error("Workout session not found");
      }

      await ctx.db
        .delete(workoutSessions)
        .where(eq(workoutSessions.id, input.id));

      return { success: true };
    }),
});
