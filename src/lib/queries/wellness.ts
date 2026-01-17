import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  saveWellness,
  getWellnessBySessionId,
  getWellnessHistory,
  getWellnessStats,
  deleteWellness,
} from "~/server/functions/wellness";

export const wellnessHistoryQueryOptions = (
  limit?: number,
  offset?: number,
  startDate?: Date,
  endDate?: Date,
) =>
  queryOptions({
    queryKey: ["wellnessHistory", limit, offset, startDate, endDate],
    queryFn: () =>
      getWellnessHistory({ data: { limit, offset, startDate, endDate } }),
    staleTime: 1000 * 60 * 5,
  });

export const wellnessStatsQueryOptions = (days?: number) =>
  queryOptions({
    queryKey: ["wellnessStats", days],
    queryFn: () => getWellnessStats({ data: { days } }),
    staleTime: 1000 * 60 * 10,
  });

export function useWellnessHistory(
  limit?: number,
  offset?: number,
  startDate?: Date,
  endDate?: Date,
) {
  return useSuspenseQuery(
    wellnessHistoryQueryOptions(limit, offset, startDate, endDate),
  );
}

export function useWellnessStats(days?: number) {
  return useSuspenseQuery(wellnessStatsQueryOptions(days));
}

export function useSaveWellness() {
  const mutationFn = useServerFn(saveWellness);
  return useMutation({
    mutationFn,
  });
}

export function useDeleteWellness() {
  const mutationFn = useServerFn(deleteWellness);
  return useMutation({
    mutationFn,
  });
}
