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
  userPreferences,
  playbookSessions,
  milestones,
  milestoneAchievements,
} from "~/server/db/schema";
import {
  loadResolvedExerciseNameMap,
  resolveExerciseNameWithLookup,
} from "~/server/db/utils";
import {
  detectPlateau,
  storePlateau,
} from "~/server/api/utils/plateau-detection";
// Note: exerciseNameResolutionView replaced with raw SQL queries
import { eq, desc, and, ne, inArray, gte, asc, lt, or, sql } from "drizzle-orm";

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
import {
  triggerExerciseAggregation,
  triggerSessionAggregation,
} from "~/server/db/incremental-aggregation";
import { invalidateQueries } from "~/trpc/cache-config";

/**
 * Simple exercise name normalization
 */
function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Ensure master exercise links exist for template exercises
 * Creates master exercises and links if they don't exist
 */
async function ensureMasterExerciseLinks(
  db: any, // typeof ctx.db - using any to avoid type issues
  userId: string,
  templateExerciseIds: number[],
): Promise<void> {
  if (templateExerciseIds.length === 0) return;

  // Find which template exercises already have master exercise links
  const existingLinks = await db
    .select()
    .from(exerciseLinks)
    .where(
      and(
        eq(exerciseLinks.user_id, userId),
        inArray(exerciseLinks.templateExerciseId, templateExerciseIds),
      ),
    );

  const existingTemplateIds = new Set(
    existingLinks.map(
      (link: { templateExerciseId: number }) => link.templateExerciseId,
    ),
  );

  // Find template exercises that need master exercise links
  const missingTemplateIds = templateExerciseIds.filter(
    (id) => !existingTemplateIds.has(id),
  );

  if (missingTemplateIds.length === 0) return;

  logger.info("Creating master exercise links", {
    userId,
    missingTemplateIds,
    count: missingTemplateIds.length,
  });

  // Get template exercise details
  const templateExercisesData = await db
    .select()
    .from(templateExercises)
    .where(
      and(
        eq(templateExercises.user_id, userId),
        inArray(templateExercises.id, missingTemplateIds),
      ),
    );

  // Create master exercises and links for missing ones
  for (const templateExercise of templateExercisesData) {
    const exerciseName = normalizeExerciseName(
      templateExercise.exerciseName || "Unknown Exercise",
    );

    // Check if master exercise already exists with this name
    const existingMaster = await db
      .select()
      .from(masterExercises)
      .where(
        and(
          eq(masterExercises.user_id, userId),
          eq(masterExercises.normalizedName, exerciseName),
        ),
      )
      .limit(1);

    let masterExerciseId: number;

    if (existingMaster.length > 0) {
      // Use existing master exercise
      masterExerciseId = existingMaster[0]!.id;
    } else {
      // Create new master exercise
      const newMaster = await db
        .insert(masterExercises)
        .values({
          user_id: userId,
          name: templateExercise.exerciseName || "Unknown Exercise",
          normalizedName: exerciseName,
          muscleGroup: templateExercise.muscleGroup || null,
          tags: templateExercise.tags || null,
        })
        .returning({ id: masterExercises.id });

      masterExerciseId = newMaster[0]!.id;
    }

    // Create exercise link
    await db.insert(exerciseLinks).values({
      user_id: userId,
      templateExerciseId: templateExercise.id,
      masterExerciseId,
    });
  }

  logger.info("Master exercise links created successfully", {
    userId,
    count: templateExercisesData.length,
  });
}

