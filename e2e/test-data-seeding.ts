import { createDb, getD1Binding } from "../src/server/db";
import { eq } from "drizzle-orm";
import { chunkedInsert } from "../src/server/db/chunk-utils";
import {
  users,
  workoutTemplates,
  workoutSessions,
  templateExercises,
  sessionExercises,
  userPreferences,
  userIntegrations,
  whoopRecovery,
  whoopCycles,
  whoopSleep,
  whoopProfile,
  wellnessData,
  masterExercises,
  exerciseLinks,
} from "../src/server/db/schema";
import {
  createMockUser,
  createMockWorkoutTemplate,
  createMockWorkoutSession,
  createMockTemplateExercise,
  createMockSessionExercise,
  createMockUserPreferences,
  createMockUserIntegration,
  createMockWhoopRecovery,
  createMockWhoopCycle,
  createMockWhoopSleep,
  createMockWhoopProfile,
  createMockWellnessData,
  createMockMasterExercise,
  createMockExerciseLink,
} from "../src/__tests__/mocks/test-data";

/**
 * E2E Test Data Seeding Utilities
 *
 * Provides utilities to seed test data into the D1 database for E2E tests.
 * Uses the existing test data factories but adapts them for database insertion.
 */

// Test user ID that matches the E2E test credentials
export const E2E_TEST_USER_ID = "e2e-test-user-id";

/**
 * Seed a test user into the database
 */
export async function seedTestUser(userId: string = E2E_TEST_USER_ID) {
  const db = createDb(getD1Binding());

  const testUser = createMockUser({
    id: userId,
    email: process.env["E2E_TEST_USERNAME"] || "e2e-test@example.com",
    firstName: "E2E",
    lastName: "TestUser",
  });

  await db.insert(users).values(testUser).onConflictDoNothing();
  console.log(`✓ Seeded test user: ${userId}`);
  return testUser;
}

/**
 * Seed user preferences for the test user
 */
export async function seedUserPreferences(userId: string = E2E_TEST_USER_ID) {
  const db = createDb(getD1Binding());

  const preferences = createMockUserPreferences({
    user_id: userId,
    predictive_defaults_enabled: true,
    enable_manual_wellness: true,
  });

  await db.insert(userPreferences).values(preferences).onConflictDoNothing();
  console.log(`✓ Seeded user preferences for: ${userId}`);
  return preferences;
}

/**
 * Seed workout templates for the test user
 */
export async function seedWorkoutTemplates(
  userId: string = E2E_TEST_USER_ID,
  count: number = 3,
) {
  const db = createDb(getD1Binding());

  const templates = [
    createMockWorkoutTemplate({
      id: 1,
      user_id: userId,
      name: "Push Day",
      dedupeKey: "push-day",
    }),
    createMockWorkoutTemplate({
      id: 2,
      user_id: userId,
      name: "Pull Day",
      dedupeKey: "pull-day",
    }),
    createMockWorkoutTemplate({
      id: 3,
      user_id: userId,
      name: "Leg Day",
      dedupeKey: "leg-day",
    }),
  ].slice(0, count);

  for (const template of templates) {
    await db.insert(workoutTemplates).values(template).onConflictDoNothing();
  }
  console.log(`✓ Seeded ${templates.length} workout templates for: ${userId}`);
  return templates;
}

/**
 * Seed template exercises for workout templates
 */
export async function seedTemplateExercises(userId: string = E2E_TEST_USER_ID) {
  const db = createDb(getD1Binding());

  const exercises = [
    // Push Day exercises
    createMockTemplateExercise({
      id: 1,
      user_id: userId,
      templateId: 1,
      exerciseName: "Bench Press",
      orderIndex: 0,
    }),
    createMockTemplateExercise({
      id: 2,
      user_id: userId,
      templateId: 1,
      exerciseName: "Overhead Press",
      orderIndex: 1,
    }),
    createMockTemplateExercise({
      id: 3,
      user_id: userId,
      templateId: 1,
      exerciseName: "Tricep Dips",
      orderIndex: 2,
    }),
    // Pull Day exercises
    createMockTemplateExercise({
      id: 4,
      user_id: userId,
      templateId: 2,
      exerciseName: "Deadlift",
      orderIndex: 0,
    }),
    createMockTemplateExercise({
      id: 5,
      user_id: userId,
      templateId: 2,
      exerciseName: "Pull-ups",
      orderIndex: 1,
    }),
    createMockTemplateExercise({
      id: 6,
      user_id: userId,
      templateId: 2,
      exerciseName: "Barbell Rows",
      orderIndex: 2,
    }),
    // Leg Day exercises
    createMockTemplateExercise({
      id: 7,
      user_id: userId,
      templateId: 3,
      exerciseName: "Squat",
      orderIndex: 0,
    }),
    createMockTemplateExercise({
      id: 8,
      user_id: userId,
      templateId: 3,
      exerciseName: "Lunges",
      orderIndex: 1,
    }),
    createMockTemplateExercise({
      id: 9,
      user_id: userId,
      templateId: 3,
      exerciseName: "Calf Raises",
      orderIndex: 2,
    }),
  ];

  await chunkedInsert(exercises, (chunk) =>
    db.insert(templateExercises).values(chunk).onConflictDoNothing(),
  );
  console.log(`✓ Seeded ${exercises.length} template exercises for: ${userId}`);
  return exercises;
}

