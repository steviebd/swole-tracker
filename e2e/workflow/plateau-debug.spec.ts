import { test, expect } from "../fixtures/auth.fixture";

// Set a shorter timeout for debugging
test.setTimeout(60000); // 1 minute per test

test.describe("Plateau Debug", () => {
  test("debug single workout completion", async ({
    authenticatedPage: page,
  }) => {
    console.log("\n🔍 Starting Debug Test\n");
    const templateName = `Debug Test ${Date.now()}`;

    // Step 1: Create simple template
    console.log("Step 1: Creating template...");
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    const createButton = page.locator('a:has-text("Create Template")');
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator('input[placeholder*="Push Day"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(templateName);

    const nextButton = page.locator('button:has-text("Next")');
    await nextButton.click();
    await page.waitForTimeout(500);

    const firstExerciseInput = page.locator('input[placeholder="Exercise 1"]');
    await expect(firstExerciseInput).toBeVisible({ timeout: 5000 });
    await firstExerciseInput.fill("Squat");
    await page.waitForTimeout(500);

    await nextButton.click(); // Go to linking
    await page.waitForTimeout(1000);
    await nextButton.click(); // Go to preview
    await page.waitForTimeout(500);

    const createTemplateButton = page.locator(
      'button:has-text("Create Template")',
    );
    await expect(createTemplateButton).toBeVisible({ timeout: 5000 });
    await createTemplateButton.click();

    await page.waitForURL(/\/templates/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    console.log("✓ Template created");

    // Step 2: Start workout
    console.log("Step 2: Starting workout...");
    const ourStartWorkoutLink = page.locator(
      `a[aria-label="Start workout with ${templateName}"]`,
    );
    await expect(ourStartWorkoutLink).toBeVisible({ timeout: 5000 });
    await ourStartWorkoutLink.click();
    await page.waitForLoadState("networkidle");

    const startWorkoutButton = page
      .locator('button:has-text("Start workout"), a:has-text("Start workout")')
      .last();
    await expect(startWorkoutButton).toBeVisible({ timeout: 5000 });
    await startWorkoutButton.click();
    await page.waitForLoadState("networkidle");
    console.log("✓ Workout started");

    // Step 3: Enter workout data
    console.log("Step 3: Entering workout data...");
    await page.waitForTimeout(2000); // Wait for form to fully load

    // Try to find and fill weight/reps inputs
    const weightInput = page.locator('input[type="number"]').first();
    await expect(weightInput).toBeVisible({ timeout: 5000 });
    await weightInput.fill("100");
    console.log("✓ Weight set to 100kg");

    const allInputs = page.locator('input[type="number"]');
    const inputCount = await allInputs.count();
    console.log(`Found ${inputCount} number inputs`);

    if (inputCount >= 2) {
      await allInputs.nth(1).fill("5");
      console.log("✓ Reps set to 5");
    }

    await page.waitForTimeout(1000);

    // Step 4: Complete workout
    console.log("Step 4: Completing workout...");
    const completeButton = page.getByRole("button", {
      name: "Complete",
      exact: true,
    });
    await expect(completeButton).toBeVisible({ timeout: 5000 });
    await completeButton.click();
    await page.waitForTimeout(1000);

    const completeWorkoutButtons = page.getByRole("button", {
      name: "Complete Workout",
    });
    const completeWorkoutButton = completeWorkoutButtons.last();
    await expect(completeWorkoutButton).toBeVisible({ timeout: 5000 });
    await completeWorkoutButton.click();
    await page.waitForLoadState("networkidle");
    console.log("✓ Workout completed");

    // Should redirect to homepage
    await expect(page).toHaveURL(/^\/$|\/$/, { timeout: 10000 });
    console.log("✅ Debug test completed successfully!");
  });
});
