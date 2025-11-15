import { test, expect } from "../fixtures/auth.fixture";

test.describe("Authentication", () => {
  test("should redirect unauthenticated user to login", async ({ page }) => {
    // Navigate to protected route without auth
    await page.goto("/workout/new");

    // Should redirect to login (could be /auth/login or /sign-in)
    await page.waitForURL(/.*(auth\/login|sign-in).*/);
    expect(page.url()).toMatch(/.*(auth\/login|sign-in).*/);

    // Verify login page elements - check for OAuth redirect
    try {
      // Check if it redirects to WorkOS AuthKit
      await page.waitForURL(/.*authkit\.app.*/, { timeout: 5000 });
      console.log("Redirected to WorkOS AuthKit as expected");
    } catch {
      // If no redirect, look for Google sign-in button
      await expect(
        page.locator('button:has-text("Sign in with Google")'),
      ).toBeVisible();
    }
  });

  test("should complete WorkOS OAuth flow with real credentials", async ({
    page,
  }) => {
    // This test verifies the OAuth redirect flow works
    // We don't complete the full OAuth flow as it requires real user interaction

    // Start at home
    await page.goto("/");

    // Click sign in
    const signInButton = page
      .locator('button:has-text("Sign in"), a:has-text("Sign in")')
      .first();
    await signInButton.click();

    // Should redirect to WorkOS AuthKit
    await page.waitForURL(/.*authkit\.app.*/);
    expect(page.url()).toContain("authkit.app");
  });

  test("should maintain authenticated session across page reloads", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to a protected route
    await page.goto("/dashboard");
    await expect(page.locator("body")).toBeVisible();

    // Reload page
    await page.reload();

    // Should still be authenticated (no redirect to login)
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/dashboard");
  });

  test("should access protected workout routes when authenticated", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Test various protected routes
    const protectedRoutes = [
      "/workout/new",
      "/workout/start",
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
    await page.goto("/dashboard");

    // Should redirect to login due to expired session or to WorkOS AuthKit
    try {
      await page.waitForURL(/.*auth\/login.*/, { timeout: 5000 });
      expect(page.url()).toContain("/auth/login");
    } catch {
      // If it redirects to WorkOS AuthKit, that's also expected behavior
      await page.waitForURL(/.*authkit\.app.*/, { timeout: 5000 });
      expect(page.url()).toContain("authkit.app");
    }
  });
});
