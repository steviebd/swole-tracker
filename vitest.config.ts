/// <reference types="vitest" />
import os from "os";
import path from "path";
import { defineConfig } from "vitest/config";

const isCI = process.env.CI === "true";
const cpuCount =
  typeof (os as { availableParallelism?: () => number })
    .availableParallelism === "function"
    ? os.availableParallelism()
    : (os.cpus()?.length ?? 1);
const maxLocalThreads = Math.min(4, Math.max(1, Math.floor(cpuCount / 2)));

const baseExclude = [
  "**/*.spec.{ts,tsx}",
  "src/__e2e__/**/*",
  "**/*e2e*",
  "**/node_modules/**",
  "**/dist/**",
  "**/*.e2e.{ts,tsx}",
  "**/e2e/**/*",
  "**/playwright/**/*",
  "playwright.config.ts",
];

const jsdomTestGlobs = [
  "src/__tests__/components/**/*.test.{ts,tsx}",
  "src/__tests__/hooks/**/*.test.{ts,tsx}",
  "src/__tests__/unit/hooks/**/*.test.{ts,tsx}",
];

export default defineConfig({
  test: {
    globals: true,
    poolOptions: {
      threads: {
        maxThreads: isCI ? cpuCount : maxLocalThreads,
        minThreads: 1,
      },
    },
    setupFiles: [
      "./src/__tests__/setup.common.ts",
      "./src/__tests__/setup.dom.ts",
    ],
    environment: "jsdom",
    mockReset: true,
    restoreMocks: true,

    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    exclude: baseExclude,
    coverage: {
      provider: "v8",
      // Keep full reporter stack for CI; use a lightweight summary locally.
      reporter: isCI ? ["text", "lcov", "json", "html"] : ["text-summary"],
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
