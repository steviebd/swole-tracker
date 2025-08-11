"use client";

import { useRef, useState } from "react";
import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";
import { FocusTrap, useReturnFocus } from "./focus-trap";

interface ProgressionModalProps {
  open: boolean;
  onClose: () => void;
  exerciseName?: string;
}

type TimeRange = "week" | "month" | "year";

export function ProgressionModal({ open, onClose, exerciseName }: ProgressionModalProps) {
  const { theme, resolvedTheme } = useTheme();
  const { restoreFocus } = useReturnFocus();
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>(exerciseName || "");
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  
  // Get list of exercises for dropdown
  const { data: exerciseList, isLoading: exerciseListLoading } = api.progress.getExerciseList.useQuery(
    undefined,
    { enabled: open }
  );
  
  // Get strength progression data for selected exercise
  const { data: strengthData, isLoading: strengthLoading } = api.progress.getStrengthProgression.useQuery(
    {
      exerciseName: selectedExercise,
      timeRange,
    },
    { 
      enabled: !!selectedExercise && open
    }
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="progression-title"
      className="fixed inset-0 z-[50000] flex min-h-screen items-center justify-center p-4"
      style={{ 
        backgroundColor: theme !== "system" || (theme === "system" && resolvedTheme === "dark") ? 'rgba(0, 0, 0, 0.8)' : 'rgba(17, 24, 39, 0.8)',
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
          className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border shadow-2xl transition-colors duration-300 ${
            theme !== "system" || (theme === "system" && resolvedTheme === "dark")
              ? "bg-gray-900 border-gray-800" 
              : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800"
          }`}
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
              Exercise Progression
            </h2>
            <p className={`text-sm transition-colors duration-300 ${
              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                ? "text-gray-400" 
                : "text-gray-600 dark:text-gray-400"
            }`}>
              Select an exercise to track your progress over time
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {/* Exercise Selection and Time Range */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Exercise Selector */}
              <div className="flex-1">
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-gray-300" 
                    : "text-gray-700 dark:text-gray-300"
                }`}>
                  Exercise
                </label>
                {exerciseListLoading ? (
                  <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-10 rounded-lg"></div>
                ) : (
                  <select
                    value={selectedExercise}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
                      theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                        ? "bg-gray-800 border-gray-700 text-white focus:border-blue-500"
                        : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                    }`}
                  >
                    <option value="">Choose an exercise...</option>
                    {exerciseList?.map((exercise) => (
                      <option key={exercise.exerciseName} value={exercise.exerciseName}>
                        {exercise.exerciseName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              {/* Time Range Selector */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-gray-300" 
                    : "text-gray-700 dark:text-gray-300"
                }`}>
                  Time Range
                </label>
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

            {selectedExercise ? (
              <>
                {strengthLoading ? (
                  <div className="space-y-4">
                    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>
                    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
                  </div>
                ) : strengthData && strengthData.length > 0 ? (
                  <>
                    {/* Simple Chart Visualization */}
                    <div className="mb-6">
                      <h3 className={`text-lg font-semibold mb-3 transition-colors duration-300 ${
                        theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                          ? "text-white" 
                          : "text-gray-900 dark:text-white"
                      }`}>Weight Progress</h3>
                      
                      <div className={`h-64 p-4 rounded-lg transition-colors duration-300 ${
                        theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                          ? "bg-gray-800" 
                          : "bg-gray-50"
                      }`}>
                        <svg className="w-full h-full" viewBox="0 0 400 200">
                          {/* Grid lines */}
                          <defs>
                            <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                              <path d="M 40 0 L 0 0 0 20" fill="none" 
                                stroke={theme !== "system" || (theme === "system" && resolvedTheme === "dark") ? "#374151" : "#E5E7EB"} 
                                strokeWidth="0.5"/>
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill="url(#grid)" />
                          
                          {/* Data points and line */}
                          {strengthData.map((point, index) => {
                            const maxWeight = Math.max(...strengthData.map(d => d.weight));
                            const minWeight = Math.min(...strengthData.map(d => d.weight));
                            const range = maxWeight - minWeight || 1;
                            
                            const x = (index / Math.max(1, strengthData.length - 1)) * 360 + 20;
                            const y = 180 - ((point.weight - minWeight) / range) * 160;
                            
                            return (
                              <g key={index}>
                                {/* Line to next point */}
                                {index < strengthData.length - 1 && (
                                  <line
                                    x1={x}
                                    y1={y}
                                    x2={(index + 1) / Math.max(1, strengthData.length - 1) * 360 + 20}
                                    y2={180 - ((strengthData[index + 1]!.weight - minWeight) / range) * 160}
                                    stroke={theme !== "system" || (theme === "system" && resolvedTheme === "dark") ? "#60A5FA" : "#3B82F6"}
                                    strokeWidth="2"
                                  />
                                )}
                                
                                {/* Data point */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill={theme !== "system" || (theme === "system" && resolvedTheme === "dark") ? "#60A5FA" : "#3B82F6"}
                                  className="hover:r-6 cursor-pointer transition-all"
                                />
                                
                                {/* Weight label */}
                                <text
                                  x={x}
                                  y={y - 10}
                                  textAnchor="middle"
                                  className={`text-xs font-medium ${
                                    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                                      ? "fill-gray-300" 
                                      : "fill-gray-700"
                                  }`}
                                >
                                  {point.weight}kg
                                </text>
                              </g>
                            );
                          })}
                        </svg>
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
                      } max-h-64 overflow-y-auto`}>
                        <div className={`grid grid-cols-6 gap-4 px-4 py-3 text-sm font-medium border-b sticky top-0 transition-colors duration-300 ${
                          theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                            ? "text-gray-400 border-gray-800 bg-gray-900" 
                            : "text-gray-600 border-gray-200 bg-white dark:text-gray-400 dark:border-gray-800 dark:bg-gray-900"
                        }`}>
                          <div>Date</div>
                          <div>Weight</div>
                          <div>Reps</div>
                          <div>Sets</div>
                          <div>Volume</div>
                          <div>1RM Est.</div>
                        </div>
                        {strengthData.slice(0, 10).map((session, index) => (
                          <div key={index} className={`grid grid-cols-6 gap-4 px-4 py-3 text-sm transition-colors duration-300 ${
                            index !== Math.min(9, strengthData.length - 1)
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
                              {new Date(session.workoutDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
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
                            }`}>{(session.weight * session.reps * session.sets).toLocaleString()}kg</div>
                            <div className={`font-medium transition-colors duration-300 ${
                              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                                ? "text-white" 
                                : "text-gray-900 dark:text-white"
                            }`}>{session.oneRMEstimate}kg</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <svg className={`w-16 h-16 mx-auto mb-4 transition-colors duration-300 ${
                      theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                        ? "text-gray-600" 
                        : "text-gray-400 dark:text-gray-600"
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className={`text-lg font-medium mb-2 transition-colors duration-300 ${
                      theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                        ? "text-gray-300" 
                        : "text-gray-700 dark:text-gray-300"
                    }`}>
                      No data found
                    </p>
                    <p className={`text-sm transition-colors duration-300 ${
                      theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                        ? "text-gray-400" 
                        : "text-gray-600 dark:text-gray-400"
                    }`}>
                      Complete some workouts with {selectedExercise} to see your progression.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <svg className={`w-16 h-16 mx-auto mb-4 transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-gray-600" 
                    : "text-gray-400 dark:text-gray-600"
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className={`text-lg font-medium mb-2 transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-gray-300" 
                    : "text-gray-700 dark:text-gray-300"
                }`}>
                  Select an Exercise
                </p>
                <p className={`text-sm transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-gray-400" 
                    : "text-gray-600 dark:text-gray-400"
                }`}>
                  Choose an exercise from the dropdown to view your progression.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`flex justify-between items-center border-t px-6 py-4 transition-colors duration-300 ${
            theme !== "system" || (theme === "system" && resolvedTheme === "dark")
              ? "border-gray-800" 
              : "border-gray-200 dark:border-gray-800"
          }`}>
            {selectedExercise && (
              <a
                href="/progress"
                onClick={onClose}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-blue-400 hover:text-blue-300 hover:bg-gray-800"
                    : "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-gray-800"
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 712-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 712-2h2a2 2 0 712 2v14a2 2 0 71-2 2h-2a2 2 0 71-2-2z" />
                </svg>
                View Full Progress Dashboard
              </a>
            )}
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
