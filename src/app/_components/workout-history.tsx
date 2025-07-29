"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export function WorkoutHistory() {
  const { data: workouts, isLoading } = api.workouts.getRecent.useQuery({
    limit: 50,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...(Array(5) as number[])].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg bg-gray-800 p-4">
            <div className="mb-2 h-4 w-1/3 rounded bg-gray-700"></div>
            <div className="mb-2 h-3 w-1/2 rounded bg-gray-700"></div>
            <div className="h-3 w-2/3 rounded bg-gray-700"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!workouts?.length) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-6xl">🏋️</div>
        <h3 className="mb-2 text-xl font-semibold">No workouts yet</h3>
        <p className="mb-6 text-gray-400">
          Start your first workout to see your history here
        </p>
        <Link
          href="/workout/start"
          className="rounded-lg bg-purple-600 px-6 py-3 font-medium transition-colors hover:bg-purple-700"
        >
          Start First Workout
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workouts.map((workout) => (
        <div key={workout.id} className="rounded-lg bg-gray-800 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{workout.template.name}</h3>
            <div className="text-sm text-gray-400">
              {new Date(workout.workoutDate).toLocaleDateString()}
            </div>
          </div>

          <div className="mb-3 text-sm text-gray-400">
            {new Date(workout.workoutDate).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          {/* Exercise Summary */}
          <div className="mb-4 space-y-1">
            {workout.exercises.length === 0 ? (
              <p className="text-sm text-gray-500">No exercises logged</p>
            ) : (
              workout.exercises.map((exercise) => (
                <div key={exercise.id} className="text-sm">
                  <span className="text-gray-300">
                    {exercise.exerciseName}:
                  </span>{" "}
                  {exercise.weight && (
                    <span>
                      {exercise.weight}
                      {exercise.unit}
                    </span>
                  )}
                  {exercise.weight && exercise.reps && " × "}
                  {exercise.reps && <span>{exercise.reps} reps</span>}
                  {(exercise.reps ?? exercise.weight) && exercise.sets && " × "}
                  {exercise.sets && <span>{exercise.sets} sets</span>}
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href={`/workout/session/${workout.id}`}
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              View Details
            </Link>
            <Link
              href={`/workout/start?templateId=${workout.templateId}`}
              className="rounded bg-purple-600 px-3 py-1 text-sm transition-colors hover:bg-purple-700"
            >
              Repeat Workout
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
