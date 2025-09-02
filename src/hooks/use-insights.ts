import { useQuery } from "convex/react";
import { api } from "~/convex/_generated/api";
import type { Id } from "~/convex/_generated/dataModel";

interface ExerciseInsightsParams {
  exerciseName: string;
  templateExerciseId?: Id<"templateExercises">;
  unit: "kg" | "lbs";
  limitSessions?: number;
  excludeSessionId?: Id<"workoutSessions">;
}

interface BestSet {
  weight?: number;
  unit?: "kg" | "lbs";
  reps?: number;
  sets?: number;
  rpe?: number;
}

interface Recommendation {
  type: "weight" | "reps";
  nextWeight?: number;
  nextReps?: number;
  unit: "kg" | "lbs";
  rationale: string;
}

interface VolumePoint {
  volume: number;
  date: number;
}

interface Suggestion {
  kind: "rest" | "rpe" | "volume";
  message: string;
}

interface ExerciseInsights {
  unit: "kg" | "lbs";
  bestSet?: BestSet;
  best1RM?: number;
  recommendation?: Recommendation;
  volumeSparkline: VolumePoint[];
  suggestions: Suggestion[];
}

export function useExerciseInsights(params: ExerciseInsightsParams) {
  const data = useQuery(
    api.insights.getExerciseInsights,
    {
      exerciseName: params.exerciseName,
      templateExerciseId: params.templateExerciseId,
      unit: params.unit,
      limitSessions: params.limitSessions,
      excludeSessionId: params.excludeSessionId,
    }
  );

  return {
    data,
    isLoading: data === undefined,
    error: null,
  };
}