"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";

/**
 * Hook for goal tracking and progress management
 *
 * Features:
 * - Weekly and monthly goal calculations
 * - Progress tracking with achievement states
 * - Configurable targets for workouts, consistency, and volume
 * - Celebration logic for exceeded goals
 * - Error handling and loading states
 */

export type TimeRange = "week" | "month";
export type GoalType = "workouts" | "consistency" | "volume";

export interface Goal {
  id: string;
  type: GoalType;
  label: string;
  current: number;
  target: number;
  unit: string;
  percentage: number;
  status: "exceeded" | "perfect" | "great" | "good" | "needs-work";
  message: string;
  description: string;
}

export interface ProgressGoals {
  goals: Goal[];
  summary: {
    totalGoals: number;
    achievedGoals: number;
    exceededGoals: number;
    overallProgress: number;
  };
  isLoading: boolean;
  error: string | null;
}

export interface UseProgressGoalsOptions {
  timeRange: TimeRange;
  customTargets?: {
    workouts?: number;
    consistency?: number;
    volume?: number;
  };
}

export function useProgressGoals({
  timeRange,
  customTargets,
}: UseProgressGoalsOptions): ProgressGoals {
  // Fetch data based on time range
  const {
    data: workoutDates,
    isLoading: workoutDatesLoading,
    error: workoutDatesError,
  } = api.progress.getWorkoutDates.useQuery({
    timeRange,
  });

  const { data: volumeData, isLoading: volumeLoading } =
    api.progress.getVolumeProgression.useQuery({
      timeRange,
    });

  const { isLoading: consistencyLoading } =
    api.progress.getConsistencyStats.useQuery({
      timeRange,
    });

  const isLoading = workoutDatesLoading || volumeLoading || consistencyLoading;
  const error = workoutDatesError ? workoutDatesError.message : null;

  return useMemo((): ProgressGoals => {
    // Default targets based on time range
    const defaultTargets = {
      week: {
        workouts: 3,
        consistency: 3, // days
        volume: 10000, // lbs
      },
      month: {
        workouts: 12,
        consistency: 12, // days
        volume: 40000, // lbs
      },
    };

    const targets = {
      ...defaultTargets[timeRange],
      ...customTargets,
    };

    // Calculate current values
    const currentWorkouts = workoutDates?.length || 0;
    const currentVolume =
      volumeData?.data?.reduce(
        (sum, session) => sum + (session.totalVolume || 0),
        0,
      ) || 0;

    // Calculate consistency (unique days with workouts)
    const uniqueWorkoutDays = new Set(
      workoutDates?.map((date) => new Date(date).toDateString()) || [],
    ).size;

    // Helper function to determine goal status
    const getGoalStatus = (current: number, target: number) => {
      const percentage = (current / target) * 100;

      if (percentage >= 120) {
        return {
          status: "exceeded" as const,
          message: "🏆 Exceeded!",
          percentage: Math.round(percentage),
        };
      } else if (percentage >= 100) {
        return {
          status: "perfect" as const,
          message: "🎯 Perfect!",
          percentage: 100,
        };
      } else if (percentage >= 75) {
        return {
          status: "great" as const,
          message: "💪 Great progress!",
          percentage: Math.round(percentage),
        };
      } else if (percentage >= 50) {
        return {
          status: "good" as const,
          message: "👍 Good start",
          percentage: Math.round(percentage),
        };
      } else {
        return {
          status: "needs-work" as const,
          message: "Keep pushing!",
          percentage: Math.round(percentage),
        };
      }
    };

    // Create goals array
    const workoutGoalStatus = getGoalStatus(currentWorkouts, targets.workouts);
    const consistencyGoalStatus = getGoalStatus(
      uniqueWorkoutDays,
      targets.consistency,
    );
    const volumeGoalStatus = getGoalStatus(currentVolume, targets.volume);

    const goals: Goal[] = [
      {
        id: `workouts-${timeRange}`,
        type: "workouts",
        label: `${timeRange === "week" ? "Weekly" : "Monthly"} Workouts`,
        current: currentWorkouts,
        target: targets.workouts,
        unit: "workouts",
        percentage: workoutGoalStatus.percentage,
        status: workoutGoalStatus.status,
        message: workoutGoalStatus.message,
        description: `Complete ${targets.workouts}+ workouts ${timeRange === "week" ? "per week" : "per month"}`,
      },
      {
        id: `consistency-${timeRange}`,
        type: "consistency",
        label: `${timeRange === "week" ? "Workout Days" : "Active Days"}`,
        current: uniqueWorkoutDays,
        target: targets.consistency,
        unit: "days",
        percentage: consistencyGoalStatus.percentage,
        status: consistencyGoalStatus.status,
        message: consistencyGoalStatus.message,
        description: `Stay active ${targets.consistency}+ days ${timeRange === "week" ? "per week" : "per month"}`,
      },
      {
        id: `volume-${timeRange}`,
        type: "volume",
        label: `${timeRange === "week" ? "Weekly" : "Monthly"} Volume`,
        current: Math.round(currentVolume),
        target: targets.volume,
        unit: "lbs",
        percentage: volumeGoalStatus.percentage,
        status: volumeGoalStatus.status,
        message: volumeGoalStatus.message,
        description: `Build strength with ${targets.volume.toLocaleString()}+ lbs total volume`,
      },
    ];

    // Calculate summary statistics
    const achievedGoals = goals.filter((goal) => goal.percentage >= 100).length;
    const exceededGoals = goals.filter(
      (goal) => goal.status === "exceeded",
    ).length;
    const totalProgress =
      goals.reduce((sum, goal) => sum + goal.percentage, 0) / goals.length;

    const summary = {
      totalGoals: goals.length,
      achievedGoals,
      exceededGoals,
      overallProgress: Math.round(totalProgress),
    };

    return {
      goals,
      summary,
      isLoading,
      error,
    };
  }, [timeRange, workoutDates, volumeData, customTargets, isLoading, error]);
}

