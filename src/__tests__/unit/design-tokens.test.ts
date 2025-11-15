import { describe, it, expect } from "vitest";
import {
  getSemanticTokens,
  getScheme,
  colors,
  materialThemes,
  materialSchemes,
  surfaceTokens,
  typography,
  spacing,
  motion,
  shape,
  stateLayerOpacity,
  themeMeta,
} from "~/lib/design-tokens";

describe("Design Tokens", () => {
  describe("getSemanticTokens", () => {
    it("should return semantic tokens for light theme", () => {
      const result = getSemanticTokens("light", "light");
      expect(result.scheme).toBeDefined();
      expect(result.surfaces).toBeDefined();
      expect(result.surfaces.surface).toBeDefined();
    });

    it("should use default scheme when not provided", () => {
      const result = getSemanticTokens("light");
      expect(result.scheme).toBeDefined();
    });
  });

  describe("getScheme", () => {
    it("should return scheme for theme and kind", () => {
      const result = getScheme("light", "light");
      expect(result).toBeDefined();
      expect(typeof result["primary"]).toBe("string");
    });
  });

  describe("colors", () => {
    it("should have primary color scale", () => {
      expect(colors.primary).toBeDefined();
      expect(colors.primary[500]).toBeDefined();
    });

    it("should have success colors", () => {
      expect(colors.success[500]).toBeDefined();
      expect(colors.success[600]).toBeDefined();
    });
  });

  describe("materialThemes", () => {
    it("should have light theme", () => {
      expect(materialThemes.light).toBeDefined();
      expect(materialThemes.light.palettes["primary"]).toBeDefined();
    });
  });

  describe("materialSchemes", () => {
    it("should have schemes for all themes", () => {
      expect(materialSchemes.light.light).toBeDefined();
      expect(materialSchemes.dark.dark).toBeDefined();
    });
  });

  describe("surfaceTokens", () => {
    it("should have surface tokens for themes", () => {
      expect(surfaceTokens.light.light).toBeDefined();
      expect(surfaceTokens.light.light.surface).toBeDefined();
    });
  });

  describe("typography", () => {
    it("should have font families", () => {
      expect(typography.fontFamily.display).toBeDefined();
      expect(typography.fontSize).toBeDefined();
    });
  });

  describe("spacing", () => {
    it("should have spacing values", () => {
      expect(spacing[1]).toBe("8px");
      expect(spacing.md).toBe("24px");
    });
  });

  describe("motion", () => {
    it("should have duration and easing", () => {
      expect(motion.duration.fast).toBe("150ms");
      expect(motion.easing.easeOut).toBeDefined();
    });
  });

  describe("shape", () => {
    it("should have radius values", () => {
      expect(shape.radius.sm).toBeDefined();
    });
  });

  describe("stateLayerOpacity", () => {
    it("should have opacity values", () => {
      expect(stateLayerOpacity.hover).toBe(0.08);
      expect(stateLayerOpacity.pressed).toBe(0.12);
    });
  });

  describe("themeMeta", () => {
    it("should have theme metadata", () => {
      expect(themeMeta.defaultScheme).toBeDefined();
      expect(themeMeta.tones).toBeDefined();
    });
  });
});
