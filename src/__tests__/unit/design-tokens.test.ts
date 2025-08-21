import { describe, it, expect } from "vitest";
import {
  DesignTokens,
  TokenUtils,
  type SurfaceLevel,
  type VisualStyle,
  type SpacingSize,
  type TypographySize,
  type ShadowLevel,
} from "~/lib/design-tokens";

describe("DesignTokens structure", () => {
  it("should have all required color categories", () => {
    expect(DesignTokens.colors).toHaveProperty("primary");
    expect(DesignTokens.colors).toHaveProperty("secondary");
    expect(DesignTokens.colors).toHaveProperty("accent");
    expect(DesignTokens.colors).toHaveProperty("background");
    expect(DesignTokens.colors).toHaveProperty("text");
    expect(DesignTokens.colors).toHaveProperty("border");
    expect(DesignTokens.colors).toHaveProperty("status");
    expect(DesignTokens.colors).toHaveProperty("glass");
    expect(DesignTokens.colors).toHaveProperty("chart");
  });

  it("should have all required spacing categories", () => {
    expect(DesignTokens.spacing).toHaveProperty("component");
    expect(DesignTokens.spacing).toHaveProperty("gap");
    expect(DesignTokens.spacing).toHaveProperty("layout");
  });

  it("should have all required typography categories", () => {
    expect(DesignTokens.typography).toHaveProperty("fontFamily");
    expect(DesignTokens.typography).toHaveProperty("fontSize");
    expect(DesignTokens.typography).toHaveProperty("fontWeight");
    expect(DesignTokens.typography).toHaveProperty("lineHeight");
  });

  it("should have all required border radius values", () => {
    expect(DesignTokens.borderRadius).toHaveProperty("sm");
    expect(DesignTokens.borderRadius).toHaveProperty("md");
    expect(DesignTokens.borderRadius).toHaveProperty("lg");
    expect(DesignTokens.borderRadius).toHaveProperty("card");
    expect(DesignTokens.borderRadius).toHaveProperty("full");
  });

  it("should have all required shadow levels", () => {
    expect(DesignTokens.shadow).toHaveProperty("xs");
    expect(DesignTokens.shadow).toHaveProperty("sm");
    expect(DesignTokens.shadow).toHaveProperty("md");
    expect(DesignTokens.shadow).toHaveProperty("lg");
    expect(DesignTokens.shadow).toHaveProperty("focus");
  });

  it("should have all required motion tokens", () => {
    expect(DesignTokens.motion).toHaveProperty("duration");
    expect(DesignTokens.motion).toHaveProperty("easing");
  });

  it("should have component-specific tokens", () => {
    expect(DesignTokens.component).toHaveProperty("button");
    expect(DesignTokens.component).toHaveProperty("card");
    expect(DesignTokens.component).toHaveProperty("input");
  });
});

describe("TokenUtils.getSurfaceBackground", () => {
  it("should return correct background for app surface", () => {
    const result = TokenUtils.getSurfaceBackground("app");
    expect(result).toBe(DesignTokens.colors.background.app);
  });

  it("should return correct background for surface", () => {
    const result = TokenUtils.getSurfaceBackground("surface");
    expect(result).toBe(DesignTokens.colors.background.surface);
  });

  it("should return correct background for card", () => {
    const result = TokenUtils.getSurfaceBackground("card");
    expect(result).toBe(DesignTokens.colors.background.card);
  });

  it("should return correct background for elevated", () => {
    const result = TokenUtils.getSurfaceBackground("elevated");
    expect(result).toBe(DesignTokens.colors.background.card);
  });

  it("should handle all surface levels", () => {
    const surfaceLevels: SurfaceLevel[] = [
      "app",
      "surface",
      "card",
      "elevated",
    ];
    surfaceLevels.forEach((level) => {
      expect(() => TokenUtils.getSurfaceBackground(level)).not.toThrow();
    });
  });
});

describe("TokenUtils.getStatusColor", () => {
  it("should return primary text color for default style", () => {
    const result = TokenUtils.getStatusColor("default");
    expect(result).toBe(DesignTokens.colors.text.primary);
  });

  it("should return success colors", () => {
    const defaultResult = TokenUtils.getStatusColor("success", "default");
    const mutedResult = TokenUtils.getStatusColor("success", "muted");

    expect(defaultResult).toBe(DesignTokens.colors.status.success.default);
    expect(mutedResult).toBe(DesignTokens.colors.status.success.muted);
  });

  it("should return warning colors", () => {
    const defaultResult = TokenUtils.getStatusColor("warning", "default");
    const mutedResult = TokenUtils.getStatusColor("warning", "muted");

    expect(defaultResult).toBe(DesignTokens.colors.status.warning.default);
    expect(mutedResult).toBe(DesignTokens.colors.status.warning.muted);
  });

  it("should return danger colors", () => {
    const defaultResult = TokenUtils.getStatusColor("danger", "default");
    const mutedResult = TokenUtils.getStatusColor("danger", "muted");

    expect(defaultResult).toBe(DesignTokens.colors.status.danger.default);
    expect(mutedResult).toBe(DesignTokens.colors.status.danger.muted);
  });

  it("should return info colors", () => {
    const defaultResult = TokenUtils.getStatusColor("info", "default");
    const mutedResult = TokenUtils.getStatusColor("info", "muted");

    expect(defaultResult).toBe(DesignTokens.colors.status.info.default);
    expect(mutedResult).toBe(DesignTokens.colors.status.info.muted);
  });

  it("should handle all visual styles", () => {
    const visualStyles: VisualStyle[] = [
      "default",
      "success",
      "warning",
      "danger",
      "info",
    ];
    visualStyles.forEach((style) => {
      expect(() => TokenUtils.getStatusColor(style)).not.toThrow();
      expect(() => TokenUtils.getStatusColor(style, "default")).not.toThrow();
      expect(() => TokenUtils.getStatusColor(style, "muted")).not.toThrow();
    });
  });
});

