"use client";

import { useQuery } from "convex/react";
import { api } from "~/convex/_generated/api";
import { useAuth } from "~/providers/AuthProvider";
import Link from "next/link";

export function RecentWorkouts() {
  const { user } = useAuth();
  const workouts = useQuery(api.workouts.getWorkouts, user ? {} : "skip");

  if (!user) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Recent Workouts</h3>
        </div>
        <div className="p-6 pt-0">
          <p className="text-sm text-muted-foreground">Please sign in to view your workouts.</p>
        </div>
      </div>
    );
  }

  if (workouts === undefined) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Recent Workouts</h3>
        </div>
        <div className="p-6 pt-0 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!recentWorkouts.length) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Recent Workouts</h3>
        </div>
        <div className="p-6 pt-0">
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent workouts. Start your first workout!
          </p>
          <Link
            href="/workout/start"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4 w-full"
          >
            Start First Workout
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6 pb-4">
        <h3 className="text-2xl font-semibold leading-none tracking-tight">Recent Workouts</h3>
      </div>
      <div className="p-6 pt-0 space-y-3">
        {recentWorkouts.map((workout) => (
          <div key={workout._id} className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">
                {workout.templateName || "Quick Workout"}
              </h4>
              <div className="text-xs text-muted-foreground">
                {new Date(workout.workoutDate || workout._creationTime).toLocaleDateString()}
              </div>
            </div>

            <div className="text-sm text-muted-foreground mb-2">
              {workout.exercises?.length || 0} exercise{(workout.exercises?.length || 0) !== 1 ? "s" : ""} logged
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Link
                href={`/workout/session/${workout._id}`}
                className="text-primary hover:underline"
              >
                View
              </Link>
              {workout.templateId && (
                <Link
                  href={`/workout/start?templateId=${workout.templateId}`}
                  className="text-muted-foreground hover:text-primary"
                >
                  Repeat
                </Link>
              )}
            </div>
          </div>
        ))}
        <div className="text-center pt-2">
          <Link
            href="/workouts"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            View all workouts →
          </Link>
        </div>
      </div>
    </div>
  );
}
