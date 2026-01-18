import { test, expect } from "../fixtures/auth.fixture";

test.describe("Template Creation", () => {
  test("should navigate to new template page", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates");
    await expect(
      page.locator("h1:has-text('Your Workout Arsenal')"),
    ).toBeVisible();

    await page.click('a:has-text("Create Template")');

    await expect(page.locator("h1:has-text('Create Template')")).toBeVisible();
    await expect(page.locator("text=Step 1 of 3")).toBeVisible();
  });

  test("should show multi-step wizard with form elements", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    await expect(page.locator("form")).toBeVisible();

    await expect(
      page.locator('input[placeholder*="e.g., Push Day"]'),
    ).toBeVisible();

    await expect(page.locator("text=Template Name")).toBeVisible();

    await expect(page.locator("button:has-text('Continue')")).toBeVisible();
  });

  test("should require template name before proceeding", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    const continueButton = page.locator("button:has-text('Continue')");
    await expect(continueButton).toBeDisabled();

    await page.fill('input[placeholder*="e.g., Push Day"]', "Test Template");

    await expect(continueButton).toBeEnabled();
  });

  test("should complete full template creation flow", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    const templateName = `Test Template ${Date.now()}`;

    await page.goto("/templates/new");

    await expect(page.locator("h1")).toContainText("Create Template");
    await expect(page.locator("text=Step 1 of 3")).toBeVisible();

    await page.fill('input[placeholder*="e.g., Push Day"]', templateName);
    await page.click("button:has-text('Continue')");

    await expect(page.locator("text=Step 2 of 3")).toBeVisible();
    await expect(page.locator("text=Add Exercises")).toBeVisible();

    await page.fill('input[placeholder*="Add an exercise"]', "Bench Press");
    await page.click("button:has-text('Add')");

    await page.fill('input[placeholder*="Add an exercise"]', "Squat");
    await page.click("button:has-text('Add')");

    await expect(page.locator("text=Bench Press")).toBeVisible();
    await expect(page.locator("text=Squat")).toBeVisible();

    await page.click("button:has-text('Continue')");

    await expect(page.locator("text=Step 3 of 3")).toBeVisible();
    await expect(page.locator("text=Review")).toBeVisible();

    await expect(page.locator("text=Smart Linking Results")).toBeVisible();
    await expect(page.locator("text=Total Exercises")).toBeVisible();

    await page.click("button:has-text('Create Template')");

    await page.waitForURL("/templates");
    await expect(page.locator("h1")).toContainText("Your Workout Arsenal");

    await page.waitForTimeout(2000);

    await expect(page.locator(`text=${templateName}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should handle back navigation between steps", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    await page.fill('input[placeholder*="e.g., Push Day"]', "Back Test");
    await page.click("button:has-text('Continue')");

    await expect(page.locator("text=Step 2 of 3")).toBeVisible();

    await page.fill('input[placeholder*="Add an exercise"]', "Deadlift");
    await page.click("button:has-text('Add')");
    await expect(page.locator("text=Deadlift")).toBeVisible();

    await page.click("button:has-text('Back')");

    await expect(page.locator("text=Step 1 of 3")).toBeVisible();

    await expect(
      page.locator('input[placeholder*="e.g., Push Day"]'),
    ).toHaveValue("Back Test");
  });

  test("should remove exercises correctly", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    await page.fill('input[placeholder*="e.g., Push Day"]', "Remove Test");
    await page.click("button:has-text('Continue')");

    await page.fill('input[placeholder*="Add an exercise"]', "Row");
    await page.click("button:has-text('Add')");

    await expect(page.locator("text=Row")).toBeVisible();

    await page.click('button:has-text("Remove")');

    await expect(page.locator("text=Row")).not.toBeVisible();
  });

  test("should validate exercises required on step 2", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    await page.fill('input[placeholder*="e.g., Push Day"]', "Validation Test");
    await page.click("button:has-text('Continue')");

    await expect(page.locator("button:has-text('Continue')")).toBeDisabled();

    await page.fill('input[placeholder*="Add an exercise"]', "Curl");
    await page.click("button:has-text('Add')");

    await expect(page.locator("button:has-text('Continue')")).toBeEnabled();
  });

  test("should cancel template creation and return to list", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    await page.fill('input[placeholder*="e.g., Push Day"]', "Cancel Test");
    await page.click("button:has-text('Continue')");

    await page.fill('input[placeholder*="Add an exercise"]', "Fly");
    await page.click("button:has-text('Add')");

    await page.goto("/templates");

    await expect(page.locator("h1")).toContainText("Your Workout Arsenal");
  });
});
