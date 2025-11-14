import { test, expect } from "../fixtures/auth.fixture";

test.describe("Template Creation with Exercise Linking", () => {
  test("should create template with auto-linking suggestions", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to new template
    await page.goto("/templates/new");
    await expect(page.locator("h1")).toContainText("New Template");

    // Fill template name
    await page.fill(
      'input[placeholder*="Push Day"], input[placeholder*="e.g., Push Day"]',
      "Upper Body Day",
    );

    // Move to exercises step
    await page.click('button:has-text("Exercises")');

    // Add exercises that should have auto-linking suggestions
    const exercises = ["Bench Press", "Squat", "Deadlift"];

    for (const exercise of exercises) {
      await page.fill(
        'input[placeholder*="Search exercises"], input[placeholder*="Add exercise"]',
        exercise,
      );
      await page.waitForTimeout(500);

      const option = page
        .locator(
          `[role="option"]:has-text("${exercise}"), [data-option]:has-text("${exercise}")`,
        )
        .first();
      if (await option.isVisible()) {
        await option.click();
      }
    }

    // Move to linking review step
    await page.click('button:has-text("Preview")');

    // Should show linking review interface
    await expect(page.locator("text=Smart Linking Results")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator("text=Exercise Review")).toBeVisible();

    // Should show linking summary with counts
    await expect(page.locator("text=Auto-linked")).toBeVisible();
    await expect(page.locator("text=Need Review")).toBeVisible();
    await expect(page.locator("text=Create New")).toBeVisible();

    // Should show all exercises in review
    for (const exercise of exercises) {
      await expect(page.locator(`text=${exercise}`)).toBeVisible();
    }

    // Accept default linking decisions
    await page.click('button:has-text("Create Template")');

    // Should redirect to templates list
    await page.waitForURL("/templates");
    await expect(page.locator("h1")).toContainText("Your Workout Arsenal");

    // Verify template appears
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Upper Body Day")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should handle manual linking decisions in step 3", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    // Fill template name
    await page.fill(
      'input[placeholder*="Push Day"], input[placeholder*="e.g., Push Day"]',
      "Custom Workout",
    );

    // Move to exercises step
    await page.click('button:has-text("Exercises")');

    // Add an exercise that might need manual review
    await page.fill(
      'input[placeholder*="Search exercises"], input[placeholder*="Add exercise"]',
      "Custom Exercise Name",
    );
    await page.waitForTimeout(500);

    // Add the exercise (might not find in search, so just press Enter)
    await page.keyboard.press("Enter");

    // Move to linking review step
    await page.click('button:has-text("Preview")');

    // Should show linking review interface
    await expect(page.locator("text=Smart Linking Results")).toBeVisible({
      timeout: 5000,
    });

    // Should show the custom exercise
    await expect(page.locator("text=Custom Exercise Name")).toBeVisible();

    // Should have option to create new exercise
    await expect(page.locator('button:has-text("Create New")')).toBeVisible();

    // Click create new for the custom exercise
    await page.click('button:has-text("Create New")');

    // Create template
    await page.click('button:has-text("Create Template")');

    // Should redirect to templates list
    await page.waitForURL("/templates");
    await expect(page.locator("text=Custom Workout")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should use bulk linking actions", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    // Fill template name
    await page.fill(
      'input[placeholder*="Push Day"], input[placeholder*="e.g., Push Day"]',
      "Bulk Test Workout",
    );

    // Move to exercises step
    await page.click('button:has-text("Exercises")');

    // Add multiple exercises
    const exercises = [
      "Bench Press",
      "Squat",
      "Deadlift",
      "Pull Up",
      "Shoulder Press",
    ];

    for (const exercise of exercises) {
      await page.fill(
        'input[placeholder*="Search exercises"], input[placeholder*="Add exercise"]',
        exercise,
      );
      await page.waitForTimeout(500);

      const option = page
        .locator(
          `[role="option"]:has-text("${exercise}"), [data-option]:has-text("${exercise}")`,
        )
        .first();
      if (await option.isVisible()) {
        await option.click();
      }
    }

    // Move to linking review step
    await page.click('button:has-text("Preview")');

    // Should show linking review interface
    await expect(page.locator("text=Smart Linking Results")).toBeVisible({
      timeout: 5000,
    });

    // Should show bulk actions
    await expect(
      page.locator('button:has-text("Accept All Auto-Links")'),
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("Create New for Unmatched")'),
    ).toBeVisible();

    // Try bulk action if available
    const acceptAllButton = page.locator(
      'button:has-text("Accept All Auto-Links")',
    );
    if (await acceptAllButton.isVisible()) {
      await acceptAllButton.click();
      await page.waitForTimeout(500); // Wait for UI to update
    }

    // Create template
    await page.click('button:has-text("Create Template")');

    // Should redirect to templates list
    await page.waitForURL("/templates");
    await expect(page.locator("text=Bulk Test Workout")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should allow rejecting exercise links", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    // Fill template name
    await page.fill(
      'input[placeholder*="Push Day"], input[placeholder*="e.g., Push Day"]',
      "No Link Workout",
    );

    // Move to exercises step
    await page.click('button:has-text("Exercises")');

    // Add an exercise
    await page.fill(
      'input[placeholder*="Search exercises"], input[placeholder*="Add exercise"]',
      "Bench Press",
    );
    await page.waitForTimeout(500);

    const option = page
      .locator(
        '[role="option"]:has-text("Bench Press"), [data-option]:has-text("Bench Press")',
      )
      .first();
    if (await option.isVisible()) {
      await option.click();
    }

    // Move to linking review step
    await page.click('button:has-text("Preview")');

    // Should show linking review interface
    await expect(page.locator("text=Smart Linking Results")).toBeVisible({
      timeout: 5000,
    });

    // Look for reject/don't link option
    const rejectButton = page.locator(
      'button:has-text("Don\'t Link"), button:has-text("Reject")',
    );
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      await page.waitForTimeout(500); // Wait for UI to update
    }

    // Create template
    await page.click('button:has-text("Create Template")');

    // Should redirect to templates list
    await page.waitForURL("/templates");
    await expect(page.locator("text=No Link Workout")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should handle empty template in linking review", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    // Fill template name
    await page.fill(
      'input[placeholder*="Push Day"], input[placeholder*="e.g., Push Day"]',
      "Empty Template",
    );

    // Move directly to linking review without adding exercises
    await page.click('button:has-text("Preview")');

    // Should show linking review interface
    await expect(page.locator("text=Smart Linking Results")).toBeVisible({
      timeout: 5000,
    });

    // Should show empty state or minimal content
    await expect(page.locator("text=Exercise Review")).toBeVisible();

    // Should still be able to create template
    await page.click('button:has-text("Create Template")');

    // Should redirect to templates list
    await page.waitForURL("/templates");
    await expect(page.locator("text=Empty Template")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should navigate back from linking review to exercises", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await page.goto("/templates/new");

    // Fill template name
    await page.fill(
      'input[placeholder*="Push Day"], input[placeholder*="e.g., Push Day"]',
      "Navigation Test",
    );

    // Move to exercises step
    await page.click('button:has-text("Exercises")');

    // Add an exercise
    await page.fill(
      'input[placeholder*="Search exercises"], input[placeholder*="Add exercise"]',
      "Test Exercise",
    );
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");

    // Move to linking review step
    await page.click('button:has-text("Preview")');

    // Should show linking review interface
    await expect(page.locator("text=Smart Linking Results")).toBeVisible({
      timeout: 5000,
    });

    // Click back button
    await page.click('button:has-text("Back")');

    // Should return to exercises step
    await expect(page.locator('button:has-text("Exercises")')).toHaveClass(
      /bg-primary/,
    );
    await expect(page.locator("text=Test Exercise")).toBeVisible();

    // Should be able to add more exercises
    await page.fill(
      'input[placeholder*="Search exercises"], input[placeholder*="Add exercise"]',
      "Another Exercise",
    );
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");

    // Should show both exercises
    await expect(page.locator("text=Test Exercise")).toBeVisible();
    await expect(page.locator("text=Another Exercise")).toBeVisible();
  });
});
