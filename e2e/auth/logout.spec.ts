import { test, expect } from "../fixtures/auth.fixture";

test.describe("User Logout", () => {
  test("should successfully logout and redirect to login", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to dashboard to ensure we're on a page with the header
    await page.goto("/dashboard");

    // Open user menu by clicking avatar
    const avatarButton = page.locator('button[aria-label="Account menu"]');
    await avatarButton.click();

    // Click the sign out button
    const signOutButton = page.locator('button:has-text("Sign out")');
    await signOutButton.click();

    // Wait for redirect to login page or WorkOS AuthKit
    try {
      await page.waitForURL(/.*auth\/login.*/, { timeout: 5000 });
      expect(page.url()).toContain("/auth/login");
    } catch {
      // If it redirects to WorkOS AuthKit, that's also expected
      await page.waitForURL(/.*authkit\.app.*/, { timeout: 5000 });
      expect(page.url()).toContain("authkit.app");
    }
  });

  test("should clear session data after logout", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to dashboard
    await page.goto("/dashboard");

    // Open user menu and logout
    const avatarButton = page.locator('button[aria-label="Account menu"]');
    await avatarButton.click();
    const signOutButton = page.locator('button:has-text("Sign out")');
    await signOutButton.click();

    // Wait for logout to complete
    await page.waitForLoadState("networkidle");

    // Try to access a protected route
    await page.goto("/dashboard");

    // Should redirect to login due to cleared session
    try {
      await page.waitForURL(/.*auth\/login.*/, { timeout: 5000 });
      expect(page.url()).toContain("/auth/login");
    } catch {
      // If it redirects to WorkOS AuthKit, that's also expected
      await page.waitForURL(/.*authkit\.app.*/, { timeout: 5000 });
      expect(page.url()).toContain("authkit.app");
    }

    // Verify session is cleared by checking the session endpoint
    const response = await page.request.get("/api/auth/session");
    expect(response.status()).toBe(401);

    const sessionData = await response.json();
    expect(sessionData.user).toBeNull();
  });
});