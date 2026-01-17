import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  masterExercises,
  exerciseLinks,
  templateExercises,
} from "~/server/db/schema";
import { eq, and, like, inArray, desc, sql } from "drizzle-orm";
import { normalizeExerciseName } from "~/lib/exercise-utils";
import { withAuth } from "./middleware";

// === SEARCH MASTER EXERCISES ===
export const searchMaster = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      query: z.string().min(1).max(100),
      limit: z.number().int().positive().default(20),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db } = context;
    const { query, limit } = data;

    const normalizedSearch = `%${normalizeExerciseName(query)}%`;

    const results = await db
      .select({
        id: masterExercises.id,
        name: masterExercises.name,
        normalizedName: masterExercises.normalizedName,
        tags: masterExercises.tags,
        muscleGroup: masterExercises.muscleGroup,
      })
      .from(masterExercises)
      .where(like(masterExercises.normalizedName, normalizedSearch))
      .orderBy(desc(masterExercises.name))
      .limit(limit);

    return results;
  });

// === FIND SIMILAR EXERCISES ===
export const findSimilar = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      exerciseName: z.string().min(1),
      limit: z.number().int().positive().default(5),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db } = context;
    const { exerciseName, limit } = data;

    const normalizedName = normalizeExerciseName(exerciseName);

    const results = await db
      .select({
        id: masterExercises.id,
        name: masterExercises.name,
        normalizedName: masterExercises.normalizedName,
        tags: masterExercises.tags,
        muscleGroup: masterExercises.muscleGroup,
      })
      .from(masterExercises)
      .where(
        sql`${masterExercises.normalizedName} LIKE ${`%${normalizedName}%`}`,
      )
      .orderBy(masterExercises.name)
      .limit(limit);

    return results;
  });

// === GET ALL MASTER EXERCISES ===
export const getAllMaster = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      limit: z.number().int().positive().default(100),
      offset: z.number().int().nonnegative().default(0),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db } = context;
    const { limit, offset } = data ?? { limit: 100, offset: 0 };

    const results = await db
      .select({
        id: masterExercises.id,
        name: masterExercises.name,
        normalizedName: masterExercises.normalizedName,
        tags: masterExercises.tags,
        muscleGroup: masterExercises.muscleGroup,
        createdAt: masterExercises.createdAt,
      })
      .from(masterExercises)
      .orderBy(desc(masterExercises.createdAt))
      .limit(limit)
      .offset(offset);

    return results;
  });

// === GET MIGRATION STATUS ===
export const getMigrationStatus = createServerFn({ method: "GET" })
  .middleware([withAuth])
  .handler(async ({ context }) => {
    const { db, user } = context;

    const unlinkedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(templateExercises)
      .where(
        and(
          eq(templateExercises.user_id, user.id),
          sql`NOT EXISTS (
            SELECT 1 FROM exercise_links
            WHERE exercise_links.template_exercise_id = ${templateExercises.id}
          )`,
        ),
      );

    const unlinkedCount = unlinkedResult[0]?.count ?? 0;

    const linkedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(exerciseLinks)
      .where(eq(exerciseLinks.user_id, user.id));

    const linkedCount = linkedResult[0]?.count ?? 0;

    return {
      linkedCount,
      unlinkedCount,
      totalCount: linkedCount + unlinkedCount,
      needsMigration: unlinkedCount > 0,
      migrationProgress:
        linkedCount + unlinkedCount > 0
          ? (linkedCount / (linkedCount + unlinkedCount)) * 100
          : 100,
    };
  });

// === LINK TO MASTER ===
export const linkToMaster = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      templateExerciseId: z.number(),
      masterExerciseId: z.number(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { templateExerciseId, masterExerciseId } = data;

    const templateExercise = await db.query.templateExercises.findFirst({
      where: and(
        eq(templateExercises.id, templateExerciseId),
        eq(templateExercises.user_id, user.id),
      ),
    });

    if (!templateExercise) {
      throw new Error("Template exercise not found");
    }

    const masterExercise = await db.query.masterExercises.findFirst({
      where: eq(masterExercises.id, masterExerciseId),
    });

    if (!masterExercise) {
      throw new Error("Master exercise not found");
    }

    await db
      .insert(exerciseLinks)
      .values({
        user_id: user.id,
        templateExerciseId,
        masterExerciseId,
      })
      .onConflictDoNothing();

    return { success: true };
  });

// === UNLINK EXERCISE ===
export const unlink = createServerFn({ method: "POST" })
  .inputValidator(z.object({ templateExerciseId: z.number() }))
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { templateExerciseId } = data;

    await db
      .delete(exerciseLinks)
      .where(
        and(
          eq(exerciseLinks.templateExerciseId, templateExerciseId),
          eq(exerciseLinks.user_id, user.id),
        ),
      );

    return { success: true };
  });

// === BULK LINK EXERCISES ===
export const bulkLink = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      links: z.array(
        z.object({
          templateExerciseId: z.number(),
          masterExerciseId: z.number(),
        }),
      ),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { links } = data;

    let linkedCount = 0;

    for (const link of links) {
      const templateExercise = await db.query.templateExercises.findFirst({
        where: and(
          eq(templateExercises.id, link.templateExerciseId),
          eq(templateExercises.user_id, user.id),
        ),
      });

      if (!templateExercise) continue;

      const masterExercise = await db.query.masterExercises.findFirst({
        where: eq(masterExercises.id, link.masterExerciseId),
      });

      if (!masterExercise) continue;

      try {
        await db
          .insert(exerciseLinks)
          .values({
            user_id: user.id,
            templateExerciseId: link.templateExerciseId,
            masterExerciseId: link.masterExerciseId,
          })
          .onConflictDoNothing();
        linkedCount++;
      } catch {
        // Continue on error
      }
    }

    return { success: true, linkedCount };
  });

// === RESOLVE EXERCISE NAME ===
export const resolveName = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      templateExerciseId: z.number().optional(),
      exerciseName: z.string().min(1),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { templateExerciseId, exerciseName } = data;

    let resolvedName = exerciseName;
    let masterExerciseId: number | null = null;

    if (templateExerciseId) {
      const link = await db.query.exerciseLinks.findFirst({
        where: and(
          eq(exerciseLinks.templateExerciseId, templateExerciseId),
          eq(exerciseLinks.user_id, user.id),
        ),
      });

      if (link) {
        const master = await db.query.masterExercises.findFirst({
          where: eq(masterExercises.id, link.masterExerciseId),
        });

        if (master) {
          resolvedName = master.name;
          masterExerciseId = master.id;
        }
      }
    }

    return {
      originalName: exerciseName,
      resolvedName,
      masterExerciseId,
    };
  });
