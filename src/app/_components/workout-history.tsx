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
              (() => {
                // Group exercises by name and calculate summary
                const exerciseGroups = new Map<string, typeof workout.exercises>();
                workout.exercises.forEach((exercise) => {
                  if (!exerciseGroups.has(exercise.exerciseName)) {
                    exerciseGroups.set(exercise.exerciseName, []);
                  }
                  exerciseGroups.get(exercise.exerciseName)!.push(exercise);
                });

                return Array.from(exerciseGroups.entries()).map(([exerciseName, sets]) => {
                  // Find the best set (highest weight)
                  const bestSet = sets.reduce((best, current) => {
                    const currentWeight = current.weight ? parseFloat(current.weight) : 0;
                    const bestWeight = best.weight ? parseFloat(best.weight) : 0;
                    return currentWeight > bestWeight ? current : best;
                  });

                  const totalSets = sets.reduce((sum, set) => sum + (set.sets ?? 0), 0);

                  return (
                    <div key={exerciseName} className="text-sm">
                      <span className="text-gray-300">{exerciseName}:</span>{" "}
                      {bestSet.weight && (
                        <span>
                          {bestSet.weight}
                          {bestSet.unit}
                        </span>
                      )}
                      {bestSet.weight && bestSet.reps && " × "}
                      {bestSet.reps && <span>{bestSet.reps} reps</span>}
                      {(bestSet.reps ?? bestSet.weight) && totalSets > 0 && " × "}
                      {totalSets > 0 && <span>{totalSets} sets</span>}
                    </div>
                  );
                });
              })()
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
