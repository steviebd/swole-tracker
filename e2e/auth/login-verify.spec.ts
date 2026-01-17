import { test, expect } from "../fixtures/auth.fixture";

test.describe("Login Verification", () => {
  test("should login successfully and reach home page", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Should be on home page after successful login
    await expect(page.url()).toContain("localhost:8787/");

    // Verify user is on dashboard/authenticated page
    await expect(page.locator("h1")).toContainText("Dashboard", {
      timeout: 10000,
    });

    console.log("✅ Login successful - user is on home page");
  });
});
