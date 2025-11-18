import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : 1,
  reporter: [
    ["html"],
    ["json", { outputFile: "playwright-report/results.json" }],
    ["github"],
  ],
  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: "http://localhost:8787",
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    // Slow down actions for interactive testing (comment out for faster CI runs)
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
    command:
      "NODE_ENV=test E2E_TESTING=true infisical run --env dev -- bun run dev:worker",
    url: "http://localhost:8787",
    reuseExistingServer: !process.env["CI"],
    timeout: 120000,
  },
});
