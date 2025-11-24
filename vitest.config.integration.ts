/// <reference types="vitest" />
import path from "path";
import { defineConfig } from "vitest/config";

const isCI = process.env["CI"] === "true";
const maxThreads = isCI ? 2 : 2;

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
        maxThreads: maxThreads,
        minThreads: 1,
      },
    },

    // Integration test configuration
    reporters: isCI ? ["default"] : [["default", { summary: false }]],
    logHeapUsage: true,
    isolate: false,
    testTimeout: 15000,
    hookTimeout: 8000,

    setupFiles: ["./src/__tests__/setup.common.ts"],
    environment: "happy-dom",
    mockReset: true,
    restoreMocks: true,

    include: ["src/__tests__/integration/**/*.test.{ts,tsx}"],
    exclude: baseExclude,
    maxConcurrency: maxThreads,

    coverage: {
      provider: "v8",
      reporter: isCI ? ["text", "lcov", "json"] : ["text"],
      all: isCI,
      include: [
        "src/contexts/**/*",
        "src/hooks/**/*",
        "src/lib/**/*",
        "src/components/**/*",
      ],
      exclude: [
        "src/**/__tests__/**",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "src/**/types/**",
        "src/**/schemas/**",
        "src/**/*.config.{ts,js}",
        "src/**/*.setup.{ts,js}",
        "src/**/mocks/**",
        "src/**/test-data/**",
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 65,
        statements: 75,
      },
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(process.cwd(), "./src"),
    },
  },
});
