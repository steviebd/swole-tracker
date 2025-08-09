"use client";

import { useRef } from "react";
import { useTheme } from "~/providers/ThemeProvider";
import { FocusTrap, useReturnFocus } from "./focus-trap";

interface ProgressionModalProps {
  open: boolean;
  onClose: () => void;
  exerciseName?: string;
}

export function ProgressionModal({ open, onClose, exerciseName = "Exercise" }: ProgressionModalProps) {
  const { theme, resolvedTheme } = useTheme();
  const { restoreFocus } = useReturnFocus();
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  if (!open) return null;

  const progressionData = [
    { date: "2024-12-15", weight: 80, reps: 8, sets: 3, volume: 1920 },
    { date: "2024-12-18", weight: 82.5, reps: 8, sets: 3, volume: 1980 },
    { date: "2024-12-22", weight: 85, reps: 6, sets: 3, volume: 1530 },
    { date: "2024-12-25", weight: 85, reps: 8, sets: 3, volume: 2040 },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="progression-title"
      style={{ 
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        zIndex: 50000,
        backgroundColor: theme !== "system" || (theme === "system" && resolvedTheme === "dark") ? '#000000' : '#111827',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={() => {
        restoreFocus();
        onClose();
      }}
    >
      <FocusTrap
        onEscape={() => {
          restoreFocus();
          onClose();
        }}
        initialFocusRef={firstFocusRef as React.RefObject<HTMLElement>}
        preventScroll
      >
        <div
          className={`rounded-xl border shadow-2xl transition-colors duration-300 ${
            theme !== "system" || (theme === "system" && resolvedTheme === "dark")
              ? "bg-gray-900 border-gray-800" 
              : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800"
          }`}
          style={{
            width: '100%',
            maxWidth: '42rem',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`border-b px-6 py-4 transition-colors duration-300 ${
            theme !== "system" || (theme === "system" && resolvedTheme === "dark")
              ? "border-gray-800" 
              : "border-gray-200 dark:border-gray-800"
          }`}>
            <h2 id="progression-title" className={`text-xl font-bold transition-colors duration-300 ${
              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                ? "text-white" 
                : "text-gray-900 dark:text-white"
            }`}>
              {exerciseName} Progression
            </h2>
            <p className={`text-sm transition-colors duration-300 ${
              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                ? "text-gray-400" 
                : "text-gray-600 dark:text-gray-400"
            }`}>
              Track your progress over time
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {/* Chart Placeholder */}
            <div className={`mb-6 h-64 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors duration-300 ${
              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                ? "border-gray-700 bg-gray-800/50" 
                : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
            }`}>
              <div className="text-center">
                <svg className={`w-12 h-12 mx-auto mb-2 transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-gray-600" 
                    : "text-gray-400 dark:text-gray-600"
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className={`text-sm font-medium transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-gray-400" 
                    : "text-gray-600 dark:text-gray-400"
                }`}>
                  Progress Chart Coming Soon
                </p>
              </div>
            </div>

            {/* Progression Table */}
            <div className="space-y-3">
              <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-white" 
                  : "text-gray-900 dark:text-white"
              }`}>Recent Sessions</h3>
              
              <div className={`rounded-lg border transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "border-gray-800" 
                  : "border-gray-200 dark:border-gray-800"
              }`}>
                <div className={`grid grid-cols-5 gap-4 px-4 py-3 text-sm font-medium border-b transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-gray-400 border-gray-800" 
                    : "text-gray-600 border-gray-200 dark:text-gray-400 dark:border-gray-800"
                }`}>
                  <div>Date</div>
                  <div>Weight</div>
                  <div>Reps</div>
                  <div>Sets</div>
                  <div>Volume</div>
                </div>
                {progressionData.map((session, index) => (
                  <div key={index} className={`grid grid-cols-5 gap-4 px-4 py-3 text-sm transition-colors duration-300 ${
                    index !== progressionData.length - 1 
                      ? theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                        ? "border-b border-gray-800" 
                        : "border-b border-gray-200 dark:border-gray-800"
                      : ""
                  }`}>
                    <div className={`transition-colors duration-300 ${
                      theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                        ? "text-gray-300" 
                        : "text-gray-700 dark:text-gray-300"
                    }`}>
                      {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className={`font-medium transition-colors duration-300 ${
                      theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                        ? "text-white" 
                        : "text-gray-900 dark:text-white"
                    }`}>{session.weight}kg</div>
                    <div className={`transition-colors duration-300 ${
                      theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                        ? "text-gray-300" 
                        : "text-gray-700 dark:text-gray-300"
                    }`}>{session.reps}</div>
                    <div className={`transition-colors duration-300 ${
                      theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                        ? "text-gray-300" 
                        : "text-gray-700 dark:text-gray-300"
                    }`}>{session.sets}</div>
                    <div className={`font-medium transition-colors duration-300 ${
                      theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                        ? "text-white" 
                        : "text-gray-900 dark:text-white"
                    }`}>{session.volume}kg</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`flex justify-end gap-2 border-t px-6 py-4 transition-colors duration-300 ${
            theme !== "system" || (theme === "system" && resolvedTheme === "dark")
              ? "border-gray-800" 
              : "border-gray-200 dark:border-gray-800"
          }`}>
            <button
              ref={firstFocusRef}
              onClick={() => {
                restoreFocus();
                onClose();
              }}
              className={`px-4 py-2 rounded-lg border font-medium transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                  : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}