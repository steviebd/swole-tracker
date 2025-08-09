"use client";

import Link from "next/link";
import { useTheme } from "~/providers/ThemeProvider";

export function QuickActionCards() {
  const { theme, resolvedTheme } = useTheme();

  const cardClass = `transition-all duration-300 cursor-pointer group rounded-xl md:rounded-2xl border transform hover:-translate-y-1 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "bg-gray-900 border-gray-800 shadow-lg hover:shadow-2xl hover:border-gray-700" 
      : "bg-white border-gray-200 shadow-sm hover:shadow-lg dark:bg-gray-900 dark:border-gray-800"
  }`;

  const titleClass = `text-lg md:text-xl font-bold mb-2 transition-colors duration-300 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "text-white" 
      : "text-gray-900 dark:text-white"
  }`;

  const descClass = `text-sm md:text-base mb-6 transition-colors duration-300 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "text-gray-400" 
      : "text-gray-600 dark:text-gray-400"
  }`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Start Workout Card */}
      <Link href="/workout/start" className={cardClass}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-colors duration-300"
              style={{ 
                backgroundColor: theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "var(--color-info)" 
                  : "#3B82F6"
              }}
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <svg className={`w-5 h-5 transition-colors duration-300 ${
              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                ? "text-gray-500 group-hover:text-gray-300" 
                : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className={titleClass}>Start Workout</h3>
          <p className={descClass}>Begin a new workout session</p>
          <div className="w-full bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 text-white font-medium py-3 rounded-xl shadow-sm transition-all duration-300 text-center">
            Open
          </div>
        </div>
      </Link>

      {/* View Progress Card */}
      <Link href="/workouts" className={cardClass}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-colors duration-300"
              style={{
                backgroundColor:
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "var(--color-info)"
                    : "#10B981",
              }}
            >
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6a2 2 0 00-2-2H5m4 8h6m0 0V7a2 2 0 012-2h2m-8 12a2 2 0 01-2 2H7m8-2a2 2 0 002 2h2" />
              </svg>
            </div>
            <svg
              className={`w-5 h-5 transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-gray-500 group-hover:text-gray-300"
                  : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className={titleClass}>View Progress</h3>
          <p className={descClass}>Track your fitness journey</p>
          <div
            className={`w-full font-medium py-3 rounded-xl transition-colors duration-300 text-center ${
              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                ? "border-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600"
                : "border-2 border-gray-200 text-gray-900 hover:bg-gray-50"
            }`}
          >
            View Charts
          </div>
        </div>
      </Link>

      {/* Manage Templates Card */}
      <Link href="/templates" className={cardClass}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-colors duration-300"
              style={{ 
                backgroundColor: theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "var(--color-primary)" 
                  : "#8B5CF6"
              }}
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <svg className={`w-5 h-5 transition-colors duration-300 ${
              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                ? "text-gray-500 group-hover:text-gray-300" 
                : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className={titleClass}>Manage Templates</h3>
          <p className={descClass}>Create and edit workout templates</p>
          <div className="w-full bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 text-white font-medium py-3 rounded-xl shadow-sm transition-all duration-300 text-center">
            Open
          </div>
        </div>
      </Link>
    </div>
  );
}