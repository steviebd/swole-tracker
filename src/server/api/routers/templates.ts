import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { templateRateLimit } from "~/lib/rate-limit-middleware";
import {
  workoutTemplates,
  templateExercises,
  masterExercises,
  exerciseLinks,
} from "~/server/db/schema";
import { eq, desc, and } from "drizzle-orm";

// In-memory request deduplication cache for concurrent request protection
const requestCache = new Map<string, { result: any; timestamp: number }>();
const REQUEST_CACHE_TTL = 30000; // 30 seconds

// Cleanup expired requests every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > REQUEST_CACHE_TTL) {
      requestCache.delete(key);
    }
  }
}, 300000);

// Utility function to normalize exercise names for fuzzy matching
function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/* DEBUG LOGGING ENABLED FOR TESTS */
const debugEnabled =
  Boolean(process.env.VITEST) || process.env.NODE_ENV === "test";
function debugLog(...args: unknown[]) {
  if (debugEnabled) {
    console.log("[templatesRouter]", ...args);
  }
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
  debugLog("createAndLinkMasterExercise: start", {
    userId,
    exerciseName,
    templateExerciseId,
    linkingRejected,
  });

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

  debugLog("createAndLinkMasterExercise: lookup existing", existing);
  if (existing.length > 0) {
    masterExercise = existing[0];
  } else {
    // Create new master exercise
    debugLog("createAndLinkMasterExercise: inserting new master exercise");
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
      masterExercise =
        newMasterExercise[0] as typeof masterExercises.$inferInsert & {
          id: number;
        };
    }
  }

  // If we still don't have a master exercise, skip linking gracefully
  debugLog(
    "createAndLinkMasterExercise: resolved masterExercise",
    masterExercise,
  );
  if (masterExercise?.id == null) {
    debugLog(
      "createAndLinkMasterExercise: no masterExercise id, aborting link",
    );
    return null;
  }

  // Create the link
  // Upsert link without relying on onConflictDoUpdate (not available in some drivers/mocks)
  debugLog("createAndLinkMasterExercise: inserting link");
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
  debugLog("createAndLinkMasterExercise: ensuring latest link via update");
  await db
    .update(exerciseLinks)
    .set({
      masterExerciseId: masterExercise.id,
    })
    .where(eq(exerciseLinks.templateExerciseId, templateExerciseId));

  debugLog("createAndLinkMasterExercise: done", {
    masterExerciseId: masterExercise.id,
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
    .use(templateRateLimit)
    .input(
      z.object({
        name: z.string().min(1).max(256),
        exercises: z.array(z.string().min(1).max(256)),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      debugLog("templates.create: resolver entered", {
        input,
        userId: ctx?.user?.id,
        requestId: ctx.requestId,
      });
      const userId = ctx.user.id;

      // Enhanced server-side deduplication check
      // Create a fingerprint based on name and exercises for stronger deduplication
      const exerciseFingerprint = input.exercises.sort().join("|");
      const templateFingerprint = `${input.name}:${exerciseFingerprint}`;
      
      // Create request cache key for concurrent request deduplication
      const requestCacheKey = `${userId}:${templateFingerprint}`;
      
      debugLog("templates.create: checking request cache", {
        requestCacheKey,
        requestId: ctx.requestId,
      });

      // Check if this exact request is already being processed
      const cachedRequest = requestCache.get(requestCacheKey);
      if (cachedRequest && (Date.now() - cachedRequest.timestamp) < REQUEST_CACHE_TTL) {
        debugLog("templates.create: returning cached result for concurrent request", {
          templateId: cachedRequest.result.id,
          cacheAge: Date.now() - cachedRequest.timestamp,
          requestId: ctx.requestId,
        });
        return cachedRequest.result;
      }
      
      debugLog("templates.create: checking for duplicates", {
        templateFingerprint,
        requestId: ctx.requestId,
      });

      // Check for recent templates with same name AND exercises (stronger deduplication)
      const recentTemplates = await ctx.db.query.workoutTemplates.findMany({
        where: and(
          eq(workoutTemplates.user_id, userId),
          eq(workoutTemplates.name, input.name),
        ),
        orderBy: [desc(workoutTemplates.createdAt)],
        limit: 3, // Check last 3 templates with same name
        with: {
          exercises: {
            orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
          },
        },
      });

      // If a template with same name and exercises was created recently, return it instead
      for (const recentTemplate of recentTemplates) {
        const timeDiff = Date.now() - new Date(recentTemplate.createdAt).getTime();
        if (timeDiff < 30000) { // Extended to 30 seconds for React 19 concurrent rendering protection
          const recentFingerprint = `${recentTemplate.name}:${recentTemplate.exercises.map(e => e.exerciseName).sort().join("|")}`;
          if (recentFingerprint === templateFingerprint) {
            debugLog("templates.create: returning existing recent template with same fingerprint", {
              templateId: recentTemplate.id,
              timeDiff,
              templateFingerprint,
              requestId: ctx.requestId,
            });
            return recentTemplate;
          }
        }
      }

      debugLog("templates.create: creating new template", {
        requestId: ctx.requestId,
      });

      // Use transaction for atomic template creation with better isolation
      const template = await ctx.db.transaction(async (tx) => {
        // Insert template within transaction
        const [newTemplate] = await tx
          .insert(workoutTemplates)
          .values({
            name: input.name,
            user_id: userId,
          })
          .returning();

        if (!newTemplate) {
          throw new Error("Failed to create template");
        }

        debugLog("templates.create: template created in transaction", {
          templateId: newTemplate.id,
          requestId: ctx.requestId,
        });

        // Insert exercises within same transaction
        if (input.exercises.length > 0) {
          const insertedExercises = await tx
            .insert(templateExercises)
            .values(
              input.exercises.map((exerciseName, index) => ({
                user_id: ctx.user.id,
                templateId: newTemplate.id,
                exerciseName,
                orderIndex: index,
                linkingRejected: 0,
              })),
            )
            .returning();

          // Create master exercise links within transaction
          for (const templateExercise of insertedExercises) {
            await createAndLinkMasterExercise(
              tx,
              ctx.user.id,
              templateExercise.exerciseName,
              templateExercise.id,
              false,
            );
          }
        }

        return newTemplate;
      });

      debugLog("templates.create: completed", {
        templateId: template.id,
        requestId: ctx.requestId,
      });

      // Cache the result for concurrent request deduplication
      requestCache.set(requestCacheKey, {
        result: template,
        timestamp: Date.now(),
      });

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
