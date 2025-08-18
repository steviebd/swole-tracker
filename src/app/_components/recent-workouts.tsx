"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export function RecentWorkouts() {
  const { data: workouts, isLoading, error } = api.workouts.getRecent.useQuery({ limit: 3 });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-muted-foreground py-4">
        Failed to load recent workouts
      </div>
    );
  }

  if (!workouts || workouts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No recent workouts found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <Link
          key={workout.id}
          href={`/workout/session/${workout.id}`}
          className="block p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">
                {workout.template?.name || "Unknown Template"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {new Date(workout.workoutDate).toLocaleDateString()}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {workout.exercises?.length || 0} exercises
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}