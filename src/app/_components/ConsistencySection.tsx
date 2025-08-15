"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { ConsistencyAnalysisModal } from "./ConsistencyAnalysisModal";

type TimeRange = "week" | "month" | "year";

export function ConsistencySection() {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [showModal, setShowModal] = useState(false);
  
  // Get consistency stats
  const { data: consistencyData, isLoading: consistencyLoading } = api.progress.getConsistencyStats.useQuery({
    timeRange,
  });

  // Get workout dates for calendar
  const { data: workoutDatesData, isLoading: workoutDatesLoading } = api.progress.getWorkoutDates.useQuery({
    timeRange,
  });

  const cardClass = "transition-all duration-300 rounded-xl border shadow-sm glass-surface";
  const titleClass = "text-xl font-bold mb-4 text-[var(--color-text)]";
  const subtitleClass = "text-sm font-medium mb-2 text-[var(--color-text-secondary)]";

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
        <div className="flex space-x-1 bg-[var(--color-bg-surface)] rounded-lg p-1 border border-[var(--color-border)]">
          {(["week", "month", "year"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                timeRange === range
                  ? "bg-[var(--color-primary)] text-background shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {consistencyLoading || workoutDatesLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[var(--color-bg-surface)] h-32 rounded-lg"></div>
          ))}
        </div>
      ) : consistencyData ? (
        <>
          {/* Consistency Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Current Streak */}
            <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">🔥</span>
                <h3 className={subtitleClass}>Current Streak</h3>
              </div>
              <p className="text-2xl font-bold text-[var(--color-warning)]">
                {consistencyData.currentStreak}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                days
              </p>
            </div>

            {/* Longest Streak */}
            <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">🏆</span>
                <h3 className={subtitleClass}>Best Streak</h3>
              </div>
              <p className="text-2xl font-bold text-[var(--color-warning)]">
                {consistencyData.longestStreak}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                days
              </p>
            </div>

            {/* Weekly Frequency */}
            <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">📈</span>
                <h3 className={subtitleClass}>Frequency</h3>
              </div>
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {consistencyData.frequency}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                per week
              </p>
            </div>

            {/* Consistency Score */}
            <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">⭐</span>
                <h3 className={subtitleClass}>Score</h3>
              </div>
              <p className={`text-2xl font-bold ${
                consistencyData.consistencyScore >= 80 
                  ? "text-[var(--color-success)]"
                  : consistencyData.consistencyScore >= 60
                  ? "text-[var(--color-warning)]"
                  : "text-[var(--color-danger)]"
              }`}>
                {consistencyData.consistencyScore}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                out of 100
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workout Calendar */}
            <div>
              <h3 className={subtitleClass} suppressHydrationWarning>Workout Calendar - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
              <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium p-2 text-[var(--color-text-muted)]">
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
                            ? "ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)] bg-opacity-20 text-[var(--color-primary)]"
                            : isWorkoutDay(date)
                            ? "bg-[var(--color-success)] text-background font-semibold"
                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:bg-opacity-80"
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
                    <div className="w-3 h-3 bg-[var(--color-success)] rounded"></div>
                    <span className="text-[var(--color-text-muted)]">Workout</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded border-2 border-[var(--color-primary)] bg-[var(--color-primary)] bg-opacity-20"></div>
                    <span className="text-[var(--color-text-muted)]">Today</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Progress & Trends */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className={subtitleClass}>3x/Week Target Progress</h3>
                <button
                  onClick={() => setShowModal(true)}
                  className="btn-secondary"
                >
                  View Details
                </button>
              </div>
              <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      Progress
                    </span>
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {actualWorkouts}/{targetWorkouts} workouts
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[var(--color-border)]">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        targetProgress >= 100 
                          ? "bg-[var(--color-success)]"
                          : targetProgress >= 70
                          ? "bg-[var(--color-warning)]"
                          : "bg-[var(--color-danger)]"
                      }`}
                      style={{ width: `${targetProgress}%` }}
                    />
                  </div>
                  <p className="text-xs mt-1 text-[var(--color-text-muted)]">
                    {targetProgress.toFixed(0)}% of target achieved
                  </p>
                </div>

                {/* Consistency Trends */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[var(--color-text)]">
                    Consistency Insights
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className={`${
                        consistencyData.frequency >= 3 ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"
                      }`}>
                        {consistencyData.frequency >= 3 ? "✅" : "⚠️"}
                      </span>
                      <span className="text-[var(--color-text-secondary)]">
                        {consistencyData.frequency >= 3 
                          ? "Meeting weekly target"
                          : `${(3 - consistencyData.frequency).toFixed(1)} workouts behind target`
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`${
                        consistencyData.currentStreak >= 3 ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]"
                      }`}>
                        {consistencyData.currentStreak >= 3 ? "🔥" : "💭"}
                      </span>
                      <span className="text-[var(--color-text-secondary)]">
                        {consistencyData.currentStreak >= 3
                          ? "Strong streak going!"
                          : "Build a longer streak"
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`${
                        consistencyData.consistencyScore >= 80 ? "text-[var(--color-success)]" : 
                        consistencyData.consistencyScore >= 60 ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]"
                      }`}>
                        {consistencyData.consistencyScore >= 80 ? "🌟" : 
                         consistencyData.consistencyScore >= 60 ? "📈" : "📉"}
                      </span>
                      <span className="text-[var(--color-text-secondary)]">
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
          <p className="text-lg font-medium mb-2 text-[var(--color-text-secondary)]">
            No consistency data found
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Complete some workouts to track your consistency and build streaks.
          </p>
        </div>
      )}
      
      {/* Detailed Analysis Modal */}
      <ConsistencyAnalysisModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        timeRange={timeRange}
      />
    </div>
  );
}