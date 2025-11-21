/// <reference types="vitest" />
import path from "path";
import { defineConfig } from "vitest/config";

const isCI = process.env["CI"] === "true";
// Simplified thread count to avoid JSDOM/os module conflicts
const maxLocalThreads = isCI ? 4 : 2;

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
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: false,
      },
    },
    // Speed optimizations
    // Optimize test output for speed
    reporters: isCI ? ["default"] : [["default", { summary: false }]],
    // Enable heap usage logging to monitor memory
    logHeapUsage: true,
    // Disable test isolation to reduce memory overhead
    isolate: false,
    // Increase timeouts to prevent timeouts due to memory constraints
    testTimeout: 60000,
    hookTimeout: 60000,

    setupFiles: [
      "./src/__tests__/setup.dom.ts",
      "./src/__tests__/setup.common.ts",
    ],
    environment: "jsdom",
    mockReset: true,
    restoreMocks: true,

    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    exclude: baseExclude,
    maxConcurrency: 1, // Only run one test at a time
    coverage: {
      provider: "v8",
      // Keep full reporter stack for CI; use detailed text output locally.
      reporter: isCI ? ["text", "lcov", "json", "html"] : ["text"],
      all: isCI,
      include: [
        "src/app/**/*.{ts,tsx}",
        "src/components/**/*.{ts,tsx}",
        "src/hooks/**/*.{ts,tsx}",
        "src/lib/**/*.{ts,tsx}",
        "src/providers/**/*.{ts,tsx}",
        "src/server/**/*.{ts,tsx}",
        "src/trpc/**/*.{ts,tsx}",
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
        lines: 43,
        functions: 41,
        branches: 34,
        statements: 42,
      },
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(process.cwd(), "./src"),
    },
  },
});
