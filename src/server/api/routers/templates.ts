import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { templateRateLimit } from "~/lib/rate-limit-middleware";
import {
  workoutTemplates,
  templateExercises,
  masterExercises,
  exerciseLinks,
  workoutSessions,
} from "~/server/db/schema";
import { eq, desc, and, inArray, sql, asc, max, count } from "drizzle-orm";

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
  getAll: protectedProcedure
    .input(
      z
        .object({
          search: z.string().max(120).optional(),
          sort: z
            .enum(["recent", "lastUsed", "mostUsed", "name"])
            .default("recent"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const searchTerm = input?.search?.trim();
      const sort = input?.sort ?? "recent";

      const whereCondition = searchTerm
        ? and(
            eq(workoutTemplates.user_id, ctx.user.id),
            sql`${workoutTemplates.name} ILIKE ${`%${searchTerm}%`}`,
          )
        : eq(workoutTemplates.user_id, ctx.user.id);

      const queryBuilder = ctx.db
        .select({
          template: workoutTemplates,
          lastUsed: max(workoutSessions.workoutDate).as("lastUsed"),
          totalSessions: count(workoutSessions.id).as("totalSessions"),
        })
        .from(workoutTemplates)
        .leftJoin(
          workoutSessions,
          eq(workoutTemplates.id, workoutSessions.templateId),
        )
        .where(whereCondition);

      queryBuilder.groupBy(workoutTemplates.id);

      switch (sort) {
        case "lastUsed":
          queryBuilder.orderBy(desc(max(workoutSessions.workoutDate)));
          break;
        case "mostUsed":
          queryBuilder.orderBy(desc(count(workoutSessions.id)));
          break;
        case "name":
          queryBuilder.orderBy(asc(workoutTemplates.name));
          break;
        default:
          queryBuilder.orderBy(desc(workoutTemplates.createdAt));
      }

      const results = await queryBuilder;

      const templateIds = results.map((row) => row.template.id);

      if (templateIds.length === 0) {
        return [] as Array<
          typeof workoutTemplates.$inferSelect & {
            exercises: (typeof templateExercises.$inferSelect)[];
            lastUsed: Date | null;
            totalSessions: number;
          }
        >;
      }

      const templates = await ctx.db.query.workoutTemplates.findMany({
        where: inArray(workoutTemplates.id, templateIds),
        with: {
          exercises: {
            orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
          },
        },
      });

      const statsByTemplate = new Map<
        number,
        { lastUsed: Date | null; totalSessions: number }
      >();
      for (const row of results) {
        statsByTemplate.set(row.template.id, {
          lastUsed: row.lastUsed ?? null,
          totalSessions: Number(row.totalSessions ?? 0),
        });
      }

      const orderMap = new Map<number, number>();
      templateIds.forEach((id, index) => {
        if (!orderMap.has(id)) {
          orderMap.set(id, index);
        }
      });

      const sortedTemplates = [...templates].sort((a, b) => {
        const aIndex = orderMap.get(a.id) ?? 0;
        const bIndex = orderMap.get(b.id) ?? 0;
        return aIndex - bIndex;
      });

      return sortedTemplates.map((template) => ({
        ...template,
        exercises: template.exercises ?? [],
        lastUsed: statsByTemplate.get(template.id)?.lastUsed ?? null,
        totalSessions: statsByTemplate.get(template.id)?.totalSessions ?? 0,
      }));
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

      return {
        ...template,
        exercises: template.exercises ?? [],
      };
    }),

  // Create a new template
  create: protectedProcedure
    .use(templateRateLimit)
    .input(
      z.object({
        name: z.string().min(1).max(256),
        exercises: z.array(z.string().min(1).max(256)),
        dedupeKey: z.string().uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      debugLog("templates.create: resolver entered", {
        input,
        userId: ctx?.user?.id,
        requestId: ctx.requestId,
      });
      const userId = ctx.user.id;

      const dedupeKey = input.dedupeKey;

      const loadTemplateResponse = async (templateId: number) => {
        const templateWithRelations =
          await ctx.db.query.workoutTemplates.findFirst({
            where: eq(workoutTemplates.id, templateId),
            with: {
              exercises: {
                orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
              },
            },
          });

        if (!templateWithRelations) {
          return null;
        }

        const [stats] = await ctx.db
          .select({
            lastUsed: max(workoutSessions.workoutDate).as("lastUsed"),
            totalSessions: count(workoutSessions.id).as("totalSessions"),
          })
          .from(workoutSessions)
          .where(eq(workoutSessions.templateId, templateId));

        const lastUsedValue = stats?.lastUsed
          ? stats.lastUsed instanceof Date
            ? stats.lastUsed
            : new Date(stats.lastUsed as unknown as string)
          : null;

        return {
          ...templateWithRelations,
          exercises: templateWithRelations.exercises ?? [],
          lastUsed: lastUsedValue,
          totalSessions: Number(stats?.totalSessions ?? 0),
        };
      };

      if (dedupeKey) {
        const existingByKey = await ctx.db.query.workoutTemplates.findFirst({
          where: and(
            eq(workoutTemplates.user_id, userId),
            eq(workoutTemplates.dedupeKey, dedupeKey),
          ),
        });

        if (existingByKey) {
          debugLog(
            "templates.create: returning existing template via dedupeKey",
            {
              templateId: existingByKey.id,
              dedupeKey,
              requestId: ctx.requestId,
            },
          );
          const response = await loadTemplateResponse(existingByKey.id);
          if (response) {
            return response;
          }
          return {
            ...existingByKey,
            exercises: [],
            lastUsed: null,
            totalSessions: 0,
          };
        }
      }

      // Add server-side deduplication fallback - prevent creating duplicate templates with same name
      // within a short time window (useful for detecting double-clicks)
      const recentTemplate = await ctx.db.query.workoutTemplates.findFirst({
        where: and(
          eq(workoutTemplates.user_id, userId),
          eq(workoutTemplates.name, input.name),
        ),
        orderBy: [desc(workoutTemplates.createdAt)],
      });

      // If a template with same name was created in the last 5 seconds, return it instead
      if (recentTemplate) {
        const timeDiff = Date.now() - recentTemplate.createdAt.getTime();
        if (timeDiff < 5000) {
          debugLog("templates.create: returning existing recent template", {
            templateId: recentTemplate.id,
            timeDiff,
            requestId: ctx.requestId,
          });
          const response = await loadTemplateResponse(recentTemplate.id);
          if (response) {
            return response;
          }
          return {
            ...recentTemplate,
            exercises: [],
            lastUsed: null,
            totalSessions: 0,
          };
        }
      }

      debugLog("templates.create: creating new template", {
        requestId: ctx.requestId,
      });
      const [insertedTemplate] = await ctx.db
        .insert(workoutTemplates)
        .values({
          name: input.name,
          user_id: userId,
          dedupeKey,
        })
        .onConflictDoNothing({
          target: [workoutTemplates.user_id, workoutTemplates.dedupeKey],
        })
        .returning();

      let template = insertedTemplate;
      const createdNewTemplate = Boolean(insertedTemplate);

      if (!template) {
        debugLog("templates.create: insert skipped due to dedupe", {
          dedupeKey,
          requestId: ctx.requestId,
        });

        if (dedupeKey) {
          template = await ctx.db.query.workoutTemplates.findFirst({
            where: and(
              eq(workoutTemplates.user_id, userId),
              eq(workoutTemplates.dedupeKey, dedupeKey),
            ),
          });
          if (template) {
            debugLog(
              "templates.create: returning deduped template after conflict",
              {
                templateId: template.id,
                dedupeKey,
                requestId: ctx.requestId,
              },
            );
          }
        }

        if (!template) {
          template = await ctx.db.query.workoutTemplates.findFirst({
            where: and(
              eq(workoutTemplates.user_id, userId),
              eq(workoutTemplates.name, input.name),
            ),
            orderBy: [desc(workoutTemplates.createdAt)],
          });
        }

        if (!template) {
          throw new Error("Failed to create template");
        }
      }

      if (createdNewTemplate && input.exercises.length > 0) {
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

      const response = await loadTemplateResponse(template.id);
      if (!response) {
        throw new Error("Failed to load template after creation");
      }

      debugLog("templates.create: completed", {
        templateId: template.id,
        requestId: ctx.requestId,
        createdNewTemplate,
      });
      return response;
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
        debugLog("templates.delete: template already removed", {
          templateId: input.id,
          requestId: ctx.requestId,
        });
        return { success: true, alreadyDeleted: true };
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

  // Duplicate an existing template with exercises
  duplicate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(256).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const original = await ctx.db.query.workoutTemplates.findFirst({
        where: eq(workoutTemplates.id, input.id),
        with: {
          exercises: {
            orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
          },
        },
      });

      if (!original || original.user_id !== ctx.user.id) {
        throw new Error("Template not found");
      }

      const baseName = input.name?.trim() || `${original.name} Copy`;
      let candidateName = baseName;
      if (!input.name) {
        let suffix = 1;
        while (true) {
          const existing = await ctx.db.query.workoutTemplates.findFirst({
            where: and(
              eq(workoutTemplates.user_id, ctx.user.id),
              eq(workoutTemplates.name, candidateName),
            ),
          });

          if (!existing) {
            break;
          }

          suffix += 1;
          candidateName = `${baseName} (${suffix})`;
          if (suffix > 10) {
            candidateName = `${baseName} (${Date.now()})`;
            break;
          }
        }
      }

      const [created] = await ctx.db
        .insert(workoutTemplates)
        .values({
          name: candidateName,
          user_id: ctx.user.id,
        })
        .returning();

      if (!created) {
        throw new Error("Failed to duplicate template");
      }

      const originalExercises = original.exercises ?? [];

      if (originalExercises.length > 0) {
        const inserted = await ctx.db
          .insert(templateExercises)
          .values(
            originalExercises.map((exercise) => ({
              user_id: ctx.user.id,
              templateId: created.id,
              exerciseName: exercise.exerciseName,
              orderIndex: exercise.orderIndex,
              linkingRejected: exercise.linkingRejected ?? false,
            })),
          )
          .returning();

        for (const exercise of inserted) {
          await createAndLinkMasterExercise(
            ctx.db,
            ctx.user.id,
            exercise.exerciseName,
            exercise.id,
            exercise.linkingRejected ?? false,
          );
        }
      }

      return created;
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
        debugLog("templates.delete: template already removed", {
          templateId: input.id,
          requestId: ctx.requestId,
        });
        return { success: true, alreadyDeleted: true };
      }

      await ctx.db
        .delete(workoutTemplates)
        .where(eq(workoutTemplates.id, input.id));

      return { success: true };
    }),
});
