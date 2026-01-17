import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getRecentWorkouts,
  getWorkout,
  startWorkout,
  saveWorkout,
  deleteWorkout,
  getLastExerciseData,
} from "~/server/functions/workouts";

export const recentWorkoutsQueryOptions = (limit?: number) =>
  queryOptions({
    queryKey: ["recentWorkouts", limit],
    queryFn: () => getRecentWorkouts({ data: { limit } }),
    staleTime: 1000 * 60 * 5,
  });

export const workoutQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ["workout", id],
    queryFn: () => getWorkout({ data: { id } }),
  });

export function useRecentWorkouts(limit?: number) {
  return useSuspenseQuery(recentWorkoutsQueryOptions(limit));
}

export function useWorkout(id: number) {
  return useSuspenseQuery(workoutQueryOptions(id));
}

export function useStartWorkout() {
  const mutationFn = useServerFn(startWorkout);
  return useMutation({
    mutationFn,
    onSuccess: () => {
      // Invalidate recent workouts cache
      return Promise.resolve();
    },
  });
}

export function useSaveWorkout() {
  const mutationFn = useServerFn(saveWorkout);
  return useMutation({
    mutationFn,
  });
}

export function useDeleteWorkout() {
  const mutationFn = useServerFn(deleteWorkout);
  return useMutation({
    mutationFn,
    onSuccess: () => {
      // Invalidate recent workouts cache
      return Promise.resolve();
    },
  });
}

export function useLastExerciseData() {
  const mutationFn = useServerFn(getLastExerciseData);
  return useMutation({
    mutationFn,
  });
}
