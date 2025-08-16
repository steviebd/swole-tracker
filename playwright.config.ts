import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "src/__e2e__",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  // globalSetup: "./src/__e2e__/setup/global-setup.ts",
  // globalTeardown: "./src/__e2e__/setup/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    video: "on-first-retry",
    screenshot: "only-on-failure",
    // Load test environment variables
    // storageState: "src/__e2e__/storage/auth.json",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Enable more when needed:
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "bun dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Load test environment for e2e tests
      ...process.env,
    },
  },
});
