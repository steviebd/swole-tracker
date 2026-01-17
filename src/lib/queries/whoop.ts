import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getIntegrationStatus,
  disconnectIntegration,
  getRecovery,
  getLatestRecovery,
  getCycles,
  getSleep,
  getWhoopWorkouts,
  getBodyMeasurements,
} from "~/server/functions/whoop";

export const whoopIntegrationStatusQueryOptions = queryOptions({
  queryKey: ["whoopIntegrationStatus"],
  queryFn: () => getIntegrationStatus(),
  staleTime: 1000 * 60 * 5,
});

export const whoopRecoveryQueryOptions = (days?: number) =>
  queryOptions({
    queryKey: ["whoopRecovery", days],
    queryFn: () => getRecovery({ data: { days } }),
    staleTime: 1000 * 60 * 5,
  });

export const whoopLatestRecoveryQueryOptions = queryOptions({
  queryKey: ["whoopLatestRecovery"],
  queryFn: () => getLatestRecovery(),
  staleTime: 1000 * 60 * 5,
});

export const whoopCyclesQueryOptions = (days?: number) =>
  queryOptions({
    queryKey: ["whoopCycles", days],
    queryFn: () => getCycles({ data: { days } }),
    staleTime: 1000 * 60 * 5,
  });

export const whoopSleepQueryOptions = (days?: number) =>
  queryOptions({
    queryKey: ["whoopSleep", days],
    queryFn: () => getSleep({ data: { days } }),
    staleTime: 1000 * 60 * 5,
  });

export const whoopWorkoutsQueryOptions = (days?: number) =>
  queryOptions({
    queryKey: ["whoopWorkouts", days],
    queryFn: () => getWhoopWorkouts({ data: { days } }),
    staleTime: 1000 * 60 * 5,
  });

export const whoopBodyMeasurementsQueryOptions = (limit?: number) =>
  queryOptions({
    queryKey: ["whoopBodyMeasurements", limit],
    queryFn: () => getBodyMeasurements({ data: { limit } }),
    staleTime: 1000 * 60 * 10,
  });

export function useWhoopIntegrationStatus() {
  return useSuspenseQuery(whoopIntegrationStatusQueryOptions);
}

export function useWhoopRecovery(days?: number) {
  return useSuspenseQuery(whoopRecoveryQueryOptions(days));
}

export function useWhoopLatestRecovery() {
  return useSuspenseQuery(whoopLatestRecoveryQueryOptions);
}

export function useWhoopCycles(days?: number) {
  return useSuspenseQuery(whoopCyclesQueryOptions(days));
}

export function useWhoopSleep(days?: number) {
  return useSuspenseQuery(whoopSleepQueryOptions(days));
}

export function useWhoopWorkouts(days?: number) {
  return useSuspenseQuery(whoopWorkoutsQueryOptions(days));
}

export function useWhoopBodyMeasurements(limit?: number) {
  return useSuspenseQuery(whoopBodyMeasurementsQueryOptions(limit));
}

export function useDisconnectWhoop() {
  const mutationFn = useServerFn(disconnectIntegration);
  return useMutation({
    mutationFn,
  });
}
