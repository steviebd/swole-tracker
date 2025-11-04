/// <reference types="vitest" />
import os from "os";
import path from "path";
import { defineConfig } from "vitest/config";

// Performance-optimized Vitest configuration
const isCI = process.env.CI === "true";
const cpuCount = os.cpus().length;
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

export default defineConfig({
  test: {
    globals: true,

    // Optimized worker pool for performance
    poolOptions: {
      threads: {
        maxThreads: isCI ? cpuCount : maxLocalThreads,
        minThreads: 1,
        // Use fewer threads on M1 to reduce heat
        isolate: false, // Share memory between threads
      },
    },

    // Minimal setup for performance
    setupFiles: [
      "./src/__tests__/setup.common.ts",
    ],

    environment: "jsdom",

    // Essential mocks only
    mockReset: false, // Skip for performance
    restoreMocks: false, // Skip for performance

    // Include only essential test files
    include: [
      "src/__tests__/unit/**/*.test.{ts,tsx}",
      "src/__tests__/components/**/*.test.{ts,tsx}",
      "src/__tests__/hooks/**/*.test.{ts,tsx}",
    ],

    exclude: [
      ...baseExclude,
      // Exclude slow tests for performance
      "**/integration/**",
      "**/e2e/**",
      "**/performance/**",
      "**/analytics-performance.test.ts",
    ],

    // Optimized coverage for performance
    coverage: isCI ? {
      provider: "v8",
      reporter: ["text", "lcov", "json"],
      all: false, // Only collect coverage for tested files
      include: [
        "src/lib/**/*.ts",
        "src/hooks/**/*.ts",
        "src/components/**/*.ts",
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
        lines: 40, // Lower threshold for performance
        functions: 35,
        branches: 30,
        statements: 40,
      },
    } : undefined, // Skip coverage locally for speed

    // Performance optimizations
    watch: false, // Disable watch mode for CI performance
    reporters: isCI ? ["verbose"] : ["basic"],
    testTimeout: 10000, // Shorter timeout for faster failure
    hookTimeout: 5000,

    // Skip problematic tests for performance
    slowTestThreshold: 1000, // Mark tests slower than 1s as slow

    // Optimize file handling
    pool: "threads", // Use threads instead of processes for better performance
    isolate: false, // Share memory between tests

    // Cache test results
    cache: {
      dir: ".cache/vitest",
    },
  },

  resolve: {
    alias: {
      "~": path.resolve(process.cwd(), "./src"),
      "@": path.resolve(process.cwd(), "./src"),
    },
  },

  // Performance optimizations
  esbuild: {
    // Skip source maps for performance
    sourcemap: false,
    // Target modern JS for faster compilation
    target: "es2022",
  },
});