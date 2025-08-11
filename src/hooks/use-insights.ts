import { useMemo } from "react";
import { api } from "~/trpc/react";

// Exercise-level insights
export function useExerciseInsights(params: {
  exerciseName: string;
  templateExerciseId?: number;
  unit?: "kg" | "lbs";
  limitSessions?: number;
  excludeSessionId?: number;
}) {
  const {
    exerciseName,
    templateExerciseId,
    unit = "kg",
    limitSessions = 10,
    excludeSessionId,
  } = params;

  const query = api.insights.getExerciseInsights.useQuery(
    { exerciseName, templateExerciseId, unit, limitSessions, excludeSessionId },
    {
      enabled: Boolean(exerciseName),
      staleTime: 1000 * 30,
    },
  );

  // Provide stable fallbacks for consumers
  const data = useMemo(() => {
    return (
      query.data ?? {
        unit,
        bestSet: undefined as
          | {
              weight?: number;
              reps?: number;
              unit?: "kg" | "lbs";
              sets?: number;
              rpe?: number;
            }
          | undefined,
        best1RM: undefined as number | undefined,
        volumeSparkline: [] as Array<{ date: Date; volume: number }>,
        recommendation: undefined as
          | {
              type: "weight" | "reps";
              nextWeight?: number;
              nextReps?: number;
              rationale: string;
              unit: "kg" | "lbs";
            }
          | undefined,
        suggestions: [] as Array<{
          kind: "rest" | "rpe" | "volume";
          message: string;
        }>,
      }
    );
  }, [query.data, unit]);

  return { ...query, data };
}

// Session-level insights
export function useSessionInsights(
  sessionId: number,
  unit: "kg" | "lbs" = "kg",
) {
  const query = api.insights.getSessionInsights.useQuery(
    { sessionId, unit },
    {
      enabled: Number.isFinite(sessionId),
      staleTime: 1000 * 30,
    },
  );

  const data = useMemo(() => {
    return (
      query.data ?? {
        unit,
        totalVolume: 0,
        bestSets: [] as Array<{
          exerciseName: string;
          volume: number;
          bestSet?: {
            weight?: number;
            reps?: number | null;
            unit: "kg" | "lbs";
          };
        }>,
      }
    );
  }, [query.data, unit]);

  return { ...query, data };
}

// Export CSV
export function useExportWorkoutsCSV(params?: {
  since?: Date;
  limit?: number;
}) {
  const since = params?.since;
  const limit = params?.limit ?? 50;

  const query = api.insights.exportWorkoutsCSV.useQuery(
    { since, limit },
    {
      enabled: true,
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  );

  return query;
}
