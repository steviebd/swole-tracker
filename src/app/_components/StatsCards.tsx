"use client";

import { useTheme } from "~/providers/ThemeProvider";
import { useMockStats } from "~/hooks/useMockData";

export function StatsCards() {
  const { theme, resolvedTheme } = useTheme();
  const { data: stats } = useMockStats();

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* This Week Workouts */}
      <div className={cardClass}>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgClass("green")}`}>
              <svg className={`w-6 h-6 ${iconClass("green")}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className={labelClass}>This Week</p>
              <p className={valueClass}>{stats.workoutsThisWeek} Workouts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Average Duration */}
      <div className={cardClass}>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgClass("blue")}`}>
              <svg className={`w-6 h-6 ${iconClass("blue")}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className={labelClass}>Avg Duration</p>
              <p className={valueClass}>{stats.avgDuration}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Goal */}
      <div className={cardClass}>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgClass("purple")}`}>
              <svg className={`w-6 h-6 ${iconClass("purple")}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className={labelClass}>Weekly Goal</p>
              <p className={valueClass}>{stats.weeklyGoal.current}/{stats.weeklyGoal.target}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}