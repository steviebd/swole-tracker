#!/usr/bin/env bun

/**
 * Migration script to create master exercise links for existing exercises
 * This ensures all template exercises have corresponding master exercise links
 */

import { db } from "../src/server/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  templateExercises,
  exerciseLinks,
  masterExercises,
  sessionExercises,
} from "../src/server/db/schema";
import { logger } from "../src/lib/logger";

/**
 * Simple exercise name normalization (matching the one in workouts.ts)
 */
function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

async function migrateMasterExercises() {
  console.log("🚀 Starting master exercise migration...");

  try {
    // 1. Find all template exercises that don't have master exercise links
    const allTemplateExercises = await db
      .select()
      .from(templateExercises)
      .where(eq(templateExercises.user_id, process.env.USER_ID!));

    if (allTemplateExercises.length === 0) {
      console.log("ℹ️ No template exercises found");
      return;
    }

    console.log(`📋 Found ${allTemplateExercises.length} template exercises`);

    // 2. Find which ones already have master exercise links
    const existingLinks = await db
      .select()
      .from(exerciseLinks)
      .where(
        and(
          eq(exerciseLinks.user_id, process.env.USER_ID!),
          inArray(
            exerciseLinks.templateExerciseId,
            allTemplateExercises.map((ex) => ex.id),
          ),
        ),
      );

    const existingTemplateIds = new Set(
      existingLinks.map((link) => link.templateExerciseId),
    );

    // 3. Find template exercises that need master exercise links
    const missingTemplateIds = allTemplateExercises
      .map((ex) => ex.id)
      .filter((id) => !existingTemplateIds.has(id));

    if (missingTemplateIds.length === 0) {
      console.log(
        "✅ All template exercises already have master exercise links",
      );
      return;
    }

    console.log(
      `🔗 Creating master exercise links for ${missingTemplateIds.length} exercises`,
    );

    // 4. Get template exercise details for missing ones
    const missingTemplateExercises = await db
      .select()
      .from(templateExercises)
      .where(
        and(
          eq(templateExercises.user_id, process.env.USER_ID!),
          inArray(templateExercises.id, missingTemplateIds),
        ),
      );

    // 5. Create master exercises and links for missing ones
    let createdCount = 0;
    let linkedCount = 0;

    for (const templateExercise of missingTemplateExercises) {
      const exerciseName = normalizeExerciseName(
        templateExercise.exerciseName || "Unknown Exercise",
      );

      // Check if master exercise already exists with this name
      const existingMaster = await db
        .select()
        .from(masterExercises)
        .where(
          and(
            eq(masterExercises.user_id, process.env.USER_ID!),
            eq(masterExercises.normalizedName, exerciseName),
          ),
        )
        .limit(1);

      let masterExerciseId: number;

      if (existingMaster.length > 0) {
        // Use existing master exercise
        masterExerciseId = existingMaster[0]!.id;
        console.log(
          `📝 Using existing master exercise: ${templateExercise.exerciseName} -> ID ${masterExerciseId}`,
        );
      } else {
        // Create new master exercise
        const newMaster = await db
          .insert(masterExercises)
          .values({
            user_id: process.env.USER_ID!,
            name: templateExercise.exerciseName || "Unknown Exercise",
            normalizedName: exerciseName,
            muscleGroup: templateExercise.muscleGroup || null,
            tags: templateExercise.tags || null,
          })
          .returning({ id: masterExercises.id });

        masterExerciseId = newMaster[0]!.id;
        createdCount++;
        console.log(
          `➕ Created new master exercise: ${templateExercise.exerciseName} -> ID ${masterExerciseId}`,
        );
      }

      // Create exercise link
      await db.insert(exerciseLinks).values({
        user_id: process.env.USER_ID!,
        templateExerciseId: templateExercise.id,
        masterExerciseId,
      });

      linkedCount++;
      console.log(
        `🔗 Linked template exercise ${templateExercise.id} to master exercise ${masterExerciseId}`,
      );
    }

    console.log("✅ Migration completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - Master exercises created: ${createdCount}`);
    console.log(`   - Exercise links created: ${linkedCount}`);
    console.log(
      `   - Total template exercises processed: ${missingTemplateIds.length}`,
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Check if USER_ID is provided
if (!process.env.USER_ID) {
  console.error("❌ USER_ID environment variable is required");
  console.error(
    "Usage: USER_ID=user_123 bun scripts/migrate-master-exercises.ts",
  );
  process.exit(1);
}

// Run migration
await migrateMasterExercises()
  .then(() => {
    console.log("🎉 Master exercise migration completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  });
