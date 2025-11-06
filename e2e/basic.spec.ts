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

  // Look for login form elements
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();

  // Take a screenshot for debugging
  await page.screenshot({ path: "login-page.png" });
});
