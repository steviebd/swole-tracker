"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";

interface ProgressBarProps {
  value: number;
  className?: string;
}

function ProgressBar({ value, className = "" }: Omit<ProgressBarProps, 'theme'>) {
  const bgClass = "bg-surface border border-muted";

  return (
    <div className={`w-full rounded-full h-3 ${bgClass} ${className}`}>
      <div
        className="h-3 rounded-full transition-all duration-500"
        style={{ 
          width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundColor: "var(--color-primary)"
        }}
      ></div>
    </div>
  );
}

export function WeeklyProgressSection() {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month">("week");
  
  // Get real data from ProgressDashboard API
  const { data: consistencyData, isLoading: consistencyLoading } = api.progress.getConsistencyStats.useQuery({
    timeRange: selectedPeriod,
  });
  
  const { data: volumeData, isLoading: volumeLoading } = api.progress.getVolumeProgression.useQuery({
    timeRange: selectedPeriod,
  });

  const isLoading = consistencyLoading || volumeLoading;

  // Calculate progress data from real API data
  const calculateProgress = () => {
    const targetWorkouts = selectedPeriod === "week" ? 3 : 12;
    const totalWorkouts = consistencyData?.totalWorkouts || 0;
    const workoutGoal = {
      current: totalWorkouts,
      target: targetWorkouts,
      percentage: Math.min(100, (totalWorkouts / targetWorkouts) * 100)
    };

    // Calculate total volume from volume data
    const totalVolume = volumeData?.reduce((sum, session) => sum + session.totalVolume, 0) || 0;
    const targetVolume = selectedPeriod === "week" ? 15000 : 60000; // 15k per week, 60k per month
    const volumeGoal = {
      current: `${(totalVolume / 1000).toFixed(1)}k`,
      target: `${(targetVolume / 1000).toFixed(0)}k`,
      percentage: Math.min(100, (totalVolume / targetVolume) * 100)
    };

    const consistency = {
      percentage: consistencyData?.consistencyScore || 0,
      message: (consistencyData?.consistencyScore || 0) >= 80 
        ? "Great consistency!" 
        : (consistencyData?.consistencyScore || 0) >= 60 
        ? "Good progress, keep it up!" 
        : "Let's improve consistency"
    };

    return { workoutGoal, volumeGoal, consistency };
  };

  const progress = calculateProgress();

  const cardClass = "card-interactive";

  const titleClass = "text-xl font-bold text-theme-primary";

  const toggleBgClass = "flex gap-1 rounded-lg p-1 transition-colors duration-300";

  const getButtonClass = (isActive: boolean) => `
    text-sm font-medium px-4 py-2 rounded-md transition-colors duration-300 ${
      isActive
        ? "bg-theme-surface text-theme-primary shadow-sm"
        : "text-theme-secondary hover:text-theme-primary hover:bg-theme-surface/50"
    }
  `;

  const labelClass = "text-base font-medium text-theme-primary";

  const valueClass = "text-base font-bold text-theme-primary";

  const subtextClass = "text-sm text-theme-muted";

  return (
    <div className={cardClass}>
      <div className="p-6 pb-4 border-b border-muted transition-colors duration-300">
        <div className="flex items-center justify-between">
          <h3 className={titleClass}>Weekly Progress</h3>
          <div className={toggleBgClass} style={{ backgroundColor: "var(--color-bg-surface)" }}>
            <button
              onClick={() => setSelectedPeriod("week")}
              className={getButtonClass(selectedPeriod === "week")}
            >
              Week
            </button>
            <button
              onClick={() => setSelectedPeriod("month")}
              className={getButtonClass(selectedPeriod === "month")}
            >
              Month
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-5 w-20 skeleton" />
                  <div className="h-5 w-12 skeleton" />
                </div>
                <div className="h-3 w-full skeleton" />
                <div className="h-4 w-32 skeleton" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Workout Goal - Links to Consistency section */}
            <Link href="/progress#consistency" className="space-y-3 hover:opacity-80 transition-opacity">
              <div className="flex justify-between">
                <span className={labelClass}>Workout Goal</span>
                <span className={valueClass}>
                  {progress.workoutGoal.current}/{progress.workoutGoal.target}
                </span>
              </div>
              <ProgressBar value={progress.workoutGoal.percentage} />
              <p className={subtextClass}>
                {Math.max(0, progress.workoutGoal.target - progress.workoutGoal.current)} more to reach your goal
              </p>
            </Link>

            {/* Volume Goal - Links to Volume Tracking section */}
            <Link href="/progress#volume" className="space-y-3 hover:opacity-80 transition-opacity">
              <div className="flex justify-between">
                <span className={labelClass}>Volume Goal</span>
                <span className={valueClass}>{progress.volumeGoal.current}/{progress.volumeGoal.target}</span>
              </div>
              <ProgressBar value={progress.volumeGoal.percentage} />
              <p className={subtextClass}>
                {(parseFloat(progress.volumeGoal.target.replace(/[^\d.]/g, '')) - parseFloat(progress.volumeGoal.current.replace(/[^\d.]/g, ''))).toFixed(1)}k kg remaining
              </p>
            </Link>

            {/* Consistency - Links to Consistency section */}
            <Link href="/progress#consistency" className="space-y-3 hover:opacity-80 transition-opacity">
              <div className="flex justify-between">
                <span className={labelClass}>Consistency</span>
                <span className={valueClass}>{progress.consistency.percentage}%</span>
              </div>
              <ProgressBar value={progress.consistency.percentage} />
              <p className={subtextClass}>{progress.consistency.message}</p>
            </Link>
          </div>
        )}

        {/* View Full Progress Dashboard Button */}
        <div className="pt-4 border-t border-muted">
          <Link 
            href="/progress"
            className="btn-secondary w-full justify-center"
          >
            View Full Progress Dashboard
            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}