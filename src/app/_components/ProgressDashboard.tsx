"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { StrengthProgressSection } from "./StrengthProgressSection";
import { VolumeTrackingSection } from "./VolumeTrackingSection";
import { ConsistencySection } from "./ConsistencySection";
import { PersonalRecordsSection } from "./PersonalRecordsSection";
import { RecentAchievements } from "./RecentAchievements";
import { WhoopIntegrationSection } from "./WhoopIntegrationSection";
import { WellnessHistorySection } from "./WellnessHistorySection";

type TimeRange = "week" | "month" | "year";

export function ProgressDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  
  // Fetch progress data using our new API endpoints
  const { data: volumeData, isLoading: volumeLoading } = api.progress.getVolumeProgression.useQuery({
    timeRange,
  });
  
  const { data: consistencyData, isLoading: consistencyLoading } = api.progress.getConsistencyStats.useQuery({
    timeRange,
  });
  
  const { data: exerciseList, isLoading: exerciseListLoading } = api.progress.getExerciseList.useQuery();

  const cardClass = `transition-all duration-300 glass-surface`;

  return (
    <div className="min-h-screen bg-horizon">
      {/* Header with Navigation */}
      <div className="sticky top-0 z-40 glass-header">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
              <span className="hidden sm:inline" style={{ color: 'var(--color-border)' }}>/</span>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                <span className="hidden sm:inline">Progress Dashboard</span>
                <span className="sm:hidden">Progress</span>
              </span>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex space-x-1 rounded-lg p-1 self-start sm:self-center glass-surface">
              {(["week", "month", "year"] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    timeRange === range
                      ? "btn-primary"
                      : "btn-ghost"
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          {/* Total Volume */}
          <div className={cardClass + " p-6"}>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Total Volume</h3>
            {volumeLoading ? (
              <div className="animate-pulse h-8 w-20 rounded" style={{ backgroundColor: 'var(--color-border)' }}></div>
            ) : (
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
{(volumeData?.reduce((sum, day) => sum + day.totalVolume, 0) || 0).toLocaleString()} kg
              </p>
            )}
          </div>

          {/* Total Workouts */}
          <div className={cardClass + " p-6"}>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Workouts</h3>
            {consistencyLoading ? (
              <div className="animate-pulse h-8 w-12 rounded" style={{ backgroundColor: 'var(--color-border)' }}></div>
            ) : (
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{consistencyData?.totalWorkouts || 0}</p>
            )}
          </div>

          {/* Workout Frequency */}
          <div className={cardClass + " p-6"}>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Weekly Frequency</h3>
            {consistencyLoading ? (
              <div className="animate-pulse h-8 w-16 rounded" style={{ backgroundColor: 'var(--color-border)' }}></div>
            ) : (
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{consistencyData?.frequency || 0}x</p>
            )}
          </div>

          {/* Current Streak */}
          <div className={cardClass + " p-6"}>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Current Streak</h3>
            {consistencyLoading ? (
              <div className="animate-pulse h-8 w-12 rounded" style={{ backgroundColor: 'var(--color-border)' }}></div>
            ) : (
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{consistencyData?.currentStreak || 0} days</p>
            )}
          </div>
        </div>

        {/* Recent Achievements Section */}
        <div className="mb-8">
          <RecentAchievements />
        </div>

        {/* Exercise List */}
        <div className={cardClass + " p-6 mb-8"}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Your Exercises</h2>
          {exerciseListLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 rounded" style={{ backgroundColor: 'var(--color-border)' }}></div>
              ))}
            </div>
          ) : exerciseList && exerciseList.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {exerciseList.map((exercise, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--color-text)' }}>{exercise.exerciseName}</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      Last used: {new Date(exercise.lastUsed).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {exercise.totalSets} sets
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              No exercises found. Complete some workouts to see your progress!
            </p>
          )}
        </div>

        {/* Personal Records Section */}
        <div className="mt-8">
          <PersonalRecordsSection />
        </div>

        {/* Strength Progression Section */}
        <div className="mt-8">
          <StrengthProgressSection />
        </div>

        {/* Volume Tracking Section */}
        <div id="volume" className="mt-8">
          <VolumeTrackingSection />
        </div>

        {/* Consistency Section */}
        <div id="consistency" className="mt-8">
          <ConsistencySection />
        </div>

        {/* Wellness History Section */}
        <div className="mt-8">
          <WellnessHistorySection timeRange={timeRange} />
        </div>

        {/* WHOOP Integration Section */}
        <div className="mt-8">
          <WhoopIntegrationSection />
        </div>
      </div>
    </div>
  );
}