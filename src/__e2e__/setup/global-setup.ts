import { chromium, type FullConfig } from "@playwright/test";
import { createTestUser, cleanupTestData } from "./test-database";
import path from "path";
import { config as dotenvConfig } from "dotenv";

async function globalSetup(config: FullConfig) {
  console.log("🧪 Starting global e2e test setup...");

  // Load test environment variables
  const testEnvPath = path.resolve(process.cwd(), ".env.test");
  dotenvConfig({ path: testEnvPath });

  try {
    // Clean up any existing test data
    await cleanupTestData();
    console.log("✅ Cleaned up existing test data");

    // Create test user and authenticate
    const testUser = await createTestUser();
    console.log(`✅ Created test user: ${testUser.email}`);

    // Create browser and authenticate
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Navigate to login page and authenticate
    await page.goto("http://localhost:3000/auth/login");
    
    // Fill in login form
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for successful login (redirect to dashboard)
    await page.waitForURL(/\/$|\/dashboard/, { timeout: 10000 });

    // Save authentication state
    const storageDir = path.dirname(path.resolve(process.cwd(), "src/__e2e__/storage/auth.json"));
    await page.context().storageState({ path: "src/__e2e__/storage/auth.json" });

    await browser.close();

    console.log("✅ Authentication state saved");
    console.log("🎉 Global setup completed successfully");

    // Store test user info for tests
    process.env.TEST_USER_EMAIL = testUser.email;
    process.env.TEST_USER_PASSWORD = testUser.password;
    process.env.TEST_USER_ID = testUser.id;

  } catch (error) {
    console.error("❌ Global setup failed:", error);
    throw error;
  }
}

export default globalSetup;