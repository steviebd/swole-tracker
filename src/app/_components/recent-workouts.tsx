"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export function RecentWorkouts() {
  const { data: workouts, isLoading, isStale, isFetching } = api.workouts.getRecent.useQuery(
    { limit: 3 },
    {
      // Enhanced caching for better performance
      staleTime: 2 * 60 * 1000, // 2 minutes - consider fresh for longer
      gcTime: 10 * 60 * 1000, // 10 minutes in cache
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3) as number[]].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!workouts?.length) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-center py-4">
          No recent workouts. Start your first workout!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <div key={workout.id} className="bg-gray-800 rounded-lg p-4 relative">
          {isStale && isFetching && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          )}
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{workout.template.name}</h4>
            <div className="text-xs text-gray-400">
              {new Date(workout.workoutDate).toLocaleDateString()}
            </div>
          </div>
          
          <div className="text-sm text-gray-400 mb-2">
            {workout.exercises.length} exercise{workout.exercises.length !== 1 ? "s" : ""} logged
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/workout/session/${workout.id}`}
              className="text-purple-400 hover:text-purple-300"
            >
              View
            </Link>
            <Link
              href={`/workout/start?templateId=${workout.templateId}`}
              className="text-gray-400 hover:text-white"
            >
              Repeat
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
