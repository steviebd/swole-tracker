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
          <div key={i} className="glass-surface card animate-pulse p-4">
            <div className="mb-2 h-4 w-1/3 rounded bg-gray-700"></div>
            <div className="h-3 w-2/3 rounded bg-gray-700"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card glass-surface border-red-700/50 p-4">
        <p className="text-red-300">Error loading workouts: {error.message}</p>
      </div>
    );
  }

  if (!workouts?.length) {
    return (
      <div className="card glass-surface p-4">
        <p className="text-secondary py-4 text-center">
          No recent workouts. Start your first workout!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <div key={workout.id} className="card glass-surface relative p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-medium">
              {workout.template?.name ?? "Unknown Template"}
            </h4>
            <div className="text-muted text-xs">
              {new Date(workout.workoutDate).toLocaleDateString()}
            </div>
          </div>

          <div className="text-secondary mb-2 text-sm">
            {(() => {
              const uniqueExercises = new Set(
                workout.exercises.map((exercise) => exercise.exerciseName),
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
