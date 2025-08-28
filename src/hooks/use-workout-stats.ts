"use client";

import { useMemo } from "react";
import { useSharedWorkoutData } from "./use-shared-workout-data";

/**
 * Hook for calculating workout statistics and comparisons
 * 
 * Features:
 * - This week vs last week workout count comparison
 * - Average duration calculations from volume data
 * - Current streak calculations with achievement levels
 * - Weekly goal tracking with progress percentages
 * - Memoized calculations for performance
 */

export interface WorkoutStats {
  workoutsThisWeek: number;
  workoutsLastWeek: number;
  weeklyChange: string | undefined;
  avgDuration: string;
  durationChange: string | undefined;
  currentStreak: number;
  streakAchievement: string | undefined;
  weeklyGoal: {
    current: number;
    target: number;
    percentage: number;
  };
  goalAchievement: string | undefined;
  isLoading: boolean;
  error: string | null;
}

export function useWorkoutStats(): WorkoutStats {
  // Use shared data to avoid duplicate API calls
  const {
    thisWeekWorkouts,
    thisWeekVolume,
    lastWeekWorkouts,
    monthWorkouts: streakWorkouts,
    isLoading,
    error,
  } = useSharedWorkoutData();

  return useMemo((): WorkoutStats => {
    const workoutsThisWeek = thisWeekWorkouts.length || 0;
    const workoutsLastWeek = lastWeekWorkouts.length || 0;

    // Calculate weekly change percentage
    let weeklyChange: string | undefined;
    if (workoutsLastWeek > 0) {
      const changePercent = ((workoutsThisWeek - workoutsLastWeek) / workoutsLastWeek) * 100;
      weeklyChange = `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
    } else if (workoutsThisWeek > 0) {
      weeklyChange = "New!";
    }

    // Calculate average duration
    let avgDuration = "0min";
    let durationChange: string | undefined;
    
    if (thisWeekVolume && thisWeekVolume.length > 0) {
      const totalSets = thisWeekVolume.reduce((sum, session) => sum + session.totalSets, 0);
      const avgSets = totalSets / thisWeekVolume.length;
      // Estimate 3-4 minutes per set including rest
      const estimatedMinutes = Math.round(avgSets * 3.5);
      avgDuration = `${estimatedMinutes}min`;
      
      // Simple duration improvement indicator
      if (avgSets >= 15) {
        durationChange = "+5%";
      } else if (avgSets >= 12) {
        durationChange = "+2%";
      } else if (avgSets < 8) {
        durationChange = "-3%";
      }
    }

    // Calculate current streak
    const calculateStreak = (dates: string[] = []): number => {
      if (dates.length === 0) return 0;
      
      const workoutDates = dates.map(date => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
      }).sort((a, b) => b.getTime() - a.getTime());
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let streak = 0;
      let currentDate = new Date(today);
      
      for (const workoutDate of workoutDates) {
        if (workoutDate.getTime() === currentDate.getTime()) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (workoutDate.getTime() < currentDate.getTime()) {
          // Check if it's yesterday (allow 1 day gap)
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (streak === 0 && workoutDate.getTime() === yesterday.getTime()) {
            streak++;
            currentDate.setDate(workoutDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
      
      return streak;
    };

    const currentStreak = calculateStreak(streakWorkouts);
    
    // Streak achievement messages
    let streakAchievement: string | undefined;
    if (currentStreak >= 7) {
      streakAchievement = "🔥 On Fire!";
    } else if (currentStreak >= 5) {
      streakAchievement = "💪 Strong!";
    } else if (currentStreak >= 3) {
      streakAchievement = "📈 Building!";
    }

    // Weekly goal tracking (target: 3 workouts per week)
    const weeklyGoal = {
      current: workoutsThisWeek,
      target: 3,
      percentage: Math.min((workoutsThisWeek / 3) * 100, 100),
    };

    // Goal achievement messages
    let goalAchievement: string | undefined;
    if (weeklyGoal.percentage >= 100) {
      if (weeklyGoal.current > weeklyGoal.target) {
        goalAchievement = "🏆 Exceeded!";
      } else {
        goalAchievement = "🎯 Perfect!";
      }
    } else if (weeklyGoal.percentage >= 67) {
      goalAchievement = "💪 Great!";
    } else if (weeklyGoal.percentage >= 33) {
      goalAchievement = "👍 Good start";
    }

    return {
      workoutsThisWeek,
      workoutsLastWeek,
      weeklyChange,
      avgDuration,
      durationChange,
      currentStreak,
      streakAchievement,
      weeklyGoal,
      goalAchievement,
      isLoading,
      error,
    };
  }, [
    thisWeekWorkouts,
    lastWeekWorkouts,
    thisWeekVolume,
    streakWorkouts,
    isLoading,
    error,
  ]);
}

/**
 * Utility function to format workout statistics for display
 */
export function formatWorkoutStats(stats: WorkoutStats) {
  return {
    thisWeekDisplay: {
      value: stats.workoutsThisWeek.toString(),
      change: stats.weeklyChange,
      label: "This Week",
    },
    durationDisplay: {
      value: stats.avgDuration,
      change: stats.durationChange,
      label: "Avg Duration",
    },
    streakDisplay: {
      value: `${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}`,
      change: stats.streakAchievement,
      label: "Current Streak",
    },
    goalDisplay: {
      value: `${stats.weeklyGoal.current}/${stats.weeklyGoal.target}`,
      change: stats.goalAchievement,
      label: "Weekly Goal",
      percentage: Math.round(stats.weeklyGoal.percentage),
    },
  };
}