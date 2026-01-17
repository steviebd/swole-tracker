import { test, expect } from "@playwright/test";

test("basic - unauthenticated user sees sign-in page", async ({ page }) => {
  await page.goto("/");

  // Check that the page loads and shows sign-in
  await expect(page).toHaveTitle(/Sign in/);

  // Look for sign-in elements (WorkOS AuthKit or custom sign-in)
  await expect(page.locator("body")).toBeVisible();

  // Take a screenshot for debugging
  await page.screenshot({ path: "signin-page.png" });
});

test("basic - protected route shows sign-in", async ({ page }) => {
  // Navigate directly to the login API which should redirect
  const response = await page.goto("/api/auth/login?redirectTo=/_app/_index");

  // Should redirect to WorkOS AuthKit
  await page.waitForURL(/.*authkit\.app.*/, { timeout: 15000 });
  expect(page.url()).toContain("authkit.app");

  // Take a screenshot for debugging
  await page.screenshot({ path: "workos-redirect.png" });
});
