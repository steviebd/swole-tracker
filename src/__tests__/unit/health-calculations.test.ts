import { describe, it, expect } from "vitest";
import {
  clip,
  calculateReadiness,
  calculateOverloadMultiplier,
  roundToIncrement,
  calculateProgressionSuggestions,
} from "~/lib/health-calculations";
import type { WhoopMetrics } from "~/server/api/schemas/health-advice";

describe("clip function", () => {
  it("should return value when within bounds", () => {
    expect(clip(5, 0, 10)).toBe(5);
  });

  it("should return min when value is below min", () => {
    expect(clip(-5, 0, 10)).toBe(0);
  });

  it("should return max when value is above max", () => {
    expect(clip(15, 0, 10)).toBe(10);
  });

  it("should handle edge cases", () => {
    expect(clip(0, 0, 10)).toBe(0);
    expect(clip(10, 0, 10)).toBe(10);
  });
});

describe("calculateReadiness function", () => {
  const baseWhoopMetrics: WhoopMetrics = {
    recovery_score: 80,
    sleep_performance: 85,
    hrv_now_ms: 50,
    hrv_baseline_ms: 45,
    rhr_now_bpm: 60,
    rhr_baseline_bpm: 65,
    yesterday_strain: 12,
  };

  it("should calculate readiness with complete data", () => {
    const result = calculateReadiness(baseWhoopMetrics);

    expect(result.rho).toBeGreaterThan(0);
    expect(result.rho).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.flags)).toBe(true);
  });

  it("should handle missing HRV data", () => {
    const metrics = {
      ...baseWhoopMetrics,
      hrv_now_ms: undefined,
      hrv_baseline_ms: undefined,
    };
    const result = calculateReadiness(metrics);

    expect(result.flags).toContain("missing_hrv");
  });

  it("should handle missing RHR data", () => {
    const metrics = {
      ...baseWhoopMetrics,
      rhr_now_bpm: undefined,
      rhr_baseline_bpm: undefined,
    };
    const result = calculateReadiness(metrics);

    expect(result.flags).toContain("missing_rhr");
  });

  it("should add descriptive flags for good recovery", () => {
    const metrics = { ...baseWhoopMetrics, recovery_score: 85 };
    const result = calculateReadiness(metrics);

    expect(result.flags).toContain("good_recovery");
  });

  it("should add descriptive flags for poor sleep", () => {
    const metrics = { ...baseWhoopMetrics, sleep_performance: 55 };
    const result = calculateReadiness(metrics);

    expect(result.flags).toContain("poor_sleep");
  });

  it("should adjust for high yesterday strain", () => {
    const metrics = { ...baseWhoopMetrics, yesterday_strain: 16 };
    const result = calculateReadiness(metrics);

    expect(result.flags).toContain("high_strain_yesterday");
  });

  it("should handle undefined values gracefully", () => {
    const metrics = {
      recovery_score: undefined,
      sleep_performance: undefined,
      hrv_now_ms: undefined,
      hrv_baseline_ms: undefined,
      rhr_now_bpm: undefined,
      rhr_baseline_bpm: undefined,
      yesterday_strain: undefined,
    };
    const result = calculateReadiness(metrics);

    expect(result.rho).toBeGreaterThan(0);
    expect(result.flags).toContain("missing_hrv");
    expect(result.flags).toContain("missing_rhr");
  });
});

describe("calculateOverloadMultiplier function", () => {
  it("should calculate multiplier for high readiness", () => {
    const result = calculateOverloadMultiplier(0.8, "intermediate");
    expect(result).toBeGreaterThan(1);
  });

  it("should calculate multiplier for low readiness", () => {
    const result = calculateOverloadMultiplier(0.3, "intermediate");
    expect(result).toBeLessThan(1);
  });

  it("should cap multiplier for beginners", () => {
    const result = calculateOverloadMultiplier(0.9, "beginner");
    expect(result).toBeLessThanOrEqual(1.05);
  });

  it("should handle edge cases", () => {
    expect(calculateOverloadMultiplier(0, "intermediate")).toBe(0.9);
    expect(calculateOverloadMultiplier(1, "intermediate")).toBe(1.1);
  });
});

