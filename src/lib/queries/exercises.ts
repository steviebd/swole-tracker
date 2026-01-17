import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  searchMaster,
  findSimilar,
  getAllMaster,
  getMigrationStatus,
  linkToMaster,
  unlink,
  bulkLink,
  resolveName,
} from "~/server/functions/exercises";

export const searchMasterQueryOptions = (query: string, limit?: number) =>
  queryOptions({
    queryKey: ["exerciseSearch", query, limit],
    queryFn: () => searchMaster({ data: { query, limit } }),
    staleTime: 1000 * 60 * 5,
  });

export const similarExercisesQueryOptions = (
  exerciseName: string,
  limit?: number,
) =>
  queryOptions({
    queryKey: ["similarExercises", exerciseName, limit],
    queryFn: () => findSimilar({ data: { exerciseName, limit } }),
    staleTime: 1000 * 60 * 5,
  });

export const allMasterExercisesQueryOptions = (
  limit?: number,
  offset?: number,
) =>
  queryOptions({
    queryKey: ["masterExercises", limit, offset],
    queryFn: () => getAllMaster({ data: { limit, offset } }),
    staleTime: 1000 * 60 * 10,
  });

export const migrationStatusQueryOptions = queryOptions({
  queryKey: ["migrationStatus"],
  queryFn: () => getMigrationStatus(),
  staleTime: 1000 * 60 * 5,
});

export function useSearchMaster(query: string, limit?: number) {
  return useSuspenseQuery(searchMasterQueryOptions(query, limit));
}

export function useSimilarExercises(exerciseName: string, limit?: number) {
  return useSuspenseQuery(similarExercisesQueryOptions(exerciseName, limit));
}

export function useAllMasterExercises(limit?: number, offset?: number) {
  return useSuspenseQuery(allMasterExercisesQueryOptions(limit, offset));
}

export function useMigrationStatus() {
  return useSuspenseQuery(migrationStatusQueryOptions);
}

export function useLinkToMaster() {
  const mutationFn = useServerFn(linkToMaster);
  return useMutation({
    mutationFn,
  });
}

export function useUnlinkExercise() {
  const mutationFn = useServerFn(unlink);
  return useMutation({
    mutationFn,
  });
}

export function useBulkLinkExercises() {
  const mutationFn = useServerFn(bulkLink);
  return useMutation({
    mutationFn,
  });
}

export function useResolveExerciseName() {
  const mutationFn = useServerFn(resolveName);
  return useMutation({
    mutationFn,
  });
}
