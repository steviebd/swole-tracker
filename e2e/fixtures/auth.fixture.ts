import {
  test as base,
  expect,
  type Page,
  type BrowserContext,
} from "@playwright/test";
import { existsSync, writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";

const STORAGE_STATE_PATH = join(process.cwd(), "e2e/.auth/storage-state.json");

const TEST_CREDENTIALS = {
  email: process.env["E2E_TEST_USERNAME"],
  password: process.env["E2E_TEST_PASSWORD"],
};

if (!TEST_CREDENTIALS.email || !TEST_CREDENTIALS.password) {
  throw new Error(
    "E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables must be set for E2E tests. " +
      "Add them to the .env file in the project root. See e2e/workflow/README.md for details.",
  );
}

async function doLogin(page: Page): Promise<void> {
  console.log("Performing login for:", TEST_CREDENTIALS.email!);

  await page.goto("/");

  await page.waitForURL(/authkit\.app/);
  console.log("Redirected to WorkOS login page");

  const emailInput = page.locator('input[type="email"], input[name="email"]');
  await emailInput.waitFor({ state: "visible", timeout: 10000 });
  await emailInput.fill(TEST_CREDENTIALS.email!);
  console.log("Filled email:", TEST_CREDENTIALS.email!);

  const continueButton = page.locator('button:has-text("Continue")');
  await continueButton.waitFor({ state: "visible", timeout: 5000 });
  await continueButton.click();
  console.log("Clicked Continue button");

  const passwordInput = page.locator(
    'input[type="password"], input[name="password"]',
  );
  await passwordInput.waitFor({ state: "visible", timeout: 10000 });
  await passwordInput.fill(TEST_CREDENTIALS.password!);
  console.log("Filled password");

  const submitButton = page.locator('button:has-text("Sign in")').first();
  await submitButton.click();
  console.log("Clicked Sign in button");

  await page.waitForURL(/localhost:8787/, { timeout: 30000 });
  console.log("✓ Successfully authenticated and redirected back to app");

  await page.waitForLoadState("networkidle");
}

async function saveStorageState(page: Page): Promise<void> {
  const storageState = await page.context().storageState();
  const authDir = join(STORAGE_STATE_PATH, "..");
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }
  writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));
  console.log("✓ Saved authentication state to:", STORAGE_STATE_PATH);
}

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    const response = await page.context().request.get("/api/auth/session");
    if (response.ok()) {
      const data = (await response.json()) as { user: { id: string } | null };
      return data.user !== null;
    }
  } catch {
    // Network error - treat as not authenticated
  }
  return false;
}

async function createAuthContext(
  browser: import("@playwright/test").Browser,
  baseURL: string,
): Promise<BrowserContext> {
  const hasStorageState = existsSync(STORAGE_STATE_PATH);

  if (hasStorageState) {
    console.log("✓ Loading existing authentication state");
    const storageState = JSON.parse(readFileSync(STORAGE_STATE_PATH, "utf-8"));
    return browser.newContext({
      baseURL,
      storageState,
    });
  }

  console.log("No existing auth state, will login on first use");
  return browser.newContext({
    baseURL,
  });
}

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: [
    async ({ browser, baseURL }, use) => {
      const context = await createAuthContext(browser, baseURL);
      const page = await context.newPage();

      const hasStorageState = existsSync(STORAGE_STATE_PATH);

      if (!hasStorageState) {
        console.log("No existing auth state, performing fresh login...");
        await doLogin(page);
        await saveStorageState(page);
      } else {
        const authenticated = await isAuthenticated(page);
        if (!authenticated) {
          console.log(
            "Auth state exists but session invalid, re-logging in...",
          );
          await doLogin(page);
          await saveStorageState(page);
        } else {
          console.log("✓ Using existing authentication state");
        }
      }

      await use(page);

      await page.close();
      await context.close();
    },
    { scope: "test" },
  ],
});

export { expect };
