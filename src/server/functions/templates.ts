import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  workoutTemplates,
  templateExercises,
  workoutSessions,
} from "~/server/db/schema";
import { eq, and, desc, asc, max, count, inArray, sql } from "drizzle-orm";
import { chunkedBatch, whereInChunks } from "~/server/db/chunk-utils";
import { checkAuth } from "./auth";

async function requireAuth() {
  const { isAuthenticated, user } = await checkAuth();
  if (!isAuthenticated || !user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export const getTemplates = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({
        search: z.string().max(120).optional(),
        sort: z
          .enum(["recent", "lastUsed", "mostUsed", "name"])
          .default("recent"),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const db = (await import("~/server/db")).getDb();
    const input = data ?? {};
    const searchTerm = input.search?.trim();
    const sort = input.sort ?? "recent";

    const whereCondition = searchTerm
      ? and(
          eq(workoutTemplates.user_id, user.id),
          sql`LOWER(${workoutTemplates.name}) LIKE LOWER(${`%${searchTerm}%`})`,
        )
      : eq(workoutTemplates.user_id, user.id);

    const queryBuilder = db
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
      .where(whereCondition)
      .groupBy(workoutTemplates.id);

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
      return [];
    }

    const templates = await whereInChunks(templateIds, async (idChunk) => {
      return db.query.workoutTemplates.findMany({
        where: inArray(workoutTemplates.id, idChunk),
        with: {
          exercises: {
            orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
          },
        },
      });
    });

    const statsByTemplate = new Map(
      results.map((row) => [
        row.template.id,
        {
          lastUsed: row.lastUsed ?? null,
          totalSessions: Number(row.totalSessions ?? 0),
        },
      ]),
    );

    return templates.map((t) => ({
      ...t,
      ...statsByTemplate.get(t.id),
    }));
  });

export const getTemplate = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const db = (await import("~/server/db")).getDb();

    const template = await db.query.workoutTemplates.findFirst({
      where: and(
        eq(workoutTemplates.id, data.id),
        eq(workoutTemplates.user_id, user.id),
      ),
      with: {
        exercises: {
          orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
        },
      },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    return template;
  });

export const createTemplate = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(256),
      exercises: z.array(z.string().min(1).max(256)),
      dedupeKey: z.string().optional(),
      warmupConfig: z.record(z.string(), z.any()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const db = (await import("~/server/db")).getDb();

    const [created] = await db
      .insert(workoutTemplates)
      .values({
        name: data.name,
        user_id: user.id,
        warmupConfig: data.warmupConfig
          ? JSON.stringify(data.warmupConfig)
          : null,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create template");
    }

    if (data.exercises.length > 0) {
      const exerciseRows = data.exercises.map((name, index) => ({
        user_id: user.id,
        templateId: created.id,
        exerciseName: name,
        orderIndex: index,
        linkingRejected: false,
      }));

      await chunkedBatch(db, exerciseRows, (chunk) =>
        db.insert(templateExercises).values(chunk),
      );
    }

    return db.query.workoutTemplates.findFirst({
      where: eq(workoutTemplates.id, created.id),
      with: {
        exercises: {
          orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
        },
      },
    });
  });

export const updateTemplate = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number(),
      name: z.string().min(1).max(256),
      exercises: z.array(z.string().min(1).max(256)),
      warmupConfig: z.record(z.string(), z.any()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const db = (await import("~/server/db")).getDb();

    const existing = await db.query.workoutTemplates.findFirst({
      where: eq(workoutTemplates.id, data.id),
    });

    if (!existing || existing.user_id !== user.id) {
      return { success: true, alreadyDeleted: true };
    }

    await db
      .update(workoutTemplates)
      .set({
        name: data.name,
        warmupConfig: data.warmupConfig
          ? JSON.stringify(data.warmupConfig)
          : null,
      })
      .where(eq(workoutTemplates.id, data.id));

    await db
      .delete(templateExercises)
      .where(eq(templateExercises.templateId, data.id));

    if (data.exercises.length > 0) {
      const exerciseRows = data.exercises.map((name, index) => ({
        user_id: user.id,
        templateId: data.id,
        exerciseName: name,
        orderIndex: index,
        linkingRejected: false,
      }));

      await chunkedBatch(db, exerciseRows, (chunk) =>
        db.insert(templateExercises).values(chunk),
      );
    }

    return { success: true };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const db = (await import("~/server/db")).getDb();

    const existing = await db.query.workoutTemplates.findFirst({
      where: eq(workoutTemplates.id, data.id),
    });

    if (!existing || existing.user_id !== user.id) {
      return { success: true, alreadyDeleted: true };
    }

    await db.delete(workoutTemplates).where(eq(workoutTemplates.id, data.id));

    return { success: true };
  });

export const duplicateTemplate = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number(),
      name: z.string().min(1).max(256).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const db = (await import("~/server/db")).getDb();

    const original = await db.query.workoutTemplates.findFirst({
      where: eq(workoutTemplates.id, data.id),
      with: {
        exercises: {
          orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
        },
      },
    });

    if (!original || original.user_id !== user.id) {
      throw new Error("Template not found");
    }

    const baseName = data.name?.trim() || `${original.name} Copy`;

    const [created] = await db
      .insert(workoutTemplates)
      .values({ name: baseName, user_id: user.id })
      .returning();

    if (!created) {
      throw new Error("Failed to duplicate template");
    }

    if (original.exercises.length > 0) {
      const exerciseRows = original.exercises.map((ex) => ({
        user_id: user.id,
        templateId: created.id,
        exerciseName: ex.exerciseName,
        orderIndex: ex.orderIndex,
        linkingRejected: ex.linkingRejected ?? false,
      }));

      await chunkedBatch(db, exerciseRows, (chunk) =>
        db.insert(templateExercises).values(chunk),
      );
    }

    return db.query.workoutTemplates.findFirst({
      where: eq(workoutTemplates.id, created.id),
      with: {
        exercises: {
          orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
        },
      },
    });
  });
