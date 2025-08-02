import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  workoutSessions,
  sessionExercises,
  workoutTemplates,
  templateExercises,
  exerciseLinks,
  masterExercises,
} from "~/server/db/schema";
import { eq, desc, and, ne, sql, inArray } from "drizzle-orm";

const setInputSchema = z.object({
  id: z.string(),
  weight: z.number().optional(),
  reps: z.number().int().positive().optional(),
  sets: z.number().int().positive().default(1),
  unit: z.enum(["kg", "lbs"]).default("kg"),
});

const exerciseInputSchema = z.object({
  templateExerciseId: z.number().optional(),
  exerciseName: z.string().min(1).max(256),
  sets: z.array(setInputSchema),
  unit: z.enum(["kg", "lbs"]).default("kg"),
});

export const workoutsRouter = createTRPCRouter({
  // Get recent workouts for the current user
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().default(10) }))
    .query(async ({ input, ctx }) => {
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
    .input(z.object({ 
      exerciseName: z.string(),
      templateId: z.number().optional(),
      excludeSessionId: z.number().optional(),
      templateExerciseId: z.number().optional()
    }))
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
            where: eq(exerciseLinks.masterExerciseId, exerciseLink.masterExerciseId),
            with: {
              templateExercise: true,
            },
          });

          // Get all exercise names from linked template exercises
          exerciseNamesToSearch = linkedExercises.map(link => link.templateExercise.exerciseName);
        }
      }

      // Get the most recent workout session that contains any of these linked exercises
      const whereConditions = [
        eq(workoutSessions.user_id, ctx.user.id),
      ];
      
      // Exclude the current session if specified
      if (input.excludeSessionId) {
        whereConditions.push(ne(workoutSessions.id, input.excludeSessionId));
      }

      // Build the exercise filter condition
      const exerciseWhereCondition = exerciseNamesToSearch.length === 1 
        ? eq(sessionExercises.exerciseName, exerciseNamesToSearch[0]!)
        : inArray(sessionExercises.exerciseName, exerciseNamesToSearch);

      const recentSessionsWithExercise = await ctx.db.query.workoutSessions.findMany({
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
        session => session.exercises.length > 0
      );

      if (!lastSessionWithExercise) {
        return null;
      }

      // Get all sets from that session for this exercise, ordered by setOrder
      const lastExerciseSets = lastSessionWithExercise.exercises.sort(
        (a, b) => (a.setOrder ?? 0) - (b.setOrder ?? 0)
      );

      const sets = lastExerciseSets.map((set, index) => ({
        id: `prev-${index}`,
        weight: set.weight ? parseFloat(set.weight) : undefined,
        reps: set.reps,
        sets: set.sets ?? 1,
        unit: set.unit as "kg" | "lbs",
      }));

      // Calculate best performance for header display
      const bestWeight = Math.max(...sets.map(set => set.weight ?? 0));
      const bestSet = sets.find(set => set.weight === bestWeight);

      return {
        sets,
        best: bestSet ? {
          weight: bestSet.weight,
          reps: bestSet.reps,
          sets: bestSet.sets,
          unit: bestSet.unit,
        } : undefined,
      };
    }),

  // Get latest performance data for template exercise using exercise linking
  getLatestPerformanceForTemplateExercise: protectedProcedure
    .input(z.object({
      templateExerciseId: z.number(),
      excludeSessionId: z.number().optional()
    }))
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
            eq(exerciseLinks.user_id, ctx.user.id)
          )
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
              eq(templateExercises.user_id, ctx.user.id)
            )
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
          whereConditions.push(ne(sessionExercises.sessionId, input.excludeSessionId));
        }

        // Get the most recent workout that contains this exercise
        const latestWorkout = await ctx.db
          .select({
            sessionId: sessionExercises.sessionId,
            workoutDate: workoutSessions.workoutDate,
          })
          .from(sessionExercises)
          .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
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
          .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
          .where(and(
            eq(sessionExercises.user_id, ctx.user.id),
            eq(sessionExercises.exerciseName, templateExercise[0]!.exerciseName),
            eq(sessionExercises.sessionId, latestWorkout[0]!.sessionId)
          ))
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
        .innerJoin(exerciseLinks, eq(exerciseLinks.templateExerciseId, templateExercises.id))
        .where(
          and(
            eq(exerciseLinks.masterExerciseId, masterExerciseId),
            eq(templateExercises.user_id, ctx.user.id)
          )
        );

      if (linkedTemplateExercises.length === 0) {
        return null;
      }

      const templateExerciseIds = linkedTemplateExercises.map(te => te.id);

      // Get the most recent session exercise from any linked template exercise
      const whereConditions = [
        eq(sessionExercises.user_id, ctx.user.id),
      ];

      // Only add inArray condition if we have template exercise IDs
      if (templateExerciseIds.length > 0) {
        whereConditions.push(inArray(sessionExercises.templateExerciseId, templateExerciseIds));
      } else {
        // If no template exercise IDs, return null as there's nothing to search for
        return null;
      }

      if (input.excludeSessionId) {
        whereConditions.push(ne(sessionExercises.sessionId, input.excludeSessionId));
      }

      // Get the most recent workout that contains any linked exercise
      const latestWorkout = await ctx.db
        .select({
          sessionId: sessionExercises.sessionId,
          workoutDate: workoutSessions.workoutDate,
        })
        .from(sessionExercises)
        .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
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
        .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
        .where(and(
          eq(sessionExercises.user_id, ctx.user.id),
          inArray(sessionExercises.templateExerciseId, templateExerciseIds),
          eq(sessionExercises.sessionId, latestWorkout[0]!.sessionId)
        ))
        .orderBy(desc(sessionExercises.weight)) // Order by highest weight first
        .limit(1);

      return latestPerformance[0] ?? null;
    }),

  // Start a new workout session
  start: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        workoutDate: z.date().default(() => new Date()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Verify template ownership
      const template = await ctx.db.query.workoutTemplates.findFirst({
        where: eq(workoutTemplates.id, input.templateId),
        with: {
          exercises: {
            orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
          },
        },
      });

      if (!template || template.user_id !== ctx.user.id) {
        throw new Error("Template not found");
      }

      // Create workout session
      const [session] = await ctx.db
        .insert(workoutSessions)
        .values({
          user_id: ctx.user.id,
          templateId: input.templateId,
          workoutDate: input.workoutDate,
        })
        .returning();

      if (!session) {
        throw new Error("Failed to create workout session");
      }

      return {
        sessionId: session.id,
        template,
      };
    }),

  // Save workout session with exercises
  save: protectedProcedure
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
          .filter((set) => 
            set.weight !== undefined || 
            set.reps !== undefined || 
            set.sets !== undefined
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
          }))
      );

      if (setsToInsert.length > 0) {
        await ctx.db.insert(sessionExercises).values(setsToInsert);
      }

      return { success: true };
    }),

  // Delete a workout session
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const session = await ctx.db.query.workoutSessions.findFirst({
        where: eq(workoutSessions.id, input.id),
      });

      if (!session || session.user_id !== ctx.user.id) {
        throw new Error("Workout session not found");
      }

      await ctx.db
        .delete(workoutSessions)
        .where(eq(workoutSessions.id, input.id));

      return { success: true };
    }),
});
