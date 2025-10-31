import { useQueryClient } from "@tanstack/react-query";
import { invalidateQueries } from "~/trpc/cache-config";

export interface CacheInvalidationDependencies {
  useQueryClientHook?: typeof useQueryClient;
  invalidateHelpers?: typeof invalidateQueries;
}

/**
 * Hook to provide cache invalidation helpers for mutations
 */
export function useCacheInvalidation({
  useQueryClientHook = useQueryClient,
  invalidateHelpers = invalidateQueries,
}: CacheInvalidationDependencies = {}) {
  const queryClient = useQueryClientHook();

  return {
    // Invalidate workout queries after workout-related mutations
    invalidateWorkouts: () => invalidateHelpers.workouts(queryClient),

    // Invalidate templates after template mutations
    invalidateTemplates: () => invalidateHelpers.templates(queryClient),

    // Invalidate preferences after preference updates
    invalidatePreferences: () => invalidateHelpers.preferences(queryClient),

    // Invalidate everything (use sparingly)
    invalidateAll: () => invalidateHelpers.all(queryClient),

    // Specific invalidation for workout start (immediate cache refresh)
    onWorkoutStart: () => {
      // Immediately invalidate recent workouts and last exercise data
      void queryClient.invalidateQueries({
        queryKey: ["workouts", "getRecent"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["workouts", "getLastExerciseData"],
      });
    },

    // Specific invalidation for workout save
    onWorkoutSave: () => {
      // Invalidate all workout-related queries
      invalidateHelpers.workouts(queryClient);
      // Also invalidate aggregated progress data since new sessions affect progress calculations
      invalidateHelpers.progressAggregated(queryClient);
      // Invalidate real-time progress queries for immediate dashboard updates
      invalidateHelpers.progressRealtime(queryClient);
    },

    // Invalidate aggregated progress data (for when new sessions are added)
    invalidateProgressAggregated: () => {
      invalidateHelpers.progressAggregated(queryClient);
    },

    // Invalidate real-time progress data (for immediate dashboard updates)
    invalidateProgressRealtime: () => {
      invalidateHelpers.progressRealtime(queryClient);
    },

    // Optimistic updates for better UX
    optimisticWorkoutUpdate: (sessionId: number, exercises: any[]) => {
      queryClient.setQueryData(["workouts", "getRecent"], (old: unknown) => {
        // Update the cache optimistically
        if (!old || !Array.isArray(old)) return old;

        // Add the new workout to the beginning of the recent workouts list
        const newWorkout = {
          id: sessionId,
          exercises,
          createdAt: new Date().toISOString(),
          // Add other necessary fields based on your data structure
        };

        return [newWorkout, ...old.slice(0, 9)] as unknown[]; // Keep only top 10
      });
    },

    // Optimistic updates for progress data
    optimisticProgressUpdate: (
      type: "volume" | "workout" | "streak",
      data: any,
    ) => {
      switch (type) {
        case "volume":
          queryClient.setQueryData(
            ["progress", "getVolumeProgression"],
            (old: unknown) => {
              if (!old || typeof old !== 'object' || !('data' in old)) return old;
              const oldObj = old as { data: unknown[] };
              return {
                ...oldObj,
                data: [...oldObj.data, data],
              };
            },
          );
          break;
        case "workout":
          queryClient.setQueryData(
            ["progress", "getWorkoutDates"],
            (old: unknown) => {
              if (!old || !Array.isArray(old)) return old;
              return [...(old as unknown[]), new Date().toISOString()];
            },
          );
          break;
        case "streak":
          queryClient.setQueryData(
            ["progress", "getConsistencyStats"],
            (old: unknown) => {
              if (!old || typeof old !== 'object') return old;
              return {
                ...old as Record<string, unknown>,
                currentStreak: data.currentStreak,
                lastWorkoutDate: data.lastWorkoutDate,
              };
            },
          );
          break;
      }
    },
  };
}
