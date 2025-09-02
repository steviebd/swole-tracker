"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { WorkoutCard, type WorkoutMetric } from "~/components/ui/workout-card";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Plus } from "lucide-react";

/**
 * Recent workouts section with enhanced template-style design
 * 
 * Features:
 * - Enhanced workout cards with gradient backgrounds and glass effects
 * - Key metrics (duration, volume, exercise count) with smooth animations
 * - Action buttons (view details, repeat workout) with hover states
 * - "New!" badges for recent sessions (within 24 hours)
 * - Mobile-first responsive design with touch-optimized targets
 * - Smooth entry/exit animations with staggered loading
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
        <div ref={ref} className={cn("space-y-4 sm:space-y-6", className)}>
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl sm:text-2xl font-display font-bold text-foreground mb-4 sm:mb-6"
          >
            Recent Workouts
          </motion.h2>
          <div className="space-y-3 sm:space-y-4">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="animate-pulse"
              >
                <div className="h-[180px] sm:h-[200px] bg-muted rounded-xl glass-surface" />
              </motion.div>
            ))}
          </div>
        </div>
      );
    }

    if (!recentWorkouts || recentWorkouts.length === 0) {
      return (
        <div ref={ref} className={cn("space-y-4 sm:space-y-6", className)}>
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl sm:text-2xl font-display font-bold text-foreground mb-4 sm:mb-6"
          >
            Recent Workouts
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="glass-surface p-8 sm:p-12 text-center rounded-xl relative overflow-hidden"
          >
            {/* Gradient background overlay */}
            <div 
              className="absolute inset-0 opacity-5"
              style={{
                background: 'var(--gradient-universal-action-primary)'
              }}
              aria-hidden="true"
            />
            
            {/* Content */}
            <div className="relative z-10">
              <motion.div 
                className="mb-6 text-5xl sm:text-6xl"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
              >
                💪
              </motion.div>
              <h3 className="text-lg sm:text-xl font-display font-bold text-foreground mb-2">No workouts yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Start your first workout to see it appear here and begin tracking your fitness journey</p>
              <motion.button
                onClick={() => router.push("/workout/start")}
                className={cn(
                  "inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium",
                  "transition-all duration-200 hover:scale-105 active:scale-95",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "shadow-lg hover:shadow-xl"
                )}
                style={{
                  background: 'var(--gradient-universal-action-primary)'
                }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="w-5 h-5" />
                Start Your First Workout
              </motion.button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("space-y-4 sm:space-y-6", className)}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">Recent Workouts</h2>
          {recentWorkouts.length >= limit && (
            <motion.button
              onClick={() => router.push("/workouts")}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 rounded-lg",
                "text-sm font-medium text-primary hover:text-primary/80",
                "transition-all duration-200 hover:bg-primary/5",
                "focus:outline-none focus:ring-2 focus:ring-primary/20"
              )}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.95 }}
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}
        </motion.div>

        <AnimatePresence mode="popLayout">
          <div className="space-y-3 sm:space-y-4">
            {recentWorkouts.map((workout, index) => {
              const workoutName = workout.template?.name || "Unnamed Workout";
              const metrics = formatWorkoutMetrics(workout);
              const isRecent = isRecentWorkout(workout.createdAt);

              return (
                <motion.div
                  key={workout.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    duration: 0.2, 
                    delay: index * 0.05,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                >
                  <WorkoutCard
                    workoutName={workoutName}
                    date={workout.createdAt.toISOString()}
                    metrics={metrics}
                    isRecent={isRecent}
                    onRepeat={() => handleRepeatWorkout(workout.id.toString(), workoutName)}
                    onViewDetails={() => handleViewDetails(workout.id.toString())}
                  />
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </div>
    );
  }
);

RecentWorkouts.displayName = "RecentWorkouts";

export { RecentWorkouts };