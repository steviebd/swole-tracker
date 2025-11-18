import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { workoutRateLimit } from "~/lib/rate-limit-middleware";
import {
  workoutSessions,
  sessionExercises,
  workoutTemplates,
  templateExercises,
  exerciseLinks,
  masterExercises,
  exerciseSets,
  userPreferences,
} from "~/server/db/schema";
import {
  loadResolvedExerciseNameMap,
  resolveExerciseNameWithLookup,
} from "~/server/db/utils";
// Note: exerciseNameResolutionView replaced with raw SQL queries
import { eq, desc, and, ne, inArray, gte, asc, lt } from "drizzle-orm";

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

// Warm-Up Sets: Individual exercise set schema (Phase 2)
const exerciseSetInputSchema = z.object({
  setNumber: z.number().int().positive(),
  setType: z.enum(["warmup", "working", "backoff", "drop"]).default("working"),
  weight: z.number().nonnegative().nullable(),
  reps: z.number().int().positive(),
  rpe: z.number().int().min(1).max(10).optional(),
  restSeconds: z.number().int().positive().optional(),
  completed: z.boolean().optional(),
  notes: z.string().optional(),
});

const exerciseInputSchema = z.object({
  templateExerciseId: z.number().optional(),
  exerciseName: z.string().min(1).max(256),
  sets: z.array(setInputSchema),
  unit: z.enum(["kg", "lbs"]).default("kg"),
  // Warm-Up Sets: Optional array of individual sets with set-level granularity
  exerciseSets: z.array(exerciseSetInputSchema).optional(),
});

import { logger } from "~/lib/logger";
import {
  generateAndPersistDebrief,
  type GenerateDebriefOptions,
} from "~/server/api/services/session-debrief";
import {
  chunkArray,
  chunkedBatch,
  getInsertChunkSize,
  SQLITE_VARIABLE_LIMIT,
  whereInChunks,
} from "~/server/db/chunk-utils";
import { invalidateQueries } from "~/trpc/cache-config";
import {
  detectWarmupPattern,
  generateDefaultWarmupProtocol,
  calculateVolumeBreakdown,
} from "~/server/api/utils/warmup-pattern-detection";

