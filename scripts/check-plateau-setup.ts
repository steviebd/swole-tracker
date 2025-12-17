#!/usr/bin/env bun
/**
 * Diagnostic script to check plateau feature setup
 *
 * Usage: bun scripts/check-plateau-setup.ts [exerciseName]
 * Example: bun scripts/check-plateau-setup.ts "Bench Press"
 */

import { db } from "~/server/db";
import {
  keyLifts,
  masterExercises,
  exerciseLinks,
  templateExercises,
  sessionExercises,
  workoutSessions
} from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

const exerciseName = process.argv[2] || "Bench Press";
const userId = process.env.TEST_USER_ID; // You'll need to provide your user ID

if (!userId) {
  console.error("❌ Please set TEST_USER_ID environment variable");
  console.log("\nExample: TEST_USER_ID=user_xxx bun scripts/check-plateau-setup.ts");
  process.exit(1);
}

console.log(`🔍 Checking plateau setup for: "${exerciseName}"\n`);

async function checkSetup() {
  // 1. Check if template exercise exists
  console.log("1️⃣  Checking for template exercise...");
  const templates = await db
    .select()
    .from(templateExercises)
    .where(
      and(
        eq(templateExercises.user_id, userId),
        eq(templateExercises.exerciseName, exerciseName)
      )
    );

  if (templates.length === 0) {
    console.log(`   ❌ No template exercise found for "${exerciseName}"`);
    return;
  }
  console.log(`   ✅ Found template exercise (ID: ${templates[0]!.id})`);

  // 2. Check for exercise link (template → master)
  console.log("\n2️⃣  Checking for exercise link...");
  const links = await db
    .select({
      linkId: exerciseLinks.id,
      templateExerciseId: exerciseLinks.templateExerciseId,
      masterExerciseId: exerciseLinks.masterExerciseId,
      masterExerciseName: masterExercises.name,
    })
    .from(exerciseLinks)
    .leftJoin(masterExercises, eq(masterExercises.id, exerciseLinks.masterExerciseId))
    .where(
      and(
        eq(exerciseLinks.user_id, userId),
        eq(exerciseLinks.templateExerciseId, templates[0]!.id)
      )
    );

  if (links.length === 0) {
    console.log(`   ❌ No exercise link found`);
    console.log(`   💡 Run migration: fetch('/api/trpc/workouts.migrateMasterExercises', {method: 'POST', credentials: 'include'})`);
    return;
  }
  console.log(`   ✅ Exercise link found (Master ID: ${links[0]!.masterExerciseId})`);
  console.log(`      Master exercise: "${links[0]!.masterExerciseName}"`);

  const masterExerciseId = links[0]!.masterExerciseId;

  // 3. Check for key lift tracking
  console.log("\n3️⃣  Checking key lift status...");
  const keyLiftRecords = await db
    .select()
    .from(keyLifts)
    .where(
      and(
        eq(keyLifts.userId, userId),
        eq(keyLifts.masterExerciseId, masterExerciseId)
      )
    );

  if (keyLiftRecords.length === 0) {
    console.log(`   ❌ Exercise is NOT marked as a key lift`);
    console.log(`   💡 Go to /progress and toggle 🎯 for "${exerciseName}"`);
    return;
  }

  const keyLift = keyLiftRecords[0]!;
  console.log(`   ✅ Key lift record exists`);
  console.log(`      Tracking: ${keyLift.isTracking ? "✅ YES" : "❌ NO"}`);
  console.log(`      Maintenance Mode: ${keyLift.maintenanceMode ? "🔧 YES" : "✅ NO"}`);

  if (!keyLift.isTracking) {
    console.log(`   💡 Toggle key lift to "Tracking" mode`);
    return;
  }

  if (keyLift.maintenanceMode) {
    console.log(`   💡 Disable maintenance mode to resume plateau detection`);
    return;
  }

  // 4. Check recent session history
  console.log("\n4️⃣  Checking recent workout history...");
  const recentSessions = await db
    .select({
      weight: sessionExercises.weight,
      reps: sessionExercises.reps,
      sets: sessionExercises.sets,
      workoutDate: workoutSessions.workoutDate,
    })
    .from(sessionExercises)
    .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
    .innerJoin(exerciseLinks, and(
      eq(exerciseLinks.templateExerciseId, sessionExercises.templateExerciseId),
      eq(exerciseLinks.user_id, userId)
    ))
    .where(
      and(
        eq(sessionExercises.user_id, userId),
        eq(exerciseLinks.masterExerciseId, masterExerciseId)
      )
    )
    .orderBy(desc(workoutSessions.workoutDate))
    .limit(5);

  if (recentSessions.length < 3) {
    console.log(`   ⚠️  Only ${recentSessions.length} sessions found (need 3+ for plateau detection)`);
    console.log(`   💡 Complete more workouts with "${exerciseName}"`);
    return;
  }

  console.log(`   ✅ Found ${recentSessions.length} recent sessions:`);
  recentSessions.forEach((session, i) => {
    console.log(`      ${i + 1}. ${session.weight}kg × ${session.reps} reps × ${session.sets} sets (${new Date(session.workoutDate).toLocaleDateString()})`);
  });

  // 5. Check for plateau pattern
  console.log("\n5️⃣  Analyzing plateau pattern...");
  const last3 = recentSessions.slice(0, 3);
  const weights = last3.map(s => s.weight);
  const reps = last3.map(s => s.reps);

  const allSameWeight = weights.every(w => w === weights[0]);
  const allSameReps = reps.every(r => r === reps[0]);

  if (allSameWeight && allSameReps) {
    console.log(`   🔴 PLATEAU DETECTED!`);
    console.log(`      Stalled at: ${weights[0]}kg × ${reps[0]} reps for 3+ sessions`);
    console.log(`   💡 Plateau should appear on /progress dashboard after next workout save`);
  } else {
    console.log(`   ✅ No plateau detected (weight or reps are progressing)`);
  }

  console.log("\n✅ Setup check complete!");
}

checkSetup().catch(console.error);
