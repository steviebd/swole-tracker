"use client";

import { api } from "~/trpc/react";
import { Card } from "~/app/_components/ui/Card";

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

  // Icon definitions for each stat
  const StatIcon = ({ type }: { type: 'workouts' | 'duration' | 'goal' }) => {
    const icons = {
      workouts: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      duration: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      goal: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };
    return icons[type];
  };

  

  if (isLoading) {
    return (
      <div className="space-y-gap-sm">
        {[...Array(3)].map((_, i) => (
          <Card key={i} surface="card" padding="md">
            <div className="flex items-center gap-gap-md">
              <div className="w-10 h-10 rounded-lg skeleton" />
              <div className="space-y-gap-xs flex-1">
                <div className="h-4 w-16 skeleton" />
                <div className="h-6 w-20 skeleton" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-gap-sm sm:space-y-gap-md">
      {/* This Week Workouts */}
      <Card surface="card" padding="md" interactive>
        <div className="flex items-center gap-gap-md">
          <div className="w-10 h-10 rounded-lg bg-chart-1/20 border border-chart-1/30 flex items-center justify-center text-chart-1 flex-shrink-0">
            <StatIcon type="workouts" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-secondary text-sm font-medium">This Week</p>
            <p className="text-2xl font-serif font-bold text-text-primary mt-1">
              {stats.workoutsThisWeek} <span className="text-lg font-sans font-normal text-text-secondary">Workouts</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Average Duration */}
      <Card surface="card" padding="md" interactive>
        <div className="flex items-center gap-gap-md">
          <div className="w-10 h-10 rounded-lg bg-chart-2/20 border border-chart-2/30 flex items-center justify-center text-chart-2 flex-shrink-0">
            <StatIcon type="duration" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-secondary text-sm font-medium">Average Duration</p>
            <p className="text-2xl font-serif font-bold text-text-primary mt-1">
              {stats.avgDuration}
            </p>
          </div>
        </div>
      </Card>

      {/* Weekly Goal */}
      <Card surface="card" padding="md" interactive>
        <div className="flex items-center gap-gap-md">
          <div className="w-10 h-10 rounded-lg bg-chart-3/20 border border-chart-3/30 flex items-center justify-center text-chart-3 flex-shrink-0">
            <StatIcon type="goal" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-secondary text-sm font-medium">Weekly Goal</p>
            <p className="text-2xl font-serif font-bold text-text-primary mt-1">
              {stats.weeklyGoal.current}<span className="text-lg font-sans font-normal text-text-secondary">/{stats.weeklyGoal.target}</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Enhanced responsive design for larger screens */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-gap-md mt-gap-lg">
          {/* Placeholder for potential additional stats on larger screens */}
        </div>
      </div>
    </div>
  );
}
