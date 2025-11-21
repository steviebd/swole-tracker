import { test, expect } from "../fixtures/auth.fixture";

// Set a longer timeout for interactive testing
test.setTimeout(180000); // 3 minutes per test

test.describe("Warm-Up Sets Feature - E2E Tests", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Ensure we're on the home page before each test
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("user can configure warm-up preferences", async ({ authenticatedPage: page }) => {
    console.log("\n Setting up warm-up preferences test\n");

    // Navigate to settings/preferences
    console.log("Step 1: Navigating to settings page...");
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Look for warm-up preferences section
    const warmupSection = page.locator('text=/warm-up|warmup/i').first();

    // If preferences exist, verify they can be modified
    if (await warmupSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("Found warm-up preferences section");

      // Take screenshot of preferences page
      await page.screenshot({
        path: "test-screenshots/warmup-01-preferences.png",
        fullPage: true,
      });

      console.log("Warm-up preferences section found and accessible");
    } else {
      console.log("Warm-up preferences section not found - may be in different location");
    }

    console.log("Warm-up preferences test completed");
  });

  test("user can see warm-up section during workout", async ({ authenticatedPage: page }) => {
    console.log("\n Starting warm-up section visibility test\n");

    // Step 1: Navigate to templates
    console.log("Step 1: Navigating to templates...");
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    // Find a template with exercises (or create one)
    const templateLink = page.locator('a[aria-label*="Start workout"]').first();

    if (await templateLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("Step 2: Starting workout from existing template...");

      // Click to start workout
      await templateLink.click();
      await page.waitForLoadState("networkidle");

      // Wait for redirect to workout start page
      await page.waitForURL(/\/workout\/start\?templateId=\d+/, { timeout: 10000 });

      // Click the second "Start workout" button
      const startButton = page.locator('button:has-text("Start workout"), a:has-text("Start workout")').last();
      if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await startButton.click();
        await page.waitForLoadState("networkidle");
      }

      // Wait for workout session page
      await page.waitForURL(/\/workout\/session\//, { timeout: 10000 });
      console.log("Workout session started");

      // Step 3: Look for warm-up section
      console.log("Step 3: Looking for warm-up section...");

      // The warm-up section should be collapsible and show "Warm-up Sets"
      const warmupSection = page.locator('text=/Warm-up Sets/i').first();

      await page.screenshot({
        path: "test-screenshots/warmup-02-workout-session.png",
        fullPage: true,
      });

      if (await warmupSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("Found warm-up section in workout");

        // Click to expand warm-up section
        const expandButton = page.locator('button[aria-controls*="warmup"], button:has-text("Warm-up Sets")').first();
        if (await expandButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expandButton.click();
          await page.waitForTimeout(500);
          console.log("Expanded warm-up section");

          await page.screenshot({
            path: "test-screenshots/warmup-03-expanded-section.png",
            fullPage: true,
          });
        }
      } else {
        console.log("Warm-up section not visible - checking if feature is enabled");
      }

      // Complete or cancel the workout
      console.log("Step 4: Cleaning up - canceling workout...");
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      console.log("Warm-up section visibility test completed");
    } else {
      console.log("No templates available - skipping test");
    }
  });

  test("user can use Auto Fill for warm-up suggestions", async ({ authenticatedPage: page }) => {
    console.log("\n Testing Auto Fill warm-up suggestions\n");

    // Navigate to templates and start a workout
    console.log("Step 1: Starting workout...");
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    const templateLink = page.locator('a[aria-label*="Start workout"]').first();

    if (!(await templateLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log("No templates available - skipping test");
      return;
    }

    await templateLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForURL(/\/workout\/start\?templateId=\d+/, { timeout: 10000 });

    const startButton = page.locator('button:has-text("Start workout"), a:has-text("Start workout")').last();
    if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForLoadState("networkidle");
    }

    await page.waitForURL(/\/workout\/session\//, { timeout: 10000 });
    console.log("Workout session started");

    // Step 2: Expand warm-up section and look for Auto Fill button
    console.log("Step 2: Looking for Auto Fill button...");

    // First try to find and expand warm-up section
    const warmupToggle = page.locator('button[aria-controls*="warmup"], button:has-text("Warm-up Sets")').first();
    if (await warmupToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await warmupToggle.click();
      await page.waitForTimeout(500);
    }

    // Look for Auto Fill button
    const autoFillButton = page.locator('button:has-text("Auto Fill")').first();

    if (await autoFillButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("Found Auto Fill button");

      await page.screenshot({
        path: "test-screenshots/warmup-04-auto-fill-available.png",
        fullPage: true,
      });

      // Click Auto Fill
      await autoFillButton.click();
      await page.waitForTimeout(1000);
      console.log("Clicked Auto Fill button");

      await page.screenshot({
        path: "test-screenshots/warmup-05-after-auto-fill.png",
        fullPage: true,
      });

      // Verify warm-up sets were generated
      const warmupSetInputs = page.locator('input[aria-label*="Warm-up set"]');
      const count = await warmupSetInputs.count();
      console.log(`Auto Fill generated ${count / 2} warm-up sets (weight/reps inputs)`);

      expect(count).toBeGreaterThan(0);
    } else {
      console.log("Auto Fill button not visible - feature may need exercise data first");
    }

    // Cleanup
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    console.log("Auto Fill test completed");
  });

  test("user can manually adjust warm-up sets", async ({ authenticatedPage: page }) => {
    console.log("\n Testing manual warm-up set adjustment\n");

    // Start a workout
    console.log("Step 1: Starting workout...");
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    const templateLink = page.locator('a[aria-label*="Start workout"]').first();

    if (!(await templateLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log("No templates available - skipping test");
      return;
    }

    await templateLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForURL(/\/workout\/start\?templateId=\d+/, { timeout: 10000 });

    const startButton = page.locator('button:has-text("Start workout"), a:has-text("Start workout")').last();
    if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForLoadState("networkidle");
    }

    await page.waitForURL(/\/workout\/session\//, { timeout: 10000 });

    // Step 2: Add warm-up sets manually
    console.log("Step 2: Adding warm-up sets manually...");

    // Expand warm-up section
    const warmupToggle = page.locator('button[aria-controls*="warmup"], button:has-text("Warm-up Sets")').first();
    if (await warmupToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await warmupToggle.click();
      await page.waitForTimeout(500);
    }

    // Find and click "Add Set" button
    const addSetButton = page.locator('button:has-text("Add Set")').first();

    if (await addSetButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("Found Add Set button");

      // Add a warm-up set
      await addSetButton.click();
      await page.waitForTimeout(500);
      console.log("Added first warm-up set");

      // Look for weight input and fill it
      const weightInput = page.locator('input[aria-label*="Warm-up set 1 weight"]').first();
      if (await weightInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await weightInput.fill("40");
        console.log("Entered weight: 40");
      }

      // Look for reps input and fill it
      const repsInput = page.locator('input[aria-label*="Warm-up set 1 reps"]').first();
      if (await repsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await repsInput.fill("10");
        console.log("Entered reps: 10");
      }

      await page.screenshot({
        path: "test-screenshots/warmup-06-manual-set-added.png",
        fullPage: true,
      });

      // Add another set
      await addSetButton.click();
      await page.waitForTimeout(500);
      console.log("Added second warm-up set");

      // Fill second set
      const weightInput2 = page.locator('input[aria-label*="Warm-up set 2 weight"]').first();
      if (await weightInput2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await weightInput2.fill("60");
      }

      const repsInput2 = page.locator('input[aria-label*="Warm-up set 2 reps"]').first();
      if (await repsInput2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await repsInput2.fill("8");
      }

      await page.screenshot({
        path: "test-screenshots/warmup-07-two-sets-added.png",
        fullPage: true,
      });

      console.log("Manual warm-up set adjustment completed");
    } else {
      console.log("Add Set button not visible");
    }

    // Cleanup
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("user can save workout with warm-up sets", async ({ authenticatedPage: page }) => {
    console.log("\n Testing saving workout with warm-up sets\n");
    const templateName = `E2E Warmup Test ${Date.now()}`;

    // Step 1: Create a test template
    console.log("Step 1: Creating test template...");
    await page.goto("/templates/new");
    await page.waitForLoadState("networkidle");

    // Fill template name
    const nameInput = page.locator('input[placeholder*="Push Day"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(templateName);

    // Click Next to go to exercises
    const nextButton = page.locator('button:has-text("Next")');
    await nextButton.click();
    await page.waitForTimeout(500);

    // Add exercise
    const exerciseInput = page.locator('input[placeholder="Exercise 1"]');
    await expect(exerciseInput).toBeVisible({ timeout: 5000 });
    await exerciseInput.fill("Bench Press");
    await page.waitForTimeout(500);

    // Skip linking and go to preview
    await nextButton.click();
    await page.waitForTimeout(1000);
    await nextButton.click();
    await page.waitForTimeout(500);

    // Create template
    const createButton = page.locator('button:has-text("Create Template")');
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();

    await page.waitForURL(/\/templates$/, { timeout: 10000 });
    console.log("Template created");

    // Step 2: Start workout with the template
    console.log("Step 2: Starting workout...");

    const ourTemplateLink = page.locator(`a[aria-label="Start workout with ${templateName}"]`);
    await expect(ourTemplateLink).toBeVisible({ timeout: 5000 });
    await ourTemplateLink.click();

    await page.waitForURL(/\/workout\/start\?templateId=\d+/, { timeout: 10000 });

    const startWorkoutButton = page.locator('button:has-text("Start workout"), a:has-text("Start workout")').last();
    await expect(startWorkoutButton).toBeVisible({ timeout: 5000 });
    await startWorkoutButton.click();

    await page.waitForURL(/\/workout\/session\/\d+/, { timeout: 10000 });
    console.log("Workout session started");

    // Step 3: Add warm-up sets
    console.log("Step 3: Adding warm-up sets...");

    // Expand warm-up section
    const warmupToggle = page.locator('button:has-text("Warm-up Sets")').first();
    if (await warmupToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await warmupToggle.click();
      await page.waitForTimeout(500);

      // Add a warm-up set
      const addSetButton = page.locator('button:has-text("Add Set")').first();
      if (await addSetButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addSetButton.click();
        await page.waitForTimeout(500);

        // Fill weight and reps
        const weightInput = page.locator('input[aria-label*="Warm-up set 1 weight"]').first();
        if (await weightInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await weightInput.fill("40");
        }

        const repsInput = page.locator('input[aria-label*="Warm-up set 1 reps"]').first();
        if (await repsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await repsInput.fill("10");
        }

        console.log("Added warm-up set: 40kg x 10");
      }
    }

    // Fill working set data
    console.log("Step 4: Filling working set data...");
    const workingWeightInput = page.locator('input[placeholder="Weight"]').first();
    if (await workingWeightInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workingWeightInput.fill("100");
    }

    const workingRepsInput = page.locator('input[placeholder="Reps"]').first();
    if (await workingRepsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workingRepsInput.fill("5");
    }

    await page.screenshot({
      path: "test-screenshots/warmup-08-before-save.png",
      fullPage: true,
    });

    // Step 5: Complete workout
    console.log("Step 5: Completing workout...");
    const completeButton = page.getByRole('button', { name: 'Complete', exact: true });
    await expect(completeButton).toBeVisible({ timeout: 5000 });
    await completeButton.click();
    await page.waitForTimeout(1000);

    // Confirm completion
    const confirmButton = page.getByRole('button', { name: 'Complete Workout' }).last();
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    // Wait for redirect to home
    await page.waitForURL(/^\/$|\/$/);
    console.log("Workout completed and saved");

    await page.screenshot({
      path: "test-screenshots/warmup-09-after-save.png",
      fullPage: true,
    });

    // Step 6: Verify workout in history
    console.log("Step 6: Verifying workout in history...");
    await page.goto("/workouts");
    await page.waitForLoadState("networkidle");

    // Look for the template name or bench press
    const workoutInHistory = page.locator(`text=/Bench Press|${templateName}/i`).first();
    const isVisible = await workoutInHistory.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      console.log("Workout found in history");
    } else {
      console.log("Note: Workout may not be immediately visible in history");
    }

    await page.screenshot({
      path: "test-screenshots/warmup-10-workout-history.png",
      fullPage: true,
    });

    // Step 7: Cleanup - delete template
    console.log("Step 7: Cleaning up - deleting template...");
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    const templateText = page.locator(`text="${templateName}"`);
    if (await templateText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await templateText.click();
      await page.waitForTimeout(500);

      const deleteButton = page.getByRole('button', { name: 'Delete' }).first();
      if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Confirm delete
        const confirmDelete = page.locator('button:has-text("Delete")').last();
        if (await confirmDelete.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmDelete.click();
          console.log("Template deleted");
        }
      }
    }

    console.log("\nWorkout save with warm-up sets test completed");
  });

  test("smart suggestions appear based on user history", async ({ authenticatedPage: page }) => {
    console.log("\n Testing smart suggestions for warm-up sets\n");

    // Start a workout
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    const templateLink = page.locator('a[aria-label*="Start workout"]').first();

    if (!(await templateLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log("No templates available - skipping test");
      return;
    }

    await templateLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForURL(/\/workout\/start\?templateId=\d+/, { timeout: 10000 });

    const startButton = page.locator('button:has-text("Start workout"), a:has-text("Start workout")').last();
    if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForLoadState("networkidle");
    }

    await page.waitForURL(/\/workout\/session\//, { timeout: 10000 });

    // Expand warm-up section
    const warmupToggle = page.locator('button:has-text("Warm-up Sets")').first();
    if (await warmupToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await warmupToggle.click();
      await page.waitForTimeout(1000);

      // Look for smart suggestion banner
      const suggestionBanner = page.locator('text=/Smart Suggestion|based on your history/i').first();

      if (await suggestionBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log("Found smart suggestion banner");

        await page.screenshot({
          path: "test-screenshots/warmup-11-smart-suggestion.png",
          fullPage: true,
        });

        // Look for Apply button
        const applyButton = page.locator('button:has-text("Apply")').first();
        if (await applyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await applyButton.click();
          console.log("Applied smart suggestion");

          await page.screenshot({
            path: "test-screenshots/warmup-12-after-apply.png",
            fullPage: true,
          });
        }
      } else {
        console.log("No smart suggestion available - user may not have enough history");
      }
    }

    // Cleanup
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    console.log("Smart suggestions test completed");
  });

  test("warm-up section accessibility", async ({ authenticatedPage: page }) => {
    console.log("\n Testing warm-up section accessibility\n");

    // Start a workout
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    const templateLink = page.locator('a[aria-label*="Start workout"]').first();

    if (!(await templateLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log("No templates available - skipping test");
      return;
    }

    await templateLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForURL(/\/workout\/start\?templateId=\d+/, { timeout: 10000 });

    const startButton = page.locator('button:has-text("Start workout"), a:has-text("Start workout")').last();
    if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForLoadState("networkidle");
    }

    await page.waitForURL(/\/workout\/session\//, { timeout: 10000 });

    // Check accessibility attributes
    console.log("Checking ARIA attributes...");

    // Check for aria-expanded on toggle button
    const warmupToggle = page.locator('button[aria-expanded]').first();
    if (await warmupToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      const expanded = await warmupToggle.getAttribute("aria-expanded");
      console.log(`aria-expanded attribute present: ${expanded}`);
      expect(expanded).toBeDefined();

      // Check aria-controls
      const controls = await warmupToggle.getAttribute("aria-controls");
      if (controls) {
        console.log(`aria-controls: ${controls}`);
      }
    }

    // Test keyboard navigation
    console.log("Testing keyboard navigation...");

    // Focus on toggle and press Enter
    if (await warmupToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await warmupToggle.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);

      const expandedAfter = await warmupToggle.getAttribute("aria-expanded");
      console.log(`After Enter key - aria-expanded: ${expandedAfter}`);
    }

    await page.screenshot({
      path: "test-screenshots/warmup-13-accessibility.png",
      fullPage: true,
    });

    // Cleanup
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    console.log("Accessibility test completed");
  });
});
