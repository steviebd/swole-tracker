"use client";

import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";

export function StatsCards() {
  const { theme, resolvedTheme } = useTheme();
  
  // Get real data from ProgressDashboard API
  const { isLoading: consistencyLoading } = api.progress.getConsistencyStats.useQuery({
    timeRange: "week",
  });
  
  const { data: volumeData, isLoading: volumeLoading } = api.progress.getVolumeProgression.useQuery({
    timeRange: "week",
  });

  const { data: workoutDates, isLoading: workoutDatesLoading } = api.progress.getWorkoutDates.useQuery({
    timeRange: "week",
  });

  const isLoading = consistencyLoading || volumeLoading || workoutDatesLoading;

  // Calculate stats from real data
  const calculateStats = () => {
    const workoutsThisWeek = workoutDates?.length || 0;
    
    // Calculate average duration from volume data (estimate based on exercises and sets)
    let avgDuration = "0 min";
    if (volumeData && volumeData.length > 0) {
      const avgSets = volumeData.reduce((sum, session) => sum + session.totalSets, 0) / volumeData.length;
      // Estimate 3-4 minutes per set including rest
      const estimatedMinutes = Math.round(avgSets * 3.5);
      avgDuration = `${estimatedMinutes} min`;
    }
    
    // Weekly goal progress (target 3 workouts per week)
    const weeklyGoal = {
      current: workoutsThisWeek,
      target: 3
    };
    
    return {
      workoutsThisWeek,
      avgDuration,
      weeklyGoal
    };
  };

  const stats = calculateStats();

  const cardClass = `transition-all duration-300 border rounded-xl hover:shadow-xl ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "bg-gray-900 border-gray-800 shadow-lg hover:shadow-2xl" 
      : "bg-white border-gray-200 shadow-sm hover:shadow-lg dark:bg-gray-900 dark:border-gray-800"
  }`;

  const iconBgClass = (color: string) => 
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? `bg-${color}-500/20` 
      : `bg-${color}-100 dark:bg-${color}-500/20`;

  const iconClass = (color: string) =>
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? `text-${color}-400` 
      : `text-${color}-600 dark:text-${color}-400`;

  const labelClass = `text-sm font-medium transition-colors duration-300 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "text-gray-400" 
      : "text-gray-600 dark:text-gray-400"
  }`;

  const valueClass = `text-2xl font-bold transition-colors duration-300 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "text-white" 
      : "text-gray-900 dark:text-white"
  }`;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={cardClass}>
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 sm:h-4 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-5 sm:h-6 w-16 sm:w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {/* This Week Workouts */}
      <div className={cardClass}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${iconBgClass("green")}`}>
              <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${iconClass("green")}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={labelClass}>This Week</p>
              <p className={`text-lg sm:text-2xl font-bold transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-white" 
                  : "text-gray-900 dark:text-white"
              }`}>{stats.workoutsThisWeek} Workouts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Average Duration */}
      <div className={cardClass}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${iconBgClass("blue")}`}>
              <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${iconClass("blue")}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={labelClass}>Avg Duration</p>
              <p className={`text-lg sm:text-2xl font-bold transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-white" 
                  : "text-gray-900 dark:text-white"
              }`}>{stats.avgDuration}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Goal */}
      <div className={cardClass}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${iconBgClass("purple")}`}>
              <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${iconClass("purple")}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={labelClass}>Weekly Goal</p>
              <p className={`text-lg sm:text-2xl font-bold transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-white" 
                  : "text-gray-900 dark:text-white"
              }`}>{stats.weeklyGoal.current}/{stats.weeklyGoal.target}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}