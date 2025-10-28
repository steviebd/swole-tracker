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
    },

    // Invalidate aggregated progress data (for when new sessions are added)
    invalidateProgressAggregated: () => {
      invalidateHelpers.progressAggregated(queryClient);
    },

    // Optimistic updates for better UX
    optimisticWorkoutUpdate: (_sessionId: number, _exercises: unknown[]) => {
      queryClient.setQueryData(["workouts", "getRecent"], (old: unknown) => {
        // Update the cache optimistically
        // The actual implementation would depend on your data structure
        return old;
      });
    },
  };
}
