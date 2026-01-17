import { test, expect } from "@playwright/test";

test("basic - homepage loads", async ({ page }) => {
  await page.goto("/");

  // Check that the page loads without errors
  await expect(page).toHaveTitle(/Swole Tracker/);

  // Look for common navigation elements
  await expect(page.locator("body")).toBeVisible();

  // Take a screenshot for debugging
  await page.screenshot({ path: "homepage.png" });
});

test("basic - unauthenticated user redirects to WorkOS", async ({ page }) => {
  // Navigate to protected route
  await page.goto("/dashboard");

  // Should redirect to WorkOS AuthKit
  await page.waitForURL(/.*authkit\.app.*/, { timeout: 10000 });
  expect(page.url()).toContain("authkit.app");

  // Take a screenshot for debugging
  await page.screenshot({ path: "workos-redirect.png" });
});
