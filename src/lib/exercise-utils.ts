/**
 * Shared utility functions for exercise management
 * Extracted to reduce code duplication across router files
 */

import { eq, and, inArray } from "drizzle-orm";
import {
  exerciseLinks,
  masterExercises,
  templateExercises,
} from "~/server/db/schema";
import type { DrizzleDb } from "~/server/db";

/**
 * Simple exercise name normalization
 * Converts to lowercase, trims whitespace, and normalizes multiple spaces to single space
 */
export function normalizeExerciseName(name: string): string {
  if (!name || typeof name !== "string") {
    return "";
  }
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Ensure master exercise links exist for template exercises
 * Creates master exercises and links if they don't exist
 */
export async function ensureMasterExerciseLinks(
  db: DrizzleDb,
  userId: string,
  templateExerciseIds: number[],
): Promise<void> {
  if (templateExerciseIds.length === 0) return;

  // Find which template exercises already have master exercise links
  const existingLinks = await db
    .select()
    .from(exerciseLinks)
    .where(
      and(
        eq(exerciseLinks.user_id, userId),
        inArray(exerciseLinks.templateExerciseId, templateExerciseIds),
      ),
    );

  const existingTemplateIds = new Set(
    existingLinks.map(
      (link: { templateExerciseId: number }) => link.templateExerciseId,
    ),
  );

  // Find template exercises that need master exercise links
  const missingTemplateIds = templateExerciseIds.filter(
    (id) => !existingTemplateIds.has(id),
  );

  if (missingTemplateIds.length === 0) return;

  // Get template exercise details
  const templateExercisesData = await db
    .select()
    .from(templateExercises)
    .where(
      and(
        eq(templateExercises.user_id, userId),
        inArray(templateExercises.id, missingTemplateIds),
      ),
    );

  // Create master exercises and links for missing ones
  for (const templateExercise of templateExercisesData) {
    const exerciseName = normalizeExerciseName(
      templateExercise.exerciseName || "Unknown Exercise",
    );

    // Check if master exercise already exists with this name
    const existingMaster = await db
      .select()
      .from(masterExercises)
      .where(
        and(
          eq(masterExercises.user_id, userId),
          eq(masterExercises.normalizedName, exerciseName),
        ),
      )
      .limit(1);

    let masterExerciseId: number;

    if (existingMaster.length > 0) {
      // Use existing master exercise
      masterExerciseId = existingMaster[0]!.id;
    } else {
      // Create new master exercise
      const newMaster = await db
        .insert(masterExercises)
        .values({
          user_id: userId,
          name: templateExercise.exerciseName || "Unknown Exercise",
          normalizedName: exerciseName,
          muscleGroup: null, // Template exercises don't have muscleGroup
          tags: null, // Template exercises don't have tags
        })
        .returning({ id: masterExercises.id });

      masterExerciseId = newMaster[0]!.id;
    }

    // Create exercise link
    await db.insert(exerciseLinks).values({
      user_id: userId,
      templateExerciseId: templateExercise.id,
      masterExerciseId,
    });
  }
}
