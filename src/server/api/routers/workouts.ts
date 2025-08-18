import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { workoutRateLimit } from "~/lib/rate-limit-middleware";
import {
  workoutSessions,
  sessionExercises,
  workoutTemplates,
  templateExercises,
  exerciseLinks,
} from "~/server/db/schema-d1";
import { eq, desc, and, ne, inArray, gte } from "drizzle-orm";

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

/* DEBUG LOGGING - CONDITIONAL FOR DEVELOPMENT */
const debugEnabled =
  process.env.VITEST ||
  process.env.NODE_ENV === "test" ||
  (process.env.NODE_ENV === "development" && process.env.DEBUG_WORKOUTS);
function debugLog(...args: unknown[]) {
  if (debugEnabled) console.log("[workoutsRouter]", ...args);
}

export const workoutsRouter = createTRPCRouter({
  // Get recent workouts for the current user
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().default(10) }))
    .query(async ({ input, ctx }) => {
      debugLog("getRecent: input", input);
      return ctx.db.query.workoutSessions.findMany({
        where: eq(workoutSessions.user_id, ctx.user.id),
        orderBy: [desc(workoutSessions.workoutDate)],
        limit: input.limit,
        with: {
          template: {
            with: {
              exercises: true,
            },
          },
          exercises: true,
        },
      });
    }),

  // Get a specific workout session
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const workout = await ctx.db.query.workoutSessions.findFirst({
        where: eq(workoutSessions.id, input.id),
        with: {
          template: {
            with: {
              exercises: true,
            },
          },
          exercises: true,
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
      // First check if this exercise is linked to a master exercise
      let exerciseNamesToSearch = [input.exerciseName];

      if (input.templateExerciseId) {
        // Check if this template exercise is linked to a master exercise
        const exerciseLink = await ctx.db.query.exerciseLinks.findFirst({
          where: eq(exerciseLinks.templateExerciseId, input.templateExerciseId),
          with: {
            masterExercise: true,
          },
        });

        if (exerciseLink) {
          // Find all template exercises linked to the same master exercise
          const linkedExercises = await ctx.db.query.exerciseLinks.findMany({
            where: eq(
              exerciseLinks.masterExerciseId,
              exerciseLink.masterExerciseId,
            ),
            with: {
              templateExercise: true,
            },
          });

          // Get all exercise names from linked template exercises
          exerciseNamesToSearch = linkedExercises.map(
            (link) => link.templateExercise.exerciseName,
          );
        }
      }

      // Get the most recent workout session that contains any of these linked exercises
      const whereConditions = [eq(workoutSessions.user_id, ctx.user.id)];

      // Exclude the current session if specified
      if (input.excludeSessionId) {
        whereConditions.push(ne(workoutSessions.id, input.excludeSessionId));
      }

      // Build the exercise filter condition
      const exerciseWhereCondition =
        exerciseNamesToSearch.length === 1
          ? eq(sessionExercises.exerciseName, exerciseNamesToSearch[0]!)
          : inArray(sessionExercises.exerciseName, exerciseNamesToSearch);

      const recentSessionsWithExercise =
        await ctx.db.query.workoutSessions.findMany({
          where: and(...whereConditions),
          orderBy: [desc(workoutSessions.workoutDate)],
          with: {
            exercises: {
              where: exerciseWhereCondition,
            },
          },
          limit: 50, // Check more sessions since we're looking across templates
        });

      // Find the first session that actually has this exercise
      const lastSessionWithExercise = recentSessionsWithExercise.find(
        (session) => session.exercises.length > 0,
      );

      if (!lastSessionWithExercise) {
        return null;
      }

      // Get all sets from that session for this exercise, ordered by setOrder
      const lastExerciseSets = lastSessionWithExercise.exercises.sort(
        (a, b) => (a.setOrder ?? 0) - (b.setOrder ?? 0),
      );

      const sets = lastExerciseSets.map((set, index) => ({
        id: `prev-${index}`,
        weight: set.weight ? parseFloat(set.weight) : undefined,
        reps: set.reps,
        sets: set.sets ?? 1,
        unit: set.unit as "kg" | "lbs",
      }));

      // Calculate best performance for header display
      const bestWeight = Math.max(...sets.map((set) => set.weight ?? 0));
      const bestSet = sets.find((set) => set.weight === bestWeight);

      return {
        sets,
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
      // First, check if this template exercise is linked to a master exercise
      const exerciseLink = await ctx.db
        .select({
          masterExerciseId: exerciseLinks.masterExerciseId,
        })
        .from(exerciseLinks)
        .where(
          and(
            eq(exerciseLinks.templateExerciseId, input.templateExerciseId),
            eq(exerciseLinks.user_id, ctx.user.id),
          ),
        )
        .limit(1);

      if (exerciseLink.length === 0) {
        // No link found, fall back to exercise name matching
        const templateExercise = await ctx.db
          .select({ exerciseName: templateExercises.exerciseName })
          .from(templateExercises)
          .where(
            and(
              eq(templateExercises.id, input.templateExerciseId),
              eq(templateExercises.user_id, ctx.user.id),
            ),
          )
          .limit(1);

        if (templateExercise.length === 0) {
          return null;
        }

        // Get latest performance by exercise name
        const whereConditions = [
          eq(sessionExercises.user_id, ctx.user.id),
          eq(sessionExercises.exerciseName, templateExercise[0]!.exerciseName),
        ];

        if (input.excludeSessionId) {
          whereConditions.push(
            ne(sessionExercises.sessionId, input.excludeSessionId),
          );
        }

        // Get the most recent workout that contains this exercise
        const latestWorkout = await ctx.db
          .select({
            sessionId: sessionExercises.sessionId,
            workoutDate: workoutSessions.workoutDate,
          })
          .from(sessionExercises)
          .innerJoin(
            workoutSessions,
            eq(workoutSessions.id, sessionExercises.sessionId),
          )
          .where(and(...whereConditions))
          .orderBy(desc(workoutSessions.workoutDate))
          .limit(1);

        if (latestWorkout.length === 0) {
          return null;
        }

        // Get the highest weight set from that workout
        const latestPerformance = await ctx.db
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
            eq(workoutSessions.id, sessionExercises.sessionId),
          )
          .where(
            and(
              eq(sessionExercises.user_id, ctx.user.id),
              eq(
                sessionExercises.exerciseName,
                templateExercise[0]!.exerciseName,
              ),
              eq(sessionExercises.sessionId, latestWorkout[0]!.sessionId),
            ),
          )
          .orderBy(desc(sessionExercises.weight)) // Order by highest weight first
          .limit(1);

        return latestPerformance[0] ?? null;
      }

      // Exercise is linked to a master exercise, get latest performance from any linked exercise
      const masterExerciseId = exerciseLink[0]!.masterExerciseId;

      // Find all template exercises linked to this master exercise
      const linkedTemplateExercises = await ctx.db
        .select({ id: templateExercises.id })
        .from(templateExercises)
        .innerJoin(
          exerciseLinks,
          eq(exerciseLinks.templateExerciseId, templateExercises.id),
        )
        .where(
          and(
            eq(exerciseLinks.masterExerciseId, masterExerciseId),
            eq(templateExercises.user_id, ctx.user.id),
          ),
        );

      if (linkedTemplateExercises.length === 0) {
        return null;
      }

      const templateExerciseIds = linkedTemplateExercises.map((te) => te.id);

      // Get the most recent session exercise from any linked template exercise
      const whereConditions = [eq(sessionExercises.user_id, ctx.user.id)];

      // Only add inArray condition if we have template exercise IDs
      if (templateExerciseIds.length > 0) {
        whereConditions.push(
          inArray(sessionExercises.templateExerciseId, templateExerciseIds),
        );
      } else {
        // If no template exercise IDs, return null as there's nothing to search for
        return null;
      }

      if (input.excludeSessionId) {
        whereConditions.push(
          ne(sessionExercises.sessionId, input.excludeSessionId),
        );
      }

      // Get the most recent workout that contains any linked exercise
      const latestWorkout = await ctx.db
        .select({
          sessionId: sessionExercises.sessionId,
          workoutDate: workoutSessions.workoutDate,
        })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(workoutSessions.id, sessionExercises.sessionId),
        )
        .where(and(...whereConditions))
        .orderBy(desc(workoutSessions.workoutDate))
        .limit(1);

      if (latestWorkout.length === 0) {
        return null;
      }

      // Get the highest weight set from that workout for any linked exercise
      const latestPerformance = await ctx.db
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
          eq(workoutSessions.id, sessionExercises.sessionId),
        )
        .where(
          and(
            eq(sessionExercises.user_id, ctx.user.id),
            inArray(sessionExercises.templateExerciseId, templateExerciseIds),
            eq(sessionExercises.sessionId, latestWorkout[0]!.sessionId),
          ),
        )
        .orderBy(desc(sessionExercises.weight)) // Order by highest weight first
        .limit(1);

      return latestPerformance[0] ?? null;
    }),

  // Start a new workout session
  start: protectedProcedure
    .use(workoutRateLimit)
    .input(
      z.object({
        templateId: z.number(),
        workoutDate: z.date().default(() => new Date()),
        // Phase 3 telemetry (optional on start)
        theme_used: z.string().max(20).optional(),
        device_type: z
          .enum(["android", "ios", "desktop", "ipad", "other"])
          .optional(),
        perf_metrics: z.any().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        debugLog("start: input", input);
        
        // Check for recent duplicate session (within last 2 minutes)
        const recentSession = await ctx.db.query.workoutSessions.findFirst({
          where: and(
            eq(workoutSessions.user_id, ctx.user.id),
            eq(workoutSessions.templateId, input.templateId),
            gte(workoutSessions.workoutDate, new Date(Date.now() - 120000)) // Within last 2 minutes
          ),
          orderBy: [desc(workoutSessions.workoutDate)],
          with: {
            exercises: true,
          },
        });

        // If we found a recent session with the same template and no exercises (just started), return it
        if (recentSession && recentSession.exercises.length === 0) {
          debugLog("start: returning existing recent session", recentSession.id);
          
          // Get the template info for the response
          const template = await ctx.db.query.workoutTemplates.findFirst({
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
        const template = await ctx.db.query.workoutTemplates.findFirst({
          where: eq(workoutTemplates.id, input.templateId),
          with: {
            exercises: {
              orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
            },
          },
        });

        debugLog("start: found template", template);
        if (!template || template.user_id !== ctx.user.id) {
          throw new Error("Template not found");
        }

        // Create workout session
        debugLog("start: inserting workout session");
        const [session] = await ctx.db
          .insert(workoutSessions)
          .values({
            user_id: ctx.user.id,
            templateId: input.templateId,
            workoutDate: input.workoutDate,
            // Phase 3 persistence
            theme_used: input.theme_used ?? null,
            device_type: input.device_type ?? null,
            perf_metrics: input.perf_metrics ?? null,
          })
          .returning();

        debugLog("start: inserted session", session);
        if (!session) {
          throw new Error("Failed to create workout session");
        }

        const result = {
          sessionId: session.id,
          template,
        };
        debugLog("start: returning", result);
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
        debugLog("start: caught error", message, meta);
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
        // Phase 3 telemetry on save (optional updates)
        theme_used: z.string().max(20).optional(),
        device_type: z
          .enum(["android", "ios", "desktop", "ipad", "other"])
          .optional(),
        perf_metrics: z.any().optional(),
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

      // Optionally update session telemetry fields on save
      if (
        typeof input.theme_used !== "undefined" ||
        typeof input.device_type !== "undefined" ||
        typeof input.perf_metrics !== "undefined"
      ) {
        await ctx.db
          .update(workoutSessions)
          .set({
            theme_used:
              typeof input.theme_used !== "undefined"
                ? input.theme_used
                : undefined,
            device_type:
              typeof input.device_type !== "undefined"
                ? input.device_type
                : undefined,
            perf_metrics:
              typeof input.perf_metrics !== "undefined"
                ? input.perf_metrics
                : undefined,
          })
          .where(eq(workoutSessions.id, input.sessionId));
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
          .map((set, setIndex) => ({
            user_id: ctx.user.id,
            sessionId: input.sessionId,
            templateExerciseId: exercise.templateExerciseId,
            exerciseName: exercise.exerciseName,
            setOrder: setIndex,
            weight: set.weight?.toString(),
            reps: set.reps,
            sets: set.sets,
            unit: set.unit,
            // Phase 2 mappings
            rpe: set.rpe, // maps to session_exercise.rpe
            rest_seconds: set.rest, // maps to session_exercise.rest_seconds
            is_estimate: set.isEstimate ?? false,
            is_default_applied: set.isDefaultApplied ?? false,
          })),
      );

      if (setsToInsert.length > 0) {
        await ctx.db.insert(sessionExercises).values(setsToInsert);
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
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify session ownership
      const session = await ctx.db.query.workoutSessions.findFirst({
        where: eq(workoutSessions.id, input.sessionId),
        with: {
          exercises: {
            orderBy: [sessionExercises.setOrder],
          },
        },
      });

      if (!session || session.user_id !== ctx.user.id) {
        throw new Error("Workout session not found");
      }

      let updatedCount = 0;

      // Apply updates to session exercises
      for (const update of input.updates) {
        console.log(`Processing update for setId: ${update.setId}, exerciseName: ${update.exerciseName}`);
        
        let setIndex: number;
        
        // Use setIndex if provided, otherwise parse from setId
        if (update.setIndex !== undefined) {
          setIndex = update.setIndex;
          console.log(`Using provided setIndex: ${setIndex}`);
        } else {
          // Legacy parsing for old setId format
          const setIdMatch = /_set_(\d+)$/.exec(update.setId);
          if (!setIdMatch?.[1]) {
            console.warn(`Invalid setId format: ${update.setId}`);
            continue;
          }
          setIndex = parseInt(setIdMatch[1]) - 1; // Convert to 0-based index
          console.log(`Parsed setIndex from setId: ${setIndex} (from ${setIdMatch[1]})`);
        }

        // Find exercises matching the exercise name
        const exerciseMatches = session.exercises.filter(
          (ex) => ex.exerciseName === update.exerciseName
        );
        console.log(`Found ${exerciseMatches.length} matching exercises for ${update.exerciseName}`);

        // Find the specific set by index within the exercise
        if (setIndex >= 0 && setIndex < exerciseMatches.length) {
          const targetExercise = exerciseMatches[setIndex];
          
          if (targetExercise) {
            console.log(`Updating exercise ID ${targetExercise.id} with weight: ${update.weight}, reps: ${update.reps}`);
            // Update the existing set
            await ctx.db
              .update(sessionExercises)
              .set({
                weight: update.weight !== undefined ? update.weight.toString() : undefined,
                reps: update.reps,
                unit: update.unit,
              })
              .where(eq(sessionExercises.id, targetExercise.id));
            
            updatedCount++;
            console.log(`Successfully updated set ${targetExercise.id}`);
          }
        } else {
          console.warn(`Set index ${setIndex} out of range for exercise ${update.exerciseName}. Available sets: ${exerciseMatches.length}`);
        }
      }

      return { success: true, updatedCount };
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