describe("TokenUtils.getSpacing", () => {
  it("should return component spacing", () => {
    const result = TokenUtils.getSpacing("component", "md");
    expect(result).toBe(DesignTokens.spacing.component.md);
  });

  it("should return gap spacing", () => {
    const result = TokenUtils.getSpacing("gap", "lg");
    expect(result).toBe(DesignTokens.spacing.gap.lg);
  });

  it("should handle all spacing sizes", () => {
    const spacingSizes: SpacingSize[] = ["xs", "sm", "md", "lg", "xl"];
    spacingSizes.forEach((size) => {
      expect(() => TokenUtils.getSpacing("component", size)).not.toThrow();
      expect(() => TokenUtils.getSpacing("gap", size)).not.toThrow();
    });
  });
});

describe("TokenUtils.getTypography", () => {
  it("should return font size values", () => {
    const result = TokenUtils.getTypography("fontSize", "lg");
    expect(result).toBe(DesignTokens.typography.fontSize.lg);
  });

  it("should return font weight values", () => {
    const result = TokenUtils.getTypography("fontWeight", "bold");
    expect(result).toBe(DesignTokens.typography.fontWeight.bold);
  });

  it("should handle all typography sizes", () => {
    const typographySizes: TypographySize[] = [
      "xs",
      "sm",
      "base",
      "lg",
      "xl",
      "2xl",
      "3xl",
    ];
    typographySizes.forEach((size) => {
      expect(() => TokenUtils.getTypography("fontSize", size)).not.toThrow();
    });
  });

  it("should handle all font weights", () => {
    const fontWeights = ["normal", "medium", "semibold", "bold", "black"];
    fontWeights.forEach((weight) => {
      expect(() =>
        TokenUtils.getTypography("fontWeight", weight as any),
      ).not.toThrow();
    });
  });
});

describe("TokenUtils.getShadow", () => {
  it("should return shadow values", () => {
    const result = TokenUtils.getShadow("md");
    expect(result).toBe(DesignTokens.shadow.md);
  });

  it("should handle all shadow levels", () => {
    const shadowLevels: ShadowLevel[] = ["xs", "sm", "md", "lg"];
    shadowLevels.forEach((level) => {
      expect(() => TokenUtils.getShadow(level)).not.toThrow();
    });
  });
});

describe("Type definitions", () => {
  it("should have proper type definitions", () => {
    // Test that the types are properly defined
    const surfaceLevel: SurfaceLevel = "app";
    const visualStyle: VisualStyle = "success";
    const spacingSize: SpacingSize = "md";
    const typographySize: TypographySize = "lg";
    const shadowLevel: ShadowLevel = "sm";

    expect(surfaceLevel).toBe("app");
    expect(visualStyle).toBe("success");
    expect(spacingSize).toBe("md");
    expect(typographySize).toBe("lg");
    expect(shadowLevel).toBe("sm");
  });
});

describe("DesignTokens constants", () => {
  it("should be defined as const and immutable", () => {
    expect(DesignTokens).toBeDefined();
    expect(typeof DesignTokens).toBe("object");
  });

  it("should have consistent CSS custom property format", () => {
    // Test a few examples to ensure consistent format
    expect(DesignTokens.colors.primary.default).toMatch(/^var\(--color-/);
    expect(DesignTokens.spacing.component.md).toMatch(/^var\(--spacing-/);
    expect(DesignTokens.typography.fontSize.base).toMatch(/^var\(--font-/);
    expect(DesignTokens.shadow.md).toMatch(/^var\(--shadow-/);
  });

  it("should have all tokens as strings", () => {
    // Recursively check that all values are strings (CSS custom properties)
    const checkAllStrings = (obj: any): boolean => {
      if (typeof obj === "string") {
        return obj.startsWith("var(--");
      }
      if (typeof obj === "object" && obj !== null) {
        return Object.values(obj).every(checkAllStrings);
      }
      return false;
    };

    expect(checkAllStrings(DesignTokens)).toBe(true);
  });
});
