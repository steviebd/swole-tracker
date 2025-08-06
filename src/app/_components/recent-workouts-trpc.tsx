"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export function RecentWorkoutsTRPC() {
  const {
    data: workouts,
    isLoading,
    error,
  } = api.workouts.getRecent.useQuery({ limit: 3 });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...(Array(3) as number[])].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 bg-red-50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-100 dark:border-red-700">
        <p>Error loading workouts: {error.message}</p>
      </div>
    );
  }

  if (!workouts?.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="py-4 text-center text-secondary">
          No recent workouts. Start your first workout!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <div key={workout.id} className="relative card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-medium">
              {workout.template?.name ?? "Unknown Template"}
            </h4>
            <div className="text-xs text-muted">
              {new Date(workout.workoutDate).toLocaleDateString()}
            </div>
          </div>

          <div className="mb-2 text-sm text-secondary">
            {(() => {
              const uniqueExercises = new Set(
                workout.exercises.map(exercise => exercise.exerciseName)
              ).size;
              return `${uniqueExercises} exercise${uniqueExercises !== 1 ? "s" : ""} logged`;
            })()}
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/workout/session/${workout.id}`}
              className="link-primary no-underline"
            >
              View
            </Link>
            <Link
              href={`/workout/start?templateId=${workout.templateId}`}
              className="text-secondary hover:text-gray-900 dark:hover:text-white"
            >
              Repeat
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
