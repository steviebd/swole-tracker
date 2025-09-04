"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";

type FocusType = "1RM" | "Volume";
type TimeRange = "week" | "month" | "quarter" | "year";

export function ExerciseProgressionCard() {
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [focus, setFocus] = useState<FocusType>("1RM");
  const [timeRange, setTimeRange] = useState<TimeRange>("quarter");
  const [showAIGuidance, setShowAIGuidance] = useState(false);

  // Get user's most trained exercises
  const { data: topExercises, isLoading: topExercisesLoading } = api.progress.getTopExercises.useQuery({
    limit: 20,
    timeRange: "year", // Use year to get comprehensive list
  });

  // Set default exercise when data loads
  const defaultExercise = topExercises?.[0]?.exerciseName || "";
  const currentExercise = selectedExercise || defaultExercise;

  // Get exercise-specific data based on focus
  const { data: strengthData, isLoading: strengthLoading } = api.progress.getExerciseStrengthProgression.useQuery(
    {
      exerciseName: currentExercise,
      timeRange,
    },
    { enabled: !!currentExercise && focus === "1RM" }
  );

  const { data: volumeData, isLoading: volumeLoading } = api.progress.getExerciseVolumeProgression.useQuery(
    {
      exerciseName: currentExercise,
      timeRange,
    },
    { enabled: !!currentExercise && focus === "Volume" }
  );

  const { data: recentPRs, isLoading: prsLoading } = api.progress.getExerciseRecentPRs.useQuery(
    {
      exerciseName: currentExercise,
      timeRange,
    },
    { enabled: !!currentExercise }
  );

  const { data: topSets, isLoading: topSetsLoading } = api.progress.getExerciseTopSets.useQuery(
    {
      exerciseName: currentExercise,
      timeRange,
    },
    { enabled: !!currentExercise }
  );

  // Calculate progression status with detailed descriptions
  const getProgressionStatus = (trend: number) => {
    if (trend > 2) {
      return { 
        status: "improving", 
        color: "text-green-500", 
        icon: "🟢",
        text: "Improving",
        description: "Great progress! Keep up the current training approach."
      };
    }
    if (trend < -2) {
      return { 
        status: "declining", 
        color: "text-red-500", 
        icon: "🔴",
        text: "Declining",
        description: "Performance is declining. Consider adjusting training variables."
      };
    }
    return { 
      status: "maintaining", 
      color: "text-yellow-500", 
      icon: "🟡",
      text: "Maintaining",
      description: "Steady performance. Progress may come in waves."
    };
  };

  // Prepare chart data from volume progression data
  const chartData = useMemo(() => {
    if (focus === "Volume" && volumeData?.volumeByWeek) {
      return volumeData.volumeByWeek.map(point => ({
        date: point.weekStart,
        value: point.totalVolume,
        label: `${point.totalVolume}kg`,
      }));
    }
    // For 1RM focus, we'll use a simplified approach since the API doesn't return progression data
    // We'll show the current 1RM as a single point for now
    if (focus === "1RM" && strengthData) {
      return [{
        date: new Date().toISOString().split('T')[0]!,
        value: strengthData.currentOneRM,
        label: `${strengthData.currentOneRM}kg`,
      }];
    }
    return [];
  }, [focus, strengthData, volumeData]);

  // Get current data based on focus
  const currentData = focus === "1RM" ? strengthData : volumeData;
  const isLoading = focus === "1RM" ? strengthLoading : volumeLoading;
  const progressionTrend = focus === "1RM" 
    ? (strengthData?.progressionTrend || 0) 
    : (volumeData?.volumeChangePercent || 0);
  const progression = getProgressionStatus(progressionTrend);

  // Close modal when clicking outside
  const handleModalBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowAIGuidance(false);
    }
  };

  // Styles
  const cardClass = "transition-all duration-300 rounded-xl border shadow-sm glass-surface";
  const titleClass = "text-xl font-bold mb-4 text-[var(--color-text)]";
  const subtitleClass = "text-sm font-medium mb-2 text-[var(--color-text-secondary)]";
  const selectClass = "px-3 py-2 text-sm rounded-lg border transition-colors bg-[var(--color-bg-surface)] border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-primary)]";

  return (
    <div className={cardClass + " p-6"}>
      {/* Header with selectors */}
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className={titleClass + " mb-0"}>Volume by Exercise</h2>
          <button
            onClick={() => setShowAIGuidance(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-200 flex items-center space-x-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>AI Insights</span>
            <span className="px-1.5 py-0.5 bg-black/20 rounded text-xs">Beta</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Exercise Selector */}
          <div>
            <label htmlFor="exercise-select" className={subtitleClass}>
              Exercise
            </label>
            <select
              id="exercise-select"
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className={selectClass + " w-full"}
              disabled={topExercisesLoading}
            >
              {topExercises?.map((exercise) => (
                <option key={exercise.exerciseName} value={exercise.exerciseName}>
                  {exercise.exerciseName}
                </option>
              ))}
            </select>
          </div>

          {/* Focus Selector */}
          <div>
            <label htmlFor="focus-select" className={subtitleClass}>
              Focus
            </label>
            <select
              id="focus-select"
              value={focus}
              onChange={(e) => setFocus(e.target.value as FocusType)}
              className={selectClass + " w-full"}
            >
              <option value="1RM">1RM</option>
              <option value="Volume">Volume</option>
            </select>
          </div>

          {/* Time Range Selector */}
          <div>
            <label htmlFor="time-range-select" className={subtitleClass}>
              Time Range
            </label>
            <select
              id="time-range-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className={selectClass + " w-full"}
            >
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {(isLoading || topExercisesLoading) && (
        <div className="space-y-4">
          <div className="animate-pulse bg-[var(--color-bg-surface)] h-24 rounded-lg"></div>
          <div className="animate-pulse bg-[var(--color-bg-surface)] h-64 rounded-lg"></div>
          <div className="animate-pulse bg-[var(--color-bg-surface)] h-32 rounded-lg"></div>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && !topExercisesLoading && currentExercise && (
        <>
          {/* Key Metrics Display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <p className={subtitleClass}>
                Current {focus === "1RM" ? "1RM" : "Total Volume"}
              </p>
              <p className="text-xl font-bold text-[var(--color-primary)]">
                {focus === "1RM" 
                  ? `${strengthData?.currentOneRM || 0}kg ${strengthData?.oneRMChange ? `(${strengthData.oneRMChange > 0 ? '+' : ''}${strengthData.oneRMChange}kg)` : ''}`
                  : `${volumeData?.currentVolume?.toLocaleString() || 0}kg`
                }
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <p className={subtitleClass}>Progression Status</p>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{progression.icon}</span>
                  <p className={`text-lg font-bold ${progression.color}`}>
                    {progression.text}
                  </p>
                </div>
                <p className={`text-lg font-bold ${progression.color}`}>
                  {progressionTrend > 0 ? '+' : ''}{progressionTrend.toFixed(1)}%
                  {progressionTrend > 0 ? ' ↗' : progressionTrend < 0 ? ' ↘' : ' →'}
                </p>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {progression.description}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <p className={subtitleClass}>Sessions</p>
              <p className="text-xl font-bold text-[var(--color-info)]">
                {currentData?.sessionCount || 0}
                {currentData?.frequency ? ` (${currentData.frequency.toFixed(1)}x/week)` : ''}
                {currentData?.frequency && currentData.frequency >= 2 ? ' ✓' : ''}
              </p>
            </div>
          </div>

          {/* Progression Chart */}
          <div className="mb-6">
            <h3 className={subtitleClass}>
              {focus} Progression Over Time
            </h3>
            <div className="relative h-64 p-6 rounded-lg border border-[var(--color-border)]" 
                 style={{ background: 'color-mix(in srgb, var(--card) 98%, var(--primary) 2%)' }}>
              {chartData.length > 0 ? (
                <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                  {/* Grid lines */}
                  <defs>
                    <pattern id="progression-grid" width="40" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 20" fill="none" stroke="var(--color-border)" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#progression-grid)" />
                  
                  {/* Data visualization */}
                  {chartData.map((point, index) => {
                    const maxValue = Math.max(...chartData.map(p => p.value));
                    const minValue = Math.min(...chartData.map(p => p.value));
                    const range = maxValue - minValue || 1;
                    const padding = range * 0.1;
                    
                    const x = (index / Math.max(1, chartData.length - 1)) * 350 + 25;
                    const y = 180 - ((point.value - minValue + padding) / (range + 2 * padding)) * 160;
                    
                    return (
                      <g key={index}>
                        {/* Line to next point */}
                        {index < chartData.length - 1 && (
                          <line
                            x1={x}
                            y1={y}
                            x2={((index + 1) / Math.max(1, chartData.length - 1)) * 350 + 25}
                            y2={180 - ((chartData[index + 1]!.value - minValue + padding) / (range + 2 * padding)) * 160}
                            stroke="var(--color-primary)"
                            strokeWidth="2"
                          />
                        )}
                        
                        {/* Data point */}
                        <circle
                          cx={x}
                          cy={y}
                          r="4"
                          fill="var(--color-primary)"
                          className="hover:r-6 cursor-pointer transition-all"
                        />
                        
                        {/* Value label on hover */}
                        <text
                          x={x}
                          y={Math.max(y - 15, 15)}
                          textAnchor="middle"
                          className="text-xs font-medium opacity-0 hover:opacity-100 transition-opacity"
                          fill="var(--color-text)"
                        >
                          {point.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    No progression data available for selected period
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent PRs Section */}
          <div className="mb-6">
            <h3 className={subtitleClass}>Recent PRs</h3>
            {prsLoading ? (
              <div className="animate-pulse bg-[var(--color-bg-surface)] h-20 rounded-lg"></div>
            ) : recentPRs?.recentPRs && recentPRs.recentPRs.length > 0 ? (
              <div className="space-y-2">
                {recentPRs.recentPRs.slice(0, 3).map((pr, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {pr.type === "1RM" ? "🏆" : pr.type === "Volume" ? "💪" : "⭐"}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">
                          {new Date(pr.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {pr.weight}kg x {pr.reps} {pr.type === "1RM" ? "(New 1RM!)" : "(Volume PR)"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[var(--color-primary)]">
                        {pr.oneRMPercentage?.toFixed(0) || 0}% of 1RM
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No recent PRs in selected time range
                </p>
              </div>
            )}
          </div>

          {/* Top Recent Sets Section */}
          <div>
            <h3 className={subtitleClass}>Top Recent Sets</h3>
            {topSetsLoading ? (
              <div className="animate-pulse bg-[var(--color-bg-surface)] h-24 rounded-lg"></div>
            ) : topSets?.topSets && topSets.topSets.length > 0 ? (
              <div className="space-y-2">
                {topSets.topSets.map((set, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {set.weight}kg x {set.reps}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {new Date(set.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[var(--color-primary)]">
                        {set.oneRMPercentage.toFixed(0)}% of 1RM
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No recent sets data available
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!isLoading && !topExercisesLoading && (!currentExercise || (topExercises && topExercises.length === 0)) && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="var(--color-text-muted)">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-lg font-medium mb-2 text-[var(--color-text-secondary)]">
            No exercise data found
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Complete some workouts to track your exercise progression.
          </p>
        </div>
      )}

      {/* AI Guidance Modal */}
      {showAIGuidance && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={handleModalBackdropClick}
        >
          <div className="bg-[var(--color-bg-card)] rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text)]">AI Training Insights</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Powered by advanced analytics</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIGuidance(false)}
                  className="p-2 hover:bg-[var(--color-bg-surface)] rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Current Exercise Insights */}
              {currentExercise && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-[var(--color-text)] mb-2">
                    {currentExercise} Analysis
                  </h4>
                  <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                    {strengthData?.currentOneRM && (
                      <p>• You're working with a {strengthData.currentOneRM}kg 1RM - excellent foundation!</p>
                    )}
                    {progression.status === 'improving' && (
                      <p>• Your {progressionTrend.toFixed(1)}% improvement shows great consistency!</p>
                    )}
                    {progression.status === 'maintaining' && (
                      <p>• Steady performance indicates good training stability.</p>
                    )}
                    {progression.status === 'declining' && (
                      <p>• Consider a deload week to recover and reset your progress.</p>
                    )}
                    {currentData?.frequency && currentData.frequency >= 2 && (
                      <p>• Training {currentData.frequency.toFixed(1)}x per week shows excellent frequency!</p>
                    )}
                  </div>
                </div>
              )}

              {/* General AI Insights */}
              <div className="space-y-3">
                <h4 className="font-semibold text-[var(--color-text)]">Smart Recommendations</h4>
                
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-start space-x-3">
                    <span className="text-green-500 font-bold">✓</span>
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">Progressive Overload</p>
                      <p className="text-sm text-green-700 dark:text-green-300">Aim for 2.5-5kg increases when hitting 8+ reps consistently</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start space-x-3">
                    <span className="text-yellow-500 font-bold">!</span>
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">Recovery Focus</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">Sleep 7-9 hours and eat sufficient protein for optimal gains</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-500 font-bold">💡</span>
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">Form Check</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Record your lifts to ensure consistent technique as weight increases</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coming Soon Section */}
              <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border border-purple-200 dark:border-purple-800">
                <div className="text-center">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full inline-block mb-3">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-[var(--color-text)] mb-2">More AI Features Coming Soon!</h4>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                    We're developing advanced AI that will provide personalized training recommendations based on your unique progress patterns.
                  </p>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    <p>• Personalized programming suggestions</p>
                    <p>• Injury prevention alerts</p>
                    <p>• Competition readiness tracking</p>
                    <p>• Recovery optimization tips</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] rounded-b-xl">
              <button
                onClick={() => setShowAIGuidance(false)}
                className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary)]/90 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}