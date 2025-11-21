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

test("basic - login page loads", async ({ page }) => {
  await page.goto("/auth/login");

  // Check that login page loads
  await expect(page).toHaveTitle(/Swole Tracker/);

  // Look for OAuth redirect or Google sign-in button
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

  // Take a screenshot for debugging
  await page.screenshot({ path: "login-page.png" });
});
