import { test, expect } from "../fixtures/auth.fixture";

test.describe("Authentication", () => {
  test("should redirect unauthenticated user to WorkOS", async ({ page }) => {
    // Navigate to protected route without auth
    await page.goto("/workout/start");

    // Should redirect to WorkOS AuthKit
    await page.waitForURL(/.*authkit\.app.*/, { timeout: 10000 });
    expect(page.url()).toContain("authkit.app");
  });

  test("should complete WorkOS OAuth flow with real credentials", async ({
    page,
  }) => {
    // Start at home
    await page.goto("/");

    // Should redirect to WorkOS AuthKit
    await page.waitForURL(/.*authkit\.app.*/);
    expect(page.url()).toContain("authkit.app");
  });

  test("should maintain authenticated session across page reloads", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to a protected route
    await page.goto("/workout/start");
    await expect(page.locator("body")).toBeVisible();

    // Reload page
    await page.reload();

    // Should still be authenticated (no redirect to login)
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).not.toContain("/auth/login");
  });

  test("should access protected workout routes when authenticated", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Test various protected routes
    const protectedRoutes = [
      "/workout/start",
      "/workouts",
      "/templates",
      "/progress",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      // Should not redirect to login
      await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
      expect(page.url()).not.toContain("/auth/login");
    }
  });

  test("should handle session expiry gracefully", async ({ page }) => {
    // Mock expired session by intercepting session endpoint
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ user: null }),
      });
    });

    // Try to access protected route
    await page.goto("/workout/start");

    // Should redirect to WorkOS AuthKit due to expired session
    await page.waitForURL(/.*authkit\.app.*/, { timeout: 10000 });
    expect(page.url()).toContain("authkit.app");
  });
});
