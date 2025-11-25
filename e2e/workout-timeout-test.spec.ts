import { test, expect } from "./fixtures/auth.fixture";

test.setTimeout(120000); // 2 minutes

test("debug workout timeout issue", async ({ authenticatedPage: page }) => {
  console.log("🔍 Starting workout timeout debug test");

  // Step 1: Create a simple template
  await page.goto("/templates");
  await page.waitForLoadState("networkidle");

  const createButton = page.locator('a:has-text("Create Template")');
  await createButton.click();
  await page.waitForLoadState("networkidle");

  const nameInput = page.locator('input[placeholder*="Push Day"]');
  await nameInput.fill(`Timeout Test ${Date.now()}`);

  // Move to exercises step
  const nextButton = page.locator('button:has-text("Next")');
  await nextButton.click();
  await page.waitForTimeout(500);

  // Add Squat exercise
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

  // Step 2: Start workout
  await page.goto("/workouts");
  await page.waitForLoadState("networkidle");

  const startWorkoutButton = page
    .locator('a:has-text("Start workout")')
    .first();
  await startWorkoutButton.click();
  await page.waitForLoadState("networkidle");

  console.log("✅ Workout started, now testing data entry...");

  // Step 3: Test data entry with detailed logging
  console.log("Looking for weight input...");

  // Wait for the workout form to be fully loaded
  await page.waitForSelector('input[type="number"]', { timeout: 10000 });

  const weightInput = page.locator('input[type="number"]').first();
  console.log("Found weight input, waiting for visibility...");
  await expect(weightInput).toBeVisible({ timeout: 5000 });

  console.log("Weight input is visible, filling with 100...");
  await weightInput.fill("100");
  console.log("✅ Weight set to 100kg");

  const allInputs = page.locator('input[type="number"]');
  const inputCount = await allInputs.count();
  console.log(`Found ${inputCount} number inputs`);

  if (inputCount >= 2) {
    console.log("Setting reps to 5...");
    await allInputs.nth(1).fill("5");
    console.log("✅ Reps set to 5");
  } else {
    console.log(`⚠️ Only found ${inputCount} number inputs`);
  }

  // Take screenshot to verify state
  await page.screenshot({
    path: "test-screenshots/timeout-debug-data-entered.png",
    fullPage: true,
  });

  console.log("✅ Data entry completed successfully");
});
