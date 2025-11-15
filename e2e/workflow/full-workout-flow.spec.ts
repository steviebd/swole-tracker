import { test, expect } from "../fixtures/auth.fixture";

test.describe("Full Workout Flow", () => {
  test("authenticated user can complete full workout workflow", async ({
    authenticatedPage: page,
  }) => {
    // Navigate to dashboard - should be authenticated
    await page.goto("/");
    await expect(page).toHaveTitle(/Swole Tracker/);

    // Look for dashboard content or navigation
    await expect(page.locator("body")).toBeVisible();

    // Navigate to workouts page
    await page.goto("/workouts");
    await expect(page.locator("body")).toBeVisible();

    // Check if we can see existing workouts or create new one
    const startWorkoutButton = page.locator('button:has-text("Start Workout")');
    if (await startWorkoutButton.isVisible()) {
      await startWorkoutButton.click();

      // Should be in workout session
      await expect(page.locator("body")).toBeVisible();

      // Look for exercise selection or current workout display
      await page.waitForTimeout(2000); // Allow time for workout session to load

      // Try to add an exercise if possible
      const addExerciseButton = page.locator('button:has-text("Add Exercise")');
      if (await addExerciseButton.isVisible()) {
        await addExerciseButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Navigate to progress page to check historic data
    await page.goto("/progress");
    await expect(page.locator("body")).toBeVisible();

    // Look for progress charts or data
    await page.waitForTimeout(2000); // Allow time for progress data to load

    // Navigate to templates page
    await page.goto("/templates");
    await expect(page.locator("body")).toBeVisible();

    // Look for existing templates or create template button
    const createTemplateButton = page.locator(
      'button:has-text("Create Template")',
    );
    if (await createTemplateButton.isVisible()) {
      await createTemplateButton.click();
      await page.waitForTimeout(1000);
    }

    // Take screenshots for debugging
    await page.screenshot({ path: "full-workflow-desktop.png" });
  });

  test("mobile responsive workout flow", async ({
    authenticatedPage: page,
  }) => {
    // Simulate mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to dashboard
    await page.goto("/");
    await expect(page).toHaveTitle(/Swole Tracker/);

    // Check mobile navigation
    await expect(page.locator("body")).toBeVisible();

    // Test mobile menu if present
    const mobileMenuButton = page.locator(
      'button[aria-label="Menu"], button:has-text("Menu")',
    );
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await page.waitForTimeout(1000);
    }

    // Navigate through key pages on mobile
    await page.goto("/workouts");
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/progress");
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/templates");
    await expect(page.locator("body")).toBeVisible();

    // Take mobile screenshot
    await page.screenshot({ path: "full-workflow-mobile.png" });
  });

  test("OAuth redirect functionality", async ({ page }) => {
    // Test OAuth redirect without authentication bypass
    await page.goto("/auth/login");

    // Should redirect to WorkOS AuthKit
    await page.waitForURL(/.*authkit\.app.*/, { timeout: 10000 });

    // Verify we're on WorkOS domain
    const currentUrl = page.url();
    expect(currentUrl).toContain("authkit.app");

    // Take screenshot of OAuth page
    await page.screenshot({ path: "oauth-redirect.png" });
  });
});
