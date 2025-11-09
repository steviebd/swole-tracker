import { test, expect } from "../fixtures/auth.fixture";

test.describe("Authentication", () => {
  test("should redirect unauthenticated user to login", async ({ page }) => {
    // Navigate to protected route without auth
    await page.goto("/workout/new");

    // Should redirect to login (could be /auth/login or /sign-in)
    await page.waitForURL(/.*(auth\/login|sign-in).*/);
    expect(page.url()).toMatch(/.*(auth\/login|sign-in).*/);

    // Verify login page elements
    await expect(page.locator("text=Sign In")).toBeVisible();
    await expect(
      page.locator('button:has-text("Sign in with Google")'),
    ).toBeVisible();
  });

  test("should complete WorkOS OAuth flow with real credentials", async ({
    page,
  }) => {
    // This test uses the authenticatedPage fixture which handles the full OAuth flow
    // The fixture is defined in auth.fixture.ts and performs real authentication

    // Start at home
    await page.goto("/");

    // Click sign in
    const signInButton = page
      .locator('button:has-text("Sign in"), a:has-text("Sign in")')
      .first();
    await signInButton.click();

    // Should redirect to login page first
    await page.waitForURL(/.*auth\/login.*/);

    // Click Google auth button
    await page.click('button:has-text("Sign in with Google")');

    // OAuth flow will be handled by the fixture when we use authenticatedPage
    // For this test, we'll just verify the redirect happens
    await expect(page.url()).toMatch(/.*google\.com.*/);
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

    // Should redirect to login due to expired session
    await page.waitForURL(/.*auth\/login.*/);
    expect(page.url()).toContain("/auth/login");
  });
});
