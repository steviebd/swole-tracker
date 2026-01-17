import { queryOptions, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

export const plateauMilestoneQueryOptions = queryOptions({
  queryKey: ["plateauMilestone"],
  queryFn: async () => ({ plateaus: [], milestones: [] }),
  staleTime: 1000 * 60 * 10,
});

export function usePlateaus() {
  return { data: [], isLoading: false, error: null };
}

export function useMilestones() {
  return { data: [], isLoading: false, error: null };
}

export function useCreateMilestone() {
  const mutationFn = useServerFn(async () => ({ id: 0 }));
  return useMutation({ mutationFn });
}

export function useDismissPlateau() {
  const mutationFn = useServerFn(async () => ({ success: true }));
  return useMutation({ mutationFn });
}
