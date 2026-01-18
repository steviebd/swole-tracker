import { test, expect } from "../fixtures/auth.fixture";

test.describe("Template Creation with Exercise Linking", () => {
  test("should create template with auto-linking suggestions", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    const templateName = `Linking Test ${Date.now()}`;

    await page.goto("/templates/new");

    await page.fill('input[placeholder*="e.g., Push Day"]', templateName);
    await page.click("button:has-text('Continue')");

    const exercises = ["Bench Press", "Squat", "Deadlift"];

    for (const exercise of exercises) {
      await page.fill('input[placeholder*="Add an exercise"]', exercise);
      await page.click("button:has-text('Add')");
    }

    await expect(page.locator("text=Bench Press")).toBeVisible();
    await expect(page.locator("text=Squat")).toBeVisible();
    await expect(page.locator("text=Deadlift")).toBeVisible();

    await page.click("button:has-text('Continue')");

    await expect(page.locator("text=Smart Linking Results")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator("text=Total Exercises")).toBeVisible();

    await expect(page.locator("text=Total Exercises")).toBeVisible();
    await expect(page.locator("text=Auto-Linked")).toBeVisible();
    await expect(page.locator("text=Need Review")).toBeVisible();
    await expect(page.locator("text=Creating New")).toBeVisible();

    await page.click("button:has-text('Accept All Auto-Links')");

    await page.click("button:has-text('Create Template')");

    await page.waitForURL("/templates");
    await expect(page.locator("h1")).toContainText("Your Workout Arsenal");

    await page.waitForTimeout(2000);
    await expect(page.locator(`text=${templateName}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should handle manual linking decisions", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    const templateName = `Manual Linking ${Date.now()}`;

    await page.goto("/templates/new");

    await page.fill('input[placeholder*="e.g., Push Day"]', templateName);
    await page.click("button:has-text('Continue')");

    await page.fill(
      'input[placeholder*="Add an exercise"]',
      "Custom Exercise Name",
    );
    await page.click("button:has-text('Add')");

    await page.click("button:has-text('Continue')");

    await expect(page.locator("text=Smart Linking Results")).toBeVisible({
      timeout: 5000,
    });

    await expect(page.locator("text=Custom Exercise Name")).toBeVisible();

    await expect(
      page.locator("button:has-text('Create New Instead')"),
    ).toBeVisible();

    await page.click("button:has-text('Create New Instead')");

    await expect(page.locator("text=No similar exercises found")).toBeVisible();

    await page.click("button:has-text('Create Template')");

    await page.waitForURL("/templates");
    await expect(page.locator(`text=${templateName}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should use bulk linking actions", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const templateName = `Bulk Test ${Date.now()}`;

    await page.goto("/templates/new");

    await page.fill('input[placeholder*="e.g., Push Day"]', templateName);
    await page.click("button:has-text('Continue')");

    const exercises = [
      "Bench Press",
      "Squat",
      "Deadlift",
      "Pull Up",
      "Shoulder Press",
    ];

    for (const exercise of exercises) {
      await page.fill('input[placeholder*="Add an exercise"]', exercise);
      await page.click("button:has-text('Add')");
    }

    await page.click("button:has-text('Continue')");

    await expect(page.locator("text=Smart Linking Results")).toBeVisible({
      timeout: 5000,
    });

    await expect(
      page.locator("button:has-text('Accept All Auto-Links')"),
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('Create New for Unmatched')"),
    ).toBeVisible();

    await page.click("button:has-text('Accept All Auto-Links')");
    await page.waitForTimeout(500);

    await page.click("button:has-text('Create Template')");

    await page.waitForURL("/templates");
    await expect(page.locator(`text=${templateName}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should allow rejecting exercise links", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    const templateName = `No Link Test ${Date.now()}`;

    await page.goto("/templates/new");

    await page.fill('input[placeholder*="e.g., Push Day"]', templateName);
    await page.click("button:has-text('Continue')");

    await page.fill('input[placeholder*="Add an exercise"]', "Bench Press");
    await page.click("button:has-text('Add')");

    await page.click("button:has-text('Continue')");

    await expect(page.locator("text=Smart Linking Results")).toBeVisible({
      timeout: 5000,
    });

    const createNewButton = page.locator(
      "button:has-text('Create New Instead')",
    );
    if (await createNewButton.isVisible()) {
      await createNewButton.click();
      await page.waitForTimeout(500);
    }

    await page.click("button:has-text('Create Template')");

    await page.waitForURL("/templates");
    await expect(page.locator(`text=${templateName}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should handle empty template in linking review", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    const templateName = `Empty Template ${Date.now()}`;

    await page.goto("/templates/new");

    await page.fill('input[placeholder*="e.g., Push Day"]', templateName);
    await page.click("button:has-text('Continue')");

    await page.click("button:has-text('Continue')");

    await expect(page.locator("text=Smart Linking Results")).toBeVisible({
      timeout: 5000,
    });

    await expect(page.locator("text=Total Exercises")).toBeVisible();
    await expect(page.locator("text=0")).toBeVisible();

    await page.click("button:has-text('Create Template')");

    await page.waitForURL("/templates");
    await expect(page.locator(`text=${templateName}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should navigate back from review to exercises", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    await page.fill('input[placeholder*="e.g., Push Day"]', "Navigation Test");
    await page.click("button:has-text('Continue')");

    await page.fill('input[placeholder*="Add an exercise"]', "Test Exercise");
    await page.click("button:has-text('Add')");

    await expect(page.locator("text=Test Exercise")).toBeVisible();

    await page.click("button:has-text('Continue')");

    await expect(page.locator("text=Smart Linking Results")).toBeVisible();

    await page.click("button:has-text('Back')");

    await expect(page.locator("text=Step 2 of 3")).toBeVisible();
    await expect(page.locator("text=Test Exercise")).toBeVisible();

    await page.fill(
      'input[placeholder*="Add an exercise"]',
      "Another Exercise",
    );
    await page.click("button:has-text('Add')");

    await expect(page.locator("text=Test Exercise")).toBeVisible();
    await expect(page.locator("text=Another Exercise")).toBeVisible();
  });

  test("should show linking stats correctly", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const templateName = `Stats Test ${Date.now()}`;

    await page.goto("/templates/new");

    await page.fill('input[placeholder*="e.g., Push Day"]', templateName);
    await page.click("button:has-text('Continue')");

    await page.fill('input[placeholder*="Add an exercise"]', "Bench Press");
    await page.click("button:has-text('Add')");

    await page.fill(
      'input[placeholder*="Add an exercise"]',
      "Unknown Exercise XYZ",
    );
    await page.click("button:has-text('Add')");

    await page.click("button:has-text('Continue')");

    await expect(page.locator("text=Smart Linking Results")).toBeVisible({
      timeout: 5000,
    });

    await expect(page.locator("text=Total Exercises")).toBeVisible();
    await expect(page.locator("text=2")).toBeVisible();

    const autoLinked = page.locator("text=Auto-Linked");
    const creatingNew = page.locator("text=Creating New");

    await expect(autoLinked.first()).toBeVisible();
    await expect(creatingNew.first()).toBeVisible();
  });
});
