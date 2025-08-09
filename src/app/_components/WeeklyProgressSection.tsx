"use client";

import { useState } from "react";
import { useTheme } from "~/providers/ThemeProvider";
import { useMockProgress } from "~/hooks/useMockData";

interface ProgressBarProps {
  value: number;
  className?: string;
  theme: string;
}

function ProgressBar({ value, className = "", theme }: ProgressBarProps) {
  const { resolvedTheme } = useTheme();
  const bgClass = theme !== "system" || (theme === "system" && resolvedTheme === "dark")
    ? "bg-gray-800" 
    : "bg-gray-200 dark:bg-gray-800";

  return (
    <div className={`w-full rounded-full h-3 ${bgClass} ${className}`}>
      <div
        className="h-3 rounded-full transition-all duration-500"
        style={{ 
          width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundColor: theme !== "system" || (theme === "system" && resolvedTheme === "dark")
            ? "var(--color-primary)" 
            : "#3B82F6"
        }}
      ></div>
    </div>
  );
}

export function WeeklyProgressSection() {
  const { theme, resolvedTheme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const { data: progress } = useMockProgress();

  const cardClass = `transition-all duration-300 border rounded-xl hover:shadow-xl ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "bg-gray-900 border-gray-800 shadow-lg hover:shadow-2xl" 
      : "bg-white border-gray-200 shadow-sm hover:shadow-lg dark:bg-gray-900 dark:border-gray-800"
  }`;

  const titleClass = `text-xl font-bold transition-colors duration-300 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "text-white" 
      : "text-gray-900 dark:text-white"
  }`;

  const toggleBgClass = `flex gap-1 rounded-lg p-1 transition-colors duration-300 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "bg-gray-800" 
      : "bg-gray-100 dark:bg-gray-800"
  }`;

  const getButtonClass = (isActive: boolean) => `
    text-sm font-medium px-4 py-2 rounded-md transition-colors duration-300 ${
      isActive
        ? theme !== "system" || (theme === "system" && resolvedTheme === "dark")
          ? "bg-gray-700 text-white shadow-sm"
          : "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
        : theme !== "system" || (theme === "system" && resolvedTheme === "dark")
          ? "text-gray-400 hover:text-white hover:bg-gray-700/50"
          : "text-gray-600 hover:text-gray-900 hover:bg-white/50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700/50"
    }
  `;

  const labelClass = `text-base font-medium transition-colors duration-300 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "text-white" 
      : "text-gray-900 dark:text-white"
  }`;

  const valueClass = `text-base font-bold transition-colors duration-300 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "text-white" 
      : "text-gray-900 dark:text-white"
  }`;

  const subtextClass = `text-sm transition-colors duration-300 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "text-gray-400" 
      : "text-gray-600 dark:text-gray-400"
  }`;

  return (
    <div className={cardClass}>
      <div className={`p-6 pb-4 border-b transition-colors duration-300 ${
        theme !== "system" || (theme === "system" && resolvedTheme === "dark")
          ? "border-gray-800" 
          : "border-gray-200 dark:border-gray-700"
      }`}>
        <div className="flex items-center justify-between">
          <h3 className={titleClass}>Weekly Progress</h3>
          <div className={toggleBgClass}>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Workout Goal */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={labelClass}>Workout Goal</span>
              <span className={valueClass}>
                {progress.workoutGoal.current}/{progress.workoutGoal.target}
              </span>
            </div>
            <ProgressBar value={progress.workoutGoal.percentage} theme={theme} />
            <p className={subtextClass}>
              {progress.workoutGoal.target - progress.workoutGoal.current} more to reach your goal
            </p>
          </div>

          {/* Volume Goal */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={labelClass}>Volume Goal</span>
              <span className={valueClass}>{progress.volumeGoal.current}/{progress.volumeGoal.target}</span>
            </div>
            <ProgressBar value={progress.volumeGoal.percentage} theme={theme} />
            <p className={subtextClass}>
              {(parseFloat(progress.volumeGoal.target.replace(/[^\d.]/g, '')) - parseFloat(progress.volumeGoal.current.replace(/[^\d.]/g, ''))).toFixed(1)}k kg remaining
            </p>
          </div>

          {/* Consistency */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={labelClass}>Consistency</span>
              <span className={valueClass}>{progress.consistency.percentage}%</span>
            </div>
            <ProgressBar value={progress.consistency.percentage} theme={theme} />
            <p className={subtextClass}>{progress.consistency.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}