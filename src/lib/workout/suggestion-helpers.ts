import type { ExerciseData } from "~/app/_components/exercise-card";

export function findHighestWeightSetIndex(
  exercise?: ExerciseData,
): number {
  if (!exercise || !Array.isArray(exercise.sets) || exercise.sets.length === 0) {
    return 0;
  }

  let bestIndex = 0;
  let bestWeight = exercise.sets[0]?.weight ?? 0;
  let bestReps = exercise.sets[0]?.reps ?? 0;

  exercise.sets.forEach((set, index) => {
    const weight = set?.weight ?? 0;
    const reps = set?.reps ?? 0;

    if (weight > bestWeight) {
      bestWeight = weight;
      bestReps = reps;
      bestIndex = index;
      return;
    }

    if (weight === bestWeight && reps > bestReps) {
      bestIndex = index;
      bestReps = reps;
    }
  });

  return bestIndex;
}
