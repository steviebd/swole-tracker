import { type FullConfig } from "@playwright/test";
import { cleanupTestData } from "./test-database";
import fs from "fs";
import path from "path";

async function globalTeardown(config: FullConfig) {
  console.log("🧹 Starting global e2e test teardown...");

  try {
    // Clean up test data
    await cleanupTestData();
    console.log("✅ Cleaned up test data");

    // Remove authentication state file
    const authStatePath = path.resolve(process.cwd(), "src/__e2e__/storage/auth.json");
    if (fs.existsSync(authStatePath)) {
      fs.unlinkSync(authStatePath);
      console.log("✅ Removed authentication state file");
    }

    console.log("🎉 Global teardown completed successfully");

  } catch (error) {
    console.error("❌ Global teardown failed:", error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;