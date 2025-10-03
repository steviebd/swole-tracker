"use client";

import { useMemo } from "react";
import { useWorkoutStats } from "./use-workout-stats";
import { useProgressGoals } from "./use-progress-goals";
import { api } from "~/trpc/react";
import {
  buildWorkoutSummary,
  type RecentWorkout,
} from "~/lib/workout-metrics";

/**
 * Combined dashboard data hook for unified loading states and data coordination
 * 
 * Features:
 * - Coordinates all dashboard data fetching
 * - Provides unified loading and error states
 * - Combines workout stats and progress goals
 * - Handles recent workouts data
 * - Optimizes re-renders with proper memoization
 * - Provides helper functions for UI display
 */

export interface DashboardData {
  // Workout statistics
  stats: ReturnType<typeof useWorkoutStats>;
  
  // Progress goals (can switch between week/month)
  weeklyGoals: ReturnType<typeof useProgressGoals>;
  monthlyGoals: ReturnType<typeof useProgressGoals>;
  
  // Recent workouts
  recentWorkouts: {
    data: any[] | undefined;
    isLoading: boolean;
    error: string | null;
  };
  
  // Combined states
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  
  // Helper functions
  helpers: {
    getLoadingState: () => "loading" | "error" | "success";
    getRecentWorkoutMetrics: (workout: any) => Array<{ label: string; value: string }>;
    shouldShowCelebration: () => boolean;
    getCelebrationMessage: () => string | null;
  };
}

export interface UseDashboardDataOptions {
  // Number of recent workouts to fetch
  recentWorkoutsLimit?: number;
  
  // Custom goal targets
  customTargets?: {
    weekly?: {
      workouts?: number;
      consistency?: number;
      volume?: number;
    };
    monthly?: {
      workouts?: number;
      consistency?: number;
      volume?: number;
    };
  };
  
  // Whether to fetch goals data (can disable for performance)
  includeGoals?: boolean;
  
  // Whether to fetch recent workouts
  includeRecentWorkouts?: boolean;
}

export function useDashboardData({
  recentWorkoutsLimit = 5,
  customTargets,
  includeGoals = true,
  includeRecentWorkouts = true,
}: UseDashboardDataOptions = {}): DashboardData {
  
  // Fetch workout statistics
  const stats = useWorkoutStats();
  
  // Fetch progress goals for both time ranges
  const weeklyGoals = useProgressGoals({
    timeRange: "week",
    customTargets: customTargets?.weekly,
  });
  
  const monthlyGoals = useProgressGoals({
    timeRange: "month",
    customTargets: customTargets?.monthly,
  });
  
  // Fetch recent workouts
  const {
    data: recentWorkoutsData,
    isLoading: recentWorkoutsLoading,
    error: recentWorkoutsError,
  } = api.workouts.getRecent.useQuery(
    { limit: recentWorkoutsLimit },
    { enabled: includeRecentWorkouts }
  );

  // Combined loading and error states
  const isLoading = useMemo(() => {
    return stats.isLoading || 
           (includeGoals && (weeklyGoals.isLoading || monthlyGoals.isLoading)) ||
           (includeRecentWorkouts && recentWorkoutsLoading);
  }, [stats.isLoading, weeklyGoals.isLoading, monthlyGoals.isLoading, recentWorkoutsLoading, includeGoals, includeRecentWorkouts]);

  const errorMessage = useMemo(() => {
    return stats.error || 
           weeklyGoals.error || 
           monthlyGoals.error || 
           (recentWorkoutsError?.message || null);
  }, [stats.error, weeklyGoals.error, monthlyGoals.error, recentWorkoutsError]);

  const hasError = Boolean(errorMessage);

  // Helper functions
  const helpers = useMemo(() => ({
    getLoadingState: (): "loading" | "error" | "success" => {
      if (isLoading) return "loading";
      if (hasError) return "error";
      return "success";
    },

    getRecentWorkoutMetrics: (workout: RecentWorkout | any) =>
      buildWorkoutSummary(workout as RecentWorkout).metrics,

    shouldShowCelebration: () => {
      // Show celebration if any weekly goals exceeded or perfect
      const weeklyExceeded = weeklyGoals.goals.some(goal => 
        goal.status === "exceeded" || goal.status === "perfect"
      );
      
      // Or if current streak is noteworthy
      const greatStreak = stats.currentStreak >= 5;
      
      // Or if weekly goals achieved
      const weeklyAchieved = weeklyGoals.summary.achievedGoals > 0;
      
      return weeklyExceeded || greatStreak || weeklyAchieved;
    },

    getCelebrationMessage: () => {
      const { summary: weeklySummary } = weeklyGoals;
      const { currentStreak, goalAchievement } = stats;

      // Priority order for celebration messages
      if (weeklySummary.exceededGoals === weeklySummary.totalGoals) {
        return "🏆 All weekly goals exceeded! Outstanding!";
      } else if (weeklySummary.achievedGoals === weeklySummary.totalGoals) {
        return "🎯 Perfect week! All goals achieved!";
      } else if (currentStreak >= 7) {
        return "🔥 7+ day streak! You're on fire!";
      } else if (weeklySummary.exceededGoals > 0) {
        return "💪 Great work! Some goals exceeded!";
      } else if (goalAchievement?.includes("Perfect")) {
        return "🎯 Weekly workout goal achieved!";
      } else if (currentStreak >= 3) {
        return "📈 Building momentum! Great streak!";
      }

      return null;
    },
  }), [isLoading, hasError, stats, weeklyGoals]);

  return {
    stats,
    weeklyGoals,
    monthlyGoals,
    recentWorkouts: {
      data: recentWorkoutsData,
      isLoading: recentWorkoutsLoading,
      error: recentWorkoutsError?.message || null,
    },
    isLoading,
    hasError,
    errorMessage,
    helpers,
  };
}

/**
 * Lightweight hook for just checking if we should show dashboard loading
 * Useful for parent components that need to coordinate loading states
 */
export function useDashboardLoadingState(): {
  isLoading: boolean;
  error: string | null;
} {
  const { isLoading, errorMessage } = useDashboardData({
    includeGoals: false,
    includeRecentWorkouts: false,
  });

  return {
    isLoading,
    error: errorMessage,
  };
}
