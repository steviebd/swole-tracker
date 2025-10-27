import { describe, it, expect, vi } from "vitest";

// Mock the logger
vi.mock("~/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from "~/lib/logger";

describe("AI Response Post-Processing", () => {
  describe("postProcessAIResponse", () => {
    const postProcessAIResponse = (
      aiResponse: any,
      expectedExerciseCount: number,
    ) => {
      const originalExerciseCount = aiResponse.per_exercise.length;
      aiResponse.per_exercise = aiResponse.per_exercise
        .filter(
          (ex: any, index: number, arr: any[]) =>
            arr.findIndex((e: any) => e.exercise_id === ex.exercise_id) ===
            index,
        )
        .map((ex: any) => ({
          ...ex,
          sets: ex.sets.slice(0, 1), // Ensure exactly one set per exercise
        }));

      // Validate post-processed response
      if (aiResponse.per_exercise.length !== expectedExerciseCount) {
        logger.warn(
          "AI response exercise count mismatch after post-processing",
          {
            expected: expectedExerciseCount,
            actual: aiResponse.per_exercise.length,
            original: originalExerciseCount,
            duplicatesRemoved:
              originalExerciseCount - aiResponse.per_exercise.length,
          },
        );
      }

      logger.info("AI response processed successfully", {
        inputExercises: expectedExerciseCount,
        outputSuggestions: aiResponse.per_exercise.length,
        duplicatesRemoved:
          originalExerciseCount - aiResponse.per_exercise.length,
      });

      return aiResponse;
    };

    it("should handle duplicate exercise suggestions", () => {
      const mockAIResponse = {
        session_id: "session-1",
        readiness: { rho: 0.8, overload_multiplier: 1.05, flags: [] },
        per_exercise: [
          {
            exercise_id: "bench_press",
            name: "Bench Press",
            predicted_chance_to_beat_best: 0.7,
            sets: [
              {
                set_id: "set-1",
                suggested_weight_kg: 82.5,
                suggested_reps: 8,
                rationale: "Suggestion 1",
              },
              {
                set_id: "set-2",
                suggested_weight_kg: 85,
                suggested_reps: 6,
                rationale: "Suggestion 2",
              },
            ],
          },
          {
            exercise_id: "bench_press", // Duplicate
            name: "Bench Press",
            predicted_chance_to_beat_best: 0.7,
            sets: [
              {
                set_id: "set-3",
                suggested_weight_kg: 80,
                suggested_reps: 8,
                rationale: "Duplicate",
              },
            ],
          },
        ],
        session_predicted_chance: 0.75,
        summary: "Test summary",
        warnings: [],
        recovery_recommendations: {
          recommended_rest_between_sets: "2-3 minutes",
          recommended_rest_between_sessions: "48 hours",
          session_duration_estimate: "45 minutes",
          additional_recovery_notes: [],
        },
      };

      const result = postProcessAIResponse(mockAIResponse, 1);

      expect(result.per_exercise).toHaveLength(1);
      expect(result.per_exercise[0].sets).toHaveLength(1);
      expect(result.per_exercise[0].exercise_id).toBe("bench_press");
      expect(logger.info).toHaveBeenCalledWith(
        "AI response processed successfully",
        expect.objectContaining({
          inputExercises: 1,
          outputSuggestions: 1,
          duplicatesRemoved: 1,
        }),
      );
    });

    it("should handle single exercise workout correctly", () => {
      const mockAIResponse = {
        session_id: "session-1",
        readiness: { rho: 0.8, overload_multiplier: 1.05, flags: [] },
        per_exercise: [
          {
            exercise_id: "squat",
            name: "Squat",
            predicted_chance_to_beat_best: 0.8,
            sets: [
              {
                set_id: "squat-highest",
                suggested_weight_kg: 105,
                suggested_reps: 5,
                rationale: "Single exercise",
              },
            ],
          },
        ],
        session_predicted_chance: 0.8,
        summary: "Single exercise workout advice",
        warnings: [],
        recovery_recommendations: {
          recommended_rest_between_sets: "3-4 minutes",
          recommended_rest_between_sessions: "72 hours",
          session_duration_estimate: "30 minutes",
          additional_recovery_notes: [],
        },
      };

      const result = postProcessAIResponse(mockAIResponse, 1);

      expect(result.per_exercise).toHaveLength(1);
      expect(result.per_exercise[0].exercise_id).toBe("squat");
      expect(result.per_exercise[0].sets).toHaveLength(1);
      expect(logger.info).toHaveBeenCalledWith(
        "AI response processed successfully",
        expect.objectContaining({
          inputExercises: 1,
          outputSuggestions: 1,
          duplicatesRemoved: 0,
        }),
      );
    });

    it("should handle multiple exercises correctly", () => {
      const mockAIResponse = {
        session_id: "session-1",
        readiness: { rho: 0.8, overload_multiplier: 1.05, flags: [] },
        per_exercise: [
          {
            exercise_id: "bench_press",
            name: "Bench Press",
            predicted_chance_to_beat_best: 0.7,
            sets: [
              {
                set_id: "bench-highest",
                suggested_weight_kg: 82.5,
                suggested_reps: 8,
                rationale: "Bench progression",
              },
            ],
          },
          {
            exercise_id: "squat",
            name: "Squat",
            predicted_chance_to_beat_best: 0.8,
            sets: [
              {
                set_id: "squat-highest",
                suggested_weight_kg: 105,
                suggested_reps: 5,
                rationale: "Squat progression",
              },
            ],
          },
        ],
        session_predicted_chance: 0.75,
        summary: "Multi-exercise workout advice",
        warnings: [],
        recovery_recommendations: {
          recommended_rest_between_sets: "2-4 minutes",
          recommended_rest_between_sessions: "48-72 hours",
          session_duration_estimate: "60 minutes",
          additional_recovery_notes: [],
        },
      };

      const result = postProcessAIResponse(mockAIResponse, 2);

      expect(result.per_exercise).toHaveLength(2);
      expect(result.per_exercise.map((ex: any) => ex.exercise_id)).toEqual(
        expect.arrayContaining(["bench_press", "squat"]),
      );
      expect(result.per_exercise.every((ex: any) => ex.sets.length === 1)).toBe(
        true,
      );
      expect(logger.info).toHaveBeenCalledWith(
        "AI response processed successfully",
        expect.objectContaining({
          inputExercises: 2,
          outputSuggestions: 2,
          duplicatesRemoved: 0,
        }),
      );
    });

    it("should log warning when exercise count mismatch occurs", () => {
      const mockAIResponse = {
        session_id: "session-1",
        readiness: { rho: 0.8, overload_multiplier: 1.05, flags: [] },
        per_exercise: [
          // Only 1 exercise but expected 2
          {
            exercise_id: "bench_press",
            name: "Bench Press",
            predicted_chance_to_beat_best: 0.7,
            sets: [
              {
                set_id: "bench-highest",
                suggested_weight_kg: 82.5,
                suggested_reps: 8,
                rationale: "Bench progression",
              },
            ],
          },
        ],
        session_predicted_chance: 0.75,
        summary: "Incomplete workout advice",
        warnings: [],
        recovery_recommendations: {
          recommended_rest_between_sets: "2-3 minutes",
          recommended_rest_between_sessions: "48 hours",
          session_duration_estimate: "45 minutes",
          additional_recovery_notes: [],
        },
      };

      const result = postProcessAIResponse(mockAIResponse, 2);

      expect(result.per_exercise).toHaveLength(1);
      expect(logger.warn).toHaveBeenCalledWith(
        "AI response exercise count mismatch after post-processing",
        expect.objectContaining({
          expected: 2,
          actual: 1,
          original: 1,
          duplicatesRemoved: 0,
        }),
      );
    });

    it("should handle exercises with multiple sets by keeping only first", () => {
      const mockAIResponse = {
        session_id: "session-1",
        readiness: { rho: 0.8, overload_multiplier: 1.05, flags: [] },
        per_exercise: [
          {
            exercise_id: "bench_press",
            name: "Bench Press",
            predicted_chance_to_beat_best: 0.7,
            sets: [
              {
                set_id: "set-1",
                suggested_weight_kg: 80,
                suggested_reps: 8,
                rationale: "First set",
              },
              {
                set_id: "set-2",
                suggested_weight_kg: 82.5,
                suggested_reps: 8,
                rationale: "Second set",
              },
              {
                set_id: "set-3",
                suggested_weight_kg: 85,
                suggested_reps: 6,
                rationale: "Third set",
              },
            ],
          },
        ],
        session_predicted_chance: 0.75,
        summary: "Test summary",
        warnings: [],
        recovery_recommendations: {
          recommended_rest_between_sets: "2-3 minutes",
          recommended_rest_between_sessions: "48 hours",
          session_duration_estimate: "45 minutes",
          additional_recovery_notes: [],
        },
      };

      const result = postProcessAIResponse(mockAIResponse, 1);

      expect(result.per_exercise).toHaveLength(1);
      expect(result.per_exercise[0].sets).toHaveLength(1);
      expect(result.per_exercise[0].sets[0].set_id).toBe("set-1");
      expect(result.per_exercise[0].sets[0].rationale).toBe("First set");
    });
  });
});
