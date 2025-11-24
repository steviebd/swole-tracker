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
    // Unit test configuration
    reporters: isCI ? ["default"] : [["default", { summary: false }]],
    logHeapUsage: true,
    isolate: false,
    testTimeout: 10000,
    hookTimeout: 5000,

    setupFiles: ["./src/__tests__/setup.unit.ts"],
    environment: "node", // No DOM for pure unit tests
    mockReset: true,
    restoreMocks: true,

    include: ["src/__tests__/unit/**/*.test.{ts,tsx}"],
    exclude: baseExclude,
    maxConcurrency: maxThreads,

    coverage: {
      provider: "v8",
      reporter: isCI ? ["text", "lcov", "json"] : ["text"],
      all: isCI,
      include: [
        "src/lib/utils/**/*",
        "src/hooks/simple/**/*",
        "src/components/ui/**/*",
        "src/server/db/utils/**/*",
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
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(process.cwd(), "./src"),
    },
  },
});
