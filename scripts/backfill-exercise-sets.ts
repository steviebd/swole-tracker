#!/usr/bin/env bun
/**
 * Intelligent Exercise Sets Backfill Script
 *
 * Migrates legacy session_exercises data to the new exercise_sets table
 * with intelligent warm-up pattern detection.
 *
 * Strategy:
 * 1. Find all session_exercises where usesSetTable is NULL or false
 * 2. Analyze exercise history to detect warm-up patterns
 * 3. Create individual exercise_set rows with appropriate setType
 * 4. Compute aggregated stats (totalSets, warmupSets, workingSets, volumes)
 * 5. Mark session_exercise as migrated (usesSetTable = true)
 *
 * Usage:
 *   bun scripts/backfill-exercise-sets.ts [--dry-run] [--limit=N]
 *
 * Options:
 *   --dry-run    Show what would be migrated without making changes
 *   --limit=N    Process only N exercises (for testing)
 */

import { db } from "~/server/db";
import { sessionExercises, exerciseSets, workoutSessions } from "~/server/db/schema";
import { eq, and, isNull, or, desc } from "drizzle-orm";
import { chunkedBatch } from "~/server/db/chunk-utils";
import type { SetDetectionResult } from "~/server/api/types/warmup";

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1] ?? "0", 10) : undefined;

/**
 * Detect warm-up pattern from historical data
 *
 * Heuristics:
 * - If sets >= 3, assume first sets building up to top weight are warm-ups
 * - First set at 60-80% of top weight → warm-up
 * - Progressive weight increase → warm-up
 */
async function detectWarmupPattern(
  exercise: typeof sessionExercises.$inferSelect,
  history: Array<typeof sessionExercises.$inferSelect>
): Promise<SetDetectionResult> {
  // If only 1 set, it's a working set
  if ((exercise.sets ?? 1) === 1) {
    return {
      warmupSets: [],
      workingSets: [{ weight: exercise.weight ?? 0, reps: exercise.reps ?? 0 }],
    };
  }

  const topWeight = exercise.weight ?? 0;
  const topReps = exercise.reps ?? 0;
  const totalSets = exercise.sets ?? 1;

  // Analyze history: If this exercise typically has 3+ sets, assume warm-up ladder
  const avgSets =
    history.length > 0
      ? history.reduce((sum, h) => sum + (h.sets ?? 1), 0) / history.length
      : totalSets;

  // If 3+ sets and history shows consistent multi-set pattern
  if (totalSets >= 3 && avgSets >= 3) {
    // Estimate warm-up ladder: 60% → 75% → 90% of top weight
    const warmupCount = Math.min(3, totalSets - 1);
    const warmups: Array<{ weight: number; reps: number }> = [];

    for (let i = 0; i < warmupCount; i++) {
      const percentage = 0.6 + i * 0.15; // 60%, 75%, 90%
      const weight = Math.round((topWeight * percentage) / 2.5) * 2.5; // Round to 2.5kg
      warmups.push({
        weight,
        reps: topReps, // Conservative: same reps as working set
      });
    }

    // Working sets: remaining sets at top weight
    const workingCount = totalSets - warmupCount;
    const workings = Array(workingCount).fill({
      weight: topWeight,
      reps: topReps,
    });

    return { warmupSets: warmups, workingSets: workings };
  }

  // Default: All sets are working sets
  return {
    warmupSets: [],
    workingSets: Array(totalSets).fill({
      weight: topWeight,
      reps: topReps,
    }),
  };
}

/**
 * Main backfill function
 */