export const workoutsRouter = createTRPCRouter({
  // Get recent workouts for the current user
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().default(10) }))
    .query(async ({ input, ctx }) => {
      const staleThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000);

      await ctx.db.delete(workoutSessions).where(
        and(
          eq(workoutSessions.user_id, ctx.user.id),
          lt(workoutSessions.createdAt, staleThreshold),
          sql`NOT EXISTS (
              SELECT 1 FROM session_exercise se
              WHERE se.sessionId = ${workoutSessions.id}
                AND se.user_id = ${ctx.user.id}
            )`,
        ),
      );

      logger.debug("Getting recent workouts", { limit: input.limit });
      // 1. Fetch sessions without template details
      const sessions = await ctx.db.query.workoutSessions.findMany({
        where: and(
          eq(workoutSessions.user_id, ctx.user.id),
          sql`EXISTS (
            SELECT 1 FROM session_exercise se
            WHERE se.sessionId = ${workoutSessions.id}
              AND se.user_id = ${ctx.user.id}
          )`,
        ),
        orderBy: [desc(workoutSessions.workoutDate)],
        limit: input.limit,
        columns: {
          id: true,
          workoutDate: true,
          templateId: true,
          createdAt: true,
        },
        with: {
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

      // Safety check: ensure sessions is defined
      if (!sessions) {
        throw new Error("Sessions query returned undefined");
      }

      // 2. Get unique template IDs
      const templateIds = [
        ...new Set(
          sessions
            .map((s) => s.templateId)
            .filter((id): id is number => id !== null),
        ),
      ];

      // 3. Batch fetch templates once
      const templates =
        templateIds.length > 0
          ? await ctx.db.query.workoutTemplates.findMany({
              where: inArray(workoutTemplates.id, templateIds),
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
            })
          : [];

      // 4. Create lookup map
      const templateMap = new Map(templates.map((t) => [t.id, t]));

      // 5. Attach templates to sessions
      const sessionsWithTemplates = sessions.map((session) => ({
        ...session,
        template: session.templateId
          ? (templateMap.get(session.templateId) ?? null)
          : null,
      }));

      return sessionsWithTemplates;
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
      // Build exercise name filter conditions
      const exerciseConditions = [
        eq(sessionExercises.exerciseName, input.exerciseName),
      ];

      // If templateExerciseId is provided, also include linked exercise names
      if (input.templateExerciseId) {
        const linkedNames = await ctx.db
          .select({
            resolvedName: sql<string>`
              COALESCE(${masterExercises.name}, ${templateExercises.exerciseName})
            `,
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
          .where(eq(templateExercises.id, input.templateExerciseId));

        for (const linked of linkedNames) {
          if (
            linked.resolvedName &&
            linked.resolvedName !== input.exerciseName
          ) {
            exerciseConditions.push(
              eq(sessionExercises.exerciseName, linked.resolvedName),
            );
          }
        }
      }

      // Get the latest session with matching exercises
      const latestSession = await ctx.db
        .select({ sessionId: sessionExercises.sessionId })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(sessionExercises.sessionId, workoutSessions.id),
        )
        .where(
          and(
            eq(sessionExercises.user_id, ctx.user.id),
            or(...exerciseConditions),
            input.excludeSessionId
              ? ne(sessionExercises.sessionId, input.excludeSessionId)
              : undefined,
          ),
        )
        .orderBy(desc(workoutSessions.workoutDate))
        .limit(1);

      if (latestSession.length === 0) {
        return null;
      }

      // Get all sets from that session
      const rows = await ctx.db
        .select({
          weight: sessionExercises.weight,
          reps: sessionExercises.reps,
          sets: sessionExercises.sets,
          unit: sessionExercises.unit,
          setOrder: sessionExercises.setOrder,
        })
        .from(sessionExercises)
        .where(
          and(
            eq(sessionExercises.sessionId, latestSession[0]!.sessionId),
            eq(sessionExercises.user_id, ctx.user.id),
            or(...exerciseConditions),
          ),
        )
        .orderBy(sessionExercises.setOrder);

      if (rows.length === 0) {
        return null;
      }

      const sets = rows.map((row, index) => ({
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
      // Get resolved exercise names for this template exercise
      const resolvedNames = await ctx.db
        .select({
          resolvedName: sql<string>`
            COALESCE(${masterExercises.name}, ${templateExercises.exerciseName})
          `,
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
        .where(eq(templateExercises.id, input.templateExerciseId));

      const exerciseNames = resolvedNames
        .map((r) => r.resolvedName)
        .filter(Boolean) as string[];

      if (exerciseNames.length === 0) {
        return null;
      }

      // Find the latest session with these exercises
      const latestSession = await ctx.db
        .select({ sessionId: sessionExercises.sessionId })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(sessionExercises.sessionId, workoutSessions.id),
        )
        .where(
          and(
            eq(sessionExercises.user_id, ctx.user.id),
            or(
              inArray(sessionExercises.exerciseName, exerciseNames),
              eq(sessionExercises.templateExerciseId, input.templateExerciseId),
            ),
            input.excludeSessionId
              ? ne(sessionExercises.sessionId, input.excludeSessionId)
              : undefined,
          ),
        )
        .orderBy(desc(workoutSessions.workoutDate))
        .limit(1);

      if (latestSession.length === 0) {
        return null;
      }

      // Get the best performance from that session
      const performance = await ctx.db
        .select({
          weight: sessionExercises.weight,
          reps: sessionExercises.reps,
          sets: sessionExercises.sets,
          unit: sessionExercises.unit,
          workoutDate: workoutSessions.workoutDate,
        })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(sessionExercises.sessionId, workoutSessions.id),
        )
        .where(
          and(
            eq(sessionExercises.sessionId, latestSession[0]!.sessionId),
            eq(sessionExercises.user_id, ctx.user.id),
            or(
              inArray(sessionExercises.exerciseName, exerciseNames),
              eq(sessionExercises.templateExerciseId, input.templateExerciseId),
            ),
          ),
        )
        .orderBy(desc(sessionExercises.weight))
        .limit(1);

      return performance[0]
        ? {
            weight: performance[0].weight,
            reps: performance[0].reps,
            sets: performance[0].sets,
            unit: performance[0].unit,
            workoutDate: performance[0].workoutDate,
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
        copyFromSessionId: z.number().optional(),
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
          if (recentSession?.exercises.length === 0) {
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

        // If copying from another session, copy the exercises
        if (input.copyFromSessionId) {
          const sourceExercises = await ctx.db.query.sessionExercises.findMany({
            where: and(
              eq(sessionExercises.sessionId, input.copyFromSessionId),
              eq(sessionExercises.user_id, ctx.user.id),
            ),
          });

          if (sourceExercises.length > 0) {
            // Chunk the inserts to avoid D1 parameter limits
            const exerciseRows = sourceExercises.map((ex) => ({
              sessionId: session.id,
              user_id: ctx.user.id,
              exerciseName: ex.exerciseName,
              weight: ex.weight,
              reps: ex.reps,
              sets: ex.sets,
              unit: ex.unit,
              setOrder: ex.setOrder,
              templateExerciseId: ex.templateExerciseId,
              one_rm_estimate: ex.one_rm_estimate,
              volume_load: ex.volume_load,
            }));
            await chunkedBatch(
              ctx.db,
              exerciseRows,
              (chunk) => ctx.db.insert(sessionExercises).values(chunk),
              { limit: 50 },
            ); // Lower limit for D1 safety
          }
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
      try {
        // Verify session ownership
        const session = await ctx.db.query.workoutSessions.findFirst({
          where: eq(workoutSessions.id, input.sessionId),
        });

        if (!session || session.user_id !== ctx.user.id) {
          throw new Error("Workout session not found");
        }

        // Delete existing exercises (and cascading exercise_sets) for this session
        await ctx.db
          .delete(sessionExercises)
          .where(eq(sessionExercises.sessionId, input.sessionId));

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

        // Handle new exerciseSets format (Phase 2: Warm-Up Sets)
        // Determine if any exercise uses the new exerciseSets format
        const usesNewFormat = input.exercises.some(
          (ex) => ex.exerciseSets && ex.exerciseSets.length > 0,
        );

        if (usesNewFormat) {
          // New format: Create session_exercise rows with aggregated stats + individual exercise_sets rows
          for (const exercise of input.exercises) {
            if (!exercise.exerciseSets || exercise.exerciseSets.length === 0) {
              continue; // Skip exercises without exerciseSets data
            }

            const templateExerciseId = exercise.templateExerciseId ?? null;
            const hasValidTemplateExercise =
              templateExerciseId !== null &&
              resolvedNameLookup.has(templateExerciseId);

            const resolvedTemplateExerciseId = hasValidTemplateExercise
              ? templateExerciseId
              : null;

            const { name: resolvedExerciseName } =
              resolveExerciseNameWithLookup(
                templateExerciseId,
                exercise.exerciseName,
                resolvedNameLookup,
              );

            // Compute aggregated stats from exerciseSets
            const stats = computeAggregatedStats(exercise.exerciseSets);

            // Create session_exercise row with aggregated stats
            const [sessionExerciseRow] = await ctx.db
              .insert(sessionExercises)
              .values({
                user_id: ctx.user.id,
                sessionId: input.sessionId,
                templateExerciseId: resolvedTemplateExerciseId,
                exerciseName: exercise.exerciseName,
                resolvedExerciseName,
                setOrder: 0, // Not used in new format
                weight: stats.topSetWeight,
                reps: null, // Not meaningful when sets vary
                sets: stats.totalSets,
                unit: exercise.unit ?? "kg",
                usesSetTable: true, // Flag this as using the new format
                totalSets: stats.totalSets,
                workingSets: stats.workingSets,
                warmupSets: stats.warmupSets,
                topSetWeight: stats.topSetWeight,
                totalVolume: stats.totalVolume,
                workingVolume: stats.workingVolume,
              })
              .returning({ id: sessionExercises.id });

            if (!sessionExerciseRow) {
              throw new Error("Failed to create session exercise");
            }

            // Create individual exercise_sets rows with chunking
            const exerciseSetsToInsert = exercise.exerciseSets.map((set) => ({
              id: crypto.randomUUID(),
              sessionExerciseId: sessionExerciseRow.id,
              userId: ctx.user.id,
              setNumber: set.setNumber,
              setType: set.setType,
              weight: set.weight,
              reps: set.reps,
              rpe: set.rpe ?? null,
              restSeconds: set.restSeconds ?? null,
              completed: set.completed ?? true, // Assume completed if not specified
              notes: set.notes ?? null,
              createdAt: new Date(),
              completedAt: set.completed ? new Date() : null,
            }));

            // Use chunkedBatch to safely insert exercise_sets (D1 limit protection)
            // exercise_sets has 11 columns, so chunk size ~6 rows
            await chunkedBatch(
              ctx.db,
              exerciseSetsToInsert,
              (chunk) => ctx.db.insert(exerciseSets).values(chunk),
              { limit: 70 }, // D1-safe limit
            );

            logger.debug("Inserted exercise with sets", {
              exerciseName: exercise.exerciseName,
              sessionExerciseId: sessionExerciseRow.id,
              setsCount: exerciseSetsToInsert.length,
            });
          }

          // Trigger debrief and aggregation for new format
          const acceptLanguage =
            ctx.headers.get("accept-language") ?? undefined;
          const locale = acceptLanguage?.split(",")[0];

          void (async () => {
            try {
              const debriefOptions: GenerateDebriefOptions = {
                dbClient: ctx.db,
                userId: ctx.user.id,
                sessionId: input.sessionId,
                trigger: "auto",
                requestId: ctx.requestId,
                ...(locale !== undefined && { locale }),
              };

              await generateAndPersistDebrief(debriefOptions);
            } catch (error) {
              logger.warn("session_debrief.auto_generation_failed", {
                userId: ctx.user.id,
                sessionId: input.sessionId,
                error: error instanceof Error ? error.message : "unknown",
              });
            }
          })();

          void (async () => {
            try {
              const { aggregationTrigger } = await import(
                "~/server/db/aggregation"
              );
              await aggregationTrigger.onSessionChange(
                input.sessionId,
                ctx.user.id,
              );
            } catch (error) {
              logger.warn("aggregation_trigger_failed", {
                userId: ctx.user.id,
                sessionId: input.sessionId,
                error: error instanceof Error ? error.message : "unknown",
              });
            }
          })();

          return {
            success: true,
            playbookSessionId: null, // Playbook handling could be added later
          };
        }

        // Legacy format: Flatten exercises into individual session_exercise rows
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
                  userId: ctx.user.id,
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

              const { name: resolvedExerciseName } =
                resolveExerciseNameWithLookup(
                  templateExerciseId,
                  exercise.exerciseName,
                  resolvedNameLookup,
                );

              const numericWeight = weight ?? 0;
              const numericReps = reps ?? 0;
              const numericSets = sets ?? 0;

              return {
                user_id: ctx.user.id,
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
                rpe: set.rpe ?? null, // maps to session_exercise.rpe
                rest_seconds: set.rest ?? null, // maps to session_exercise.rest_seconds
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

        if (setsToInsert.length > 0) {
          const chunkSize = getInsertChunkSize(setsToInsert);
          try {
            await chunkedBatch(ctx.db, setsToInsert, (chunk) =>
              ctx.db.insert(sessionExercises).values(chunk),
            );
          } catch (error) {
            logger.error(
              "workouts.save.insert_failed",
              error instanceof Error ? error : new Error(String(error)),
              {
                sessionId: input.sessionId,
                userId: ctx.user.id,
                setsCount: setsToInsert.length,
                chunkSize,
                invalidTemplateExerciseIds: Array.from(
                  invalidTemplateExerciseIds,
                ),
                firstSet: setsToInsert[0],
              },
            );
            throw error;
          }
        }

        if (setsToInsert.length > 0) {
          const acceptLanguage =
            ctx.headers.get("accept-language") ?? undefined;
          const locale = acceptLanguage?.split(",")[0];

          void (async () => {
            try {
              const debriefOptions: GenerateDebriefOptions = {
                dbClient: ctx.db,
                userId: ctx.user.id,
                sessionId: input.sessionId,
                trigger: "auto",
                requestId: ctx.requestId,
                ...(locale !== undefined && { locale }),
              };

              await generateAndPersistDebrief(debriefOptions);
            } catch (error) {
              logger.warn("session_debrief.auto_generation_failed", {
                userId: ctx.user.id,
                sessionId: input.sessionId,
                error: error instanceof Error ? error.message : "unknown",
              });
            }
          })();

          // Trigger aggregation for progress tracking
          void (async () => {
            try {
              const { aggregationTrigger } = await import(
                "~/server/db/aggregation"
              );
              await aggregationTrigger.onSessionChange(
                input.sessionId,
                ctx.user.id,
              );
            } catch (error) {
              logger.warn("aggregation_trigger_failed", {
                userId: ctx.user.id,
                sessionId: input.sessionId,
                error: error instanceof Error ? error.message : "unknown",
              });
            }
          })();
        }

        // Check if this workout is part of an active playbook session
        let playbookSessionId: number | null = null;
        try {
          const { playbookSessions } = await import("~/server/db/schema");
          const linkedPlaybookSession =
            await ctx.db.query.playbookSessions.findFirst({
              where: (sessions, { eq, and }) =>
                and(
                  eq(sessions.actualWorkoutId, input.sessionId),
                  eq(sessions.isCompleted, false),
                ),
            });
          if (linkedPlaybookSession) {
            playbookSessionId = linkedPlaybookSession.id;

            // Calculate adherence score if there are exercises
            if (setsToInsert.length > 0) {
              // Simple adherence: compare number of exercises completed vs prescribed
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

              let adherenceScore = 100; // Default to perfect if no prescription

              if (prescription?.exercises) {
                const prescribedExerciseNames = new Set(
                  prescription.exercises.map((e) =>
                    e.exerciseName.toLowerCase(),
                  ),
                );
                const completedExerciseNames = new Set(
                  input.exercises.map((e) => e.exerciseName.toLowerCase()),
                );

                // Calculate overlap
                const matchingExercises = Array.from(
                  prescribedExerciseNames,
                ).filter((name) => completedExerciseNames.has(name)).length;

                adherenceScore = Math.round(
                  (matchingExercises / prescribedExerciseNames.size) * 100,
                );
              }

              // Mark playbook session as completed
              await ctx.db
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
            }
          }
        } catch (error) {
          // Silently fail - RPE is optional
          logger.info("Failed to check for playbook session", {
            sessionId: input.sessionId,
            error: error instanceof Error ? error.message : "unknown",
          });
        }

        return {
          success: true,
          playbookSessionId, // If not null, client should show RPE modal
        };
      } catch (err: any) {
        const { TRPCError } = await import("@trpc/server");
        const message = err?.message ?? "workouts.save failed";
        const meta = {
          name: err?.name,
          cause: err?.cause,
          stack: err?.stack,
          err,
        };
        logger.error("workouts.save.error", new Error(message), {
          sessionId: input.sessionId,
          userId: ctx.user.id,
          ...meta,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
          cause: meta,
        });
      }
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

      let existingSets: Array<{
        id: number;
        exerciseName: string;
        setOrder: number | null;
      }> = [];

      await whereInChunks(exerciseNames, async (nameChunk) => {
        const exerciseCondition =
          nameChunk.length === 1
            ? eq(sessionExercises.exerciseName, nameChunk[0]!)
            : inArray(sessionExercises.exerciseName, nameChunk);

        const chunkSets = await ctx.db
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
              exerciseCondition,
            ),
          )
          .orderBy(sessionExercises.setOrder);

        existingSets = existingSets.concat(chunkSets);
        return chunkSets;
      });

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

      const updateEntries = Array.from(updatesMap.entries());
      const perRowVariables = 3; // weight, reps, unit
      const updateChunkSize = Math.max(
        1,
        Math.floor(SQLITE_VARIABLE_LIMIT / Math.max(perRowVariables, 1)),
      );

      for (const chunk of chunkArray(updateEntries, updateChunkSize)) {
        const ids = chunk.map(([id]) => id);

        const weightCases = chunk
          .map(([id, update]) => sql`WHEN ${id} THEN ${update.weight}`)
          .join(" ");
        const repsCases = chunk
          .map(([id, update]) => sql`WHEN ${id} THEN ${update.reps}`)
          .join(" ");
        const unitCases = chunk
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
      }

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
      const batchTemplateExerciseIds = new Set<number>();

      for (const workout of input.workouts) {
        for (const exercise of workout.exercises) {
          if (
            typeof exercise.templateExerciseId === "number" &&
            Number.isInteger(exercise.templateExerciseId)
          ) {
            batchTemplateExerciseIds.add(exercise.templateExerciseId);
          }
        }
      }

      const batchResolvedNameLookup = await loadResolvedExerciseNameMap(
        ctx.db,
        Array.from(batchTemplateExerciseIds),
      );

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
                const { name: resolvedExerciseName } =
                  resolveExerciseNameWithLookup(
                    exercise.templateExerciseId ?? null,
                    exercise.exerciseName,
                    batchResolvedNameLookup,
                  );
                return {
                  user_id: ctx.user.id,
                  sessionId: workout.sessionId,
                  templateExerciseId: exercise.templateExerciseId,
                  exerciseName: exercise.exerciseName,
                  resolvedExerciseName,
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
            await chunkedBatch(ctx.db, setsToInsert, (chunk) =>
              ctx.db.insert(sessionExercises).values(chunk),
            );
          }

          // Generate debrief if there are sets
          if (setsToInsert.length > 0) {
            const acceptLanguage =
              ctx.headers.get("accept-language") ?? undefined;
            const locale = acceptLanguage?.split(",")[0];

            void (async () => {
              try {
                const debriefOptions: GenerateDebriefOptions = {
                  dbClient: ctx.db,
                  userId: ctx.user.id,
                  sessionId: workout.sessionId,
                  trigger: "auto",
                  requestId: ctx.requestId,
                  ...(locale !== undefined && { locale }),
                };

                await generateAndPersistDebrief(debriefOptions);
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
          let errorMessage = "Unknown error";
          if (error instanceof Error) {
            try {
              errorMessage = error.message;
            } catch {
              errorMessage = "Error serialization failed";
            }
          } else if (typeof error === "string") {
            errorMessage = error;
          }
          results.push({
            sessionId: workout.sessionId,
            success: false,
            error: errorMessage,
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

  // Get warm-up suggestions for an exercise
  getWarmupSuggestions: protectedProcedure
    .input(
      z.object({
        exerciseName: z.string(),
        targetWeight: z.number().positive(),
        targetReps: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Call detectWarmupPattern from utils
      const pattern = await detectWarmupPattern({
        userId: ctx.user.id,
        exerciseName: input.exerciseName,
        targetWorkingWeight: input.targetWeight,
        targetWorkingReps: input.targetReps,
      });

      // If low confidence, get user preferences for fallback protocol
      if (pattern.confidence === "low") {
        const preferences = await ctx.db.query.userPreferences.findFirst({
          where: eq(userPreferences.user_id, ctx.user.id),
        });

        if (preferences && preferences.warmupStrategy !== "none") {
          const fallbackSets = generateDefaultWarmupProtocol(
            input.targetWeight,
            input.targetReps,
            {
              strategy:
                (preferences.warmupStrategy as "percentage" | "fixed") ??
                "percentage",
              percentages: preferences.warmupPercentages
                ? JSON.parse(preferences.warmupPercentages)
                : [40, 60, 80],
              setsCount: preferences.warmupSetsCount ?? 3,
              repsStrategy:
                (preferences.warmupRepsStrategy as
                  | "match_working"
                  | "descending"
                  | "fixed") ?? "match_working",
              fixedReps: preferences.warmupFixedReps ?? 5,
            },
          );

          return {
            sets: fallbackSets,
            confidence: "low" as const,
            source: "protocol" as const,
            sessionCount: 0,
          };
        }
      }

      return pattern;
    }),
});

/**
 * Helper: Compute aggregated stats from exercise sets
 * Used when persisting sets to calculate session_exercise summary columns
 */
function computeAggregatedStats(
  exerciseSetsData: Array<{
    setType: string;
    weight: number | null;
    reps: number;
  }>,
): {
  totalSets: number;
  workingSets: number;
  warmupSets: number;
  topSetWeight: number;
  totalVolume: number;
  workingVolume: number;
} {
  const totalSets = exerciseSetsData.length;
  const workingSets = exerciseSetsData.filter(
    (s) => s.setType === "working",
  ).length;
  const warmupSets = exerciseSetsData.filter(
    (s) => s.setType === "warmup",
  ).length;
  const topSetWeight = Math.max(...exerciseSetsData.map((s) => s.weight ?? 0));

  const volumeBreakdown = calculateVolumeBreakdown(
    exerciseSetsData.map((s) => ({
      weight: s.weight,
      reps: s.reps,
      setType: s.setType,
    })),
  );

  return {
    totalSets,
    workingSets,
    warmupSets,
    topSetWeight,
    totalVolume: volumeBreakdown.total,
    workingVolume: volumeBreakdown.working,
  };
}
