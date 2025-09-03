import { describe, it, expect } from "vitest";
import {
  mapManualWellnessToWhoopMetrics,
  mapSubjectiveToWhoopMetrics,
  createWhoopDataWithDefaults,
  validateManualWellnessData,
  validateSubjectiveWellnessData,
  getManualWellnessLabels,
  getWellnessPresets,
  getSubjectiveWellnessLabels,
} from "~/lib/subjective-wellness-mapper";

describe("mapManualWellnessToWhoopMetrics", () => {
  it("should map manual wellness data to Whoop metrics correctly", () => {
    const manualData = {
      energyLevel: 8,
      sleepQuality: 7,
      deviceTimezone: "America/New_York",
    };

    const result = mapManualWellnessToWhoopMetrics(manualData);

    // Energy level 8 should map to ~77.78% (8-1)/9 * 100
    // Sleep quality 7 should map to ~66.67%
    // Recovery score = (77.78 * 0.7) + (66.67 * 0.3) = ~73.33, rounded to 73
    expect(result.recovery_score).toBe(74);
    expect(Math.round(result.sleep_performance!)).toBe(67); // Allow for floating point precision issues
    expect(result.hrv_now_ms).toBeUndefined();
    expect(result.rhr_now_bpm).toBeUndefined();
    expect(result.yesterday_strain).toBe(8); // Estimated based on energy level
  });

  it("should handle minimum values", () => {
    const manualData = {
      energyLevel: 1,
      sleepQuality: 1,
      deviceTimezone: "UTC",
    };

    const result = mapManualWellnessToWhoopMetrics(manualData);

    expect(result.recovery_score).toBe(0);
    expect(result.sleep_performance).toBe(0);
    expect(result.yesterday_strain).toBe(20); // Maximum strain for minimum energy
  });

  it("should handle maximum values", () => {
    const manualData = {
      energyLevel: 10,
      sleepQuality: 10,
      deviceTimezone: "UTC",
    };

    const result = mapManualWellnessToWhoopMetrics(manualData);

    expect(result.recovery_score).toBe(100);
    expect(result.sleep_performance).toBe(100);
    expect(result.yesterday_strain).toBe(5); // Minimum strain for maximum energy
  });
});

describe("mapSubjectiveToWhoopMetrics", () => {
  it("should map subjective wellness data to Whoop metrics correctly", () => {
    const subjectiveData = {
      energyLevel: 8,
      sleepQuality: 7,
      recoveryFeeling: 9,
      stressLevel: 3,
    };

    const result = mapSubjectiveToWhoopMetrics(subjectiveData);

    // Complex calculation with 4 inputs
    expect(result.recovery_score).toBeDefined();
    expect(result.sleep_performance).toBeDefined();
    expect(result.hrv_now_ms).toBeUndefined();
    expect(result.rhr_now_bpm).toBeUndefined();
    expect(result.yesterday_strain).toBeDefined();
  });

  it("should handle stress level inversion correctly", () => {
    const highStressData = {
      energyLevel: 5,
      sleepQuality: 5,
      recoveryFeeling: 5,
      stressLevel: 10, // High stress should reduce recovery score
    };

    const lowStressData = {
      energyLevel: 5,
      sleepQuality: 5,
      recoveryFeeling: 5,
      stressLevel: 1, // Low stress should improve recovery score
    };

    const highStressResult = mapSubjectiveToWhoopMetrics(highStressData);
    const lowStressResult = mapSubjectiveToWhoopMetrics(lowStressData);

    expect(
      lowStressResult.recovery_score! > highStressResult.recovery_score!,
    ).toBe(true);
  });
});

describe("createWhoopDataWithDefaults", () => {
  it("should create Whoop data with defaults", () => {
    const subjectiveData = {
      energyLevel: 7,
      sleepQuality: 8,
      recoveryFeeling: 6,
      stressLevel: 4,
    };

    const result = createWhoopDataWithDefaults(subjectiveData);

    expect(result.recovery_score).toBeDefined();
    expect(result.sleep_performance).toBeDefined();
    expect(result.hrv_now_ms).toBeUndefined();
    expect(result.hrv_baseline_ms).toBeUndefined();
    expect(result.rhr_now_bpm).toBeUndefined();
    expect(result.rhr_baseline_bpm).toBeUndefined();
    expect(result.yesterday_strain).toBeDefined();
  });
});

