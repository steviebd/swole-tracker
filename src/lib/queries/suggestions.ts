import { queryOptions, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

export const suggestionsQueryOptions = queryOptions({
  queryKey: ["suggestions"],
  queryFn: async () => [],
  staleTime: 1000 * 60 * 5,
});

export function useSuggestions() {
  return { data: [], isLoading: false, error: null };
}

export function useDismissSuggestion() {
  const mutationFn = useServerFn(async () => ({ success: true }));
  return useMutation({ mutationFn });
}
