"use client";

import React, { useEffect } from "react";
import { useAuth } from "~/providers/AuthProvider";
import { api } from "~/trpc/react";
import Link from "next/link";

interface WorkoutWithTemplate {
  id: number;
  templateId: number;
  workoutDate: string;
  createdAt: string;
  template: {
    id: number;
    name: string;
  } | null;
  exercises: Array<{
    id: number;
    exerciseName: string;
    weight: number | null;
    reps: number | null;
    sets: number;
    unit: "kg" | "lbs";
    setOrder: number;
    templateExerciseId: number | null;
    one_rm_estimate: number | null;
    volume_load: number | null;
  }>;
}

export function RecentWorkouts() {
  const { user } = useAuth();

  // Use tRPC to fetch recent workouts
  const {
    data: recentWorkouts,
    isLoading,
    error,
    refetch,
  } = api.workouts.getRecent.useQuery(
    { limit: 3 },
    {
      enabled: !!user, // Only fetch when user is authenticated
    },
  );

  // Log when workouts are fetched successfully
  useEffect(() => {
    if (recentWorkouts && recentWorkouts.length > 0) {
      console.info(
        `[RECENT_WORKOUTS] Fetched ${recentWorkouts.length} workouts at ${new Date().toISOString()}`,
        recentWorkouts,
      );
    }
  }, [recentWorkouts]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...(Array(3) as number[])].map((_, i) => (
          <div key={i} className="glass-surface card animate-pulse p-4">
            <div className="skeleton mb-2 h-4 w-1/3"></div>
            <div className="skeleton h-3 w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card glass-surface border-[var(--color-danger)]/50 p-4">
        <p className="text-[var(--color-danger)]">Error loading workouts</p>
      </div>
    );
  }

  if (!recentWorkouts?.length) {
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
      {recentWorkouts.map((workout) => (
        <div key={workout.id} className="card glass-surface relative p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-medium">
              {workout.template?.name ?? "Unknown Template"}
            </h4>
            <div className="text-muted text-xs">
              {new Date(workout.workoutDate).toLocaleDateString("en-US")}
            </div>
          </div>

          <div className="text-secondary mb-2 text-sm">
            {workout.exercises?.length || 0} exercise
            {(workout.exercises?.length || 0) !== 1 ? "s" : ""} logged
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/workout/session/${workout.id}`}
              className="link-primary focus-visible:ring-primary/40 focus-visible:ring-offset-background no-underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              View
            </Link>
            <Link
              href={`/workout/start?templateId=${workout.templateId}`}
              className="text-secondary hover:text-primary focus-visible:ring-primary/40 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Repeat
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