describe("validateManualWellnessData", () => {
  it("should validate correct manual wellness data", () => {
    const validData = {
      energyLevel: 7,
      sleepQuality: 8,
      deviceTimezone: "America/New_York",
      notes: "Feeling good today",
    };

    expect(validateManualWellnessData(validData)).toBe(true);
  });

  it("should reject invalid energy level", () => {
    const invalidData = {
      energyLevel: 15, // Invalid: > 10
      sleepQuality: 8,
      deviceTimezone: "UTC",
    };

    expect(validateManualWellnessData(invalidData)).toBe(false);
  });

  it("should reject invalid sleep quality", () => {
    const invalidData = {
      energyLevel: 7,
      sleepQuality: 0, // Invalid: < 1
      deviceTimezone: "UTC",
    };

    expect(validateManualWellnessData(invalidData)).toBe(false);
  });

  it("should reject missing device timezone", () => {
    const invalidData = {
      energyLevel: 7,
      sleepQuality: 8,
      // deviceTimezone missing
    };

    expect(validateManualWellnessData(invalidData)).toBe(false);
  });

  it("should reject notes that are too long", () => {
    const longNotes = "a".repeat(501);
    const invalidData = {
      energyLevel: 7,
      sleepQuality: 8,
      deviceTimezone: "UTC",
      notes: longNotes,
    };

    expect(validateManualWellnessData(invalidData)).toBe(false);
  });

  it("should accept data without notes", () => {
    const validData = {
      energyLevel: 7,
      sleepQuality: 8,
      deviceTimezone: "UTC",
    };

    expect(validateManualWellnessData(validData)).toBe(true);
  });
});

describe("validateSubjectiveWellnessData", () => {
  it("should validate correct subjective wellness data", () => {
    const validData = {
      energyLevel: 7,
      sleepQuality: 8,
      recoveryFeeling: 6,
      stressLevel: 4,
    };

    expect(validateSubjectiveWellnessData(validData)).toBe(true);
  });

  it("should reject incomplete data", () => {
    const invalidData = {
      energyLevel: 7,
      sleepQuality: 8,
      // missing recoveryFeeling and stressLevel
    };

    expect(validateSubjectiveWellnessData(invalidData)).toBe(false);
  });

  it("should reject out of range values", () => {
    const invalidData = {
      energyLevel: 7,
      sleepQuality: 8,
      recoveryFeeling: 15, // Invalid: > 10
      stressLevel: 4,
    };

    expect(validateSubjectiveWellnessData(invalidData)).toBe(false);
  });
});

describe("getManualWellnessLabels", () => {
  it("should return labels for manual wellness inputs", () => {
    const labels = getManualWellnessLabels();

    expect(labels.energyLevel).toHaveProperty("1", "Completely Drained");
    expect(labels.energyLevel).toHaveProperty("10", "Peak Energy");
    expect(labels.sleepQuality).toHaveProperty("1", "Terrible Sleep");
    expect(labels.sleepQuality).toHaveProperty("10", "Perfect Sleep");
  });
});

describe("getWellnessPresets", () => {
  it("should return wellness presets", () => {
    const presets = getWellnessPresets();

    expect(presets.greatDay).toEqual({
      energyLevel: 8,
      sleepQuality: 8,
      label: "🌟 Great Day",
      description: "High energy, great sleep",
    });

    expect(presets.averageDay).toEqual({
      energyLevel: 6,
      sleepQuality: 6,
      label: "😐 Average Day",
      description: "Normal energy, decent sleep",
    });

    expect(presets.toughDay).toEqual({
      energyLevel: 3,
      sleepQuality: 4,
      label: "😴 Tough Day",
      description: "Low energy, poor sleep",
    });
  });
});

describe("getSubjectiveWellnessLabels", () => {
  it("should return labels for subjective wellness inputs", () => {
    const labels = getSubjectiveWellnessLabels();

    expect(labels.energyLevel).toHaveProperty("1", "Completely Drained");
    expect(labels.energyLevel).toHaveProperty("10", "Peak Energy");
    expect(labels.sleepQuality).toHaveProperty("1", "Terrible Sleep");
    expect(labels.sleepQuality).toHaveProperty("10", "Perfect Sleep");
    expect(labels.recoveryFeeling).toHaveProperty("1", "Not Recovered");
    expect(labels.recoveryFeeling).toHaveProperty("10", "Fully Recovered");
    expect(labels.stressLevel).toHaveProperty("1", "No Stress");
    expect(labels.stressLevel).toHaveProperty("10", "Overwhelming Stress");
  });
});
