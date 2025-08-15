"use client";

import { api } from "~/trpc/react";

export function StatsCards() {
  
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

  const cardClass = "card-interactive border-border shadow-lg";

  const iconBgClass = (color: string) => `bg-${color}-500/20`;

  const iconClass = (color: string) => `text-${color}-400`;

  const labelClass = "text-sm font-medium transition-colors duration-300 text-muted-foreground";

  

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={cardClass}>
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl skeleton" />
                <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                  <div className="h-3 sm:h-4 w-12 sm:w-14 md:w-16 skeleton" />
                  <div className="h-4 sm:h-5 md:h-6 w-14 sm:w-16 md:w-20 skeleton" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
      {/* This Week Workouts */}
      <div className={cardClass}>
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgClass("green")}`}>
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${iconClass("green")}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={labelClass}>This Week</p>
              <p className="text-base sm:text-lg md:text-2xl font-bold transition-colors duration-300 truncate text-foreground">{stats.workoutsThisWeek} Workouts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Average Duration */}
      <div className={cardClass}>
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgClass("blue")}`}>
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${iconClass("blue")}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={labelClass}>Avg Duration</p>
              <p className="text-base sm:text-lg md:text-2xl font-bold transition-colors duration-300 truncate text-foreground">{stats.avgDuration}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Goal */}
      <div className={cardClass}>
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgClass("purple")}`}>
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${iconClass("purple")}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={labelClass}>Weekly Goal</p>
              <p className="text-base sm:text-lg md:text-2xl font-bold transition-colors duration-300 truncate text-foreground">{stats.weeklyGoal.current}/{stats.weeklyGoal.target}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