/**
 * Seed workout sessions for the test user
 */
export async function seedWorkoutSessions(
  userId: string = E2E_TEST_USER_ID,
  count: number = 5,
) {
  const db = createDb(getD1Binding());

  const sessions = Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - i - 1)); // Spread over last N days

    return createMockWorkoutSession({
      id: i + 1,
      user_id: userId,
      templateId: (i % 3) + 1, // Cycle through templates
      workoutDate: date,
    });
  });

  await chunkedInsert(sessions, (chunk) =>
    db.insert(workoutSessions).values(chunk).onConflictDoNothing(),
  );
  console.log(`✓ Seeded ${sessions.length} workout sessions for: ${userId}`);
  return sessions;
}

/**
 * Seed session exercises for workout sessions
 */
export async function seedSessionExercises(userId: string = E2E_TEST_USER_ID) {
  const db = createDb(getD1Binding());

  const exercises = [
    // Session 1 (Push Day) - Bench Press sets
    createMockSessionExercise({
      id: 1,
      user_id: userId,
      sessionId: 1,
      templateExerciseId: 1,
      exerciseName: "Bench Press",
      setOrder: 0,
      weight: 185,
      reps: 5,
      sets: 1,
    }),
    createMockSessionExercise({
      id: 2,
      user_id: userId,
      sessionId: 1,
      templateExerciseId: 1,
      exerciseName: "Bench Press",
      setOrder: 1,
      weight: 185,
      reps: 5,
      sets: 1,
    }),
    createMockSessionExercise({
      id: 3,
      user_id: userId,
      sessionId: 1,
      templateExerciseId: 1,
      exerciseName: "Bench Press",
      setOrder: 2,
      weight: 185,
      reps: 5,
      sets: 1,
    }),
    // Session 1 - Overhead Press
    createMockSessionExercise({
      id: 4,
      user_id: userId,
      sessionId: 1,
      templateExerciseId: 2,
      exerciseName: "Overhead Press",
      setOrder: 0,
      weight: 135,
      reps: 8,
      sets: 3,
    }),
    // Session 2 (Pull Day) - Deadlift
    createMockSessionExercise({
      id: 5,
      user_id: userId,
      sessionId: 2,
      templateExerciseId: 4,
      exerciseName: "Deadlift",
      setOrder: 0,
      weight: 315,
      reps: 5,
      sets: 3,
    }),
    // Session 3 (Leg Day) - Squat
    createMockSessionExercise({
      id: 6,
      user_id: userId,
      sessionId: 3,
      templateExerciseId: 7,
      exerciseName: "Squat",
      setOrder: 0,
      weight: 225,
      reps: 5,
      sets: 3,
    }),
  ];

  await chunkedInsert(exercises, (chunk) =>
    db.insert(sessionExercises).values(chunk).onConflictDoNothing(),
  );
  console.log(`✓ Seeded ${exercises.length} session exercises for: ${userId}`);
  return exercises;
}

/**
 * Seed WHOOP integration data for the test user
 */
export async function seedWhoopIntegration(userId: string = E2E_TEST_USER_ID) {
  const db = createDb(getD1Binding());

  const integration = createMockUserIntegration({
    user_id: userId,
    provider: "whoop",
    externalUserId: "whoop-e2e-user-123",
    accessToken: "e2e-whoop-access-token",
    refreshToken: "e2e-whoop-refresh-token",
    isActive: true,
  });

  await db.insert(userIntegrations).values(integration).onConflictDoNothing();
  console.log(`✓ Seeded WHOOP integration for: ${userId}`);
  return integration;
}

/**
 * Seed WHOOP recovery data for testing
 */
export async function seedWhoopRecoveryData(
  userId: string = E2E_TEST_USER_ID,
  days: number = 7,
) {
  const db = createDb(getD1Binding());

  const recoveryData = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));

    return createMockWhoopRecovery({
      id: i + 1,
      user_id: userId,
      whoop_recovery_id: `recovery-e2e-${i + 1}`,
      date,
      recovery_score: Math.floor(Math.random() * 40) + 60, // 60-100 range
      hrv_rmssd_milli: 40 + Math.random() * 20,
      resting_heart_rate: Math.floor(Math.random() * 20) + 50,
    });
  });

  await chunkedInsert(recoveryData, (chunk) =>
    db.insert(whoopRecovery).values(chunk).onConflictDoNothing(),
  );
  console.log(
    `✓ Seeded ${recoveryData.length} days of WHOOP recovery data for: ${userId}`,
  );
  return recoveryData;
}

/**
 * Seed master exercises for exercise linking
 */
