import { test, expect } from "../fixtures/auth.fixture";

test.describe("Template Creation", () => {
  test("should create a new empty template", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to templates page
    await page.goto("/templates");
    await expect(page.locator("text=Your Workout Arsenal")).toBeVisible();

    // Click create new template
    await page.click('a:has-text("Create Template")');

    // Should be on new template page
    await expect(page.locator("text=New Template")).toBeVisible();

    // Fill template name in basics step
    await page.fill(
      'input[placeholder*="Push Day"], input[placeholder*="e.g., Push Day"]',
      "Push Day Test",
    );

    // Move to exercises step (should be enabled now)
    await page.click('button:has-text("Exercises")');

    // Add at least one exercise to proceed
    await page.fill(
      'input[placeholder*="Search exercises"], input[placeholder*="Add exercise"]',
      "Bench Press",
    );

    // Wait for search results and select first option
    await page.waitForTimeout(500); // Wait for debounced search
    const firstOption = page.locator('[role="option"], [data-option]').first();
    if (await firstOption.isVisible()) {
      await firstOption.click();
    }

    // Move to preview step
    await page.click('button:has-text("Preview")');

    // Save template
    await page.click(
      'button:has-text("Create Template"), button:has-text("Save Template")',
    );

    // Should redirect to templates list
    await page.waitForURL("/templates");
    await expect(page.locator("h1")).toContainText("Your Workout Arsenal");

    // Verify template appears in list (may need to wait for update)
    await page.waitForTimeout(2000);
    const templateList = page.locator("text=Push Day Test");
    await expect(templateList).toBeVisible({ timeout: 10000 });
  });

  test("should add exercises to template", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to new template
    await page.goto("/templates/new");
    await expect(page.locator("h1")).toContainText("New Template");

    // Fill template name
    await page.fill(
      'input[placeholder*="Push Day"], input[placeholder*="e.g., Push Day"]',
      "Leg Day",
    );

    // Move to exercises step
    await page.click('button:has-text("Exercises")');

    // Add first exercise
    await page.fill(
      'input[placeholder*="Search exercises"], input[placeholder*="Add exercise"]',
      "Squat",
    );
    await page.waitForTimeout(500);

    const squatOption = page
      .locator(
        '[role="option"]:has-text("Squat"), [data-option]:has-text("Squat")',
      )
      .first();
    if (await squatOption.isVisible()) {
      await squatOption.click();
    }

    // Add second exercise
    await page.fill(
      'input[placeholder*="Search exercises"], input[placeholder*="Add exercise"]',
      "Leg Press",
    );
    await page.waitForTimeout(500);

    const legPressOption = page
      .locator(
        '[role="option"]:has-text("Leg Press"), [data-option]:has-text("Leg Press")',
      )
      .first();
    if (await legPressOption.isVisible()) {
      await legPressOption.click();
    }

    // Verify both exercises are added
    await expect(page.locator("text=Squat")).toBeVisible();
    await expect(page.locator("text=Leg Press")).toBeVisible();

    // Move to preview and save
    await page.click('button:has-text("Preview")');
    await page.click(
      'button:has-text("Create Template"), button:has-text("Save Template")',
    );

    // Should redirect to templates list
    await page.waitForURL("/templates");

    // Verify template appears
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Leg Day")).toBeVisible({ timeout: 10000 });
  });

  test("should navigate between template form steps", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    // Should start on basics step
    await expect(page.locator('button:has-text("Basics")')).toHaveClass(
      /bg-primary/,
    );
    await expect(page.locator('input[placeholder*="Push Day"]')).toBeVisible();

    // Try to go to exercises without name (should be disabled)
    const exercisesButton = page.locator('button:has-text("Exercises")');
    await exercisesButton.click();

    // Should stay on basics step if name is empty
    await expect(page.locator('button:has-text("Basics")')).toHaveClass(
      /bg-primary/,
    );

    // Fill name and proceed
    await page.fill(
      'input[placeholder*="Push Day"], input[placeholder*="e.g., Push Day"]',
      "Test Template",
    );
    await exercisesButton.click();

    // Should now be on exercises step
    await expect(page.locator('button:has-text("Exercises")')).toHaveClass(
      /bg-primary/,
    );
    await expect(
      page.locator('input[placeholder*="Search exercises"]'),
    ).toBeVisible();

    // Go to preview without exercises (should work)
    await page.click('button:has-text("Preview")');
    await expect(page.locator('button:has-text("Preview")')).toHaveClass(
      /bg-primary/,
    );

    // Go back to exercises
    await page.click('button:has-text("Exercises")');
    await expect(page.locator('button:has-text("Exercises")')).toHaveClass(
      /bg-primary/,
    );

    // Go back to basics
    await page.click('button:has-text("Basics")');
    await expect(page.locator('button:has-text("Basics")')).toHaveClass(
      /bg-primary/,
    );
  });

  test("should show validation errors for invalid template data", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    // Try to submit without name
    await page.click('button:has-text("Preview")');

    // Should show validation error or prevent navigation
    await expect(page.locator('button:has-text("Basics")')).toHaveClass(
      /bg-primary/,
    );

    // Fill name with only spaces
    await page.fill(
      'input[placeholder*="Push Day"], input[placeholder*="e.g., Push Day"]',
      "   ",
    );
    await page.click('button:has-text("Exercises")');

    // Should still be on basics step due to validation
    await expect(page.locator('button:has-text("Basics")')).toHaveClass(
      /bg-primary/,
    );

    // Fill valid name
    await page.fill(
      'input[placeholder*="Push Day"], input[placeholder*="e.g., Push Day"]',
      "Valid Template",
    );
    await page.click('button:has-text("Exercises")');

    // Should proceed to exercises step
    await expect(page.locator('button:has-text("Exercises")')).toHaveClass(
      /bg-primary/,
    );

    // Try to go to preview without exercises
    await page.click('button:has-text("Preview")');

    // Should allow proceeding to preview (empty exercises might be valid)
    await expect(page.locator('button:has-text("Preview")')).toHaveClass(
      /bg-primary/,
    );
  });

  test("should cancel template creation and return to list", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    // Fill some data
    await page.fill(
      'input[placeholder*="Push Day"], input[placeholder*="e.g., Push Day"]',
      "Unsaved Template",
    );
    await page.click('button:has-text("Exercises")');
    await page.fill(
      'input[placeholder*="Search exercises"], input[placeholder*="Add exercise"]',
      "Test Exercise",
    );

    // Click back button
    await page.click('a:has-text("Back"), button:has-text("Back")');

    // Should return to templates list
    await page.waitForURL("/templates");
    await expect(page.locator("h1")).toContainText("Your Workout Arsenal");

    // Verify unsaved template is not in list
    await expect(page.locator("text=Unsaved Template")).not.toBeVisible();
  });
});
