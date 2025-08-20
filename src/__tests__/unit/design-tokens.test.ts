import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildTokens,
  generateCSSVariables,
} from "../../../scripts/build-tokens.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Design Token System", () => {
  const mockTokens = {
    color: {
      primary: {
        default: {
          $value: "oklch(0.985 0 0)",
          $description: "Primary brand color",
        },
      },
      text: {
        primary: {
          $value: "oklch(0.985 0 0)",
          $description: "Primary text color",
        },
      },
    },
    spacing: {
      component: {
        padding: {
          sm: {
            $value: "0.75rem",
            $description: "Small component padding",
          },
        },
      },
    },
    typography: {
      fontSize: {
        base: {
          $value: "1rem",
          $description: "Base font size",
        },
      },
    },
  };

  describe("generateCSSVariables", () => {
    it("should generate CSS variables from token object", () => {
      const css = generateCSSVariables(mockTokens.color, "color");

      expect(css).toContain("--color-primary-default: oklch(0.985 0 0);");
      expect(css).toContain("--color-text-primary: oklch(0.985 0 0);");
      expect(css).not.toContain("$value");
      expect(css).not.toContain("$description");
    });

    it("should handle nested token structures", () => {
      const css = generateCSSVariables(mockTokens.spacing, "spacing");

      expect(css).toContain("--spacing-component-padding-sm: 0.75rem;");
    });

    it("should handle typography tokens", () => {
      const css = generateCSSVariables(mockTokens.typography, "font");

      expect(css).toContain("--font-fontSize-base: 1rem;");
    });
  });

  describe("Token File Generation", () => {
    it("should have design tokens schema file", () => {
      const tokensPath = path.resolve(
        __dirname,
        "../../../src/styles/tokens/design-tokens.json",
      );
      expect(fs.existsSync(tokensPath)).toBe(true);

      const tokensContent = fs.readFileSync(tokensPath, "utf8");
      const tokens = JSON.parse(tokensContent);

      // Validate schema structure
      expect(tokens).toHaveProperty("color");
      expect(tokens).toHaveProperty("spacing");
      expect(tokens).toHaveProperty("typography");
      expect(tokens).toHaveProperty("borderRadius");
      expect(tokens).toHaveProperty("shadow");
    });

    it("should have light theme overrides", () => {
      const lightThemePath = path.resolve(
        __dirname,
        "../../../src/styles/tokens/themes/light.json",
      );
      expect(fs.existsSync(lightThemePath)).toBe(true);

      const lightThemeContent = fs.readFileSync(lightThemePath, "utf8");
      const lightTheme = JSON.parse(lightThemeContent);

      // Validate light theme has color overrides
      expect(lightTheme).toHaveProperty("color");
      expect(lightTheme.color).toHaveProperty("semantic");
    });

    it("should generate consistent CSS from tokens", () => {
      const generatedBasePath = path.resolve(
        __dirname,
        "../../../src/styles/tokens/generated-base.css",
      );
      const generatedLightPath = path.resolve(
        __dirname,
        "../../../src/styles/tokens/generated-light.css",
      );

      expect(fs.existsSync(generatedBasePath)).toBe(true);
      expect(fs.existsSync(generatedLightPath)).toBe(true);

      const baseCSS = fs.readFileSync(generatedBasePath, "utf8");
      const lightCSS = fs.readFileSync(generatedLightPath, "utf8");

      // Check for expected CSS structure
      expect(baseCSS).toContain("@theme {");
      expect(baseCSS).toContain("--color-");
      expect(baseCSS).toContain(".btn-primary");
      expect(baseCSS).toContain(".card");

      expect(lightCSS).toContain(":root,");
      expect(lightCSS).toContain('[data-theme="light"]');
      expect(lightCSS).toContain("color-scheme: light;");
    });
  });

  describe("CSS Variable Naming", () => {
    it("should use consistent naming conventions", () => {
      const css = generateCSSVariables(mockTokens, "");

      // Should use kebab-case and logical structure
      expect(css).toMatch(/--color-primary-default:/);
      expect(css).toMatch(/--color-text-primary:/);
      expect(css).toMatch(/--spacing-component-padding-sm:/);
      expect(css).toMatch(/--typography-fontSize-base:/);
    });

    it("should not include internal properties in CSS", () => {
      const css = generateCSSVariables(mockTokens, "");

      expect(css).not.toContain("$value");
      expect(css).not.toContain("$description");
      expect(css).not.toContain("$type");
    });
  });

  describe("Token Value Validation", () => {
    it("should handle OKLCH color values", () => {
      const colorTokens = {
        test: {
          $value: "oklch(0.5 0.2 180)",
          $description: "Test color",
        },
      };

      const css = generateCSSVariables(colorTokens, "color");
      expect(css).toContain("--color-test: oklch(0.5 0.2 180);");
    });

    it("should handle rem and px spacing values", () => {
      const spacingTokens = {
        small: { $value: "0.5rem" },
        large: { $value: "24px" },
      };

      const css = generateCSSVariables(spacingTokens, "spacing");
      expect(css).toContain("--spacing-small: 0.5rem;");
      expect(css).toContain("--spacing-large: 24px;");
    });

    it("should handle numeric font weights", () => {
      const fontTokens = {
        weight: {
          normal: { $value: 400 },
          bold: { $value: 700 },
        },
      };

      const css = generateCSSVariables(fontTokens, "font");
      expect(css).toContain("--font-weight-normal: 400;");
      expect(css).toContain("--font-weight-bold: 700;");
    });
  });

  describe("Mobile Token Integration", () => {
    it("should generate mobile-compatible config", () => {
      const mobileConfigPath = path.resolve(
        __dirname,
        "../../../apps/mobile/tailwind.config.js",
      );

      if (fs.existsSync(mobileConfigPath)) {
        const configContent = fs.readFileSync(mobileConfigPath, "utf8");

        // Should contain our semantic color tokens
        expect(configContent).toMatch(/"500":\s*"oklch/);
        expect(configContent).toMatch(/background/);
        expect(configContent).toMatch(/foreground/);
        expect(configContent).toMatch(/surface/);
      }
    });

    it("should generate TypeScript constants", () => {
      const constantsPath = path.resolve(
        __dirname,
        "../../../apps/mobile/lib/design-tokens.ts",
      );

      if (fs.existsSync(constantsPath)) {
        const constantsContent = fs.readFileSync(constantsPath, "utf8");

        // Should export DesignTokens object
        expect(constantsContent).toContain("export const DesignTokens");
        expect(constantsContent).toContain("colors:");
        expect(constantsContent).toContain("spacing:");
        expect(constantsContent).toContain("typography:");

        // Should use hex color values for React Native
        expect(constantsContent).toMatch(/#[0-9a-fA-F]{6}/);
      }
    });
  });

  describe("Theme System Integration", () => {
    it("should work with data-theme attribute strategy", () => {
      // Test that generated CSS uses data-theme selectors
      const lightThemePath = path.resolve(
        __dirname,
        "../../../src/styles/tokens/generated-light.css",
      );

      if (fs.existsSync(lightThemePath)) {
        const lightCSS = fs.readFileSync(lightThemePath, "utf8");

        expect(lightCSS).toContain('[data-theme="light"]');
        expect(lightCSS).toContain('[data-theme="system"] html:not(.dark)');
        expect(lightCSS).toContain("color-scheme: light;");
      }
    });

    it("should maintain dark theme compatibility", () => {
      const darkThemePath = path.resolve(
        __dirname,
        "../../../src/styles/tokens/dark.css",
      );

      if (fs.existsSync(darkThemePath)) {
        const darkCSS = fs.readFileSync(darkThemePath, "utf8");

        expect(darkCSS).toContain('[data-theme="dark"]');
        expect(darkCSS).toContain("html.dark");
        expect(darkCSS).toContain("color-scheme: dark;");
      }
    });
  });

  describe("Semantic Token Usage", () => {
    it("should provide semantic component classes", () => {
      const baseCSS = fs.readFileSync(
        path.resolve(
          __dirname,
          "../../../src/styles/tokens/generated-base.css",
        ),
        "utf8",
      );

      // Check for semantic utility classes
      expect(baseCSS).toContain(".text-primary");
      expect(baseCSS).toContain(".text-secondary");
      expect(baseCSS).toContain(".text-muted");
      expect(baseCSS).toContain(".bg-app");
      expect(baseCSS).toContain(".bg-surface");
      expect(baseCSS).toContain(".bg-card");
    });

    it("should provide component base styles", () => {
      const baseCSS = fs.readFileSync(
        path.resolve(
          __dirname,
          "../../../src/styles/tokens/generated-base.css",
        ),
        "utf8",
      );

      // Check for component base styles
      expect(baseCSS).toContain(".btn-primary");
      expect(baseCSS).toContain(".card");
      expect(baseCSS).toContain(".input-primary");

      // Should use token variables
      expect(baseCSS).toContain("var(--color-");
      expect(baseCSS).toContain("var(--component-");
    });
  });
});
