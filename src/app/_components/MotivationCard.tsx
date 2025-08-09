"use client";

import { useTheme } from "~/providers/ThemeProvider";

export function MotivationCard() {
  const { theme, resolvedTheme } = useTheme();

  const isDark = theme !== "system" || (theme === "system" && resolvedTheme === "dark");

  return (
    <div className="rounded-2xl border-0 shadow-lg bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="p-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2l2 7 5-12 3 7h6" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-xl mb-2">You're on fire! 🔥</h3>
            <p className="text-blue-100 text-base">
              You've completed 4 workouts this week. Just one more to hit your goal!
            </p>
          </div>
          <button
            className={`px-8 py-3 rounded-xl font-bold shadow-sm transition-colors duration-300 ${
              isDark ? "bg-white text-blue-600 hover:bg-blue-50" : "bg-white text-blue-600 hover:bg-blue-50"
            }`}
          >
            Let's Go!
          </button>
        </div>
      </div>
    </div>
  );
}


