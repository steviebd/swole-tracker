import { describe, it, expect } from "vitest";
import {
  contrastRatio,
  meetsWcagAA,
  relativeLuminance,
} from "~/lib/a11y/contrast";

describe("contrast utilities", () => {
  describe("relativeLuminance", () => {
    it("calculates relative luminance for white", () => {
      expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 3);
    });

    it("calculates relative luminance for black", () => {
      expect(relativeLuminance("#000000")).toBeCloseTo(0, 3);
    });

    it("calculates relative luminance for red", () => {
      expect(relativeLuminance("#ff0000")).toBeCloseTo(0.2126, 3);
    });

    it("handles 3-digit hex codes", () => {
      expect(relativeLuminance("#fff")).toBeCloseTo(1, 3);
      expect(relativeLuminance("#000")).toBeCloseTo(0, 3);
    });

    it("throws error for invalid hex", () => {
      expect(() => relativeLuminance("invalid")).toThrow();
      expect(() => relativeLuminance("#gggggg")).toThrow();
    });
  });

  describe("contrastRatio", () => {
    it("calculates contrast ratio between black and white", () => {
      expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    });

    it("calculates contrast ratio between white and black", () => {
      expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
    });

    it("calculates contrast ratio between same colors", () => {
      expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 1);
    });
  });

  describe("meetsWcagAA", () => {
    it("returns true for high contrast colors", () => {
      expect(meetsWcagAA("#000000", "#ffffff")).toBe(true);
    });

    it("returns false for low contrast colors", () => {
      expect(meetsWcagAA("#ffffff", "#fafafa")).toBe(false);
    });

    it("accepts custom minimum ratio", () => {
      expect(meetsWcagAA("#ffffff", "#fafafa", 1)).toBe(true);
    });
  });
});
