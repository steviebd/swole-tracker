import { test, expect } from "@playwright/test";
import { WorkoutPage } from "./pages/workout-page";
import { TemplatesPage } from "./pages/templates-page";
import { createTestTemplate, getTestUser } from "./setup/test-database";

test.describe("Workout Session Flow", () => {
  let workoutPage: WorkoutPage;
  let templatesPage: TemplatesPage;

  test.beforeEach(async ({ page }) => {
    workoutPage = new WorkoutPage(page);
    templatesPage = new TemplatesPage(page);
    // Ensure we're authenticated for all tests
    await workoutPage.auth.ensureAuthenticated();
  });

  test.describe("Workout Start", () => {
    test("should display start workout page", async () => {
      await workoutPage.goToStartWorkout();
      await workoutPage.verifyOnStartWorkoutPage();
    });

    test("should start workout from template", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Test Workout Template");
      
      await workoutPage.startWorkoutFromTemplate("Test Workout Template");
      await workoutPage.verifyInWorkoutSession();
      
      // Verify exercises from template are loaded
      const exercises = await workoutPage.getExerciseNames();
      expect(exercises).toContain("Bench Press");
      expect(exercises).toContain("Squats");
    });

    test("should start quick workout without template", async () => {
      await workoutPage.startQuickWorkout();
      await workoutPage.verifyInWorkoutSession();
      
      // Should be in workout session even without template
      expect(await workoutPage.isInWorkoutSession()).toBe(true);
    });
  });

  test.describe("Exercise Logging", () => {
    test("should log sets for exercises", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Logging Test Template");
      
      await workoutPage.startWorkoutFromTemplate("Logging Test Template");
      
      // Log sets for first exercise (Bench Press)
      await workoutPage.logSet(0, 135, 8, 7); // 135lbs, 8 reps, RPE 7
      await workoutPage.logSet(0, 135, 7, 8); // Second set
      await workoutPage.logSet(0, 135, 6, 9); // Third set
      
      // Verify sets are recorded (this would depend on UI feedback)
      expect(await workoutPage.isInWorkoutSession()).toBe(true);
    });

    test("should log multiple exercises in workout", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Multi Exercise Template");
      
      await workoutPage.startWorkoutFromTemplate("Multi Exercise Template");
      
      // Log sets for first exercise (Bench Press)
      await workoutPage.logSets(0, [
        { weight: 135, reps: 10 },
        { weight: 145, reps: 8 },
        { weight: 155, reps: 6 },
      ]);
      
      // Log sets for second exercise (Squats)
      await workoutPage.logSets(1, [
        { weight: 185, reps: 12 },
        { weight: 205, reps: 10 },
        { weight: 225, reps: 8 },
      ]);
      
      expect(await workoutPage.isInWorkoutSession()).toBe(true);
    });

    test("should handle different weight/rep combinations", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Variety Template");
      
      await workoutPage.startWorkoutFromTemplate("Variety Template");
      
      // Log various set types
      await workoutPage.logSet(0, 95, 15);    // Light weight, high reps
      await workoutPage.logSet(0, 135, 10);   // Medium weight, medium reps
      await workoutPage.logSet(0, 185, 5);    // Heavy weight, low reps
      await workoutPage.logSet(0, 135, 12);   // Back down set
      
      expect(await workoutPage.isInWorkoutSession()).toBe(true);
    });
  });

  test.describe("Workout Session Management", () => {
    test("should track workout timer", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Timer Test Template");
      
      await workoutPage.startWorkoutFromTemplate("Timer Test Template");
      
      // Get initial timer
      const initialTimer = await workoutPage.getWorkoutTimer();
      expect(initialTimer).toMatch(/\d{2}:\d{2}/); // Format: MM:SS
      
      // Wait a bit and check timer has changed
      await workoutPage.page.waitForTimeout(2000);
      const updatedTimer = await workoutPage.getWorkoutTimer();
      expect(updatedTimer).not.toBe(initialTimer);
    });

    test("should add exercise during workout", async () => {
      await workoutPage.startQuickWorkout();
      
      // Add exercise to empty workout
      await workoutPage.addExerciseToWorkout("Deadlifts");
      
      const exercises = await workoutPage.getExerciseNames();
      expect(exercises).toContain("Deadlifts");
    });

    test("should finish and save workout", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Save Test Template");
      
      await workoutPage.startWorkoutFromTemplate("Save Test Template");
      
      // Log at least one set
      await workoutPage.logSet(0, 135, 10);
      
      // Finish workout
      await workoutPage.finishWorkout();
      
      // Should be redirected away from workout session
      expect(await workoutPage.isInWorkoutSession()).toBe(false);
      
      // Should be on workouts history or dashboard
      const currentUrl = workoutPage.getCurrentUrl();
      expect(currentUrl).toMatch(/\/workouts|\/$/);
    });

    test("should discard workout without saving", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Discard Test Template");
      
      await workoutPage.startWorkoutFromTemplate("Discard Test Template");
      
      // Log some data
      await workoutPage.logSet(0, 135, 10);
      
      // Discard workout
      await workoutPage.discardWorkout();
      
      // Should be redirected away from workout session
      expect(await workoutPage.isInWorkoutSession()).toBe(false);
    });
  });

  test.describe("Rest Timer", () => {
    test("should show rest timer after completing set", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Rest Timer Template");
      
      await workoutPage.startWorkoutFromTemplate("Rest Timer Template");
      
      // Log a set
      await workoutPage.logSet(0, 135, 10);
      
      // Should show rest timer
      await workoutPage.waitForRestTimer();
      
      // Should be able to skip rest
      await workoutPage.skipRest();
    });
  });

  test.describe("Workout History", () => {
    test("should display workout history", async () => {
      await workoutPage.goToWorkoutsHistory();
      await workoutPage.verifyOnWorkoutsHistoryPage();
    });

    test("should show completed workout in history", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "History Test Template");
      
      // Complete a workout
      await workoutPage.startWorkoutFromTemplate("History Test Template");
      await workoutPage.logSet(0, 135, 10);
      await workoutPage.finishWorkout();
      
      // Check history
      await workoutPage.goToWorkoutsHistory();
      const workoutHistory = await workoutPage.getWorkoutHistoryItems();
      
      // Should have at least one workout
      expect(workoutHistory.length).toBeGreaterThan(0);
      
      // Should contain our template name
      const hasOurWorkout = workoutHistory.some(workout => 
        workout.name.includes("History Test Template")
      );
      expect(hasOurWorkout).toBe(true);
    });

    test("should view workout details from history", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Details Test Template");
      
      // Complete a workout
      await workoutPage.startWorkoutFromTemplate("Details Test Template");
      await workoutPage.logSet(0, 135, 10);
      await workoutPage.logSet(0, 145, 8);
      await workoutPage.finishWorkout();
      
      // View details
      await workoutPage.goToWorkoutsHistory();
      await workoutPage.viewWorkoutDetails("Details Test Template");
      
      // Should be on workout details page
      const currentUrl = workoutPage.getCurrentUrl();
      expect(currentUrl).toMatch(/\/workouts\//);
    });
  });

  test.describe("Offline Functionality", () => {
    test("should continue workout when offline", async ({ context }) => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Offline Test Template");
      
      await workoutPage.startWorkoutFromTemplate("Offline Test Template");
      
      // Simulate going offline
      await context.setOffline(true);
      
      // Should still be able to log sets
      await workoutPage.logSet(0, 135, 10);
      
      // Re-enable network
      await context.setOffline(false);
      
      // Should be able to finish workout
      await workoutPage.finishWorkout();
      
      expect(await workoutPage.isInWorkoutSession()).toBe(false);
    });
  });

  test.describe("Workout Session Persistence", () => {
    test("should maintain workout state after page reload", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Persistence Test Template");
      
      await workoutPage.startWorkoutFromTemplate("Persistence Test Template");
      
      // Log some sets
      await workoutPage.logSet(0, 135, 10);
      
      // Reload page
      await workoutPage.page.reload();
      await workoutPage.page.waitForLoadState("networkidle");
      
      // Should still be in workout session
      expect(await workoutPage.isInWorkoutSession()).toBe(true);
      
      // Should still show our exercises
      const exercises = await workoutPage.getExerciseNames();
      expect(exercises.length).toBeGreaterThan(0);
    });

    test("should handle browser back/forward during workout", async () => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Navigation Test Template");
      
      await workoutPage.startWorkoutFromTemplate("Navigation Test Template");
      
      // Navigate away (this might show a confirmation dialog)
      await workoutPage.page.goto("/templates");
      
      // Navigate back
      await workoutPage.page.goBack();
      
      // Should return to workout session
      expect(await workoutPage.isInWorkoutSession()).toBe(true);
    });
  });

  test.describe("Error Handling", () => {
    test("should handle invalid exercise data gracefully", async () => {
      await workoutPage.startQuickWorkout();
      
      // Try to add exercise with empty name
      try {
        await workoutPage.addExerciseToWorkout("");
      } catch (error) {
        // Should handle error gracefully
        expect(await workoutPage.isInWorkoutSession()).toBe(true);
      }
    });

    test("should handle network errors during save", async ({ context }) => {
      const testUser = getTestUser();
      const { template } = await createTestTemplate(testUser.id, "Network Error Template");
      
      await workoutPage.startWorkoutFromTemplate("Network Error Template");
      await workoutPage.logSet(0, 135, 10);
      
      // Simulate network error during save
      await context.setOffline(true);
      
      try {
        await workoutPage.finishWorkout();
      } catch (error) {
        // Should handle network error
        expect(await workoutPage.isInWorkoutSession()).toBe(true);
      }
      
      // Re-enable network and try again
      await context.setOffline(false);
      await workoutPage.finishWorkout();
      
      expect(await workoutPage.isInWorkoutSession()).toBe(false);
    });
  });
});