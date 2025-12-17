#!/usr/bin/env bun
/**
 * Manual test script to verify plateau detection
 * This simulates the workout completion process to test plateau detection
 */

import { db } from "./src/server/db";
import {
  templateExercises,
  exerciseLinks,
  masterExercises,
  keyLifts,
  sessionExercises,
  workoutSessions,
  workoutTemplates,
  plateaus,
} from "./src/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  detectPlateau,
  storePlateau,
} from "./src/server/api/utils/plateau-detection";

async function testPlateauDetection() {
  console.log("🧪 Manual Plateau Detection Test\n");

  // Get test user from existing sessions
  const existingSession = await db.select().from(workoutSessions).limit(1);

  if (existingSession.length === 0) {
    console.log(
      "❌ No existing sessions found. Please run the debug test first to create some data.",
    );
    return;
  }

  const userId = existingSession[0]!.user_id;
  console.log(`👤 Using user ID: ${userId}`);

  // Find or create master exercise for Squat
  let masterExercise = await db
    .select()
    .from(masterExercises)
    .where(eq(masterExercises.name, "Squat"))
    .limit(1);

  if (masterExercise.length === 0) {
    console.log("📝 Creating master exercise for Squat...");
    const result = await db
      .insert(masterExercises)
      .values({
        user_id: userId,
        name: "Squat",
        normalizedName: "squat",
        muscleGroup: "legs",
        tags: "compound,legs",
      })
      .returning({ id: masterExercises.id });

    masterExercise = result as any;
    console.log(`✅ Created master exercise with ID: ${result[0]!.id}`);
  } else {
    console.log(
      `✅ Found existing master exercise with ID: ${masterExercise[0]!.id}`,
    );
  }

  const masterExerciseId = masterExercise[0]!.id;

  // Create a template
  console.log("\n📋 Creating template...");
  const templateResult = await db
    .insert(workoutTemplates)
    .values({
      user_id: userId,
      name: `Manual Test Template ${Date.now()}`,
    })
    .returning({ id: workoutTemplates.id });

  const templateId = templateResult[0]!.id;
  console.log(`✅ Created template with ID: ${templateId}`);

  // Create template exercise
  console.log("🏋️ Creating template exercise...");
  const templateExerciseResult = await db
    .insert(templateExercises)
    .values({
      user_id: userId,
      templateId,
      exerciseName: "Squat",
      orderIndex: 0,
    })
    .returning({ id: templateExercises.id });

  const templateExerciseId = templateExerciseResult[0]!.id;
  console.log(`✅ Created template exercise with ID: ${templateExerciseId}`);

  // Create exercise link
  console.log("🔗 Creating exercise link...");
  await db.insert(exerciseLinks).values({
    templateExerciseId,
    masterExerciseId,
    user_id: userId,
  });
  console.log("✅ Created exercise link");

  // Enable key lift tracking
  console.log("🎯 Enabling key lift tracking...");
  await db
    .insert(keyLifts)
    .values({
      userId,
      masterExerciseId,
      isTracking: true,
      maintenanceMode: false,
    })
    .onConflictDoUpdate({
      target: [keyLifts.userId, keyLifts.masterExerciseId],
      set: {
        isTracking: true,
        maintenanceMode: false,
      },
    });
  console.log("✅ Enabled key lift tracking");

  // Create 3 workout sessions with same weight/reps (plateau pattern)
  console.log("\n💪 Creating 3 workout sessions with plateau pattern...");
  for (let i = 0; i < 3; i++) {
    const workoutDate = new Date();
    workoutDate.setDate(workoutDate.getDate() - (2 - i)); // 2 days ago, 1 day ago, today

    // Create workout session
    const sessionResult = await db
      .insert(workoutSessions)
      .values({
        user_id: userId,
        templateId,
        workoutDate,
      })
      .returning({ id: workoutSessions.id });

    const sessionId = sessionResult[0]!.id;
    console.log(`  ✅ Created workout session ${i + 1} with ID: ${sessionId}`);

    // Create session exercise (same weight/reps for plateau)
    await db.insert(sessionExercises).values({
      user_id: userId,
      sessionId,
      templateExerciseId,
      exerciseName: "Squat",
      resolvedExerciseName: "Squat",
      weight: 100,
      reps: 5,
      sets: 3,
      unit: "kg",
      one_rm_estimate: 100 * (1 + 5 / 30), // ~117kg
      volume_load: 3 * 5 * 100, // 1500kg
    });
    console.log(`  ✅ Added session exercise: 100kg × 5 reps × 3 sets`);
  }

  // Test plateau detection
  console.log("\n🔍 Testing plateau detection...");
  const detectionResult = await detectPlateau(db, userId, masterExerciseId);

  console.log("Detection result:", {
    plateauDetected: detectionResult.plateauDetected,
    hasPlateau: !!detectionResult.plateau,
  });

  if (detectionResult.plateauDetected && detectionResult.plateau) {
    console.log("🎉 PLATEAU DETECTED!");
    console.log("Plateau details:", {
      exerciseName: detectionResult.plateau.exerciseName,
      stalledWeight: detectionResult.plateau.stalledWeight,
      stalledReps: detectionResult.plateau.stalledReps,
      sessionCount: detectionResult.plateau.sessionCount,
      severity: detectionResult.plateau.severity,
    });

    // Store the plateau
    console.log("\n💾 Storing plateau...");
    const plateauId = await storePlateau(db, userId, masterExerciseId, {
      isPlateaued: true,
      sessionCount: detectionResult.plateau.sessionCount,
      stalledWeight: detectionResult.plateau.stalledWeight,
      stalledReps: detectionResult.plateau.stalledReps,
      confidenceLevel:
        detectionResult.plateau.severity === "high"
          ? "high"
          : detectionResult.plateau.severity === "medium"
            ? "medium"
            : "low",
      detectedAt: detectionResult.plateau.detectedAt,
    });
    console.log(`✅ Stored plateau with ID: ${plateauId}`);

    // Check if plateau appears in active plateaus
    console.log("\n📊 Checking active plateaus...");
    const activePlateaus = await db
      .select()
      .from(plateaus)
      .where(and(eq(plateaus.userId, userId), eq(plateaus.status, "active")));

    console.log(`Found ${activePlateaus.length} active plateaus:`);
    activePlateaus.forEach((p) => {
      console.log(
        `  - ID: ${p.id}, Master Exercise: ${p.masterExerciseId}, Weight: ${p.stalledWeight}, Reps: ${p.stalledReps}`,
      );
    });
  } else {
    console.log("❌ No plateau detected");
    console.log("Recommendations:", detectionResult.recommendations);
  }

  console.log("\n✅ Manual test complete!");
  console.log(
    "💡 Check the /progress page in the app to see if plateau card appears",
  );
}

testPlateauDetection().catch(console.error);
