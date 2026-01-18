import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const envLocalPath = join(process.cwd(), ".env.local");
if (existsSync(envLocalPath)) {
  const envContent = readFileSync(envLocalPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex);
        const value = trimmed.slice(eqIndex + 1);
        process.env[key] = value;
      }
    }
  });
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/consolidated-workflow.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: 1,
  reporter: [
    ["html"],
    ["json", { outputFile: "playwright-report/results.json" }],
    ["github"],
  ],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  use: {
    baseURL: "http://localhost:8787",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 30000,
    launchOptions: {
      slowMo: process.env["SLOW_MO"] ? parseInt(process.env["SLOW_MO"]) : 0,
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: {
    command: "bun run dev:e2e",
    url: "http://localhost:8787",
    reuseExistingServer: !process.env["CI"],
    timeout: 120000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