/**
 * Helper function to get goal color scheme based on status
 */
export function getGoalColorScheme(status: Goal["status"]) {
  const colorSchemes = {
    exceeded: {
      gradient: "from-yellow-500 to-amber-500",
      background: "bg-yellow-50 dark:bg-yellow-900/20",
      text: "text-yellow-700 dark:text-yellow-300",
      border: "border-yellow-200 dark:border-yellow-800",
    },
    perfect: {
      gradient: "from-green-500 to-emerald-500",
      background: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-300",
      border: "border-green-200 dark:border-green-800",
    },
    great: {
      gradient: "from-blue-500 to-cyan-500",
      background: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-800",
    },
    good: {
      gradient: "from-orange-500 to-red-500",
      background: "bg-orange-50 dark:bg-orange-900/20",
      text: "text-orange-700 dark:text-orange-300",
      border: "border-orange-200 dark:border-orange-800",
    },
    "needs-work": {
      gradient: "from-gray-400 to-gray-500",
      background: "bg-gray-50 dark:bg-gray-900/20",
      text: "text-gray-700 dark:text-gray-300",
      border: "border-gray-200 dark:border-gray-800",
    },
  };

  return colorSchemes[status];
}

/**
 * Utility to get appropriate celebration message based on multiple goals
 */
export function getCelebrationMessage(
  summary: ProgressGoals["summary"],
): string | null {
  const { achievedGoals, exceededGoals, totalGoals, overallProgress } = summary;

  if (exceededGoals === totalGoals) {
    return "🏆 All goals exceeded! You're crushing it!";
  } else if (achievedGoals === totalGoals) {
    return "🎯 Perfect! All goals achieved!";
  } else if (exceededGoals > 0) {
    return "🔥 Great work! Some goals exceeded!";
  } else if (achievedGoals > 0) {
    return "💪 Nice progress! Keep it up!";
  } else if (overallProgress >= 50) {
    return "👍 Good momentum! You're halfway there!";
  }

  return null;
}
