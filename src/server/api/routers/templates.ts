import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { templateRateLimit } from "~/lib/rate-limit-middleware";
import { workoutTemplates, templateExercises, masterExercises, exerciseLinks } from "~/server/db/schema";
import { eq, desc, and } from "drizzle-orm";

// Utility function to normalize exercise names for fuzzy matching
function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/* DEBUG LOGGING ENABLED FOR TESTS */
const debugEnabled = Boolean(process.env.VITEST) || process.env.NODE_ENV === "test";
function debugLog(...args: unknown[]) {
  if (debugEnabled) {
     
    console.log("[templatesRouter]", ...args);
  }
}

// Helper function to create or get master exercise and link it to template exercise
type Db = {
  select: typeof import("drizzle-orm").sql | unknown;
} & typeof import("~/server/db")["db"];

async function createAndLinkMasterExercise(
  db: Db,
  userId: string,
  exerciseName: string,
  templateExerciseId: number,
  linkingRejected = false,
) {
  // Don't create links if user has rejected linking
  if (linkingRejected) {
    return null;
  }
  
  const normalizedName = normalizeExerciseName(exerciseName);
  
  // Try to find existing master exercise
  debugLog('createAndLinkMasterExercise: start', { userId, exerciseName, templateExerciseId, linkingRejected });

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
  
  let masterExercise:
    | {
        id: number;
        user_id: string;
        name: string;
        normalizedName: string;
      }
    | undefined;
  
  debugLog('createAndLinkMasterExercise: lookup existing', existing);
  if (existing.length > 0) {
    masterExercise = existing[0];
  } else {
    // Create new master exercise
    debugLog('createAndLinkMasterExercise: inserting new master exercise');
    const newMasterExercise = await db
      .insert(masterExercises)
      .values({
        user_id: userId,
        name: exerciseName,
        normalizedName,
      })
      .returning();

    // Defensive: some mocked drivers may return undefined or empty array
    if (Array.isArray(newMasterExercise) && newMasterExercise.length > 0) {
      masterExercise = newMasterExercise[0] as typeof masterExercises.$inferInsert & { id: number };
    }
  }

  // If we still don't have a master exercise, skip linking gracefully
  debugLog('createAndLinkMasterExercise: resolved masterExercise', masterExercise);
  if (masterExercise?.id == null) {
    debugLog('createAndLinkMasterExercise: no masterExercise id, aborting link');
    return null;
  }

  // Create the link
  // Upsert link without relying on onConflictDoUpdate (not available in some drivers/mocks)
  debugLog('createAndLinkMasterExercise: inserting link');
  const insertLink = db
    .insert(exerciseLinks)
    .values({
      templateExerciseId,
      masterExerciseId: masterExercise.id,
      user_id: userId,
    });

  // Some drivers/mocks may not support onConflict; call only if available
  if (typeof (insertLink as unknown as { onConflictDoNothing?: Function }).onConflictDoNothing === "function") {
    await (insertLink as unknown as { onConflictDoNothing: (args: { target: typeof exerciseLinks.templateExerciseId }) => Promise<unknown> })
      .onConflictDoNothing({ target: exerciseLinks.templateExerciseId });
  } else {
    await insertLink;
  }

  // Ensure the link points to the latest masterExerciseId (idempotent)
  debugLog('createAndLinkMasterExercise: ensuring latest link via update');
  await db
    .update(exerciseLinks)
    .set({
      masterExerciseId: masterExercise.id,
    })
    .where(eq(exerciseLinks.templateExerciseId, templateExerciseId));

  debugLog('createAndLinkMasterExercise: done', { masterExerciseId: masterExercise.id });
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
    .use(templateRateLimit)
    .input(
      z.object({
        name: z.string().min(1).max(256),
        exercises: z.array(z.string().min(1).max(256)),
      })
    )
    .mutation(async ({ input, ctx }) => {
      debugLog('templates.create: resolver entered', { input, userId: ctx?.user?.id });
      const userId = ctx.user.id;
      const [template] = await ctx.db
        .insert(workoutTemplates)
        .values({
          name: input.name,
          user_id: userId,
        })
        .returning();

      if (!template) {
        throw new Error("Failed to create template");
      }

      if (input.exercises.length > 0) {
        const insertedExercises = await ctx.db
          .insert(templateExercises)
          .values(
            input.exercises.map((exerciseName, index) => ({
              user_id: ctx.user.id,
              templateId: template.id,
              exerciseName,
              orderIndex: index,
              linkingRejected: false,
            })),
          )
          .returning();

        for (const templateExercise of insertedExercises) {
          await createAndLinkMasterExercise(
            ctx.db,
            ctx.user.id,
            templateExercise.exerciseName,
            templateExercise.id,
            false,
          );
        }
      }

      return template;
    }),

  // Update a template
  update: protectedProcedure
    .use(templateRateLimit)
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
        const insertedExercises = await ctx.db
          .insert(templateExercises)
          .values(
            input.exercises.map((exerciseName, index) => ({
              user_id: ctx.user.id,
              templateId: input.id,
              exerciseName,
              orderIndex: index,
              linkingRejected: false,
            })),
          )
          .returning();

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
    .use(templateRateLimit)
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