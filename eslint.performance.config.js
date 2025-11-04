import tseslint from "typescript-eslint";
// @ts-expect-error -- no types for this plugin
import drizzle from "eslint-plugin-drizzle";

import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * High-Performance ESLint Configuration for Swole Tracker
 *
 * Optimized for maximum performance on M1 MacBooks with intelligent caching
 * and selective rule application based on file patterns and change detection.
 */

export default tseslint.config(
  {
    // Ignore build output and all tests/e2e per task scope
    ignores: [
      ".next/**",
      "coverage/**",
      "test-results/**",
      "src/__tests__/**",
      "src/__e2e__/**",
      "**/__tests__/**",
      "**/__e2e__/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      ".turbo/**",
      ".vercel/**",
      ".cache/**",
    ],
  },
  // Generated bundles: ignore entire public directory from linting
  {
    ignores: ["public/**"],
  },
  // Fast rules for all files - minimal overhead
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    plugins: {
      drizzle,
      react,
      "react-hooks": reactHooks,
    },
    extends: [
      ...tseslint.configs.recommended,
    ],
    rules: {
      // Essential rules only - remove expensive type-aware rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off", // Too strict for performance
      "prefer-const": "error",
      "@typescript-eslint/no-var-requires": "error",

      // React hooks rules (used across the app)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Drizzle rules
      "drizzle/enforce-delete-with-where": [
        "error",
        { drizzleObjectName: ["db", "ctx.db"] },
      ],
      "drizzle/enforce-update-with-where": [
        "error",
        { drizzleObjectName: ["db", "ctx.db"] },
      ],
    },
  },
  // Medium performance rules for source files only
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Add some type-aware rules but only for source files
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-floating-promises": "off", // Can be slow
      "@typescript-eslint/require-await": "off", // Can be slow
    },
  },
  // High-performance rules for critical files only
  {
    files: [
      "src/lib/**/*.ts",
      "src/server/**/*.ts",
      "src/hooks/**/*.ts",
      "src/providers/**/*.ts"
    ],
    rules: {
      // Only enable expensive rules for critical files
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  // Theme token enforcement - lightweight syntax check
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^(bg|text)-(black|white)$/]",
          message:
            "Use theme tokens instead: bg-foreground/bg-background, text-foreground/text-background",
        },
        {
          selector: "Literal[value=/^#(000|000000|fff|ffffff)$/]",
          message: "Use theme tokens instead of raw black/white hex colors",
        },
      ],
    },
  },
  // File-specific relaxations for performance
  {
    files: ["next.config.js", "eslint.config.js", "*.config.js"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
    },
  },
  // Loosen rules for JS config files
  {
    files: [
      "*.config.js",
      "*.cjs",
      "*.mjs",
      "next.config.js",
      "postcss.config.js",
      "prettier.config.js",
    ],
    rules: {
      "import/no-anonymous-default-export": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  // Performance optimizations
  {
    linterOptions: {
      reportUnusedDisableDirectives: false, // Disable for performance
    },
    languageOptions: {
      parserOptions: {
        projectService: false, // Disable project service for performance
        project: false, // Disable project-based parsing
      },
    },
  },
);