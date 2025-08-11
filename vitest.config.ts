import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    globals: true,
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      all: true,
      include: [
        // Focus coverage on lib and API routers where we have tests
        "src/lib/**/*.{ts,tsx}",
        "src/server/api/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/**/__tests__/**",
        // Exclude Next.js app and components
        "src/app/**",
        "src/styles/**",
        "src/providers/**",
        // Exclude server-only infra and DB adapters that require env/db
        "src/server/db/**",
        "src/server/api/trpc.ts",
        // Exclude heavy client hooks not safe in jsdom without complex mocks
        "src/hooks/useWorkoutSessionState.ts",
        "src/hooks/use-workout-updates.ts",
        // Misc
        "src/middleware.ts",
        "src/env.js",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src"),
    },
  },
});
