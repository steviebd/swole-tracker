"use client";

import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";

type TimeRange = "week" | "month" | "year";

interface ConsistencyAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeRange: TimeRange;
}

export function ConsistencyAnalysisModal({ isOpen, onClose, timeRange }: ConsistencyAnalysisModalProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme !== "system" || (theme === "system" && resolvedTheme === "dark");

  const { data: consistencyData, isLoading } = api.progress.getConsistencyStats.useQuery(
    { timeRange },
    { enabled: isOpen }
  );

  const { data: workoutDatesData, isLoading: workoutDatesLoading } = api.progress.getWorkoutDates.useQuery(
    { timeRange },
    { enabled: isOpen }
  );

  if (!isOpen) return null;

  const cardClass = `transition-all duration-300 rounded-xl border shadow-sm ${
    isDark
      ? "bg-gray-900 border-gray-800 shadow-lg" 
      : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800"
  }`;

  const titleClass = `text-xl font-bold mb-4 ${
    isDark ? "text-background" : "text-gray-900 dark:text-background"
  }`;

  const subtitleClass = `text-sm font-medium mb-2 ${
    isDark ? "text-gray-300" : "text-gray-700 dark:text-gray-300"
  }`;

  // Generate detailed calendar for the selected time range
  const generateExtendedCalendar = () => {
    const now = new Date();
    const calendars: Array<{
      label: string;
      days: (Date | null)[];
      monthYear: string;
    }> = [];
    
    if (timeRange === "week") {
      // Show current week
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      
      const weekDays: (Date | null)[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        weekDays.push(date);
      }
      calendars.push({ 
        label: "This Week", 
        days: weekDays,
        monthYear: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    } else if (timeRange === "month") {
      // Show current month
      const year = now.getFullYear();
      const month = now.getMonth();
      
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();
      
      const monthDays: (Date | null)[] = [];
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < startingDayOfWeek; i++) {
        monthDays.push(null);
      }
      
      // Add all days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        monthDays.push(new Date(year, month, day));
      }
      
      calendars.push({ 
        label: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), 
        days: monthDays,
        monthYear: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    } else {
      // Show last 12 months for year view
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        const monthDays: (Date | null)[] = [];
        
        // Add empty cells for days before the first day of the month
        for (let j = 0; j < startingDayOfWeek; j++) {
          monthDays.push(null);
        }
        
        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
          monthDays.push(new Date(year, month, day));
        }
        
        calendars.push({ 
          label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), 
          days: monthDays,
          monthYear: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        });
      }
    }
    
    return calendars;
  };

  const calendars = generateExtendedCalendar();
  
  // Convert workout dates from API to Set for quick lookup
  const workoutDates = new Set(
    (workoutDatesData || []).map(dateStr => new Date(dateStr).toDateString())
  );

  const isWorkoutDay = (date: Date) => {
    return workoutDates.has(date.toDateString());
  };

  const today = new Date();
  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  // Calculate detailed statistics
  const calculateDetailedStats = () => {
    if (!consistencyData || !workoutDatesData) return null;

    const workoutsByDayOfWeek = workoutDatesData.reduce((acc, dateStr) => {
      const day = new Date(dateStr).getDay();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mostActiveDay = Object.entries(workoutsByDayOfWeek)
      .sort(([,a], [,b]) => b - a)[0];
    const mostActiveDayName = mostActiveDay ? dayNames[parseInt(mostActiveDay[0])] : "None";

    // Calculate workout distribution by hour (mock data for now)
    const workoutsByHour = {
      morning: Math.floor(workoutDatesData.length * 0.4),
      afternoon: Math.floor(workoutDatesData.length * 0.35),
      evening: Math.floor(workoutDatesData.length * 0.25)
    };

    // Target analysis
    const targetWorkoutsPerWeek = 3;
    const weeksInPeriod = timeRange === "week" ? 1 : timeRange === "month" ? 4 : 52;
    const targetWorkouts = targetWorkoutsPerWeek * weeksInPeriod;
    const actualWorkouts = consistencyData.totalWorkouts || 0;
    const targetProgress = Math.min((actualWorkouts / targetWorkouts) * 100, 100);

    // Streak analysis
    const workoutDatesSorted = workoutDatesData
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    const streaks: number[] = [];
    let currentStreak = 0;
    let longestStreak = 0;
    
    for (let i = 0; i < workoutDatesSorted.length - 1; i++) {
      const current = workoutDatesSorted[i]!;
      const next = workoutDatesSorted[i + 1]!;
      const daysDiff = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 2) { // Allow 1 rest day
        currentStreak++;
      } else {
        if (currentStreak > 0) {
          streaks.push(currentStreak + 1);
        }
        longestStreak = Math.max(longestStreak, currentStreak + 1);
        currentStreak = 0;
      }
    }
    
    if (currentStreak > 0) {
      streaks.push(currentStreak + 1);
    }
    longestStreak = Math.max(longestStreak, currentStreak + 1);

    return {
      workoutsByDayOfWeek,
      mostActiveDayName,
      workoutsByHour,
      targetProgress,
      actualWorkouts,
      targetWorkouts,
      streaks,
      longestStreakCalculated: longestStreak,
      avgWorkoutsPerWeek: consistencyData.frequency,
      totalRestDays: Math.max(0, (weeksInPeriod * 7) - actualWorkouts)
    };
  };

  const detailedStats = calculateDetailedStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`max-w-6xl w-full max-h-[90vh] overflow-y-auto rounded-xl ${cardClass} p-6`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={titleClass}>Detailed Consistency Analysis</h3>
            <p className={subtitleClass}>
              {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} View - Complete Training Patterns
            </p>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              isDark
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
            }`}
          >
            ✕ Close
          </button>
        </div>

        {isLoading || workoutDatesLoading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
            ))}
          </div>
        ) : consistencyData && detailedStats ? (
          <>
            {/* Summary Statistics */}
            <div className="mb-8">
              <h4 className={subtitleClass}>Consistency Overview</h4>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">📅</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Total Workouts
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-blue-500">
                    {detailedStats.actualWorkouts}
                  </p>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    of {detailedStats.targetWorkouts} target
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">🔥</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Current Streak
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-orange-500">
                    {consistencyData.currentStreak}
                  </p>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    days
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">🏆</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Best Streak
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-yellow-500">
                    {consistencyData.longestStreak}
                  </p>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    days
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">📈</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Weekly Avg
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-green-500">
                    {detailedStats.avgWorkoutsPerWeek}
                  </p>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    workouts
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">⭐</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Score
                    </h5>
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
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    out of 100
                  </p>
                </div>
              </div>
            </div>

            {/* Training Patterns Analysis */}
            <div className="mb-8">
              <h4 className={subtitleClass}>Training Patterns</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Day of Week Analysis */}
                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <h5 className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    Workouts by Day of Week
                  </h5>
                  <div className="space-y-2">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                      const count = detailedStats.workoutsByDayOfWeek[index] || 0;
                      const maxCount = Math.max(...Object.values(detailedStats.workoutsByDayOfWeek));
                      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      
                      return (
                        <div key={day} className="flex items-center space-x-3">
                          <span className={`text-xs w-12 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {day.slice(0, 3)}
                          </span>
                          <div className={`flex-1 h-4 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                            <div 
                              className="h-4 bg-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className={`text-xs w-6 text-right ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className={`text-xs mt-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Most active day: <span className="font-semibold text-blue-500">{detailedStats.mostActiveDayName}</span>
                  </p>
                </div>

                {/* Time of Day Preferences */}
                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <h5 className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    Preferred Training Times
                  </h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">🌅</span>
                        <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          Morning (6-11 AM)
                        </span>
                      </div>
                      <span className={`text-lg font-bold ${isDark ? "text-background" : "text-foreground"}`}>
                        {detailedStats.workoutsByHour.morning}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">☀️</span>
                        <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          Afternoon (11-5 PM)
                        </span>
                      </div>
                      <span className={`text-lg font-bold ${isDark ? "text-background" : "text-foreground"}`}>
                        {detailedStats.workoutsByHour.afternoon}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">🌆</span>
                        <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          Evening (5-10 PM)
                        </span>
                      </div>
                      <span className={`text-lg font-bold ${isDark ? "text-background" : "text-foreground"}`}>
                        {detailedStats.workoutsByHour.evening}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Extended Calendar View */}
            <div className="mb-8">
              <h4 className={subtitleClass}>Complete Training Calendar</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {calendars.map((calendar, calIndex) => (
                  <div key={calIndex} className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <h5 className={`text-xs font-semibold mb-2 text-center ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      {calendar.label}
                    </h5>
                    
                    {timeRange !== "week" && (
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                          <div key={`${day}-${index}`} className={`text-center text-xs font-medium p-1 ${
                            isDark ? "text-gray-400" : "text-gray-600"
                          }`}>
                            {day}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className={`grid ${timeRange === "week" ? "grid-cols-7" : "grid-cols-7"} gap-1`}>
                      {calendar.days.map((date, index) => (
                        <div key={index} className="aspect-square">
                          {date ? (
                            <div className={`w-full h-full flex items-center justify-center text-xs rounded transition-all ${
                              isToday(date)
                                ? `ring-1 ring-blue-500 ${isDark ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-800"}`
                                : isWorkoutDay(date)
                                ? "bg-green-500 text-white font-semibold"
                                : isDark 
                                ? "text-gray-400 hover:bg-gray-700"
                                : "text-gray-600 hover:bg-gray-200"
                            }`}>
                              {timeRange === "week" ? date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }) : date.getDate()}
                            </div>
                          ) : (
                            <div className="w-full h-full"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Calendar Legend */}
              <div className="flex items-center justify-center space-x-6 mt-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className={isDark ? "text-gray-400" : "text-gray-600"}>Workout Day</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-3 h-3 rounded border border-blue-500 ${isDark ? "bg-blue-900" : "bg-blue-100"}`}></div>
                  <span className={isDark ? "text-gray-400" : "text-gray-600"}>Today</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-3 h-3 rounded ${isDark ? "bg-gray-700" : "bg-gray-200"}`}></div>
                  <span className={isDark ? "text-gray-400" : "text-gray-600"}>Rest Day</span>
                </div>
              </div>
            </div>

            {/* Progress Insights */}
            <div>
              <h4 className={subtitleClass}>Progress Insights & Recommendations</h4>
              <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <span className={`${
                      detailedStats.targetProgress >= 100 ? "text-green-500" : "text-yellow-500"
                    }`}>
                      {detailedStats.targetProgress >= 100 ? "🎯" : "📊"}
                    </span>
                    <div>
                      <span className={isDark ? "text-gray-200" : "text-gray-800"}>Target Achievement: </span>
                      <span className={`font-semibold ${
                        detailedStats.targetProgress >= 100 ? "text-green-500" : "text-yellow-500"
                      }`}>
                        {detailedStats.targetProgress.toFixed(0)}%
                      </span>
                      <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {detailedStats.targetProgress >= 100 
                          ? "Excellent! You've exceeded your workout target."
                          : `You need ${detailedStats.targetWorkouts - detailedStats.actualWorkouts} more workouts to reach your target.`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <span className={`${
                      consistencyData.currentStreak >= 7 ? "text-green-500" : "text-blue-500"
                    }`}>
                      {consistencyData.currentStreak >= 7 ? "🔥" : "📈"}
                    </span>
                    <div>
                      <span className={isDark ? "text-gray-200" : "text-gray-800"}>Streak Analysis: </span>
                      <span className={`font-semibold ${
                        consistencyData.currentStreak >= 7 ? "text-green-500" : "text-blue-500"
                      }`}>
                        {consistencyData.currentStreak >= 7 ? "Strong" : "Building"}
                      </span>
                      <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {consistencyData.currentStreak >= 7
                          ? "Your streak is solid! Keep up the momentum."
                          : `${7 - consistencyData.currentStreak} more consecutive days to build a strong streak.`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <span className={`${
                      detailedStats.avgWorkoutsPerWeek >= 3 ? "text-green-500" : "text-orange-500"
                    }`}>
                      {detailedStats.avgWorkoutsPerWeek >= 3 ? "✅" : "⚠️"}
                    </span>
                    <div>
                      <span className={isDark ? "text-gray-200" : "text-gray-800"}>Weekly Consistency: </span>
                      <span className={`font-semibold ${
                        detailedStats.avgWorkoutsPerWeek >= 3 ? "text-green-500" : "text-orange-500"
                      }`}>
                        {detailedStats.avgWorkoutsPerWeek >= 3 ? "On Track" : "Below Target"}
                      </span>
                      <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {detailedStats.avgWorkoutsPerWeek >= 3
                          ? "Great job maintaining 3+ workouts per week!"
                          : `Average ${detailedStats.avgWorkoutsPerWeek.toFixed(1)}/week. Aim for 3+ for optimal results.`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500">💡</span>
                    <div>
                      <span className={isDark ? "text-gray-200" : "text-gray-800"}>Best Training Day: </span>
                      <span className="font-semibold text-purple-500">
                        {detailedStats.mostActiveDayName}
                      </span>
                      <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Consider scheduling important workouts on your most consistent day.
                      </p>
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
              No consistency data available
            </p>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Complete some workouts to see detailed consistency analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}