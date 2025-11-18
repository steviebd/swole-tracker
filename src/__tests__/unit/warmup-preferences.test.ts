import { describe, it, expect } from "vitest";
import {
  warmupSetDataSchema,
  warmupPatternSchema,
  warmupPreferencesSchema,
  warmupDetectionOptionsSchema,
  exerciseSetSchema,
  volumeBreakdownSchema,
} from "~/server/api/schemas/warmup";

describe("Warm-Up Preferences Schemas", () => {
  describe("warmupSetDataSchema", () => {
    it("should validate valid warm-up set data", () => {
      const validSet = {
        setNumber: 1,
        weight: 60,
        reps: 5,
        percentageOfTop: 0.6,
      };

      const result = warmupSetDataSchema.safeParse(validSet);
      expect(result.success).toBe(true);
    });

    it("should accept set without percentageOfTop", () => {
      const validSet = {
        setNumber: 2,
        weight: 80,
        reps: 5,
      };

      const result = warmupSetDataSchema.safeParse(validSet);
      expect(result.success).toBe(true);
    });

    it("should reject negative weight", () => {
      const invalidSet = {
        setNumber: 1,
        weight: -10,
        reps: 5,
      };

      const result = warmupSetDataSchema.safeParse(invalidSet);
      expect(result.success).toBe(false);
    });

    it("should reject zero reps", () => {
      const invalidSet = {
        setNumber: 1,
        weight: 60,
        reps: 0,
      };

      const result = warmupSetDataSchema.safeParse(invalidSet);
      expect(result.success).toBe(false);
    });

    it("should reject percentage outside 0-1 range", () => {
      const invalidSet = {
        setNumber: 1,
        weight: 60,
        reps: 5,
        percentageOfTop: 1.5, // > 1
      };

      const result = warmupSetDataSchema.safeParse(invalidSet);
      expect(result.success).toBe(false);
    });
  });

  describe("warmupPatternSchema", () => {
    it("should validate complete pattern", () => {
      const validPattern = {
        confidence: "high" as const,
        sets: [
          { setNumber: 1, weight: 40, reps: 5, percentageOfTop: 0.4 },
          { setNumber: 2, weight: 60, reps: 5, percentageOfTop: 0.6 },
        ],
        source: "history" as const,
        sessionCount: 5,
      };

      const result = warmupPatternSchema.safeParse(validPattern);
      expect(result.success).toBe(true);
    });

    it("should reject invalid confidence level", () => {
      const invalidPattern = {
        confidence: "super-high", // Not a valid enum
        sets: [],
        source: "history",
        sessionCount: 0,
      };

      const result = warmupPatternSchema.safeParse(invalidPattern);
      expect(result.success).toBe(false);
    });

    it("should reject invalid source", () => {
      const invalidPattern = {
        confidence: "low",
        sets: [],
        source: "ai", // Not a valid enum
        sessionCount: 0,
      };

      const result = warmupPatternSchema.safeParse(invalidPattern);
      expect(result.success).toBe(false);
    });
  });

  describe("warmupPreferencesSchema", () => {
    it("should validate with defaults", () => {
      const minimalPrefs = {
        strategy: "history" as const,
      };

      const result = warmupPreferencesSchema.safeParse(minimalPrefs);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.setsCount).toBe(3);
        expect(result.data.percentages).toEqual([40, 60, 80]);
        expect(result.data.repsStrategy).toBe("match_working");
        expect(result.data.fixedReps).toBe(5);
      }
    });

    it("should validate percentage strategy", () => {
      const prefs = {
        strategy: "percentage" as const,
        setsCount: 4,
        percentages: [30, 50, 70, 90],
        repsStrategy: "descending" as const,
      };

      const result = warmupPreferencesSchema.safeParse(prefs);
      expect(result.success).toBe(true);
    });

    it("should validate fixed strategy", () => {
      const prefs = {
        strategy: "fixed" as const,
        setsCount: 2,
        repsStrategy: "fixed" as const,
        fixedReps: 8,
      };

      const result = warmupPreferencesSchema.safeParse(prefs);
      expect(result.success).toBe(true);
    });

    it("should reject setsCount > 5", () => {
      const prefs = {
        strategy: "percentage" as const,
        setsCount: 10,
      };

      const result = warmupPreferencesSchema.safeParse(prefs);
      expect(result.success).toBe(false);
    });

    it("should reject percentages > 95", () => {
      const prefs = {
        strategy: "percentage" as const,
        percentages: [40, 60, 100], // 100 is too high
      };

      const result = warmupPreferencesSchema.safeParse(prefs);
      expect(result.success).toBe(false);
    });

    it("should reject percentages < 20", () => {
      const prefs = {
        strategy: "percentage" as const,
        percentages: [10, 50, 80], // 10 is too low
      };

      const result = warmupPreferencesSchema.safeParse(prefs);
      expect(result.success).toBe(false);
    });
  });

  describe("warmupDetectionOptionsSchema", () => {
    it("should validate required fields", () => {
      const validOptions = {
        userId: "user-123",
        exerciseName: "Bench Press",
        targetWorkingWeight: 100,
        targetWorkingReps: 5,
      };

      const result = warmupDetectionOptionsSchema.safeParse(validOptions);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.minSessions).toBe(2);
        expect(result.data.lookbackSessions).toBe(10);
      }
    });

    it("should accept custom minSessions and lookbackSessions", () => {
      const options = {
        userId: "user-123",
        exerciseName: "Squat",
        targetWorkingWeight: 150,
        targetWorkingReps: 3,
        minSessions: 5,
        lookbackSessions: 20,
      };

      const result = warmupDetectionOptionsSchema.safeParse(options);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.minSessions).toBe(5);
        expect(result.data.lookbackSessions).toBe(20);
      }
    });

    it("should reject negative weights", () => {
      const options = {
        userId: "user-123",
        exerciseName: "Bench Press",
        targetWorkingWeight: -50,
        targetWorkingReps: 5,
      };

      const result = warmupDetectionOptionsSchema.safeParse(options);
      expect(result.success).toBe(false);
    });
  });

  describe("exerciseSetSchema", () => {
    it("should validate complete exercise set", () => {
      const validSet = {
        id: crypto.randomUUID(),
        sessionExerciseId: 123,
        userId: "user-abc",
        setNumber: 1,
        setType: "warmup" as const,
        weight: 60,
        reps: 5,
        rpe: 7,
        restSeconds: 60,
        completed: true,
      };

      const result = exerciseSetSchema.safeParse(validSet);
      expect(result.success).toBe(true);
    });

    it("should validate minimal exercise set", () => {
      const minimalSet = {
        sessionExerciseId: 456,
        userId: "user-xyz",
        setNumber: 2,
        weight: 100,
        reps: 5,
      };

      const result = exerciseSetSchema.safeParse(minimalSet);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.setType).toBe("working");
        expect(result.data.completed).toBe(false);
      }
    });

    it("should accept null weight for bodyweight exercises", () => {
      const bodyweightSet = {
        sessionExerciseId: 789,
        userId: "user-123",
        setNumber: 1,
        weight: null,
        reps: 10,
      };

      const result = exerciseSetSchema.safeParse(bodyweightSet);
      expect(result.success).toBe(true);
    });

    it("should reject RPE outside 1-10 range", () => {
      const invalidSet = {
        sessionExerciseId: 100,
        userId: "user-123",
        setNumber: 1,
        weight: 100,
        reps: 5,
        rpe: 11, // Too high
      };

      const result = exerciseSetSchema.safeParse(invalidSet);
      expect(result.success).toBe(false);
    });

    it("should validate all setType enums", () => {
      const setTypes = ["warmup", "working", "backoff", "drop"] as const;

      setTypes.forEach((setType) => {
        const set = {
          sessionExerciseId: 100,
          userId: "user-123",
          setNumber: 1,
          weight: 100,
          reps: 5,
          setType,
        };

        const result = exerciseSetSchema.safeParse(set);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("volumeBreakdownSchema", () => {
    it("should validate complete volume breakdown", () => {
      const breakdown = {
        total: 2000,
        working: 1500,
        warmup: 500,
        backoff: 0,
        drop: 0,
      };

      const result = volumeBreakdownSchema.safeParse(breakdown);
      expect(result.success).toBe(true);
    });

    it("should reject negative volumes", () => {
      const breakdown = {
        total: 2000,
        working: -100,
        warmup: 500,
        backoff: 0,
        drop: 0,
      };

      const result = volumeBreakdownSchema.safeParse(breakdown);
      expect(result.success).toBe(false);
    });

    it("should accept zero for all volume types", () => {
      const breakdown = {
        total: 0,
        working: 0,
        warmup: 0,
        backoff: 0,
        drop: 0,
      };

      const result = volumeBreakdownSchema.safeParse(breakdown);
      expect(result.success).toBe(true);
    });
  });
});
