import { describe, it, expect } from "vitest";
import {
  buildWorkoutSummary,
  isWorkoutWithinHours,
  formatRelativeWorkoutDate,
  formatDurationLabel,
} from "~/lib/workout-metrics";

describe("Workout Metrics", () => {
  describe("buildWorkoutSummary", () => {
    it("should build summary for workout with exercises", () => {
      const workout = {
        id: 1,
        workoutDate: new Date(),
        templateId: null,
        createdAt: new Date(),
        exercises: [
          {
            id: 1,
            exerciseName: "Bench Press",
            templateExerciseId: null,
            setOrder: 1,
            sets: 3,
            reps: 10,
            weight: 100,
            unit: "kg",
            one_rm_estimate: null,
            volume_load: 3000,
          },
          {
            id: 2,
            exerciseName: "Squat",
            templateExerciseId: null,
            setOrder: 2,
            sets: 4,
            reps: 8,
            weight: 120,
            unit: "kg",
            one_rm_estimate: null,
            volume_load: 3840,
          },
        ],
        template: null,
      } as any;

      const result = buildWorkoutSummary(workout);
      expect(result.exerciseCount).toBe(2);
      expect(result.totalSets).toBe(7);
      expect(result.totalVolume).toBeGreaterThan(0);
      expect(result.volumeUnit).toBe("kg");
      expect(result.metrics.length).toBe(3);
    });

    it("should handle empty exercises", () => {
      const workout = {
        id: 1,
        workoutDate: new Date(),
        templateId: null,
        createdAt: new Date(),
        exercises: [],
        template: null,
      } as any;

      const result = buildWorkoutSummary(workout);
      expect(result.exerciseCount).toBe(0);
      expect(result.totalSets).toBe(0);
      expect(result.totalVolume).toBe(0);
      expect(result.metrics[0]!.label).toBe("—");
    });

    it("should convert units correctly", () => {
      const workout = {
        id: 1,
        workoutDate: new Date(),
        templateId: null,
        createdAt: new Date(),
        exercises: [
          {
            id: 1,
            exerciseName: "Bench",
            templateExerciseId: null,
            setOrder: 1,
            sets: 1,
            reps: 1,
            weight: 100,
            unit: "kg",
            one_rm_estimate: null,
            volume_load: null,
          },
          {
            id: 2,
            exerciseName: "Press",
            templateExerciseId: null,
            setOrder: 2,
            sets: 1,
            reps: 1,
            weight: 220,
            unit: "lbs",
            one_rm_estimate: null,
            volume_load: null,
          },
        ],
        template: null,
      } as any;

      const result = buildWorkoutSummary(workout);
      expect(result.volumeUnit).toBe("kg");
      expect(result.totalVolume).toBeCloseTo(100 + 220 / 2.2046226218);
    });

    it("should estimate duration when not provided", () => {
      const workout = {
        id: 1,
        workoutDate: new Date(),
        templateId: null,
        createdAt: new Date(),
        exercises: [
          {
            id: 1,
            exerciseName: "Bench",
            templateExerciseId: null,
            setOrder: 1,
            sets: 5,
            reps: 1,
            weight: 1,
            unit: "kg",
            one_rm_estimate: null,
            volume_load: null,
          },
        ],
        template: null,
      } as any;

      const result = buildWorkoutSummary(workout);
      expect(result.estimatedDurationMinutes).toBe(5 * 3.5);
    });
  });

  describe("isWorkoutWithinHours", () => {
    it("should return true for recent workout", () => {
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 12);
      const result = isWorkoutWithinHours(recentDate, 24);
      expect(result).toBe(true);
    });

    it("should return false for old workout", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2);
      const result = isWorkoutWithinHours(oldDate, 24);
      expect(result).toBe(false);
    });

    it("should handle null date", () => {
      const result = isWorkoutWithinHours(null);
      expect(result).toBe(false);
    });
  });

  describe("formatRelativeWorkoutDate", () => {
    it("should format today", () => {
      const today = new Date();
      const result = formatRelativeWorkoutDate(today);
      expect(result).toBe("Today");
    });

    it("should format yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = formatRelativeWorkoutDate(yesterday);
      expect(result).toBe("Yesterday");
    });

    it("should format days ago", () => {
      const date = new Date();
      date.setDate(date.getDate() - 5);
      const result = formatRelativeWorkoutDate(date);
      expect(result).toBe("5 days ago");
    });

    it("should format with year for different year", () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 1);
      const result = formatRelativeWorkoutDate(date);
      expect(result).toContain(date.getFullYear().toString());
    });

    it("should handle null date", () => {
      const result = formatRelativeWorkoutDate(null);
      expect(result).toBe("Unknown");
    });
  });

  describe("formatDurationLabel", () => {
    it("should format actual duration", () => {
      const result = formatDurationLabel(45, null);
      expect(result).toBe("45 min");
    });

    it("should format estimated duration", () => {
      const result = formatDurationLabel(null, 30);
      expect(result).toBe("~30 min");
    });

    it("should handle null values", () => {
      const result = formatDurationLabel(null, null);
      expect(result).toBe("-- min");
    });
  });
});
