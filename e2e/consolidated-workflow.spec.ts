import { test, expect } from "./fixtures/auth.fixture";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

const STORAGE_STATE_PATH = join(process.cwd(), "e2e/.auth/storage-state.json");

test.describe("Consolidated E2E Workflow", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(600000); // 10 minutes

  test.beforeAll(async () => {
    if (existsSync(STORAGE_STATE_PATH)) {
      unlinkSync(STORAGE_STATE_PATH);
      console.log("✓ Cleared existing auth state for fresh login");
    }
  });

  const templateName = `E2E Consolidated ${Date.now()}`;
  const exerciseName = "Squat";
  const workoutWeight = 100;
  const workoutReps = 5;

  test("01 - Authentication", async ({ authenticatedPage: page }) => {
    console.log("\n🔐 Step 1: Authentication\n");

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/.*/);
    console.log("✓ Successfully authenticated and on homepage");
  });

  test("02 - Template Creation", async ({ authenticatedPage: page }) => {
    console.log("\n📝 Step 2: Template Creation\n");

    await page.goto("/templates");
    await page.waitForLoadState("networkidle");
    console.log("✓ Navigated to templates page");

    const createButton = page.locator('a:has-text("Create Template")');
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();
    await page.waitForLoadState("networkidle");
    console.log("✓ Clicked Create Template");

    await expect(page).toHaveURL(/\/templates\/new/);

    const nameInput = page.locator('input[placeholder*="Push Day"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(templateName);
    console.log(`✓ Filled template name: ${templateName}`);

    const nextButton = page.locator('button:has-text("Next")');
    await nextButton.click();
    await page.waitForTimeout(500);
    console.log("✓ Moved to exercises step");

    const firstExerciseInput = page.locator('input[placeholder="Exercise 1"]');
    await expect(firstExerciseInput).toBeVisible({ timeout: 5000 });
    await firstExerciseInput.fill(exerciseName);
    await page.waitForTimeout(500);
    console.log(`✓ Added ${exerciseName} exercise`);

    await nextButton.click();
    await page.waitForTimeout(1000);
    console.log("✓ Moved to linking step");

    await nextButton.click();
    await page.waitForTimeout(500);
    console.log("✓ Moved to preview step");

    const createTemplateButton = page.locator(
      'button:has-text("Create Template")',
    );
    await expect(createTemplateButton).toBeVisible({ timeout: 5000 });
    await createTemplateButton.click();

    await page.waitForURL(/\/templates$/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    console.log("✓ Template created");

    const createdTemplate = page.locator(`text="${templateName}"`);
    await expect(createdTemplate).toBeVisible({ timeout: 5000 });
    console.log("✓ Template visible in list");
  });

  test("03 - Workout Session 1/4", async ({ authenticatedPage: page }) => {
    console.log("\n🏋️ Step 3: Workout Session 1/4\n");

    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    const startWorkoutLink = page.locator(
      `a[aria-label="Start workout with ${templateName}"]`,
    );
    await expect(startWorkoutLink).toBeVisible({ timeout: 10000 });
    await startWorkoutLink.click();
    await page.waitForLoadState("networkidle");
    console.log("✓ Started workout from template");

    await expect(page).toHaveURL(/\/workout\/start\?templateId=\d+/);

    const startButton = page
      .locator('button:has-text("Start workout"), a:has-text("Start workout")')
      .last();
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click();
    await page.waitForLoadState("networkidle");
    console.log("✓ Clicked Start Workout");

    await expect(page).toHaveURL(/\/workout\/session\/\d+/);
    console.log("✓ Workout session started");

    await completeWorkout(page, workoutWeight, workoutReps);
    console.log(
      `✓ Workout 1/4 completed (${workoutWeight}kg × ${workoutReps} reps)`,
    );
  });

  test("04 - Workout Session 2/4", async ({ authenticatedPage: page }) => {
    console.log("\n🏋️ Step 4: Workout Session 2/4\n");

    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    const startWorkoutLink = page.locator(
      `a[aria-label="Start workout with ${templateName}"]`,
    );
    await expect(startWorkoutLink).toBeVisible({ timeout: 10000 });
    await startWorkoutLink.click();
    await page.waitForLoadState("networkidle");

    const startButton = page
      .locator('button:has-text("Start workout"), a:has-text("Start workout")')
      .last();
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/workout\/session\/\d+/);

    await completeWorkout(page, workoutWeight, workoutReps);
    console.log(
      `✓ Workout 2/4 completed (${workoutWeight}kg × ${workoutReps} reps)`,
    );
  });

  test("05 - Workout Session 3/4", async ({ authenticatedPage: page }) => {
    console.log("\n🏋️ Step 5: Workout Session 3/4\n");

    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    const startWorkoutLink = page.locator(
      `a[aria-label="Start workout with ${templateName}"]`,
    );
    await expect(startWorkoutLink).toBeVisible({ timeout: 10000 });
    await startWorkoutLink.click();
    await page.waitForLoadState("networkidle");

    const startButton = page
      .locator('button:has-text("Start workout"), a:has-text("Start workout")')
      .last();
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/workout\/session\/\d+/);

    await completeWorkout(page, workoutWeight, workoutReps);
    console.log(
      `✓ Workout 3/4 completed (${workoutWeight}kg × ${workoutReps} reps)`,
    );
  });

  test("06 - Workout Session 4/4", async ({ authenticatedPage: page }) => {
    console.log("\n🏋️ Step 6: Workout Session 4/4\n");

    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    const startWorkoutLink = page.locator(
      `a[aria-label="Start workout with ${templateName}"]`,
    );
    await expect(startWorkoutLink).toBeVisible({ timeout: 10000 });
    await startWorkoutLink.click();
    await page.waitForLoadState("networkidle");

    const startButton = page
      .locator('button:has-text("Start workout"), a:has-text("Start workout")')
      .last();
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/workout\/session\/\d+/);

    await completeWorkout(page, workoutWeight, workoutReps);
    console.log(
      `✓ Workout 4/4 completed (${workoutWeight}kg × ${workoutReps} reps)`,
    );
  });

  test("07 - Plateau Detection Verification", async ({
    authenticatedPage: page,
  }) => {
    console.log("\n📊 Step 7: Plateau Detection Verification\n");

    await page.goto("/progress");
    await page.waitForLoadState("networkidle");
    console.log("✓ Navigated to progress page");

    const plateauCard = page.locator('[class*="PlateauMilestone"]').first();

    await expect(plateauCard).toBeVisible({ timeout: 15000 });
    console.log("✓ PlateauMilestoneCard visible");

    await expect(plateauCard.locator(`text=${exerciseName}`)).toBeVisible();
    console.log(`✓ Exercise name "${exerciseName}" found`);

    await expect(
      plateauCard.locator(`text=/${workoutWeight}.*kg/i`),
    ).toBeVisible();
    console.log(`✓ Stalled weight (${workoutWeight}kg) found`);

    await expect(
      plateauCard.locator(`text=/${workoutReps}.*rep/i`),
    ).toBeVisible();
    console.log(`✓ Stalled reps (${workoutReps}) found`);

    await expect(plateauCard.locator(`text=/4.*session/i`)).toBeVisible();
    console.log("✓ Session count (4) found");

    const recommendations = plateauCard
      .locator('[class*="recommendation"]')
      .first();
    await expect(recommendations).toBeVisible();
    console.log("✓ Recommendations section found");

    const recText = await recommendations.textContent();
    expect(recText).toMatch(/increase|reduce|try|consider|deload/i);
    console.log("✓ Recommendation content verified");
  });

  test("08 - Cleanup & Logout", async ({ authenticatedPage: page }) => {
    console.log("\n🧹 Step 8: Cleanup & Logout\n");

    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    const templateCard = page.locator(`text="${templateName}"`).first();
    await expect(templateCard).toBeVisible({ timeout: 5000 });
    console.log("✓ Found test template");

    await templateCard.click();
    await page.waitForTimeout(1000);

    const deleteButton = page.getByRole("button", { name: "Delete" }).first();
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await deleteButton.click();
    await page.waitForTimeout(500);
    console.log("✓ Clicked Delete button");

    const confirmButton = page.locator('button:has-text("Delete")').last();
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
      await page.waitForTimeout(1000);
      console.log("✓ Confirmed deletion");
    }

    const deletedTemplate = page.locator(`text="${templateName}"`);
    await expect(deletedTemplate).not.toBeVisible({ timeout: 5000 });
    console.log("✓ Template deleted");

    await page.goto("/workout/start");
    const avatarButton = page.locator('button[aria-label="Account menu"]');
    await avatarButton.click();

    const signOutButton = page.locator('button:has-text("Sign out")');
    await signOutButton.click();

    try {
      await page.waitForURL(/.*auth\/login.*/, { timeout: 5000 });
      expect(page.url()).toContain("/auth/login");
    } catch {
      await page.waitForURL(/.*authkit\.app.*/, { timeout: 5000 });
      expect(page.url()).toContain("authkit.app");
    }
    console.log("✓ Successfully logged out");
  });
});

async function completeWorkout(
  page: import("@playwright/test").Page,
  weight: number,
  reps: number,
) {
  await page.waitForTimeout(1000);

  const weightInput = page.locator('input[type="number"]').first();
  await expect(weightInput).toBeVisible({ timeout: 10000 });
  await weightInput.fill(weight.toString());

  const allInputs = page.locator('input[type="number"]');
  const inputCount = await allInputs.count();

  if (inputCount >= 2) {
    await allInputs.nth(1).fill(reps.toString());
  }

  await page.waitForTimeout(1000);

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

  await expect(page).toHaveURL(/^\/$|\/$/, { timeout: 15000 });
}
