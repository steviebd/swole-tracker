import { queryOptions, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

export const recoveryPlannerQueryOptions = queryOptions({
  queryKey: ["recoveryPlanner"],
  queryFn: async () => null,
  staleTime: 1000 * 60 * 5,
});

export function useRecoveryPlan() {
  return { data: null, isLoading: false, error: null };
}

export function useUpdateRecoveryPlan() {
  const mutationFn = useServerFn(async () => ({ success: true }));
  return useMutation({ mutationFn });
}

export function useLogRecoveryActivity() {
  const mutationFn = useServerFn(async () => ({ success: true }));
  return useMutation({ mutationFn });
}
