"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export function WorkoutHistory() {
  const { data: workouts, isLoading } = api.workouts.getRecent.useQuery({ limit: 50 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5) as number[]].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!workouts?.length) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏋️</div>
        <h3 className="text-xl font-semibold mb-2">No workouts yet</h3>
        <p className="text-gray-400 mb-6">
          Start your first workout to see your history here
        </p>
        <Link
          href="/workout/start"
          className="bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg px-6 py-3 font-medium"
        >
          Start First Workout
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workouts.map((workout) => (
        <div key={workout.id} className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">{workout.template.name}</h3>
            <div className="text-sm text-gray-400">
              {new Date(workout.workoutDate).toLocaleDateString()}
            </div>
          </div>
          
          <div className="text-sm text-gray-400 mb-3">
            {new Date(workout.workoutDate).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>

          {/* Exercise Summary */}
          <div className="space-y-1 mb-4">
            {workout.exercises.length === 0 ? (
              <p className="text-gray-500 text-sm">No exercises logged</p>
            ) : (
              workout.exercises.map((exercise) => (
                <div key={exercise.id} className="text-sm">
                  <span className="text-gray-300">{exercise.exerciseName}:</span>{" "}
                  {exercise.weight && (
                    <span>
                      {exercise.weight}{exercise.unit}
                    </span>
                  )}
                  {exercise.weight && exercise.reps && " × "}
                  {exercise.reps && (
                    <span>{exercise.reps} reps</span>
                  )}
                  {(exercise.reps ?? exercise.weight) && exercise.sets && " × "}
                  {exercise.sets && (
                    <span>{exercise.sets} sets</span>
                  )}
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
              className="text-sm bg-purple-600 hover:bg-purple-700 transition-colors rounded px-3 py-1"
            >
              Repeat Workout
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
