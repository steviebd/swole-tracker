/// <reference types="vitest" />
import path from "path";
import { defineConfig } from "vitest/config";

const isCI = process.env["CI"] === "true";

const baseExclude = [
  "**/*.spec.{ts,tsx}",
  "src/__e2e__/**/*",
  "**/*e2e*",
  "**/node_modules/**",
  "**/dist/**",
  "**/*.e2e.{ts,tsx}",
  "e2e/**/*",
  "**/e2e/**/*",
  "**/playwright/**/*",
  "playwright.config.ts",
  "e2e/**/*.spec.ts",
  "e2e/**/*.spec.{ts,tsx}",
];

export default defineConfig({
  test: {
    globals: true,
    pool: "threads",
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
      },
    },

    // Fast configuration - minimal reporting and no coverage
    reporters: [["default", { summary: false }]],
    logHeapUsage: false,
    isolate: false,
    testTimeout: 5000,
    hookTimeout: 3000,

    setupFiles: ["./src/__tests__/setup.common.ts"],
    environment: "happy-dom",
    mockReset: true,
    restoreMocks: true,

    // Include only critical tests for fast feedback
    include: [
      "src/__tests__/unit/**/*.test.{ts,tsx}",
      "src/__tests__/integration/**/*.test.{ts,tsx}",
    ],
    exclude: baseExclude,
    maxConcurrency: 2,

    // No coverage for fast runs
    coverage: {
      enabled: false,
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(process.cwd(), "./src"),
    },
  },
});
