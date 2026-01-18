import { chromium, type FullConfig } from "@playwright/test";

async function globalTeardown(config: FullConfig) {
  console.log("Running global E2E teardown...");

  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: config.projects?.[0]?.use?.baseURL || "http://localhost:8787",
  });
  const page = await context.newPage();

  await context.clearCookies();
  try {
    await page.evaluate(() => localStorage.clear());
  } catch {
    // localStorage may not be available in some contexts
  }

  await page.close();
  await context.close();
  await browser.close();

  console.log(
    "✓ Global E2E teardown complete - cookies and localStorage cleared",
  );
}

export default globalTeardown;
