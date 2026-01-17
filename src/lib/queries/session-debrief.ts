import { queryOptions, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

export const sessionDebriefQueryOptions = (sessionId: number) =>
  queryOptions({
    queryKey: ["sessionDebrief", sessionId],
    queryFn: async () => null,
    staleTime: 1000 * 60 * 10,
  });

export function useSessionDebrief(sessionId: number) {
  return { data: null, isLoading: false, error: null };
}

export function useGenerateDebrief() {
  const mutationFn = useServerFn(async () => ({ id: 0 }));
  return useMutation({ mutationFn });
}
