import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { workoutTemplates, templateExercises, masterExercises, exerciseLinks } from "~/server/db/schema";
import { eq, desc, and } from "drizzle-orm";

// Utility function to normalize exercise names for fuzzy matching
function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Helper function to create or get master exercise and link it to template exercise
async function createAndLinkMasterExercise(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  userId: string,
  exerciseName: string,
  templateExerciseId: number,
  linkingRejected: boolean = false,
) {
  // Don't create links if user has rejected linking
  if (linkingRejected) {
    return null;
  }
  
  const normalizedName = normalizeExerciseName(exerciseName);
  
  // Try to find existing master exercise
  const existing = await db
    .select()
    .from(masterExercises)
    .where(
      and(
        eq(masterExercises.user_id, userId),
        eq(masterExercises.normalizedName, normalizedName)
      )
    )
    .limit(1);
  
  let masterExercise;
  
  if (existing.length > 0) {
    masterExercise = existing[0];
  } else {
    // Create new master exercise
    const newMasterExercise = await db
      .insert(masterExercises)
      .values({
        user_id: userId,
        name: exerciseName,
        normalizedName,
      })
      .returning();
    
    masterExercise = newMasterExercise[0];
  }
  
  // Create the link
  await db
    .insert(exerciseLinks)
    .values({
      templateExerciseId,
      masterExerciseId: masterExercise.id,
      user_id: userId,
    })
    .onConflictDoUpdate({
      target: exerciseLinks.templateExerciseId,
      set: {
        masterExerciseId: masterExercise.id,
      },
    });
  
  return masterExercise;
}

export const templatesRouter = createTRPCRouter({
  // Get all templates for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.workoutTemplates.findMany({
      where: eq(workoutTemplates.user_id, ctx.user.id),
      orderBy: [desc(workoutTemplates.createdAt)],
      with: {
        exercises: {
          orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
        },
      },
    });
  }),

  // Get a single template by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const template = await ctx.db.query.workoutTemplates.findFirst({
        where: eq(workoutTemplates.id, input.id),
        with: {
          exercises: {
            orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
          },
        },
      });

      if (!template || template.user_id !== ctx.user.id) {
        throw new Error("Template not found");
      }

      return template;
    }),

  // Create a new template
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        exercises: z.array(z.string().min(1).max(256)),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [template] = await ctx.db
        .insert(workoutTemplates)
        .values({
          name: input.name,
          user_id: ctx.user.id,
        })
        .returning();

      if (!template) {
        throw new Error("Failed to create template");
      }

      // Insert exercises and create master exercise links
      if (input.exercises.length > 0) {
        const insertedExercises = await ctx.db.insert(templateExercises).values(
          input.exercises.map((exerciseName, index) => ({
            user_id: ctx.user.id,
            templateId: template.id,
            exerciseName,
            orderIndex: index,
            linkingRejected: false,
          })),
        ).returning();

        // Create master exercises and links for each template exercise
        for (const templateExercise of insertedExercises) {
          await createAndLinkMasterExercise(
            ctx.db,
            ctx.user.id,
            templateExercise.exerciseName,
            templateExercise.id,
            false, // New templates default to not rejected
          );
        }
      }

      return template;
    }),

  // Update a template
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(256),
        exercises: z.array(z.string().min(1).max(256)),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const existingTemplate = await ctx.db.query.workoutTemplates.findFirst({
        where: eq(workoutTemplates.id, input.id),
      });

      if (!existingTemplate || existingTemplate.user_id !== ctx.user.id) {
        throw new Error("Template not found");
      }

      // Update template name
      await ctx.db
        .update(workoutTemplates)
        .set({ name: input.name })
        .where(eq(workoutTemplates.id, input.id));

      // Delete existing exercises
      await ctx.db
        .delete(templateExercises)
        .where(eq(templateExercises.templateId, input.id));

      // Insert new exercises and create master exercise links
      if (input.exercises.length > 0) {
        const insertedExercises = await ctx.db.insert(templateExercises).values(
          input.exercises.map((exerciseName, index) => ({
            user_id: ctx.user.id,
            templateId: input.id,
            exerciseName,
            orderIndex: index,
            linkingRejected: false,
          })),
        ).returning();

        // Create master exercises and links for each template exercise
        for (const templateExercise of insertedExercises) {
          await createAndLinkMasterExercise(
            ctx.db,
            ctx.user.id,
            templateExercise.exerciseName,
            templateExercise.id,
            false, // New templates default to not rejected
          );
        }
      }

      return { success: true };
    }),

  // Delete a template
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const existingTemplate = await ctx.db.query.workoutTemplates.findFirst({
        where: eq(workoutTemplates.id, input.id),
      });

      if (!existingTemplate || existingTemplate.user_id !== ctx.user.id) {
        throw new Error("Template not found");
      }

      await ctx.db
        .delete(workoutTemplates)
        .where(eq(workoutTemplates.id, input.id));

      return { success: true };
    }),
});
