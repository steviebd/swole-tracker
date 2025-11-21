import { describe, it, expect } from "vitest";
import { findHighestWeightSetIndex } from "~/lib/workout/suggestion-helpers";
import type { ExerciseData } from "~/app/_components/exercise-card";

describe("findHighestWeightSetIndex", () => {
  const makeExercise = (weights: Array<{ weight?: number; reps?: number }>) =>
    ({
      exerciseName: "Test Exercise",
      unit: "kg" as const,
      sets: weights.map((set, idx) => ({
        id: `set-${idx}`,
        setNumber: idx + 1,
        unit: "kg" as const,
        sets: 1,
        ...set,
      })),
    }) satisfies ExerciseData;

  it("returns 0 when no sets are present", () => {
    expect(findHighestWeightSetIndex()).toBe(0);
    expect(findHighestWeightSetIndex(makeExercise([]))).toBe(0);
  });

  it("selects the set with the greatest weight regardless of order", () => {
    const exercise = makeExercise([
      { weight: 120, reps: 5 },
      { weight: 150, reps: 3 },
      { weight: 140, reps: 8 },
    ]);

    expect(findHighestWeightSetIndex(exercise)).toBe(1);
  });

  it("breaks weight ties by preferring the greater rep count", () => {
    const exercise = makeExercise([
      { weight: 150, reps: 3 },
      { weight: 150, reps: 5 },
      { weight: 150, reps: 4 },
    ]);

    expect(findHighestWeightSetIndex(exercise)).toBe(1);
  });
});
