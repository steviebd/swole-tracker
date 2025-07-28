import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { 
  workoutSessions, 
  sessionExercises, 
  workoutTemplates
} from "~/server/db/schema";
import { eq, desc, and } from "drizzle-orm";

const exerciseInputSchema = z.object({
  templateExerciseId: z.number().optional(),
  exerciseName: z.string().min(1).max(256),
  weight: z.number().optional(),
  reps: z.number().int().positive().optional(),
  sets: z.number().int().positive().optional(),
  unit: z.enum(["kg", "lbs"]).default("kg"),
});

export const workoutsRouter = createTRPCRouter({
  // Get recent workouts for the current user
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().default(10) }))
    .query(async ({ input, ctx }) => {
      return ctx.db.query.workoutSessions.findMany({
        where: eq(workoutSessions.userId, ctx.user.id),
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

      if (!workout || workout.userId !== ctx.user.id) {
        throw new Error("Workout not found");
      }

      return workout;
    }),

  // Get last workout data for a specific exercise (for pre-populating)
  getLastExerciseData: protectedProcedure
    .input(z.object({ exerciseName: z.string() }))
    .query(async ({ input, ctx }) => {
      const lastExercise = await ctx.db.query.sessionExercises.findFirst({
        where: and(
          eq(sessionExercises.userId, ctx.user.id),
          eq(sessionExercises.exerciseName, input.exerciseName)
        ),
        orderBy: [desc(sessionExercises.createdAt)],
      });

      if (!lastExercise) {
        return null;
      }

      return {
        weight: lastExercise.weight ? parseFloat(lastExercise.weight) : undefined,
        reps: lastExercise.reps,
        sets: lastExercise.sets,
        unit: lastExercise.unit as "kg" | "lbs",
      };
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

      if (!template || template.userId !== ctx.user.id) {
        throw new Error("Template not found");
      }

      // Create workout session
      const [session] = await ctx.db
        .insert(workoutSessions)
        .values({
          userId: ctx.user.id,
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

      if (!session || session.userId !== ctx.user.id) {
        throw new Error("Workout session not found");
      }

      // Delete existing exercises for this session
      await ctx.db
        .delete(sessionExercises)
        .where(eq(sessionExercises.sessionId, input.sessionId));

      // Insert new exercises (only those with data)
      const exercisesToInsert = input.exercises.filter(
        (exercise) => exercise.weight !== undefined || exercise.reps !== undefined || exercise.sets !== undefined
      );

      if (exercisesToInsert.length > 0) {
        await ctx.db.insert(sessionExercises).values(
          exercisesToInsert.map((exercise) => ({
            userId: ctx.user.id,
            sessionId: input.sessionId,
            templateExerciseId: exercise.templateExerciseId,
            exerciseName: exercise.exerciseName,
            weight: exercise.weight?.toString(),
            reps: exercise.reps,
            sets: exercise.sets,
            unit: exercise.unit,
          })),
        );
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

      if (!session || session.userId !== ctx.user.id) {
        throw new Error("Workout session not found");
      }

      await ctx.db.delete(workoutSessions).where(eq(workoutSessions.id, input.id));

      return { success: true };
    }),
});
