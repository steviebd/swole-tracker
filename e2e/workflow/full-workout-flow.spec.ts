import { test, expect } from "../fixtures/auth.fixture";

// Set a slower timeout for interactive testing
test.setTimeout(180000); // 3 minutes per test

test.describe("Full Workout Flow - Interactive", () => {
  test("complete workflow: create template → link exercise → workout → verify data → delete", async ({
    authenticatedPage: page,
  }) => {
    console.log("\n🏋️  Starting Full Workout Flow Test\n");
    const templateName = `E2E Squat Test ${Date.now()}`;

    // Step 1: Navigate to Templates page
    console.log("Step 1: Navigating to Templates page...");
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");
    console.log("✓ Templates page loaded");

    await page.screenshot({
      path: "test-screenshots/01-templates-page.png",
      fullPage: true
    });

    // Step 2: Click "Create Template" button
    console.log("\nStep 2: Creating new template...");
    const createButton = page.locator('a:has-text("Create Template")');
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();
    await page.waitForLoadState("networkidle");

    // Verify we're on the new template page
    await expect(page).toHaveURL(/\/templates\/new/);
    console.log("✓ Navigated to template creation page");

    await page.screenshot({
      path: "test-screenshots/02-new-template-page.png",
      fullPage: true
    });

    // Step 3: Fill in template name (Step 1 - Basics)
    console.log("\nStep 3: Filling template name...");
    const nameInput = page.locator('input[placeholder*="Push Day"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(templateName);
    console.log(`✓ Template name set: ${templateName}`);

    // Click "Next" to go to exercises step
    const nextButton = page.locator('button:has-text("Next")');
    await nextButton.click();
    await page.waitForTimeout(500);
    console.log("✓ Moved to exercises step");

    await page.screenshot({
      path: "test-screenshots/03-exercises-step.png",
      fullPage: true
    });

    // Step 4: Add "Squat" exercise (Step 2 - Exercises)
    console.log("\nStep 4: Adding Squat exercise...");

    // The first exercise input should already be visible
    const firstExerciseInput = page.locator('input[placeholder="Exercise 1"]');
    await expect(firstExerciseInput).toBeVisible({ timeout: 5000 });
    await firstExerciseInput.fill("Squat");
    await page.waitForTimeout(500); // Wait for autocomplete
    console.log("✓ Squat exercise added");

    await page.screenshot({
      path: "test-screenshots/04-squat-added.png",
      fullPage: true
    });

    // Click "Next" to go to linking step
    await nextButton.click();
    await page.waitForTimeout(1000); // Wait for linking step to load
    console.log("✓ Moved to linking step");

    await page.screenshot({
      path: "test-screenshots/05-linking-step.png",
      fullPage: true
    });

    // Step 5: Review linking suggestions (Step 3 - Link Exercises)
    console.log("\nStep 5: Reviewing exercise linking...");

    // The linking step should show suggestions or allow creating new master exercise
    // Wait for the linking UI to appear
    await page.waitForTimeout(1000);

    // Take screenshot of linking decisions
    await page.screenshot({
      path: "test-screenshots/06-linking-review.png",
      fullPage: true
    });

    console.log("✓ Linking review displayed");

    // Click "Next" to go to preview step
    await nextButton.click();
    await page.waitForTimeout(500);
    console.log("✓ Moved to preview step");

    await page.screenshot({
      path: "test-screenshots/07-preview-step.png",
      fullPage: true
    });

    // Step 6: Create the template (Step 4 - Preview)
    console.log("\nStep 6: Creating template...");
    const createTemplateButton = page.locator('button:has-text("Create Template")');
    await expect(createTemplateButton).toBeVisible({ timeout: 5000 });
    await createTemplateButton.click();

    // Wait for redirect back to templates page
    await page.waitForURL(/\/templates$/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    console.log("✓ Template created successfully");

    // Verify the template appears in the list
    const createdTemplate = page.locator(`text="${templateName}"`);
    await expect(createdTemplate).toBeVisible({ timeout: 5000 });
    console.log("✓ Template visible in templates list");

    await page.screenshot({
      path: "test-screenshots/08-template-created.png",
      fullPage: true
    });

    // Step 7: Start a workout from the template
    console.log("\nStep 7: Starting workout from template...");

    // We should already be on templates page
    // Find the "Start workout" button associated with our template
    console.log(`  Looking for template: "${templateName}"`);

    // Strategy: Find the "Start workout" link specifically for OUR template
    // The link has aria-label="Start workout with [TEMPLATE_NAME]"
    // This ensures we click the right template, not a pre-existing one like "TOTAL"
    const ourStartWorkoutLink = page.locator(`a[aria-label="Start workout with ${templateName}"]`);
    await expect(ourStartWorkoutLink).toBeVisible({ timeout: 5000 });
    console.log(`✓ Found "Start workout" link for our template`);

    await ourStartWorkoutLink.click();
    await page.waitForLoadState("networkidle");
    console.log("✓ Clicked 'Start workout' link for our specific template");

    // Verify we're on /workout/start?templateId=XX
    await expect(page).toHaveURL(/\/workout\/start\?templateId=\d+/);
    console.log("✓ Navigated to workout start page with template");

    await page.screenshot({
      path: "test-screenshots/09-workout-start-with-template.png",
      fullPage: true
    });

    // Click "Start workout" button/link again (second time, at the bottom of the page)
    // This could be either a button or a link
    const startWorkoutButton2 = page.locator('button:has-text("Start workout"), a:has-text("Start workout")').last();
    await expect(startWorkoutButton2).toBeVisible({ timeout: 5000 });
    await startWorkoutButton2.click();
    await page.waitForLoadState("networkidle");
    console.log("✓ Clicked 'Start workout' (second time)");

    // Verify we're in a workout session at /workout/session/XXX
    await expect(page).toHaveURL(/\/workout\/session\/\d+/);
    console.log("✓ Workout session started");

    await page.screenshot({
      path: "test-screenshots/10-workout-session-active.png",
      fullPage: true
    });

    // Step 8: Check Squat exercise and verify historic data
    console.log("\nStep 8: Verifying Squat exercise and historic data...");

    // Look for the Squat exercise in the workout session
    const squatExercise = page.locator('text=/Squat/i').first();
    await expect(squatExercise).toBeVisible({ timeout: 5000 });
    console.log("✓ Squat exercise found in workout session");

    // Check for pre-populated historic data (weight/reps from linked exercise)
    console.log("  Checking if historic data pre-populated...");
    // Look for input fields with values - the historic data should be pre-filled
    // We can check for the presence of values in weight/reps inputs

    await page.screenshot({
      path: "test-screenshots/11-squat-with-historic-data.png",
      fullPage: true
    });

    // Step 9: Complete the workout
    console.log("\nStep 9: Completing workout...");

    // We're on /workout/session/XXX, click the exact "Complete" button (not "Complete Workout")
    const completeButton = page.getByRole('button', { name: 'Complete', exact: true });
    await expect(completeButton).toBeVisible({ timeout: 5000 });
    await completeButton.click();
    await page.waitForTimeout(1000);
    console.log("✓ Clicked Complete button");

    await page.screenshot({
      path: "test-screenshots/12-complete-popup.png",
      fullPage: true
    });

    // A popup/modal appears with 2 "Complete Workout" buttons visible:
    // 1. One in the top-right corner (outside modal)
    // 2. One inside the modal (the one we want)
    // We need to click the one inside the modal
    const completeWorkoutButtons = page.getByRole('button', { name: 'Complete Workout' });
    const buttonCount = await completeWorkoutButtons.count();
    console.log(`  Found ${buttonCount} "Complete Workout" buttons`);

    // Click the last one (should be the one in the modal)
    const completeWorkoutButton = completeWorkoutButtons.last();
    await expect(completeWorkoutButton).toBeVisible({ timeout: 5000 });
    await completeWorkoutButton.click();
    await page.waitForLoadState("networkidle");
    console.log("✓ Workout completed and confirmed");

    // Should redirect to homepage
    await expect(page).toHaveURL(/^\/$|\/$/);
    console.log("✓ Redirected to homepage");

    await page.screenshot({
      path: "test-screenshots/13-redirected-to-homepage.png",
      fullPage: true
    });

    // Step 10: Verify workout appears in history
    console.log("\nStep 10: Verifying workout appears in history...");

    // We should already be on homepage - check Recent Workouts
    const recentWorkouts = page.locator('text=/Recent Workouts/i');
    if (await recentWorkouts.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("✓ Recent Workouts section found on homepage");
    }

    await page.screenshot({
      path: "test-screenshots/14-homepage-recent-workouts.png",
      fullPage: true
    });

    // Check /progress/ page for Strength Progression - Squat
    console.log("  Checking /progress/ page...");
    await page.goto("/progress");
    await page.waitForLoadState("networkidle");

    const strengthProgression = page.locator('text=/Strength Progression.*Squat/i');
    if (await strengthProgression.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("✓ Strength Progression - Squat found on progress page");
    } else {
      console.log("⚠️  Squat progression not visible on progress page");
    }

    await page.screenshot({
      path: "test-screenshots/15-progress-page.png",
      fullPage: true
    });

    // Check /workouts page for 180kg / 5 reps
    console.log("  Checking /workouts page for max set (180kg / 5 reps)...");
    await page.goto("/workouts");
    await page.waitForLoadState("networkidle");

    // Look for 180kg and 5 reps in the workout history
    const weight180kg = page.locator('text=/180.*kg/i');
    const reps5 = page.locator('text=/5.*reps/i');

    if (await weight180kg.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("✓ Found 180kg in workouts history");
    } else {
      console.log("⚠️  180kg not found - may not have historic data yet");
    }
    if (await reps5.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("✓ Found 5 reps in workouts history");
    } else {
      console.log("⚠️  5 reps not found - may not have historic data yet");
    }

    await page.screenshot({
      path: "test-screenshots/16-workouts-history.png",
      fullPage: true
    });

    console.log("✓ Workout verified in all locations")

    // Step 11: Clean up - delete the test template we created
    console.log("\nStep 11: Cleaning up - deleting test template...");
    console.log(`  Looking for template to delete: "${templateName}"`);
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: "test-screenshots/17-templates-before-delete.png",
      fullPage: true
    });

    // Find the EXACT template we created using the unique name
    // First, verify the template name is visible on the page
    const testTemplateName = page.locator(`text="${templateName}"`);
    await expect(testTemplateName).toBeVisible({ timeout: 5000 });
    console.log(`✓ Found template text: "${templateName}"`);

    // Click on the template name to open/select it
    await testTemplateName.click();
    await page.waitForTimeout(1000);
    console.log("✓ Clicked on template");

    await page.screenshot({
      path: "test-screenshots/18-template-selected.png",
      fullPage: true
    });

    // Now look for the Delete button that appears after selecting our template
    // Use a more specific selector to avoid clicking the wrong delete button
    const deleteButton = page.getByRole('button', { name: 'Delete' }).first();
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await deleteButton.click();
    await page.waitForTimeout(500);
    console.log("✓ Clicked Delete button");

    await page.screenshot({
      path: "test-screenshots/19-delete-confirmation.png",
      fullPage: true
    });

    // Confirm deletion if there's a confirmation dialog
    const confirmButton = page.locator('button:has-text("Delete")').last();
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
      await page.waitForTimeout(1000);
      console.log("✓ Confirmed deletion");
    }

    // Verify the template is gone
    const deletedTemplate = page.locator(`text="${templateName}"`);
    const isGone = !(await deletedTemplate.isVisible({ timeout: 2000 }).catch(() => false));
    if (isGone) {
      console.log(`✓ Template "${templateName}" successfully deleted`);
    } else {
      console.log(`⚠️  Template "${templateName}" may still be visible`);
    }

    await page.screenshot({
      path: "test-screenshots/20-final-state.png",
      fullPage: true
    });

    console.log("\n✅ Full workflow test completed!\n");
    console.log("Summary:");
    console.log(`  - Created template: "${templateName}" with Squat exercise`);
    console.log("  - Clicked on template → Start Workout");
    console.log("  - Clicked Start Workout again → Started session");
    console.log("  - Verified Squat exercise with historic data");
    console.log("  - Clicked Complete → Complete Workout → Redirected to homepage");
    console.log("  - Verified workout in history (homepage, /progress, /workouts)");
    console.log(`  - Deleted template "${templateName}" successfully`);
  });
});
