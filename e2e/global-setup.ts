import { chromium, type FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  console.log("Running global E2E setup...");

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await context.clearCookies();
  try {
    await page.evaluate(() => localStorage.clear());
  } catch {
    // localStorage may not be available in some contexts
  }

  try {
    await page.goto(
      config.projects?.[0]?.use?.baseURL || "http://localhost:8787",
    );
    console.log("✓ Dev server is responding at http://localhost:8787");
  } catch (error) {
    console.error("Dev server not available:", error);
    throw error;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  console.log("Global E2E setup complete");
}

export default globalSetup;