describe("roundToIncrement function", () => {
  it("should round to nearest increment", () => {
    expect(roundToIncrement(7.3, 2.5)).toBe(7.5);
    expect(roundToIncrement(7.6, 2.5)).toBe(7.5);
    expect(roundToIncrement(7.8, 2.5)).toBe(7.5);
  });

  it("should use default increment of 2.5", () => {
    expect(roundToIncrement(7.3)).toBe(7.5);
  });

  it("should handle exact values", () => {
    expect(roundToIncrement(10, 2.5)).toBe(10);
  });

  it("should handle different increments", () => {
    expect(roundToIncrement(7.3, 1)).toBe(7);
    expect(roundToIncrement(7.6, 1)).toBe(8);
  });
});

describe("calculateProgressionSuggestions function", () => {
  const mockExerciseHistory = [
    {
      exerciseName: "Bench Press",
      sessions: [
        {
          workoutDate: new Date("2024-01-15"),
          sets: [
            { weight: 80, reps: 8, volume: 640 },
            { weight: 80, reps: 8, volume: 640 },
            { weight: 80, reps: 6, volume: 480 },
          ],
        },
        {
          workoutDate: new Date("2024-01-08"),
          sets: [
            { weight: 77.5, reps: 8, volume: 620 },
            { weight: 77.5, reps: 8, volume: 620 },
            { weight: 77.5, reps: 7, volume: 542.5 },
          ],
        },
      ],
    },
  ];

  it("should suggest linear progression", () => {
    const result = calculateProgressionSuggestions(
      mockExerciseHistory,
      0.8,
      "linear",
      { linearIncrement: 2.5 },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBeDefined();
    expect(result[0]!.exerciseName).toBe("Bench Press");
    expect(result[0]!.suggestions[0]!.type).toBe("weight");
    expect(result[0]!.suggestions[0]!.suggested).toBe(82.5);
  });

  it("should suggest percentage progression", () => {
    const result = calculateProgressionSuggestions(
      mockExerciseHistory,
      0.8,
      "percentage",
      { percentageIncrement: 5 },
    );

    expect(result[0]!.suggestions[0]!.suggested).toBe(85); // 80 * 1.05 = 84, rounded to 2.5 increment = 85
  });

  it("should suggest adaptive progression with good readiness", () => {
    const result = calculateProgressionSuggestions(
      mockExerciseHistory,
      0.8,
      "adaptive",
    );

    expect(result[0]!.suggestions[0]!.type).toBe("weight");
    expect(result[0]!.suggestions[0]!.suggested).toBeGreaterThan(80);
  });

  it("should suggest deload when plateau detected and low readiness", () => {
    const plateauHistory = [
      {
        exerciseName: "Bench Press",
        sessions: [
          {
            workoutDate: new Date("2024-01-15"),
            sets: [{ weight: 80, reps: 8, volume: 640 }],
          },
          {
            workoutDate: new Date("2024-01-08"),
            sets: [
              { weight: 80, reps: 8, volume: 640 }, // Same volume = plateau
            ],
          },
        ],
      },
    ];

    const result = calculateProgressionSuggestions(
      plateauHistory,
      0.4,
      "adaptive",
    );

    expect(result[0]!.plateauDetected).toBe(true);
    expect(result[0]!.suggestions[0]!.suggested).toBeLessThan(80);
  });

  it("should handle empty exercise history", () => {
    const result = calculateProgressionSuggestions(
      [
        {
          exerciseName: "New Exercise",
          sessions: [],
        },
      ],
      0.8,
      "adaptive",
    );

    expect(result[0]!.suggestions[0]!.suggested).toBe(20);
    expect(result[0]!.suggestions[0]!.rationale).toContain(
      "No historical data",
    );
  });

  it("should handle sessions with no sets", () => {
    const result = calculateProgressionSuggestions(
      [
        {
          exerciseName: "Bench Press",
          sessions: [
            {
              workoutDate: new Date(),
              sets: [],
            },
          ],
        },
      ],
      0.8,
      "adaptive",
    );

    expect(result[0]!.suggestions).toHaveLength(0);
  });

  it("should suggest rep progression when appropriate", () => {
    const result = calculateProgressionSuggestions(
      mockExerciseHistory,
      0.6,
      "adaptive",
      { progressionModel: "reps" },
    );

    expect(result[0]!.suggestions[0]!.type).toBe("reps");
    expect(result[0]!.suggestions[0]!.suggested).toBe(9);
  });
});
