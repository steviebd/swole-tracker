import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdvice, getJoke } from "~/server/functions/health-advice";

export const healthAdviceQueryOptions = queryOptions({
  queryKey: ["healthAdvice"],
  queryFn: () => getAdvice(),
  staleTime: 1000 * 60 * 60,
});

export const healthJokeQueryOptions = queryOptions({
  queryKey: ["healthJoke"],
  queryFn: () => getJoke(),
  staleTime: 1000 * 60 * 60,
});

export function useHealthAdvice() {
  return useSuspenseQuery(healthAdviceQueryOptions);
}

export function useHealthJoke() {
  return useSuspenseQuery(healthJokeQueryOptions);
}
