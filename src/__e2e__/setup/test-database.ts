import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "~/server/db/schema";
import { eq } from "drizzle-orm";

// Test database connection
const testConnectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/swole_tracker_test";
const testConnection = postgres(testConnectionString);
const testDb = drizzle(testConnection, { schema });

// Test Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/**
 * Creates a test user for e2e testing
 */
export async function createTestUser(): Promise<TestUser> {
  const timestamp = Date.now();
  const testUser = {
    email: `test-user-${timestamp}@swole-tracker-e2e.com`,
    password: "TestPassword123!",
  };

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: testUser.email,
    password: testUser.password,
    email_confirm: true, // Auto-confirm email for tests
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  // Create user preferences record
  await testDb.insert(schema.userPreferences).values({
    user_id: authData.user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Created test user: ${testUser.email} (ID: ${authData.user.id})`);

  return {
    id: authData.user.id,
    email: testUser.email,
    password: testUser.password,
  };
}

/**
 * Creates test workout template
 */
export async function createTestTemplate(userId: string, name = "Test Workout") {
  const template = await testDb.insert(schema.workoutTemplates).values({
    user_id: userId,
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  // Add a couple of exercises to the template
  const exercises = await testDb.insert(schema.templateExercises).values([
    {
      user_id: userId,
      templateId: template[0]!.id,
      exerciseName: "Bench Press",
      targetSets: 3,
      targetReps: "8-10",
      restPeriod: 120,
      notes: "Control the weight",
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      user_id: userId,
      templateId: template[0]!.id,
      exerciseName: "Squats", 
      targetSets: 3,
      targetReps: "10-12",
      restPeriod: 180,
      notes: "Full range of motion",
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]).returning();

  return {
    template: template[0]!,
    exercises,
  };
}

/**
 * Creates test master exercises for linking
 */
export async function createTestMasterExercises() {
  return await testDb.insert(schema.masterExercises).values([
    {
      name: "Bench Press",
      variations: ["Barbell Bench Press", "Dumbbell Bench Press", "Incline Bench Press"],
      primaryMuscles: ["chest"],
      secondaryMuscles: ["shoulders", "triceps"],
      equipment: ["barbell", "bench"],
      instructions: ["Lie on bench", "Lower bar to chest", "Press up"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Squats",
      variations: ["Back Squat", "Front Squat", "Goblet Squat"],
      primaryMuscles: ["quadriceps", "glutes"],
      secondaryMuscles: ["hamstrings", "calves"],
      equipment: ["barbell", "rack"],
      instructions: ["Stand with feet shoulder width", "Lower until thighs parallel", "Drive up through heels"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]).returning();
}

/**
 * Cleans up all test data
 */
export async function cleanupTestData(): Promise<void> {
  try {
    // Get all test users (by email pattern)
    const { data: testUsers } = await supabaseAdmin.auth.admin.listUsers();
    const testUserIds = testUsers.users
      .filter(user => user.email?.includes("swole-tracker-e2e.com"))
      .map(user => user.id);

    if (testUserIds.length === 0) {
      console.log("No test users found to clean up");
      return;
    }

    // Delete database records for test users
    for (const userId of testUserIds) {
      // Delete in order to respect foreign key constraints
      await testDb.delete(schema.sessionExercise)
        .where(eq(schema.sessionExercise.user_id, userId));
      
      await testDb.delete(schema.workoutSession)
        .where(eq(schema.workoutSession.user_id, userId));
        
      await testDb.delete(schema.templateExercises)
        .where(eq(schema.templateExercises.user_id, userId));
        
      await testDb.delete(schema.workoutTemplates)
        .where(eq(schema.workoutTemplates.user_id, userId));
        
      await testDb.delete(schema.userPreferences)
        .where(eq(schema.userPreferences.user_id, userId));

      await testDb.delete(schema.healthAdvice)
        .where(eq(schema.healthAdvice.user_id, userId));

      await testDb.delete(schema.userIntegration)
        .where(eq(schema.userIntegration.user_id, userId));

      // Delete Supabase Auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }

    // Clean up master exercises created during tests
    await testDb.delete(schema.masterExercises)
      .where(eq(schema.masterExercises.name, "Bench Press"));
    await testDb.delete(schema.masterExercises)
      .where(eq(schema.masterExercises.name, "Squats"));

    console.log(`Cleaned up ${testUserIds.length} test users and associated data`);

  } catch (error) {
    console.error("Error cleaning up test data:", error);
    throw error;
  }
}

/**
 * Get test user info from environment
 */
export function getTestUser(): TestUser {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD; 
  const id = process.env.TEST_USER_ID;

  if (!email || !password || !id) {
    throw new Error("Test user not found in environment. Run global setup first.");
  }

  return { id, email, password };
}