export async function seedMasterExercises(userId: string = E2E_TEST_USER_ID) {
  const db = createDb(getD1Binding());

  const masterExercisesData = [
    createMockMasterExercise({
      id: 1,
      user_id: userId,
      name: "Bench Press",
      normalizedName: "bench press",
      muscleGroup: "chest",
    }),
    createMockMasterExercise({
      id: 2,
      user_id: userId,
      name: "Squat",
      normalizedName: "squat",
      muscleGroup: "legs",
    }),
    createMockMasterExercise({
      id: 3,
      user_id: userId,
      name: "Deadlift",
      normalizedName: "deadlift",
      muscleGroup: "back",
    }),
  ];

  await chunkedInsert(masterExercisesData, (chunk) =>
    db.insert(masterExercises).values(chunk).onConflictDoNothing(),
  );
  console.log(
    `✓ Seeded ${masterExercisesData.length} master exercises for: ${userId}`,
  );
  return masterExercisesData;
}

/**
 * Seed exercise links between template exercises and master exercises
 */
export async function seedExerciseLinks(userId: string = E2E_TEST_USER_ID) {
  const db = createDb(getD1Binding());

  const links = [
    createMockExerciseLink({
      id: 1,
      templateExerciseId: 1, // Bench Press template exercise
      masterExerciseId: 1, // Bench Press master exercise
      user_id: userId,
    }),
    createMockExerciseLink({
      id: 2,
      templateExerciseId: 7, // Squat template exercise
      masterExerciseId: 2, // Squat master exercise
      user_id: userId,
    }),
    createMockExerciseLink({
      id: 3,
      templateExerciseId: 4, // Deadlift template exercise
      masterExerciseId: 3, // Deadlift master exercise
      user_id: userId,
    }),
  ];

  await chunkedInsert(links, (chunk) =>
    db.insert(exerciseLinks).values(chunk).onConflictDoNothing(),
  );
  console.log(`✓ Seeded ${links.length} exercise links for: ${userId}`);
  return links;
}

/**
 * Seed wellness data for testing
 */
export async function seedWellnessData(
  userId: string = E2E_TEST_USER_ID,
  days: number = 3,
) {
  const db = createDb(getD1Binding());

  const wellnessEntries = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));

    return createMockWellnessData({
      id: i + 1,
      user_id: userId,
      date,
      energy_level: Math.floor(Math.random() * 5) + 6, // 6-10 range
      sleep_quality: Math.floor(Math.random() * 5) + 6, // 6-10 range
      has_whoop_data: true,
    });
  });

  await chunkedInsert(wellnessEntries, (chunk) =>
    db.insert(wellnessData).values(chunk).onConflictDoNothing(),
  );
  console.log(
    `✓ Seeded ${wellnessEntries.length} wellness entries for: ${userId}`,
  );
  return wellnessEntries;
}

/**
 * Complete test data seeding for E2E tests
 * Seeds all necessary data in the correct order with proper relationships
 */
export async function seedCompleteTestData(userId: string = E2E_TEST_USER_ID) {
  console.log("🌱 Starting complete E2E test data seeding...");

  // Seed in dependency order
  await seedTestUser(userId);
  await seedUserPreferences(userId);
  await seedWhoopIntegration(userId);
  await seedMasterExercises(userId);
  await seedWorkoutTemplates(userId);
  await seedTemplateExercises(userId);
  await seedExerciseLinks(userId);
  await seedWorkoutSessions(userId);
  await seedSessionExercises(userId);
  await seedWhoopRecoveryData(userId);
  await seedWellnessData(userId);

  console.log("✅ Complete E2E test data seeding finished!");
}

/**
 * Clean up all test data for a user
 * Useful for test teardown or resetting between test runs
 */
export async function cleanupTestData(userId: string = E2E_TEST_USER_ID) {
  const db = createDb(getD1Binding());

  console.log(`🧹 Cleaning up test data for user: ${userId}`);

  // Delete in reverse dependency order
  await db.delete(wellnessData).where(eq(wellnessData.user_id, userId));
  await db.delete(whoopRecovery).where(eq(whoopRecovery.user_id, userId));
  await db.delete(sessionExercises).where(eq(sessionExercises.user_id, userId));
  await db.delete(workoutSessions).where(eq(workoutSessions.user_id, userId));
  await db.delete(exerciseLinks).where(eq(exerciseLinks.user_id, userId));
  await db
    .delete(templateExercises)
    .where(eq(templateExercises.user_id, userId));
  await db.delete(workoutTemplates).where(eq(workoutTemplates.user_id, userId));
  await db.delete(masterExercises).where(eq(masterExercises.user_id, userId));
  await db.delete(userIntegrations).where(eq(userIntegrations.user_id, userId));
  await db.delete(userPreferences).where(eq(userPreferences.user_id, userId));
  await db.delete(users).where(eq(users.id, userId));

  console.log(`✓ Cleaned up all test data for user: ${userId}`);
}

// Re-export eq for convenience
export { eq } from "drizzle-orm";
