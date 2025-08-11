"use client";

import { useState } from "react";
import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";

type TimeRange = "week" | "month" | "year";

export function ConsistencySection() {
  const { theme, resolvedTheme } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  
  const isDark = theme !== "system" || (theme === "system" && resolvedTheme === "dark");
  
  // Get consistency stats
  const { data: consistencyData, isLoading: consistencyLoading } = api.progress.getConsistencyStats.useQuery({
    timeRange,
  });

  const cardClass = `transition-all duration-300 rounded-xl border shadow-sm ${
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

  // Generate calendar for current month
  const generateCalendar = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const calendar = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendar.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(new Date(year, month, day));
    }
    
    return calendar;
  };

  const calendar = generateCalendar();
  
  // Mock workout dates (this would come from API)
  const workoutDates = new Set([
    "2024-01-05", "2024-01-08", "2024-01-10", "2024-01-12", "2024-01-15"
  ].map(date => new Date(date).toDateString()));

  const isWorkoutDay = (date: Date) => {
    return workoutDates.has(date.toDateString());
  };

  const today = new Date();
  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  // Calculate target progress
  const targetWorkoutsPerWeek = 3;
  const weeksInPeriod = timeRange === "week" ? 1 : timeRange === "month" ? 4 : 52;
  const targetWorkouts = targetWorkoutsPerWeek * weeksInPeriod;
  const actualWorkouts = consistencyData?.totalWorkouts || 0;
  const targetProgress = Math.min((actualWorkouts / targetWorkouts) * 100, 100);

  return (
    <div className={cardClass + " p-6"}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={titleClass}>Consistency Tracker</h2>
        
        {/* Time Range Selector */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(["week", "month", "year"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
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

      {consistencyLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
          ))}
        </div>
      ) : consistencyData ? (
        <>
          {/* Consistency Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Current Streak */}
            <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">🔥</span>
                <h3 className={subtitleClass}>Current Streak</h3>
              </div>
              <p className="text-2xl font-bold text-orange-500">
                {consistencyData.currentStreak}
              </p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                days
              </p>
            </div>

            {/* Longest Streak */}
            <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">🏆</span>
                <h3 className={subtitleClass}>Best Streak</h3>
              </div>
              <p className="text-2xl font-bold text-yellow-500">
                {consistencyData.longestStreak}
              </p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                days
              </p>
            </div>

            {/* Weekly Frequency */}
            <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">📈</span>
                <h3 className={subtitleClass}>Frequency</h3>
              </div>
              <p className="text-2xl font-bold text-blue-500">
                {consistencyData.frequency}
              </p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                per week
              </p>
            </div>

            {/* Consistency Score */}
            <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">⭐</span>
                <h3 className={subtitleClass}>Score</h3>
              </div>
              <p className={`text-2xl font-bold ${
                consistencyData.consistencyScore >= 80 
                  ? "text-green-500"
                  : consistencyData.consistencyScore >= 60
                  ? "text-yellow-500"
                  : "text-red-500"
              }`}>
                {consistencyData.consistencyScore}
              </p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                out of 100
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workout Calendar */}
            <div>
              <h3 className={subtitleClass}>Workout Calendar - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
              <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className={`text-center text-xs font-medium p-2 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}>
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Body */}
                <div className="grid grid-cols-7 gap-1">
                  {calendar.map((date, index) => (
                    <div key={index} className="aspect-square">
                      {date ? (
                        <div className={`w-full h-full flex items-center justify-center text-sm rounded-md transition-all ${
                          isToday(date)
                            ? `ring-2 ring-blue-500 ${isDark ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-800"}`
                            : isWorkoutDay(date)
                            ? "bg-green-500 text-white font-semibold"
                            : isDark 
                            ? "text-gray-300 hover:bg-gray-700"
                            : "text-gray-700 hover:bg-gray-200"
                        }`}>
                          {date.getDate()}
                        </div>
                      ) : (
                        <div className="w-full h-full"></div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Legend */}
                <div className="flex items-center justify-center space-x-4 mt-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Workout</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className={`w-3 h-3 rounded border-2 border-blue-500 ${isDark ? "bg-blue-900" : "bg-blue-100"}`}></div>
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Today</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Progress & Trends */}
            <div>
              <h3 className={subtitleClass}>3x/Week Target Progress</h3>
              <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} space-y-4`}>
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Progress
                    </span>
                    <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      {actualWorkouts}/{targetWorkouts} workouts
                    </span>
                  </div>
                  <div className={`w-full h-3 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-300"}`}>
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        targetProgress >= 100 
                          ? "bg-green-500"
                          : targetProgress >= 70
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${targetProgress}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {targetProgress.toFixed(0)}% of target achieved
                  </p>
                </div>

                {/* Consistency Trends */}
                <div className="space-y-3">
                  <h4 className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    Consistency Insights
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className={`${
                        consistencyData.frequency >= 3 ? "text-green-500" : "text-yellow-500"
                      }`}>
                        {consistencyData.frequency >= 3 ? "✅" : "⚠️"}
                      </span>
                      <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                        {consistencyData.frequency >= 3 
                          ? "Meeting weekly target"
                          : `${(3 - consistencyData.frequency).toFixed(1)} workouts behind target`
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`${
                        consistencyData.currentStreak >= 3 ? "text-green-500" : "text-gray-500"
                      }`}>
                        {consistencyData.currentStreak >= 3 ? "🔥" : "💭"}
                      </span>
                      <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                        {consistencyData.currentStreak >= 3
                          ? "Strong streak going!"
                          : "Build a longer streak"
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`${
                        consistencyData.consistencyScore >= 80 ? "text-green-500" : 
                        consistencyData.consistencyScore >= 60 ? "text-yellow-500" : "text-red-500"
                      }`}>
                        {consistencyData.consistencyScore >= 80 ? "🌟" : 
                         consistencyData.consistencyScore >= 60 ? "📈" : "📉"}
                      </span>
                      <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                        {consistencyData.consistencyScore >= 80
                          ? "Excellent consistency!"
                          : consistencyData.consistencyScore >= 60
                          ? "Good, can improve more"
                          : "Needs consistency work"
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className={`text-lg font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            No consistency data found
          </p>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Complete some workouts to track your consistency and build streaks.
          </p>
        </div>
      )}
    </div>
  );
}