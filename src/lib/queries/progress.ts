import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getDashboardData,
  getStreak,
  getRecentPRs,
  getHistory,
  getStrengthProgression,
  getTopSets,
} from "~/server/functions/progress";

export const dashboardDataQueryOptions = (timeRange?: string) =>
  queryOptions({
    queryKey: ["dashboardData", timeRange],
    queryFn: () =>
      getDashboardData({
        data: { timeRange: timeRange as "week" | "month" | "quarter" | "year" },
      }),
    staleTime: 1000 * 60 * 5,
  });

export const streakQueryOptions = queryOptions({
  queryKey: ["streak"],
  queryFn: () => getStreak(),
  staleTime: 1000 * 60 * 30,
});

export const recentPRsQueryOptions = (limit?: number) =>
  queryOptions({
    queryKey: ["recentPRs", limit],
    queryFn: () => getRecentPRs({ data: { limit } }),
    staleTime: 1000 * 60 * 10,
  });

export const workoutHistoryQueryOptions = (limit?: number, offset?: number) =>
  queryOptions({
    queryKey: ["workoutHistory", limit, offset],
    queryFn: () => getHistory({ data: { limit, offset } }),
    staleTime: 1000 * 60 * 5,
  });

export const strengthProgressionQueryOptions = (
  exerciseName?: string,
  timeRange?: string,
  limit?: number,
) =>
  queryOptions({
    queryKey: ["strengthProgression", exerciseName, timeRange, limit],
    queryFn: () =>
      getStrengthProgression({
        data: {
          exerciseName,
          timeRange: timeRange as "week" | "month" | "quarter" | "year",
          limit,
        },
      }),
    staleTime: 1000 * 60 * 10,
  });

export const topSetsQueryOptions = (exerciseName?: string, limit?: number) =>
  queryOptions({
    queryKey: ["topSets", exerciseName, limit],
    queryFn: () => getTopSets({ data: { exerciseName, limit } }),
    staleTime: 1000 * 60 * 10,
  });

export function useDashboardData(timeRange?: string) {
  return useSuspenseQuery(dashboardDataQueryOptions(timeRange));
}

export function useStreak() {
  return useSuspenseQuery(streakQueryOptions);
}

export function useRecentPRs(limit?: number) {
  return useSuspenseQuery(recentPRsQueryOptions(limit));
}

export function useWorkoutHistory(limit?: number, offset?: number) {
  return useSuspenseQuery(workoutHistoryQueryOptions(limit, offset));
}

export function useStrengthProgression(
  exerciseName?: string,
  timeRange?: string,
  limit?: number,
) {
  return useSuspenseQuery(
    strengthProgressionQueryOptions(exerciseName, timeRange, limit),
  );
}

export function useTopSets(exerciseName?: string, limit?: number) {
  return useSuspenseQuery(topSetsQueryOptions(exerciseName, limit));
}
