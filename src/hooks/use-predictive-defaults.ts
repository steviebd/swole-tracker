"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "~/convex/_generated/api";
import type { Id } from "~/convex/_generated/dataModel";

interface PredictiveDefaultsParams {
  exerciseName: string;
  templateExerciseId?: Id<"templateExercises">;
  setIndex: number;
  currentSets: any[];
  unit: "kg" | "lbs";
}

interface PredictiveDefault {
  weight?: number;
  reps?: number;
  sets?: number;
  confidence: number; // 0-1 scale
  source: "previous_workout" | "average" | "progression" | "pattern";
  rationale: string;
}

export function usePredictiveDefaults(params: PredictiveDefaultsParams) {
  const insights = useQuery(api.insights.getExerciseInsights, {
    exerciseName: params.exerciseName,
    templateExerciseId: params.templateExerciseId,
    unit: params.unit,
    limitSessions: 5, // Look at last 5 workouts for patterns
  });

  const predictions = useMemo(() => {
    if (!insights) return null;

    const predictions: PredictiveDefault[] = [];
    
    // 1. Previous workout pattern (highest confidence)
    if (insights.bestSet && insights.volumeSparkline.length > 0) {
      const lastWorkout = insights.volumeSparkline[insights.volumeSparkline.length - 1];
      if (lastWorkout && insights.bestSet.weight && insights.bestSet.reps) {
        predictions.push({
          weight: insights.bestSet.weight,
          reps: insights.bestSet.reps,
          sets: insights.bestSet.sets || 1,
          confidence: 0.9,
          source: "previous_workout",
          rationale: "Based on your last workout performance"
        });
      }
    }

    // 2. Progressive overload suggestion (medium-high confidence)
    if (insights.recommendation) {
      if (insights.recommendation.type === "weight" && insights.recommendation.nextWeight) {
        predictions.push({
          weight: insights.recommendation.nextWeight,
          reps: insights.bestSet?.reps,
          sets: insights.bestSet?.sets || 1,
          confidence: 0.8,
          source: "progression",
          rationale: insights.recommendation.rationale
        });
      } else if (insights.recommendation.type === "reps" && insights.recommendation.nextReps) {
        predictions.push({
          weight: insights.bestSet?.weight,
          reps: (insights.bestSet?.reps || 0) + insights.recommendation.nextReps,
          sets: insights.bestSet?.sets || 1,
          confidence: 0.8,
          source: "progression",
          rationale: insights.recommendation.rationale
        });
      }
    }

    // 3. Pattern-based prediction for subsequent sets in same workout
    if (params.currentSets.length > 0 && params.setIndex > 0) {
      const previousSet = params.currentSets[params.setIndex - 1];
      if (previousSet?.weight && previousSet?.reps) {
        // Typically, people maintain weight but may decrease reps
        const repDropoff = Math.max(0, previousSet.reps - 1);
        predictions.push({
          weight: previousSet.weight,
          reps: repDropoff > 0 ? repDropoff : previousSet.reps,
          sets: 1,
          confidence: 0.7,
          source: "pattern",
          rationale: "Following pattern from previous set in this workout"
        });
      }
    }

    // 4. Conservative fallback (low confidence)
    if (predictions.length === 0 && insights.bestSet) {
      // Use 90% of best recorded weight as conservative starting point
      const conservativeWeight = insights.bestSet.weight ? Math.round((insights.bestSet.weight * 0.9) * 2) / 2 : undefined;
      predictions.push({
        weight: conservativeWeight,
        reps: insights.bestSet.reps,
        sets: 1,
        confidence: 0.5,
        source: "average",
        rationale: "Conservative estimate based on your history"
      });
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }, [insights, params.currentSets, params.setIndex]);

  return {
    predictions,
    bestPrediction: predictions?.[0],
    isLoading: insights === undefined,
    hasData: !!predictions && predictions.length > 0,
  };
}