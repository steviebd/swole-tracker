"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";
import { StrengthProgressSection } from "./StrengthProgressSection";

type TimeRange = "week" | "month" | "year";

export function ProgressDashboard() {
  const { theme, resolvedTheme } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  
  const isDark = theme !== "system" || (theme === "system" && resolvedTheme === "dark");
  
  // Fetch progress data using our new API endpoints
  const { data: volumeData, isLoading: volumeLoading } = api.progress.getVolumeProgression.useQuery({
    timeRange,
  });
  
  const { data: consistencyData, isLoading: consistencyLoading } = api.progress.getConsistencyStats.useQuery({
    timeRange,
  });
  
  const { data: exerciseList, isLoading: exerciseListLoading } = api.progress.getExerciseList.useQuery();
  
  const { data: personalRecords, isLoading: prLoading } = api.progress.getPersonalRecords.useQuery({
    timeRange,
    recordType: "both",
  });

  const cardClass = `transition-all duration-300 rounded-2xl border shadow-sm ${
    isDark
      ? "bg-gray-900 border-gray-800 shadow-lg" 
      : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800"
  }`;

  const titleClass = `text-xl font-bold mb-4 ${
    isDark ? "text-white" : "text-gray-900 dark:text-white"
  }`;

  const subtitleClass = `text-sm font-medium mb-2 ${
    isDark ? "text-gray-300" : "text-gray-700 dark:text-gray-300"
  }`;

  const valueClass = `text-2xl font-bold ${
    isDark ? "text-white" : "text-gray-900 dark:text-white"
  }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header with Navigation */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Progress Dashboard</span>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(["week", "month", "year"] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    timeRange === range
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Volume */}
          <div className={cardClass + " p-6"}>
            <h3 className={subtitleClass}>Total Volume</h3>
            {volumeLoading ? (
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-20 rounded"></div>
            ) : (
              <p className={valueClass}>
{(volumeData?.reduce((sum, day) => sum + day.totalVolume, 0) || 0).toLocaleString()} kg
              </p>
            )}
          </div>

          {/* Total Workouts */}
          <div className={cardClass + " p-6"}>
            <h3 className={subtitleClass}>Workouts</h3>
            {consistencyLoading ? (
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-12 rounded"></div>
            ) : (
              <p className={valueClass}>{consistencyData?.totalWorkouts || 0}</p>
            )}
          </div>

          {/* Workout Frequency */}
          <div className={cardClass + " p-6"}>
            <h3 className={subtitleClass}>Weekly Frequency</h3>
            {consistencyLoading ? (
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-16 rounded"></div>
            ) : (
              <p className={valueClass}>{consistencyData?.frequency || 0}x</p>
            )}
          </div>

          {/* Current Streak */}
          <div className={cardClass + " p-6"}>
            <h3 className={subtitleClass}>Current Streak</h3>
            {consistencyLoading ? (
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-12 rounded"></div>
            ) : (
              <p className={valueClass}>{consistencyData?.currentStreak || 0} days</p>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Records Section */}
          <div className={cardClass + " p-6"}>
            <h2 className={titleClass}>Recent Personal Records</h2>
            {prLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-16 rounded"></div>
                ))}
              </div>
            ) : personalRecords && personalRecords.length > 0 ? (
              <div className="space-y-4">
                {personalRecords.slice(0, 5).map((record, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{record.exerciseName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {record.recordType === "weight" ? "Weight PR" : "Volume PR"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {record.weight}kg × {record.reps}
                      </p>
                      {record.recordType === "weight" && record.oneRMEstimate && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ~{record.oneRMEstimate}kg 1RM
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No personal records found for this period.
              </p>
            )}
          </div>

          {/* Exercise List */}
          <div className={cardClass + " p-6"}>
            <h2 className={titleClass}>Your Exercises</h2>
            {exerciseListLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-12 rounded"></div>
                ))}
              </div>
            ) : exerciseList && exerciseList.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {exerciseList.map((exercise, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{exercise.exerciseName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Last used: {new Date(exercise.lastUsed).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {exercise.totalSets} sets
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No exercises found. Complete some workouts to see your progress!
              </p>
            )}
          </div>
        </div>

        {/* Strength Progression Section */}
        <div className="mt-8">
          <StrengthProgressSection />
        </div>

        {/* Coming Soon Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">

          <div className={cardClass + " p-6"}>
            <h2 className={titleClass}>Volume Analysis</h2>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="font-medium">Coming Soon</p>
              <p className="text-sm">Detailed volume breakdowns and trends</p>
            </div>
          </div>

          <div className={cardClass + " p-6"}>
            <h2 className={titleClass}>Consistency Tracker</h2>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-medium">Coming Soon</p>
              <p className="text-sm">Calendar view and streak tracking</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}