export const workoutsRouter = createTRPCRouter({
  // Migration endpoint to create master exercise links for existing exercises
  migrateMasterExercises: protectedProcedure.mutation(async ({ ctx }) => {
    logger.info("Starting master exercise migration for user", {
      userId: ctx.user.id,
    });

    try {
      // 1. Find all template exercises that don't have master exercise links
      const allTemplateExercises = await ctx.db
        .select()
        .from(templateExercises)
        .where(eq(templateExercises.user_id, ctx.user.id));

      if (allTemplateExercises.length === 0) {
        return {
          success: true,
          message: "No template exercises found",
          migrated: 0,
        };
      }

      // 2. Find which ones already have master exercise links
      const existingLinks = await ctx.db
        .select()
        .from(exerciseLinks)
        .where(
          and(
            eq(exerciseLinks.user_id, ctx.user.id),
            inArray(
              exerciseLinks.templateExerciseId,
              allTemplateExercises.map((ex) => ex.id),
            ),
          ),
        );

      const existingTemplateIds = new Set(
        existingLinks.map((link) => link.templateExerciseId),
      );

      // 3. Find template exercises that need master exercise links
      const missingTemplateIds = allTemplateExercises
        .map((ex) => ex.id)
        .filter((id) => !existingTemplateIds.has(id));

      if (missingTemplateIds.length === 0) {
        return {
          success: true,
          message: "All exercises already have master links",
          migrated: 0,
        };
      }

      // 4. Get template exercise details for missing ones
      const missingTemplateExercises = await ctx.db
        .select()
        .from(templateExercises)
        .where(
          and(
            eq(templateExercises.user_id, ctx.user.id),
            inArray(templateExercises.id, missingTemplateIds),
          ),
        );

      // 5. Create master exercises and links for missing ones
      let createdCount = 0;
      let linkedCount = 0;

      for (const templateExercise of missingTemplateExercises) {
        const exerciseName = normalizeExerciseName(
          templateExercise.exerciseName || "Unknown Exercise",
        );

        // Check if master exercise already exists with this name
        const existingMaster = await ctx.db
          .select()
          .from(masterExercises)
          .where(
            and(
              eq(masterExercises.user_id, ctx.user.id),
              eq(masterExercises.normalizedName, exerciseName),
            ),
          )
          .limit(1);

        let masterExerciseId: number;

        if (existingMaster.length > 0) {
          // Use existing master exercise
          masterExerciseId = existingMaster[0]!.id;
        } else {
          // Create new master exercise
          const newMaster = await ctx.db
            .insert(masterExercises)
            .values({
              user_id: ctx.user.id,
              name: templateExercise.exerciseName || "Unknown Exercise",
              normalizedName: exerciseName,
              muscleGroup: null, // Template exercises don't have muscleGroup
              tags: null, // Template exercises don't have tags
            })
            .returning({ id: masterExercises.id });

          masterExerciseId = newMaster[0]!.id;
          createdCount++;
        }

        // Create exercise link
        await ctx.db.insert(exerciseLinks).values({
          user_id: ctx.user.id,
          templateExerciseId: templateExercise.id,
          masterExerciseId,
        });

        linkedCount++;
      }

      logger.info("Master exercise migration completed", {
        userId: ctx.user.id,
        createdCount,
        linkedCount,
        totalProcessed: missingTemplateIds.length,
      });

      return {
        success: true,
        message: `Migration completed: ${createdCount} master exercises created, ${linkedCount} links created`,
        migrated: linkedCount,
        created: createdCount,
        linked: linkedCount,
      };
    } catch (error) {
      logger.error("Master exercise migration failed", {
        userId: ctx.user.id,
        error: error instanceof Error ? error.message : "unknown",
      });
      throw new Error("Migration failed");
    }
  }),

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

      // 2. Fetch playbook sessions for these workouts
      const sessionIds = sessions.map((s) => s.id);
      let playbookSessionData: any[] = [];
      if (sessionIds.length > 0 && ctx.db.query?.playbookSessions?.findMany) {
        try {
          playbookSessionData = await ctx.db.query.playbookSessions.findMany({
            where: inArray(playbookSessions.actualWorkoutId, sessionIds),
            with: {
              week: {
                with: {
                  playbook: {
                    columns: {
                      name: true,
                    },
                  },
                },
              },
            },
          });
        } catch (error) {
          console.warn("Failed to fetch playbook sessions:", error);
          playbookSessionData = [];
        }
      }

      // 3. Create lookup map for playbook data
      const playbookSessionMap = new Map(
        playbookSessionData.map((ps) => [
          ps.actualWorkoutId,
          {
            name: ps.week?.playbook?.name,
            weekNumber: ps.week?.weekNumber,
            sessionNumber: ps.sessionNumber,
          },
        ]),
      );

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

      // 4. Create lookup maps
      const templateMap = new Map(templates.map((t) => [t.id, t]));

      // 5. Attach templates and playbook data to sessions
      const sessionsWithTemplates = sessions.map((session) => {
        const playbookData = playbookSessionMap.get(session.id);
        return {
          ...session,
          template: session.templateId
            ? (templateMap.get(session.templateId) ?? null)
            : null,
          playbook: playbookData?.name
            ? {
                name: playbookData.name,
                weekNumber: playbookData.weekNumber,
                sessionNumber: playbookData.sessionNumber,
              }
            : null,
        };
      });

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

      // Fetch playbook session data if linked
      let playbookSessionData: any = null;
      if (ctx.db.query?.playbookSessions?.findFirst) {
        try {
          playbookSessionData = await ctx.db.query.playbookSessions.findFirst({
            where: eq(playbookSessions.actualWorkoutId, input.id),
            with: {
              week: {
                with: {
                  playbook: {
                    columns: {
                      name: true,
                    },
                  },
                },
              },
            },
          });
        } catch (error) {
          console.warn("Failed to fetch playbook session:", error);
          playbookSessionData = null;
        }
      }

      // Add playbook data if found
      if (playbookSessionData?.week?.playbook?.name) {
        (workout as any).playbook = {
          name: playbookSessionData.week.playbook.name,
          weekNumber: playbookSessionData.week.weekNumber,
          sessionNumber: playbookSessionData.sessionNumber,
        };
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
      // Collect all exercise names to match (input name + any linked/resolved names)
      const exerciseNames = [input.exerciseName];

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
            exerciseNames.push(linked.resolvedName);
          }
        }
      }

      // Build exercise name filter conditions - check BOTH exerciseName and resolvedExerciseName
      // This ensures we find history whether the exercise was used directly or via a link
      const exerciseConditions = exerciseNames.flatMap((name) => [
        eq(sessionExercises.exerciseName, name),
        eq(sessionExercises.resolvedExerciseName, name),
      ]);

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

      // Legacy format: Query sessionExercises table
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
        setNumber: index + 1,
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

      console.log("getLastExerciseData: returning", {
        exerciseName: input.exerciseName,
        setsCount: sets.length,
        sets,
        best: bestSet,
      });

      return {
        sets,
        best: bestSet
          ? {
              weight: bestSet.weight,
              reps: bestSet.reps ?? undefined,
              sets: bestSet.sets ?? 1,
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
            const insertedExerciseIds: number[] = [];
            await chunkedBatch(
              ctx.db,
              exerciseRows,
              async (chunk) => {
                const result = await ctx.db
                  .insert(sessionExercises)
                  .values(chunk)
                  .returning({ id: sessionExercises.id });
                insertedExerciseIds.push(...result.map((r) => r.id));
              },
              { limit: 50 },
            ); // Lower limit for D1 safety

            // Ensure master exercise links exist for all exercises
            if (exerciseRows.length > 0) {
              try {
                await ensureMasterExerciseLinks(
                  ctx.db,
                  ctx.user.id,
                  exerciseRows
                    .map((ex) => ex.templateExerciseId!)
                    .filter(Boolean),
                );
              } catch (error) {
                logger.warn("master_exercise_links_failed", {
                  userId: ctx.user.id,
                  templateExerciseIds: exerciseRows.map(
                    (ex) => ex.templateExerciseId,
                  ),
                  error: error instanceof Error ? error.message : "unknown",
                });
              }
            }

            // Trigger incremental aggregation for new exercises
            if (insertedExerciseIds.length > 0) {
              try {
                await triggerExerciseAggregation(
                  ctx.db,
                  ctx.user.id,
                  insertedExerciseIds,
                );
              } catch (error) {
                logger.warn("incremental_aggregation_failed", {
                  userId: ctx.user.id,
                  exerciseIds: insertedExerciseIds,
                  error: error instanceof Error ? error.message : "unknown",
                });
              }
            }
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

        // Get exercise IDs that will be deleted for aggregation
        const exercisesToDelete = await ctx.db.query.sessionExercises.findMany({
          where: eq(sessionExercises.sessionId, input.sessionId),
          columns: { id: true },
        });

        // Delete existing exercises (and cascading exercise_sets) for this session
        await ctx.db
          .delete(sessionExercises)
          .where(eq(sessionExercises.sessionId, input.sessionId));

        // Trigger incremental aggregation for deleted exercises
        if (exercisesToDelete.length > 0) {
          const deletedExerciseIds = exercisesToDelete.map((ex) => ex.id);
          try {
            await triggerExerciseAggregation(
              ctx.db,
              ctx.user.id,
              deletedExerciseIds,
            );
          } catch (error) {
            logger.warn("incremental_aggregation_failed", {
              userId: ctx.user.id,
              exerciseIds: deletedExerciseIds,
              error: error instanceof Error ? error.message : "unknown",
            });
          }
        }

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

          // Trigger plateau detection for key lifts (run after workout is saved)
          void (async () => {
            try {
              // Get master exercise IDs from the saved exercises
              const masterExerciseIds = Array.from(
                new Set(
                  input.exercises
                    .map((exercise) => exercise.templateExerciseId)
                    .filter((id): id is number => typeof id === "number")
                    .map((templateId) => {
                      // Get master exercise ID from template exercise
                      const templateExercise =
                        resolvedNameLookup.get(templateId);
                      return templateExercise?.masterExerciseId;
                    })
                    .filter((id): id is number => id !== undefined),
                ),
              );

              // Detect plateaus for each key lift
              for (const masterExerciseId of masterExerciseIds) {
                const plateauResult = await detectPlateau(
                  ctx.db,
                  ctx.user.id,
                  masterExerciseId,
                );

                if (plateauResult.plateauDetected && plateauResult.plateau) {
                  // Transform PlateauDetectionResponse to PlateauDetectionResult for storage
                  const detectionResult = {
                    isPlateaued: true,
                    sessionCount: plateauResult.plateau.sessionCount,
                    stalledWeight: plateauResult.plateau.stalledWeight,
                    stalledReps: plateauResult.plateau.stalledReps,
                    confidenceLevel: (plateauResult.plateau.severity === "high"
                      ? "high"
                      : plateauResult.plateau.severity === "medium"
                        ? "medium"
                        : "low") as "low" | "medium" | "high",
                    detectedAt: plateauResult.plateau.detectedAt,
                  };

                  await storePlateau(
                    ctx.db,
                    ctx.user.id,
                    masterExerciseId,
                    detectionResult,
                  );
                }
              }
            } catch (error) {
              logger.warn("plateau_detection_failed", {
                userId: ctx.user.id,
                sessionId: input.sessionId,
                error: error instanceof Error ? error.message : "unknown",
              });
            }
          })();

          // Collect plateau and milestone information for client notifications
          const plateauNotifications = [];
          const milestoneNotifications = [];

          // Get master exercise IDs via exerciseLinks lookup
          const templateExerciseIds = Array.from(
            new Set(
              input.exercises
                .map((e) => e.templateExerciseId)
                .filter((id): id is number => id !== undefined),
            ),
          );

          const exerciseLinkResults =
            templateExerciseIds.length > 0
              ? await ctx.db
                  .select({
                    templateExerciseId: exerciseLinks.templateExerciseId,
                    masterExerciseId: exerciseLinks.masterExerciseId,
                  })
                  .from(exerciseLinks)
                  .where(
                    and(
                      eq(exerciseLinks.user_id, ctx.user.id),
                      inArray(exerciseLinks.templateExerciseId, templateExerciseIds),
                    ),
                  )
              : [];

          const masterExerciseIds = Array.from(
            new Set(exerciseLinkResults.map((el) => el.masterExerciseId)),
          );

          for (const masterExerciseId of masterExerciseIds) {
            // Check for plateaus
            const plateauResult = await detectPlateau(
              ctx.db,
              ctx.user.id,
              masterExerciseId,
            );

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

            // Check for new milestone achievements
            const activeMilestones = await ctx.db
              .select()
              .from(milestones)
              .where(
                and(
                  eq(milestones.userId, ctx.user.id),
                  eq(milestones.masterExerciseId, masterExerciseId),
                ),
              );

            for (const milestone of activeMilestones) {
              // Get current best 1RM for this exercise from recent sessions
              const currentPerformance = await ctx.db
                .select({
                  oneRMEstimate: sessionExercises.one_rm_estimate,
                })
                .from(sessionExercises)
                .innerJoin(
                  exerciseLinks,
                  and(
                    eq(exerciseLinks.templateExerciseId, sessionExercises.templateExerciseId),
                    eq(exerciseLinks.user_id, ctx.user.id),
                  ),
                )
                .innerJoin(
                  workoutSessions,
                  eq(workoutSessions.id, sessionExercises.sessionId),
                )
                .where(
                  and(
                    eq(sessionExercises.user_id, ctx.user.id),
                    eq(exerciseLinks.masterExerciseId, masterExerciseId),
                    gte(
                      workoutSessions.workoutDate,
                      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    ), // Last 30 days
                  ),
                )
                .orderBy(desc(sessionExercises.one_rm_estimate))
                .limit(1);

              if (currentPerformance.length > 0) {
                const currentOneRM = currentPerformance[0]!.oneRMEstimate ?? 0;

                // Check if milestone is achieved
                let isAchieved = false;
                if (
                  milestone.type === "absolute_weight" &&
                  currentOneRM >= (milestone.targetValue ?? 0)
                ) {
                  isAchieved = true;
                } else if (
                  milestone.type === "bodyweight_multiplier" &&
                  currentOneRM >= (milestone.targetValue ?? 0)
                ) {
                  isAchieved = true;
                } else if (milestone.type === "volume") {
                  // Check volume milestone (sum of all sets in recent session)
                  const volumeResult = await ctx.db
                    .select({
                      totalVolume:
                        sql<number>`SUM(${sessionExercises.weight} * ${sessionExercises.reps} * ${sessionExercises.sets})`.as(
                          "totalVolume",
                        ),
                    })
                    .from(sessionExercises)
                    .innerJoin(
                      exerciseLinks,
                      and(
                        eq(exerciseLinks.templateExerciseId, sessionExercises.templateExerciseId),
                        eq(exerciseLinks.user_id, ctx.user.id),
                      ),
                    )
                    .innerJoin(
                      workoutSessions,
                      eq(workoutSessions.id, sessionExercises.sessionId),
                    )
                    .where(
                      and(
                        eq(sessionExercises.user_id, ctx.user.id),
                        eq(exerciseLinks.masterExerciseId, masterExerciseId),
                        gte(
                          workoutSessions.workoutDate,
                          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                        ), // Last 7 days
                      ),
                    )
                    .limit(1);

                  if (
                    volumeResult.length > 0 &&
                    volumeResult[0]!.totalVolume >= (milestone.targetValue ?? 0)
                  ) {
                    isAchieved = true;
                  }
                } else if (milestone.type === "reps") {
                  // Check rep milestone (max reps at target weight)
                  const repResult = await ctx.db
                    .select({
                      maxReps: sql<number>`MAX(${sessionExercises.reps})`.as(
                        "maxReps",
                      ),
                    })
                    .from(sessionExercises)
                    .innerJoin(
                      exerciseLinks,
                      and(
                        eq(exerciseLinks.templateExerciseId, sessionExercises.templateExerciseId),
                        eq(exerciseLinks.user_id, ctx.user.id),
                      ),
                    )
                    .innerJoin(
                      workoutSessions,
                      eq(workoutSessions.id, sessionExercises.sessionId),
                    )
                    .where(
                      and(
                        eq(sessionExercises.user_id, ctx.user.id),
                        eq(exerciseLinks.masterExerciseId, masterExerciseId),
                        gte(
                          sessionExercises.weight,
                          (milestone.targetValue ?? 0) * 0.9,
                        ), // Within 10% of target weight
                        gte(
                          workoutSessions.workoutDate,
                          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        ), // Last 30 days
                      ),
                    )
                    .limit(1);

                  if (
                    repResult.length > 0 &&
                    repResult[0]!.maxReps >= (milestone.targetValue ?? 0)
                  ) {
                    isAchieved = true;
                  }
                }

                if (isAchieved) {
                  // Check if this achievement was already recorded
                  const recentAchievement = await ctx.db
                    .select()
                    .from(milestoneAchievements)
                    .where(
                      and(
                        eq(milestoneAchievements.userId, ctx.user.id),
                        eq(milestoneAchievements.milestoneId, milestone.id),
                        gte(
                          milestoneAchievements.achievedAt,
                          new Date(Date.now() - 24 * 60 * 60 * 1000),
                        ), // Last 24 hours
                      ),
                    )
                    .limit(1);

                  if (recentAchievement.length === 0) {
                    const exerciseName =
                      resolvedNameLookup.get(
                        Array.from(resolvedNameLookup.keys()).find(
                          (key) =>
                            resolvedNameLookup.get(key)?.masterExerciseId ===
                            masterExerciseId,
                        ) || 0,
                      )?.name || "Unknown exercise";

                    // Record the achievement
                    await ctx.db.insert(milestoneAchievements).values({
                      userId: ctx.user.id,
                      milestoneId: milestone.id,
                      workoutId: input.sessionId,
                      achievedAt: new Date(),
                      achievedValue: currentOneRM,
                      metadata: JSON.stringify({
                        trigger: "workout_completion",
                        masterExerciseId,
                      }),
                    });

                    milestoneNotifications.push({
                      type: "milestone_achieved" as const,
                      exerciseName,
                      milestoneType: milestone.type,
                      achievedValue: currentOneRM,
                      targetValue: milestone.targetValue,
                      achievedDate: new Date().toISOString(),
                    });
                  }
                }
              }
            }
          }

          return {
            success: true,
            playbookSessionId, // If not null, client should show RPE modal
            notifications: {
              plateaus: plateauNotifications,
              milestones: milestoneNotifications,
            },
          };
        }
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

      // Trigger incremental aggregation for updated exercises
      if (updatesMap.size > 0) {
        const updatedExerciseIds = Array.from(updatesMap.keys());
        try {
          await triggerExerciseAggregation(
            ctx.db,
            ctx.user.id,
            updatedExerciseIds,
          );
        } catch (error) {
          logger.warn("incremental_aggregation_failed", {
            userId: ctx.user.id,
            exerciseIds: updatedExerciseIds,
            error: error instanceof Error ? error.message : "unknown",
          });
        }
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

          // Get exercise IDs that will be deleted for aggregation
          const exercisesToDelete =
            await ctx.db.query.sessionExercises.findMany({
              where: eq(sessionExercises.sessionId, workout.sessionId),
              columns: { id: true },
            });

          // Delete existing exercises for this session
          await ctx.db
            .delete(sessionExercises)
            .where(eq(sessionExercises.sessionId, workout.sessionId));

          // Trigger incremental aggregation for deleted exercises
          if (exercisesToDelete.length > 0) {
            const deletedExerciseIds = exercisesToDelete.map((ex) => ex.id);
            try {
              await triggerExerciseAggregation(
                ctx.db,
                ctx.user.id,
                deletedExerciseIds,
              );
            } catch (error) {
              logger.warn("incremental_aggregation_failed", {
                userId: ctx.user.id,
                exerciseIds: deletedExerciseIds,
                error: error instanceof Error ? error.message : "unknown",
              });
            }
          }

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
});
