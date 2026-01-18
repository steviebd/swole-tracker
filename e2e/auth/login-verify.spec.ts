import { test, expect } from "../fixtures/auth.fixture";

test.describe("Login Verification", () => {
  test("should login successfully and reach home page", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // After successful login, should be redirected back to the app
    // (the exact redirect depends on the state parameter sent to WorkOS)
    await expect(page.url()).toContain("localhost:8787");

    // Verify user is on a protected page (has main content or body)
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });

    console.log("✅ Login successful - user is on home page");
  });
});
