import { test as base, expect, type Page } from "@playwright/test";

// Test credentials for WorkOS - must be set in environment variables
const TEST_CREDENTIALS = {
  email: process.env["E2E_TEST_USERNAME"],
  password: process.env["E2E_TEST_PASSWORD"],
};

// Validate that credentials are provided
if (!TEST_CREDENTIALS.email || !TEST_CREDENTIALS.password) {
  throw new Error(
    "E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables must be set for E2E tests. " +
      "Add them to the .env file in the project root. See e2e/workflow/README.md for details.",
  );
}

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    console.log(
      "Setting up authenticated session for:",
      TEST_CREDENTIALS.email!,
    );

    // Navigate to the app home page which will redirect to login
    await page.goto("/");

    // Wait for redirect to WorkOS login page
    await page.waitForURL(/authkit\.app/);
    console.log("Redirected to WorkOS login page");

    // Step 1: Fill in the email field
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await emailInput.waitFor({ state: "visible", timeout: 10000 });
    await emailInput.fill(TEST_CREDENTIALS.email!);
    console.log("Filled email:", TEST_CREDENTIALS.email!);

    // Step 2: Click the "Continue" button to proceed to password step
    const continueButton = page.locator('button:has-text("Continue")');
    await continueButton.waitFor({ state: "visible", timeout: 5000 });
    await continueButton.click();
    console.log("Clicked Continue button");

    // Step 3: Wait for password field to appear (multi-step auth flow)
    const passwordInput = page.locator(
      'input[type="password"], input[name="password"]',
    );
    await passwordInput.waitFor({ state: "visible", timeout: 10000 });
    await passwordInput.fill(TEST_CREDENTIALS.password!);
    console.log("Filled password");

    // Step 4: Click the "Sign in" button (not the magic link button)
    const submitButton = page.locator('button:has-text("Sign in")').first();
    await submitButton.click();
    console.log("Clicked Sign in button");

    // Wait for redirect back to the app
    await page.waitForURL(/localhost:8787/, { timeout: 30000 });
    console.log("✓ Successfully authenticated and redirected back to app");

    // Wait for the page to fully load
    await page.waitForLoadState("networkidle");

    await use(page);

    // Cleanup: logout after test
    try {
      await page.goto("/api/auth/logout", { waitUntil: "domcontentloaded" });
      console.log("Logged out after test");
    } catch (error) {
      // Silently ignore logout errors - not critical for test success
      console.log("Note: Logout cleanup skipped (not critical)");
    }
  },
});

export { expect };
