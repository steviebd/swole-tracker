import tseslint from "typescript-eslint";
// @ts-expect-error -- no types for this plugin
import drizzle from "eslint-plugin-drizzle";

/**
 * Use eslint flat config without eslint-config-next to avoid rushstack patch error with ESLint v9.
 * We replicate minimal Next.js/web-vitals rules where useful later if needed.
 */
/**
 * Add react/react-hooks plugin to satisfy rules like react-hooks/exhaustive-deps.
 */
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

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
    ],
  },
  // Generated bundles: ignore entire public directory from linting
  {
    ignores: ["public/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    plugins: {
      drizzle,
      react,
      "react-hooks": reactHooks,
    },
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      // Widen error type to reduce false positives from try/catch, etc.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      // React hooks rules (used across the app)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "drizzle/enforce-delete-with-where": [
        "error",
        { drizzleObjectName: ["db", "ctx.db"] },
      ],
      "drizzle/enforce-update-with-where": [
        "error",
        { drizzleObjectName: ["db", "ctx.db"] },
      ],

      // Theme token enforcement - prevent hardcoded colors
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
        {
          selector: "TemplateElement[value.raw=/(bg|text)-(black|white)/]",
          message:
            "Use theme tokens instead: bg-foreground/bg-background, text-foreground/text-background",
        },
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,6}$/]",
          message:
            "Avoid hardcoded hex colors. Use CSS variables from theme system.",
        },
        {
          selector: "Literal[value=/^rgb\\(/]",
          message:
            "Avoid hardcoded RGB colors. Use CSS variables from theme system.",
        },
        {
          selector: "Literal[value=/^rgba\\(/]",
          message:
            "Avoid hardcoded RGBA colors. Use color-mix() with CSS variables.",
        },
        {
          selector: "Literal[value=/^hsl\\(/]",
          message:
            "Avoid hardcoded HSL colors. Use CSS variables from theme system.",
        },
      ],
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  // Disable expensive rules for performance
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off", // Can be slow on large codebases
    },
  },
  // File-specific relaxations
  {
    files: ["next.config.js", "eslint.config.js"],
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
      // Ensure this rule is known (we don't include eslint-config-next); disable if referenced
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
);
