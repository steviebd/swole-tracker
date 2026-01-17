import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  masterExercises,
  exerciseLinks,
  templateExercises,
} from "~/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { normalizeExerciseName } from "~/lib/exercise-utils";
import { withAuth } from "./middleware";

// === MIGRATE ALL EXERCISES ===
export const migrateAll = createServerFn({ method: "POST" })
  .middleware([withAuth])
  .handler(async ({ context }) => {
    const { db, user } = context;

    const templateExercisesList = await db
      .select()
      .from(templateExercises)
      .where(eq(templateExercises.user_id, user.id));

    if (templateExercisesList.length === 0) {
      return { success: true, message: "No exercises to migrate", migrated: 0 };
    }

    const existingLinks = await db
      .select()
      .from(exerciseLinks)
      .where(
        and(
          eq(exerciseLinks.user_id, user.id),
          sql`${exerciseLinks.templateExerciseId} IN (${sql.join(
            templateExercisesList.map((ex) => sql`${ex.id}`),
            sql`, `,
          )})`,
        ),
      );

    const existingTemplateIds = new Set(
      existingLinks.map((link) => link.templateExerciseId),
    );

    const missingExercises = templateExercisesList.filter(
      (ex) => !existingTemplateIds.has(ex.id),
    );

    let createdCount = 0;
    let linkedCount = 0;

    for (const templateExercise of missingExercises) {
      const exerciseName = templateExercise.exerciseName || "Unknown Exercise";
      const normalizedName = normalizeExerciseName(exerciseName);

      const existingMaster = await db
        .select()
        .from(masterExercises)
        .where(
          and(
            eq(masterExercises.user_id, user.id),
            eq(masterExercises.normalizedName, normalizedName),
          ),
        )
        .limit(1);

      let masterExerciseId: number;

      if (existingMaster.length > 0) {
        masterExerciseId = existingMaster[0]!.id;
      } else {
        const newMaster = await db
          .insert(masterExercises)
          .values({
            user_id: user.id,
            name: exerciseName,
            normalizedName,
          })
          .returning({ id: masterExercises.id });

        masterExerciseId = newMaster[0]!.id;
        createdCount++;
      }

      await db.insert(exerciseLinks).values({
        user_id: user.id,
        templateExerciseId: templateExercise.id,
        masterExerciseId,
      });

      linkedCount++;
    }

    return {
      success: true,
      message: `Migration completed: ${createdCount} master exercises created, ${linkedCount} links created`,
      migrated: linkedCount,
      created: createdCount,
      linked: linkedCount,
    };
  });

// === DELETE MASTER EXERCISE ===
export const deleteMaster = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number() }))
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { id } = data;

    const master = await db.query.masterExercises.findFirst({
      where: eq(masterExercises.id, id),
    });

    if (!master) {
      throw new Error("Master exercise not found");
    }

    if (master.user_id !== user.id) {
      throw new Error("Unauthorized");
    }

    await db
      .delete(exerciseLinks)
      .where(eq(exerciseLinks.masterExerciseId, id));

    await db.delete(masterExercises).where(eq(masterExercises.id, id));

    return { success: true };
  });

// === UPDATE MASTER EXERCISE ===
export const updateMaster = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number(),
      name: z.string().min(1).max(256).optional(),
      tags: z.string().nullable().optional(),
      muscleGroup: z.string().nullable().optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { id, name, tags, muscleGroup } = data;

    const master = await db.query.masterExercises.findFirst({
      where: eq(masterExercises.id, id),
    });

    if (!master) {
      throw new Error("Master exercise not found");
    }

    if (master.user_id !== user.id) {
      throw new Error("Unauthorized");
    }

    await db
      .update(masterExercises)
      .set({
        ...(name !== undefined && {
          name,
          normalizedName: normalizeExerciseName(name),
        }),
        ...(tags !== undefined && { tags }),
        ...(muscleGroup !== undefined && { muscleGroup }),
      })
      .where(eq(masterExercises.id, id));

    return db.query.masterExercises.findFirst({
      where: eq(masterExercises.id, id),
    });
  });
