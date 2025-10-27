import { describe, it, expect } from "vitest";
import {
  toNumber,
  formatPercentage,
  formatMinutes,
  getRecoveryDescriptor,
  getStrainEmoji,
  getTrainingRecommendation,
  buildZoneBreakdown,
  getWorkoutStrain,
  getWorkoutAverageHeartRate,
  getWorkoutDurationMinutes,
} from "~/lib/whoop-metrics";

describe("whoop metrics utilities", () => {
  describe("toNumber", () => {
    it("returns number as-is if finite", () => {
      expect(toNumber(42)).toBe(42);
      expect(toNumber(3.14)).toBe(3.14);
      expect(toNumber(0)).toBe(0);
    });

    it("returns null for non-finite numbers", () => {
      expect(toNumber(NaN)).toBe(null);
      expect(toNumber(Infinity)).toBe(null);
      expect(toNumber(-Infinity)).toBe(null);
    });

    it("parses valid string numbers", () => {
      expect(toNumber("42")).toBe(42);
      expect(toNumber("3.14")).toBe(3.14);
      expect(toNumber("0")).toBe(0);
    });

    it("returns null for invalid string numbers", () => {
      expect(toNumber("")).toBe(null);
      expect(toNumber("   ")).toBe(null);
      expect(toNumber("not-a-number")).toBe(null);
      expect(toNumber("NaN")).toBe(null);
    });

    it("returns null for non-number types", () => {
      expect(toNumber(null)).toBe(null);
      expect(toNumber(undefined)).toBe(null);
      expect(toNumber(true)).toBe(null);
      expect(toNumber(false)).toBe(null);
      expect(toNumber({})).toBe(null);
      expect(toNumber([])).toBe(null);
    });
  });

  describe("formatPercentage", () => {
    it("formats number as percentage", () => {
      expect(formatPercentage(75)).toBe("75%");
      expect(formatPercentage(0)).toBe("0%");
      expect(formatPercentage(100)).toBe("100%");
    });

    it("rounds to nearest integer", () => {
      expect(formatPercentage(75.4)).toBe("75%");
      expect(formatPercentage(75.6)).toBe("76%");
    });

    it("returns '--' for null", () => {
      expect(formatPercentage(null)).toBe("--");
    });
  });

  describe("formatMinutes", () => {
    it("formats minutes under 60", () => {
      expect(formatMinutes(30)).toBe("30m");
      expect(formatMinutes(5)).toBe("5m");
    });

    it("formats hours and minutes", () => {
      expect(formatMinutes(90)).toBe("1h 30m");
      expect(formatMinutes(60)).toBe("1h 0m");
      expect(formatMinutes(125)).toBe("2h 5m");
    });

    it("rounds to nearest minute", () => {
      expect(formatMinutes(30.4)).toBe("30m");
      expect(formatMinutes(30.6)).toBe("31m");
    });

    it("returns '--' for null", () => {
      expect(formatMinutes(null)).toBe("--");
    });
  });

  describe("getRecoveryDescriptor", () => {
    it("returns no data descriptor for null", () => {
      const result = getRecoveryDescriptor(null);
      expect(result).toEqual({
        emoji: "⚪️",
        color: "var(--color-muted)",
        message: "No recovery data yet",
      });
    });

    it("returns high recovery for score >= 67", () => {
      const result = getRecoveryDescriptor(67);
      expect(result).toEqual({
        emoji: "🟢",
        color: "var(--color-success)",
        message: "You're primed for a hard session",
      });

      const result2 = getRecoveryDescriptor(100);
      expect(result2).toEqual({
        emoji: "🟢",
        color: "var(--color-success)",
        message: "You're primed for a hard session",
      });
    });

    it("returns moderate recovery for score >= 34 and < 67", () => {
      const result = getRecoveryDescriptor(34);
      expect(result).toEqual({
        emoji: "🟡",
        color: "var(--color-warning)",
        message: "Dial intensity to a manageable level",
      });

      const result2 = getRecoveryDescriptor(50);
      expect(result2).toEqual({
        emoji: "🟡",
        color: "var(--color-warning)",
        message: "Dial intensity to a manageable level",
      });
    });

    it("returns low recovery for score < 34", () => {
      const result = getRecoveryDescriptor(33);
      expect(result).toEqual({
        emoji: "🔴",
        color: "var(--color-danger)",
        message: "Prioritise recovery work today",
      });

      const result2 = getRecoveryDescriptor(0);
      expect(result2).toEqual({
        emoji: "🔴",
        color: "var(--color-danger)",
        message: "Prioritise recovery work today",
      });
    });
  });

  describe("getStrainEmoji", () => {
    it("returns relaxed emoji for null", () => {
      expect(getStrainEmoji(null)).toBe("😌");
    });

    it("returns fire emoji for strain >= 18", () => {
      expect(getStrainEmoji(18)).toBe("🔥");
      expect(getStrainEmoji(25)).toBe("🔥");
    });

    it("returns lightning emoji for strain >= 14 and < 18", () => {
      expect(getStrainEmoji(14)).toBe("⚡");
      expect(getStrainEmoji(17)).toBe("⚡");
    });

    it("returns muscle emoji for strain >= 10 and < 14", () => {
      expect(getStrainEmoji(10)).toBe("💪");
      expect(getStrainEmoji(13)).toBe("💪");
    });

    it("returns smile emoji for strain < 10", () => {
      expect(getStrainEmoji(9)).toBe("🙂");
      expect(getStrainEmoji(0)).toBe("🙂");
    });
  });

  describe("getTrainingRecommendation", () => {
    it("returns no data message for null", () => {
      expect(getTrainingRecommendation(null)).toBe(
        "We need fresh recovery data to tailor training intensity. Run a WHOOP sync to update.",
      );
    });

    it("returns high intensity recommendation for score >= 67", () => {
      expect(getTrainingRecommendation(67)).toBe(
        "Recovery is in the green. Plan heavy strength or high-intensity work while you’re fresh.",
      );
      expect(getTrainingRecommendation(100)).toBe(
        "Recovery is in the green. Plan heavy strength or high-intensity work while you’re fresh.",
      );
    });

    it("returns moderate intensity recommendation for score >= 34 and < 67", () => {
      expect(getTrainingRecommendation(34)).toBe(
        "Recovery is moderate. Keep today's work controlled and focus on quality movement.",
      );
      expect(getTrainingRecommendation(50)).toBe(
        "Recovery is moderate. Keep today's work controlled and focus on quality movement.",
      );
    });

    it("returns recovery recommendation for score < 34", () => {
      expect(getTrainingRecommendation(33)).toBe(
        "Recovery is in the red. Prioritise mobility, zone-2 cardio, or complete rest.",
      );
      expect(getTrainingRecommendation(0)).toBe(
        "Recovery is in the red. Prioritise mobility, zone-2 cardio, or complete rest.",
      );
    });
  });

  describe("buildZoneBreakdown", () => {
    it("returns empty array for invalid input", () => {
      expect(buildZoneBreakdown(null)).toEqual([]);
      expect(buildZoneBreakdown(undefined)).toEqual([]);
      expect(buildZoneBreakdown("string")).toEqual([]);
      expect(buildZoneBreakdown(42)).toEqual([]);
    });

    it("returns empty array when total is 0", () => {
      const zoneDuration = {
        zone_zero_milli: 0,
        zone_one_milli: 0,
        zone_two_milli: 0,
        zone_three_milli: 0,
        zone_four_milli: 0,
        zone_five_milli: 0,
      };
      expect(buildZoneBreakdown(zoneDuration)).toEqual([]);
    });

    it("builds zone breakdown with percentages", () => {
      const zoneDuration = {
        zone_zero_milli: 60000, // 1 minute
        zone_one_milli: 120000, // 2 minutes
        zone_two_milli: 0,
        zone_three_milli: 0,
        zone_four_milli: 0,
        zone_five_milli: 0,
      };

      const result = buildZoneBreakdown(zoneDuration);
      expect(result).toHaveLength(6);
      expect(result[0]).toEqual({
        label: "Zone 0",
        description: "Idle / warm-up",
        color: "var(--color-chart-1)",
        percentage: 33, // 1/3 of total
      });
      expect(result[1]).toEqual({
        label: "Zone 1",
        description: "50-60% (Recovery)",
        color: "var(--color-chart-2)",
        percentage: 67, // 2/3 of total
      });
    });
  });

  describe("getWorkoutStrain", () => {
    it("returns null for invalid input", () => {
      expect(getWorkoutStrain(null)).toBe(null);
      expect(getWorkoutStrain(undefined)).toBe(null);
      expect(getWorkoutStrain("string")).toBe(null);
      expect(getWorkoutStrain(42)).toBe(null);
    });

    it("returns null when score is missing", () => {
      const workout = { id: 1 };
      expect(getWorkoutStrain(workout)).toBe(null);
    });

    it("returns null when score.strain is invalid", () => {
      const workout = { score: { strain: "invalid" } };
      expect(getWorkoutStrain(workout)).toBe(null);
    });

    it("returns strain value when valid", () => {
      const workout = { score: { strain: 15.5 } };
      expect(getWorkoutStrain(workout)).toBe(15.5);
    });
  });

  describe("getWorkoutAverageHeartRate", () => {
    it("returns null for invalid input", () => {
      expect(getWorkoutAverageHeartRate(null)).toBe(null);
      expect(getWorkoutAverageHeartRate(undefined)).toBe(null);
      expect(getWorkoutAverageHeartRate("string")).toBe(null);
      expect(getWorkoutAverageHeartRate(42)).toBe(null);
    });

    it("returns average from score.average_heart_rate", () => {
      const workout = { score: { average_heart_rate: 150 } };
      expect(getWorkoutAverageHeartRate(workout)).toBe(150);
    });

    it("returns average from during.average_heart_rate when score is missing", () => {
      const workout = { during: { average_heart_rate: 140 } };
      expect(getWorkoutAverageHeartRate(workout)).toBe(140);
    });

    it("prefers score over during", () => {
      const workout = {
        score: { average_heart_rate: 150 },
        during: { average_heart_rate: 140 },
      };
      expect(getWorkoutAverageHeartRate(workout)).toBe(150);
    });
  });

  describe("getWorkoutDurationMinutes", () => {
    it("returns null when workout is undefined", () => {
      expect(getWorkoutDurationMinutes(undefined)).toBe(null);
    });

    it("returns null when start or end is missing", () => {
      expect(getWorkoutDurationMinutes({})).toBe(null);
      expect(getWorkoutDurationMinutes({ start: new Date() })).toBe(null);
      expect(getWorkoutDurationMinutes({ end: new Date() })).toBe(null);
    });

    it("calculates duration in minutes", () => {
      const start = new Date("2023-01-01T10:00:00Z");
      const end = new Date("2023-01-01T10:30:00Z"); // 30 minutes later
      expect(getWorkoutDurationMinutes({ start, end })).toBe(30);
    });

    it("handles string dates", () => {
      const start = "2023-01-01T10:00:00Z";
      const end = "2023-01-01T10:30:00Z";
      expect(getWorkoutDurationMinutes({ start, end })).toBe(30);
    });

    it("returns null for negative duration", () => {
      const start = new Date("2023-01-01T10:30:00Z");
      const end = new Date("2023-01-01T10:00:00Z"); // end before start
      expect(getWorkoutDurationMinutes({ start, end })).toBe(null);
    });
  });
});
