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


  const cardClass = `bg-card border border-border rounded-lg shadow-sm transition-all duration-300 card-interactive hover:-translate-y-1 hover:shadow-xl`;

  return (
    <div className="min-h-screen bg-horizon">
      {/* Header with Navigation */}
      <div className="sticky top-0 z-40 glass-header">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
              <span className="hidden sm:inline text-border">/</span>
              <h1 className="text-lg sm:text-xl font-serif font-black gradient-text-primary">
                <span className="hidden sm:inline">Progress Dashboard</span>
                <span className="sm:hidden">Progress</span>
              </h1>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex space-x-1 rounded-lg p-1 self-start sm:self-center card-interactive">
              {(["week", "month", "year"] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    timeRange === range
                      ? "gradient-primary text-white shadow-md"
                      : "btn-ghost hover:bg-primary/10"
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
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Total Volume</h3>
            {volumeLoading ? (
              <div className="animate-pulse h-8 w-20 rounded bg-border"></div>
            ) : (
              <p className="text-2xl font-serif font-black text-foreground">
{(volumeData?.reduce((sum, day) => sum + day.totalVolume, 0) || 0).toLocaleString()} kg
              </p>
            )}
          </div>

          {/* Total Workouts */}
          <div className={cardClass + " p-6"}>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Workouts</h3>
            {consistencyLoading ? (
              <div className="animate-pulse h-8 w-12 rounded bg-border"></div>
            ) : (
              <p className="text-2xl font-serif font-black text-foreground">{consistencyData?.totalWorkouts || 0}</p>
            )}
          </div>

          {/* Workout Frequency */}
          <div className={cardClass + " p-6"}>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Weekly Frequency</h3>
            {consistencyLoading ? (
              <div className="animate-pulse h-8 w-16 rounded bg-border"></div>
            ) : (
              <p className="text-2xl font-serif font-black text-foreground">{consistencyData?.frequency || 0}x</p>
            )}
          </div>

          {/* Current Streak */}
          <div className={cardClass + " p-6"}>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Current Streak</h3>
            {consistencyLoading ? (
              <div className="animate-pulse h-8 w-12 rounded bg-border"></div>
            ) : (
              <p className="text-2xl font-serif font-black text-foreground">{consistencyData?.currentStreak || 0} days</p>
            )}
          </div>
        </div>

        {/* Recent Achievements Section */}
        <div className="mb-8">
          <RecentAchievements />
        </div>

        {/* Exercise List */}
        <div className={cardClass + " p-6 mb-8"}>
          <h2 className="text-xl font-serif font-black mb-4 gradient-text-accent">Your Exercises</h2>
          {exerciseListLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 rounded bg-border"></div>
              ))}
            </div>
          ) : exerciseList && exerciseList.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {exerciseList.map((exercise, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-primary/5 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">{exercise.exerciseName}</p>
                    <p className="text-sm text-muted-foreground">
                      Last used: {new Date(exercise.lastUsed).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">
                      {exercise.totalSets} sets
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
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