async function backfillExerciseSets() {
  console.log("🚀 Starting exercise_sets backfill...");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  if (limit) console.log(`Limit: ${limit} exercises`);

  // Fetch all legacy session_exercises (where usesSetTable is NULL or false)
  let query = db
    .select()
    .from(sessionExercises)
    .where(or(isNull(sessionExercises.usesSetTable), eq(sessionExercises.usesSetTable, false)));

  if (limit) {
    query = query.limit(limit) as typeof query;
  }

  const legacyExercises = await query;

  console.log(`📊 Found ${legacyExercises.length} legacy exercises to migrate\n`);

  if (legacyExercises.length === 0) {
    console.log("✅ No exercises to migrate. All done!");
    return;
  }

  let migrated = 0;
  let skipped = 0;
  const errors: Array<{ id: number; error: string }> = [];

  for (const exercise of legacyExercises) {
    try {
      // Fetch historical exercises for this user + exercise name
      const history = await db
        .select()
        .from(sessionExercises)
        .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
        .where(
          and(
            eq(sessionExercises.user_id, exercise.user_id),
            eq(sessionExercises.exerciseName, exercise.exerciseName),
            or(isNull(sessionExercises.usesSetTable), eq(sessionExercises.usesSetTable, false))
          )
        )
        .orderBy(desc(workoutSessions.workoutDate))
        .limit(10)
        .then((results) => results.map((r) => r.session_exercise));

      // Detect warm-up pattern
      const { warmupSets, workingSets } = await detectWarmupPattern(exercise, history);

      // Create exercise_set rows
      const newSets: Array<typeof exerciseSets.$inferInsert> = [];
      let setNumber = 1;

      // Add warm-up sets
      for (const warmup of warmupSets) {
        newSets.push({
          id: crypto.randomUUID(),
          sessionExerciseId: exercise.id,
          userId: exercise.user_id,
          setNumber: setNumber++,
          setType: "warmup",
          weight: warmup.weight,
          reps: warmup.reps,
          completed: true, // Historical data is completed
          createdAt: exercise.createdAt,
          completedAt: exercise.createdAt,
        });
      }

      // Add working sets
      for (const working of workingSets) {
        newSets.push({
          id: crypto.randomUUID(),
          sessionExerciseId: exercise.id,
          userId: exercise.user_id,
          setNumber: setNumber++,
          setType: "working",
          weight: working.weight,
          reps: working.reps,
          rpe: exercise.rpe, // Apply RPE to working sets only
          completed: true,
          createdAt: exercise.createdAt,
          completedAt: exercise.createdAt,
        });
      }

      // Calculate aggregated stats
      const totalVolume = newSets.reduce((sum, s) => sum + (s.weight ?? 0) * s.reps, 0);
      const workingVolume = workingSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      const topSetWeight = Math.max(...newSets.map((s) => s.weight ?? 0));

      if (!dryRun) {
        // Insert exercise_set rows using chunkedBatch (D1 safety)
        await chunkedBatch(db, newSets, async (chunk) => {
          return db.insert(exerciseSets).values(chunk);
        });

        // Update session_exercise with aggregated stats
        await db
          .update(sessionExercises)
          .set({
            usesSetTable: true,
            totalSets: newSets.length,
            workingSets: workingSets.length,
            warmupSets: warmupSets.length,
            topSetWeight,
            totalVolume,
            workingVolume,
          })
          .where(eq(sessionExercises.id, exercise.id));
      }

      migrated++;

      if (migrated % 100 === 0) {
        console.log(
          `   Progress: ${migrated}/${legacyExercises.length} exercises (${((migrated / legacyExercises.length) * 100).toFixed(1)}%)`
        );
      }

      // Log sample for dry run
      if (dryRun && migrated <= 5) {
        console.log(`\n📋 Sample: ${exercise.exerciseName} (ID: ${exercise.id})`);
        console.log(`   Warm-ups: ${warmupSets.length}, Working: ${workingSets.length}`);
        console.log(
          `   Sets: ${newSets.map((s) => `${s.weight}kg×${s.reps} (${s.setType})`).join(", ")}`
        );
        console.log(`   Volume: ${totalVolume}kg total, ${workingVolume}kg working`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to migrate exercise ${exercise.id}:`, error);
      errors.push({
        id: exercise.id,
        error: error instanceof Error ? error.message : String(error),
      });
      skipped++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Backfill ${dryRun ? "preview" : "complete"}!`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped: ${skipped}`);
  if (errors.length > 0) {
    console.log(`   Errors: ${errors.length}`);
    console.log("\n❌ Failed exercises:");
    errors.forEach((e) => console.log(`   - ID ${e.id}: ${e.error}`));
  }
  console.log("=".repeat(60));

  if (dryRun) {
    console.log("\n💡 This was a DRY RUN. No changes were made.");
    console.log("   Remove --dry-run flag to apply changes.");
  }
}

// Run migration
backfillExerciseSets().catch((error) => {
  console.error("💥 Fatal error during backfill:", error);
  process.exit(1);
});
