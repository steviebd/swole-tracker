import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { templateRateLimit } from "~/lib/rate-limit-middleware";
import {
  workoutTemplates,
  templateExercises,
  masterExercises,
  exerciseLinks,
} from "~/server/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";


// Utility function to normalize exercise names for fuzzy matching
function normalizeExerciseName(name: string): string {
  if (!name || typeof name !== 'string') {
    console.warn('normalizeExerciseName received invalid name:', name);
    return '';
  }
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}


// Helper function to create or get master exercise and link it to template exercise
import type { db } from "~/server/db";

type Db = typeof db;
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function createAndLinkMasterExercise(
  db: Db | DbTransaction,
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
  const existing = await db
    .select()
    .from(masterExercises)
    .where(
      and(
        eq(masterExercises.user_id, userId),
        eq(masterExercises.normalizedName, normalizedName),
      ),
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

    if (Array.isArray(newMasterExercise) && newMasterExercise.length > 0) {
      masterExercise =
        newMasterExercise[0] as typeof masterExercises.$inferInsert & {
          id: number;
        };
    }
  }

  if (masterExercise?.id == null) {
    return null;
  }

  // Create the link
  const insertLink = db.insert(exerciseLinks).values({
    templateExerciseId,
    masterExerciseId: masterExercise.id,
    user_id: userId,
  });

  // Some drivers/mocks may not support onConflict; call only if available
  if (
    typeof (insertLink as unknown as { onConflictDoNothing?: Function })
      .onConflictDoNothing === "function"
  ) {
    await (
      insertLink as unknown as {
        onConflictDoNothing: (args: {
          target: typeof exerciseLinks.templateExerciseId;
        }) => Promise<unknown>;
      }
    ).onConflictDoNothing({ target: exerciseLinks.templateExerciseId });
  } else {
    await insertLink;
  }

  // Ensure the link points to the latest masterExerciseId (idempotent)
  await db
    .update(exerciseLinks)
    .set({
      masterExerciseId: masterExercise.id,
    })
    .where(eq(exerciseLinks.templateExerciseId, templateExerciseId));

  return masterExercise;
}

export const templatesRouter = createTRPCRouter({
  // Pre-warm the D1 connection for better performance
  warmConnection: protectedProcedure.query(async ({ ctx }) => {
    // Lightweight D1 ping to establish connection
    await ctx.db.select({ exists: sql`1` });
    return { ready: true, timestamp: Date.now() };
  }),

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
        clientId: z.string().min(1).max(256), // Client-generated UUID for idempotency
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Check if a template with this clientId already exists for this user
      const existingTemplate = await ctx.db.query.workoutTemplates.findFirst({
        where: and(
          eq(workoutTemplates.user_id, userId),
          eq(workoutTemplates.clientId, input.clientId),
        ),
        with: {
          exercises: {
            orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
          },
        },
      });

      // If template with this clientId already exists, return it (natural idempotency)
      if (existingTemplate) {
        return existingTemplate;
      }

      // Create new template with clientId
      const [newTemplate] = await ctx.db
        .insert(workoutTemplates)
        .values({
          name: input.name,
          user_id: userId,
          clientId: input.clientId,
        })
        .returning();

      if (!newTemplate) {
        throw new Error("Failed to create template");
      }

      // Insert exercises if provided
      if (input.exercises.length > 0) {
        try {
          // Insert exercises sequentially
          const insertedExercises: Array<typeof templateExercises.$inferInsert & { id: number }> = [];
          
          for (let index = 0; index < input.exercises.length; index++) {
            const exerciseName = input.exercises[index];
            if (!exerciseName) continue;
            
            const [templateExercise] = await ctx.db
              .insert(templateExercises)
              .values({
                user_id: ctx.user.id,
                templateId: newTemplate.id,
                exerciseName,
                orderIndex: index,
                linkingRejected: 0,
              })
              .returning();
              
            if (templateExercise) {
              insertedExercises.push(templateExercise);
            }
          }

          // Create master exercise links for each template exercise
          for (const templateExercise of insertedExercises) {
            await createAndLinkMasterExercise(
              ctx.db,
              ctx.user.id,
              templateExercise.exerciseName,
              templateExercise.id,
              false,
            );
          }
        } catch (error) {
          // If exercise creation fails, clean up the template
          await ctx.db
            .delete(workoutTemplates)
            .where(eq(workoutTemplates.id, newTemplate.id))
            .catch(() => {
              // Ignore cleanup failure to avoid masking original error
            });
          
          throw error;
        }
      }

      return newTemplate;
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
              linkingRejected: 0,
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
