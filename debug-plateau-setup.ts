#!/usr/bin/env bun
import { db } from "./src/server/db";
import {
  templateExercises,
  exerciseLinks,
  masterExercises,
  keyLifts,
  sessionExercises,
  workoutSessions,
} from "./src/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function debugPlateauSetup() {
  console.log("🔍 Debugging Plateau Setup\n");

  // Get a test user (first one we find)
  const users = await db.select().from(workoutSessions).limit(1);
  if (users.length === 0) {
    console.log("❌ No users found in database");
    return;
  }

  const userId = users[0]!.user_id;
  console.log(`👤 Using user ID: ${userId}`);

  // Check master exercises
  const masterExercisesList = await db
    .select()
    .from(masterExercises)
    .where(eq(masterExercises.name, "Squat"))
    .limit(5);

  console.log(
    `\n📋 Master Squat exercises found: ${masterExercisesList.length}`,
  );
  masterExercisesList.forEach((me) => {
    console.log(`  - ID: ${me.id}, Name: ${me.name}`);
  });

  if (masterExercisesList.length === 0) {
    console.log("❌ No 'Squat' master exercise found - this is the problem!");
    return;
  }

  const squatMasterId = masterExercisesList[0]!.id;

  // Check template exercises for Squat
  const templateExercisesForSquat = await db
    .select({
      id: templateExercises.id,
      exerciseName: templateExercises.exerciseName,
      templateId: templateExercises.templateId,
    })
    .from(templateExercises)
    .where(eq(templateExercises.exerciseName, "Squat"))
    .limit(5);

  console.log(
    `\n📝 Template Squat exercises found: ${templateExercisesForSquat.length}`,
  );
  templateExercisesForSquat.forEach((te) => {
    console.log(
      `  - ID: ${te.id}, Name: ${te.exerciseName}, Template: ${te.templateId}`,
    );
  });

  // Check exercise links for Squat
  const exerciseLinksForSquat = await db
    .select({
      templateExerciseId: exerciseLinks.templateExerciseId,
      masterExerciseId: exerciseLinks.masterExerciseId,
      user_id: exerciseLinks.user_id,
    })
    .from(exerciseLinks)
    .where(eq(exerciseLinks.masterExerciseId, squatMasterId))
    .limit(5);

  console.log(`\n🔗 Exercise links for Squat: ${exerciseLinksForSquat.length}`);
  exerciseLinksForSquat.forEach((el) => {
    console.log(
      `  - Template: ${el.templateExerciseId}, Master: ${el.masterExerciseId}, User: ${el.user_id}`,
    );
  });

  // Check key lifts for this user
  const keyLiftsForUser = await db
    .select()
    .from(keyLifts)
    .where(
      and(
        eq(keyLifts.userId, userId),
        eq(keyLifts.masterExerciseId, squatMasterId),
      ),
    );

  console.log(`\n🎯 Key lifts for user: ${keyLiftsForUser.length}`);
  keyLiftsForUser.forEach((kl) => {
    console.log(
      `  - Master: ${kl.masterExerciseId}, Tracking: ${kl.isTracking}, Maintenance: ${kl.maintenanceMode}`,
    );
  });

  // Check recent sessions for Squat
  const recentSessions = await db
    .select({
      weight: sessionExercises.weight,
      reps: sessionExercises.reps,
      workoutDate: workoutSessions.workoutDate,
      templateExerciseId: sessionExercises.templateExerciseId,
    })
    .from(sessionExercises)
    .innerJoin(
      workoutSessions,
      eq(workoutSessions.id, sessionExercises.sessionId),
    )
    .innerJoin(
      exerciseLinks,
      eq(exerciseLinks.templateExerciseId, sessionExercises.templateExerciseId),
    )
    .where(
      and(
        eq(sessionExercises.user_id, userId),
        eq(exerciseLinks.masterExerciseId, squatMasterId),
      ),
    )
    .orderBy(desc(workoutSessions.workoutDate))
    .limit(5);

  console.log(`\n💪 Recent sessions for Squat: ${recentSessions.length}`);
  recentSessions.forEach((session, i) => {
    console.log(
      `  ${i + 1}. Weight: ${session.weight}, Reps: ${session.reps}, Date: ${session.workoutDate}, TemplateExercise: ${session.templateExerciseId}`,
    );
  });

  if (recentSessions.length < 3) {
    console.log("❌ Not enough sessions for plateau detection (need 3+)");
  } else {
    console.log("✅ Enough sessions for plateau detection");

    // Check if weights/reps are the same
    const weights = recentSessions.map((s) => Number(s.weight) || 0);
    const reps = recentSessions.map((s) => Number(s.reps) || 0);

    console.log(`   Weights: [${weights.join(", ")}]`);
    console.log(`   Reps: [${reps.join(", ")}]`);

    const hasWeightProgression = weights.some(
      (w, i) => i > 0 && w > weights[i - 1],
    );
    const hasRepsProgression = reps.some((r, i) => i > 0 && r > reps[i - 1]);

    if (!hasWeightProgression && !hasRepsProgression) {
      console.log("✅ Plateau conditions met!");
    } else {
      console.log("❌ No plateau - weights or reps are progressing");
    }
  }

  console.log("\n🏁 Debug complete");
}

debugPlateauSetup().catch(console.error);
