import { queryOptions, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

export const insightsQueryOptions = queryOptions({
  queryKey: ["insights"],
  queryFn: async () => ({ exerciseInsights: [], sessionInsights: [] }),
  staleTime: 1000 * 60 * 10,
});

export function useExerciseInsights() {
  return { data: [], isLoading: false, error: null };
}

export function useSessionInsights() {
  return { data: [], isLoading: false, error: null };
}

export function useExportWorkoutsCSV() {
  const mutationFn = useServerFn(async () => ({ csv: "" }));
  return useMutation({ mutationFn });
}
