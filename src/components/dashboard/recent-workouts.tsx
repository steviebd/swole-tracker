"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { WorkoutCard, type WorkoutMetric } from "~/components/ui/workout-card";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

/**
 * Recent workouts section using Phase 2 WorkoutCard components
 * 
 * Features:
 * - Workout cards with gradient backgrounds
 * - Key metrics (duration, volume, exercise count)
 * - Action buttons (view details, repeat workout)
 * - "New!" badges for recent sessions (within 24 hours)
 * - Mobile-optimized with touch targets
 * - Integration with existing tRPC endpoints
 */

export interface RecentWorkoutsProps {
  /** Additional CSS classes */
  className?: string;
  /** Maximum number of workouts to display */
  limit?: number;
}

const RecentWorkouts = React.forwardRef<HTMLDivElement, RecentWorkoutsProps>(
  ({ className, limit = 5 }, ref) => {
    const router = useRouter();

    // Fetch recent workouts
    const { data: recentWorkouts, isLoading, error } = api.workouts.getRecent.useQuery({
      limit: limit,
    });

    const handleRepeatWorkout = React.useCallback((workoutId: string, workoutName: string) => {
      // Navigate to start workout with template based on the workout
      console.log(`Repeating workout: ${workoutName} (ID: ${workoutId})`);
      // TODO: Implement workout repeat logic
      // This would typically create a new workout session based on the previous one
      router.push(`/workout/start?repeat=${workoutId}`);
    }, [router]);

    const handleViewDetails = React.useCallback((workoutId: string) => {
      router.push(`/workouts/${workoutId}`);
    }, [router]);

    const formatWorkoutMetrics = (workout: any): WorkoutMetric[] => {
      const metrics: WorkoutMetric[] = [];

      // Duration (estimate based on sets, or use actual if available)
      if (workout.duration) {
        metrics.push({
          label: "Duration",
          value: `${Math.round(workout.duration)}min`
        });
      } else if (workout.totalSets) {
        // Estimate 3.5 minutes per set
        const estimatedDuration = Math.round(workout.totalSets * 3.5);
        metrics.push({
          label: "Duration",
          value: `~${estimatedDuration}min`
        });
      }

      // Total volume (if available)
      if (workout.totalVolume) {
        metrics.push({
          label: "Volume",
          value: `${Math.round(workout.totalVolume)}lbs`
        });
      } else if (workout.totalSets) {
        metrics.push({
          label: "Sets",
          value: workout.totalSets.toString()
        });
      }

      // Exercise count
      if (workout.exerciseCount) {
        metrics.push({
          label: "Exercises",
          value: workout.exerciseCount.toString()
        });
      } else if (workout.exercises?.length) {
        metrics.push({
          label: "Exercises",
          value: workout.exercises.length.toString()
        });
      }

      // Ensure we have exactly 3 metrics for consistent layout
      while (metrics.length < 3) {
        metrics.push({ label: "—", value: "—" });
      }

      return metrics.slice(0, 3);
    };

    const isRecentWorkout = (createdAt: string | Date): boolean => {
      const workoutDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
      const now = new Date();
      const diffInHours = (now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60);
      return diffInHours <= 24;
    };

    if (error) {
      return (
        <div ref={ref} className={cn("space-y-4", className)}>
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Workouts</h2>
          <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
            <p>Unable to load recent workouts</p>
            <p className="text-sm mt-2">Please try again later</p>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div ref={ref} className={cn("space-y-4", className)}>
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Workouts</h2>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-[200px] bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (!recentWorkouts || recentWorkouts.length === 0) {
      return (
        <div ref={ref} className={cn("space-y-4", className)}>
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Workouts</h2>
          <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-lg">
            <div className="mb-4 text-4xl">💪</div>
            <h3 className="text-lg font-medium text-foreground mb-2">No workouts yet</h3>
            <p className="mb-4">Start your first workout to see it appear here</p>
            <button
              onClick={() => router.push("/workout/start")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Start Your First Workout
            </button>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Recent Workouts</h2>
          {recentWorkouts.length >= limit && (
            <button
              onClick={() => router.push("/workouts")}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              View All →
            </button>
          )}
        </div>

        <div className="space-y-3">
          {recentWorkouts.map((workout) => {
            const workoutName = workout.template?.name || "Unnamed Workout";
            const metrics = formatWorkoutMetrics(workout);
            const isRecent = isRecentWorkout(workout.createdAt);

            return (
              <WorkoutCard
                key={workout.id}
                workoutName={workoutName}
                date={workout.createdAt.toISOString()}
                metrics={metrics}
                isRecent={isRecent}
                onRepeat={() => handleRepeatWorkout(workout.id.toString(), workoutName)}
                onViewDetails={() => handleViewDetails(workout.id.toString())}
              />
            );
          })}
        </div>
      </div>
    );
  }
);

RecentWorkouts.displayName = "RecentWorkouts";

export { RecentWorkouts };