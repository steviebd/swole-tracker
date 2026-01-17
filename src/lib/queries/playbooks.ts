import { queryOptions, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

export const playbooksQueryOptions = queryOptions({
  queryKey: ["playbooks"],
  queryFn: async () => [],
  staleTime: 1000 * 60 * 5,
});

export function usePlaybooks() {
  return { data: [], isLoading: false, error: null };
}

export function useCreatePlaybook() {
  const mutationFn = useServerFn(async () => ({ id: 0 }));
  return useMutation({ mutationFn });
}

export function useUpdatePlaybook() {
  const mutationFn = useServerFn(async () => ({ success: true }));
  return useMutation({ mutationFn });
}

export function useDeletePlaybook() {
  const mutationFn = useServerFn(async () => ({ success: true }));
  return useMutation({ mutationFn });
}
