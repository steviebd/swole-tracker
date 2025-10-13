"use client";

import { useAuth } from "~/providers/AuthProvider";
import { api } from "~/trpc/react";
import Link from "next/link";

interface WorkoutWithTemplate {
  id: number;
  templateId: number;
  workoutDate: string;
  createdAt: string;
  template_name: string | null;
  exercise_count: number;
}

export function RecentWorkouts() {
  const { user } = useAuth();

  // Use tRPC to fetch recent workouts
  const {
    data: recentWorkouts,
    isLoading,
    error,
  } = api.workouts.getRecent.useQuery({ limit: 3 }, { enabled: !!user?.id });

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
              {new Date(workout.workoutDate).toLocaleDateString()}
            </div>
          </div>

          <div className="text-secondary mb-2 text-sm">
            {workout.exercises?.length || 0} exercise
            {(workout.exercises?.length || 0) !== 1 ? "s" : ""} logged
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/workout/session/${workout.id}`}
              className="link-primary no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              View
            </Link>
            <Link
              href={`/workout/start?templateId=${workout.templateId}`}
              className="text-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Repeat
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
