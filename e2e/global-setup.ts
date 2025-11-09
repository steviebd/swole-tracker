import { chromium, type FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  console.log("Running global E2E setup...");

  // Verify dev server is responding
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(
      config.projects?.[0]?.use?.baseURL || "http://localhost:8787",
    );
    console.log("Dev server is responding");
  } catch (error) {
    console.error("Dev server not available:", error);
    throw error;
  } finally {
    await page.close();
    await browser.close();
  }

  console.log("Global E2E setup complete");
}

export default globalSetup;
