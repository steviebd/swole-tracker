/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    globals: true,
    environmentOptions: {
      jsdom: {
        resources: "usable",
        pretendToBeVisual: true,
      },
    },
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    exclude: [
      "**/*.spec.{ts,tsx}",
      "src/__e2e__/**/*",
      "**/*e2e*",
      "**/node_modules/**",
      "**/dist/**",
      "**/*.e2e.{ts,tsx}",
      "**/e2e/**/*",
      "**/playwright/**/*",
      "playwright.config.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json", "html"],
      all: true,
      include: [
        "src/**/*.{ts,tsx}",
        "!src/**/*.d.ts",
        "!src/**/__tests__/**",
        "!src/**/*.test.{ts,tsx}",
        "!src/**/*.spec.{ts,tsx}",
        "!src/**/types/**",
        "!src/**/schemas/**",
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
        branches: 75,
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
