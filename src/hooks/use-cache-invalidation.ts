import { useQueryClient } from "@tanstack/react-query";
import { invalidateQueries } from "~/trpc/cache-config";

/**
 * Hook to provide cache invalidation helpers for mutations
 */
export function useCacheInvalidation() {
  const queryClient = useQueryClient();

  return {
    // Invalidate workout queries after workout-related mutations
    invalidateWorkouts: () => invalidateQueries.workouts(queryClient),

    // Invalidate templates after template mutations
    invalidateTemplates: () => invalidateQueries.templates(queryClient),

    // Invalidate preferences after preference updates
    invalidatePreferences: () => invalidateQueries.preferences(queryClient),

    // Invalidate everything (use sparingly)
    invalidateAll: () => invalidateQueries.all(queryClient),

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
      invalidateQueries.workouts(queryClient);
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
