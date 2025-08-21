import { describe, it, expect } from "vitest";
import {
  clip,
  calculateReadiness,
  calculateOverloadMultiplier,
  roundToIncrement,
} from "~/lib/health-calculations";
import type { WhoopMetrics } from "~/server/api/schemas/health-advice";

describe("clip function", () => {
  it("should return value when within bounds", () => {
    expect(clip(5, 0, 10)).toBe(5);
    expect(clip(0, 0, 10)).toBe(0);
    expect(clip(10, 0, 10)).toBe(10);
  });

  it("should clip values below minimum", () => {
    expect(clip(-5, 0, 10)).toBe(0);
    expect(clip(-1, 0, 10)).toBe(0);
  });

  it("should clip values above maximum", () => {
    expect(clip(15, 0, 10)).toBe(10);
    expect(clip(11, 0, 10)).toBe(10);
  });
});

describe("calculateReadiness function", () => {
  const baseWhoop: WhoopMetrics = {
    recovery_score: 80,
    sleep_performance: 70,
    hrv_now_ms: 50,
    hrv_baseline_ms: 45,
    rhr_now_bpm: 60,
    rhr_baseline_bpm: 55,
    yesterday_strain: 12,
  };

  it("should calculate readiness with complete data", () => {
    const result = calculateReadiness(baseWhoop);
    expect(result.rho).toBeGreaterThan(0);
    expect(result.rho).toBeLessThanOrEqual(1);
    expect(result.flags).toContain("good_recovery");
    // Note: sleep_performance of 70 doesn't trigger "good_sleep" flag (needs >= 80)
  });

  it("should handle missing HRV data", () => {
    const whoop = {
      ...baseWhoop,
      hrv_now_ms: undefined,
      hrv_baseline_ms: undefined,
    };
    const result = calculateReadiness(whoop);
    expect(result.flags).toContain("missing_hrv");
  });

  it("should handle missing RHR data", () => {
    const whoop = {
      ...baseWhoop,
      rhr_now_bpm: undefined,
      rhr_baseline_bpm: undefined,
    };
    const result = calculateReadiness(whoop);
    expect(result.flags).toContain("missing_rhr");
  });

  it("should apply high strain penalty", () => {
    const whoop = { ...baseWhoop, yesterday_strain: 15 };
    const result = calculateReadiness(whoop);
    expect(result.flags).toContain("high_strain_yesterday");
  });

  it("should add descriptive flags for low scores", () => {
    const whoop = { ...baseWhoop, recovery_score: 50, sleep_performance: 40 };
    const result = calculateReadiness(whoop);
    expect(result.flags).toContain("low_recovery");
    expect(result.flags).toContain("poor_sleep");
  });

  it("should handle undefined values gracefully", () => {
    const whoop = {
      recovery_score: undefined,
      sleep_performance: undefined,
      hrv_now_ms: undefined,
      hrv_baseline_ms: undefined,
      rhr_now_bpm: undefined,
      rhr_baseline_bpm: undefined,
      yesterday_strain: undefined,
    };
    const result = calculateReadiness(whoop);
    expect(result.rho).toBe(0.65); // Should use fallback values and calculate based on defaults
    expect(result.flags).toContain("missing_hrv");
    expect(result.flags).toContain("missing_rhr");
  });
});

describe("calculateOverloadMultiplier function", () => {
  it("should calculate multiplier for different readiness levels", () => {
    expect(calculateOverloadMultiplier(0.8, "intermediate")).toBeCloseTo(
      1.09,
      2,
    );
    expect(calculateOverloadMultiplier(0.5, "intermediate")).toBeCloseTo(
      1.0,
      2,
    );
    expect(calculateOverloadMultiplier(0.2, "intermediate")).toBeCloseTo(
      0.91,
      2,
    );
  });

  it("should cap multiplier for beginners", () => {
    expect(calculateOverloadMultiplier(0.9, "beginner")).toBeCloseTo(1.05, 2);
    expect(calculateOverloadMultiplier(0.8, "beginner")).toBe(1.05); // Should be capped at 1.05
  });

  it("should handle edge cases", () => {
    expect(calculateOverloadMultiplier(1.0, "advanced")).toBeCloseTo(1.1, 2);
    expect(calculateOverloadMultiplier(0.0, "advanced")).toBeCloseTo(0.9, 2);
  });
});

describe("roundToIncrement function", () => {
  it("should round to default 2.5 increment", () => {
    expect(roundToIncrement(10)).toBe(10);
    expect(roundToIncrement(11)).toBe(10);
    expect(roundToIncrement(12.5)).toBe(12.5);
    expect(roundToIncrement(13)).toBe(12.5);
    expect(roundToIncrement(14)).toBe(15);
  });

  it("should round to custom increments", () => {
    expect(roundToIncrement(10, 5)).toBe(10);
    expect(roundToIncrement(12, 5)).toBe(10);
    expect(roundToIncrement(13, 5)).toBe(15);
    expect(roundToIncrement(7.5, 1)).toBe(8);
  });

  it("should handle edge cases", () => {
    expect(roundToIncrement(0)).toBe(0);
    expect(roundToIncrement(2.4)).toBe(2.5);
    expect(roundToIncrement(2.6)).toBe(2.5);
  });
});
