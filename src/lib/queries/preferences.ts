import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getPreferences,
  updatePreferences,
} from "~/server/functions/preferences";

export const preferencesQueryOptions = queryOptions({
  queryKey: ["preferences"],
  queryFn: () => getPreferences(),
});

export function usePreferences() {
  return useSuspenseQuery(preferencesQueryOptions);
}

export function useUpdatePreferences() {
  const mutationFn = useServerFn(updatePreferences);
  return useMutation({
    mutationFn,
  });
}
