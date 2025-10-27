"use client";

import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";

type TimeRange = "week" | "month" | "year";

interface StrengthAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  templateExerciseId?: number | null;
  timeRange: TimeRange;
}

export function StrengthAnalysisModal({
  isOpen,
  onClose,
  exerciseName,
  templateExerciseId,
  timeRange,
}: StrengthAnalysisModalProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme !== "system" || (theme === "system" && resolvedTheme === "dark");

  const { data: strengthData, isLoading } = api.progress.getStrengthProgression.useQuery(
    {
      exerciseName,
      templateExerciseId: templateExerciseId ?? undefined,
      timeRange,
    },
    { 
      enabled:
        isOpen && (exerciseName.length > 0 || typeof templateExerciseId === "number"),
    }
  );

  if (!isOpen) return null;

  const cardClass = `transition-all duration-300 rounded-xl border shadow-sm ${
    isDark
      ? "bg-gray-900 border-gray-800 shadow-lg" 
      : "bg-background border-gray-200 dark:bg-gray-900 dark:border-gray-800"
  }`;

  const titleClass = `text-xl font-bold mb-4 ${
    isDark ? "text-foreground" : "text-foreground dark:text-foreground"
  }`;

  const subtitleClass = `text-sm font-medium mb-2 ${
    isDark ? "text-gray-300" : "text-gray-700 dark:text-gray-300"
  }`;

  const calculateStats = () => {
    if (!strengthData || strengthData.length === 0) return null;

    const weights = strengthData.map(d => d.weight);
    const oneRMs = strengthData.map(d => d.oneRMEstimate);
    
    const currentMax = Math.max(...weights);
    const allTimeMax = Math.max(...weights);
    const averageWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const bestOneRM = Math.max(...oneRMs);
    
    const firstEntry = strengthData[strengthData.length - 1];
    const lastEntry = strengthData[0];
    const totalProgress = firstEntry && lastEntry ? lastEntry.weight - firstEntry.weight : 0;
    const progressPercentage = firstEntry ? (totalProgress / firstEntry.weight) * 100 : 0;
    
    // Volume stats
    const totalVolume = strengthData.reduce((sum, session) => 
      sum + (session.weight * session.reps * session.sets), 0
    );
    const avgVolumePerSession = totalVolume / strengthData.length;
    
    // Session stats
    const totalSessions = strengthData.length;
    const totalSets = strengthData.reduce((sum, session) => sum + session.sets, 0);
    const totalReps = strengthData.reduce((sum, session) => sum + (session.reps * session.sets), 0);
    
    // Consistency analysis
    const dateRange = strengthData.length > 1 
      ? new Date(strengthData[0]!.workoutDate).getTime() - new Date(strengthData[strengthData.length - 1]!.workoutDate).getTime()
      : 0;
    const daysSpanned = Math.ceil(dateRange / (1000 * 60 * 60 * 24));
    const sessionsPerWeek = daysSpanned > 0 ? (totalSessions / daysSpanned) * 7 : 0;
    
    return {
      currentMax,
      allTimeMax,
      averageWeight: Math.round(averageWeight * 10) / 10,
      bestOneRM,
      totalProgress: Math.round(totalProgress * 10) / 10,
      progressPercentage: Math.round(progressPercentage * 10) / 10,
      totalVolume: Math.round(totalVolume),
      avgVolumePerSession: Math.round(avgVolumePerSession),
      totalSessions,
      totalSets,
      totalReps,
      sessionsPerWeek: Math.round(sessionsPerWeek * 10) / 10,
      daysSpanned
    };
  };

  const stats = calculateStats();

  const getProgressColor = (progress: number) => {
    if (progress > 10) return "text-green-500";
    if (progress > 0) return "text-blue-500";
    if (progress > -5) return "text-yellow-500";
    return "text-red-500";
  };

  const getProgressIcon = (progress: number) => {
    if (progress > 10) return "🚀";
    if (progress > 0) return "📈";
    if (progress > -5) return "📊";
    return "📉";
  };

  return (
    <div className="fixed inset-0 bg-background bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl ${cardClass} p-6`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={titleClass}>Detailed Strength Analysis</h3>
            <p className={subtitleClass}>{exerciseName} - {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} View</p>
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

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Performance Overview */}
            <div className="mb-8">
              <h4 className={subtitleClass}>Performance Overview</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">🏋️</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Current Max
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-blue-500">
                    {stats.currentMax}kg
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">🎯</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Best 1RM Est.
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-green-500">
                    {stats.bestOneRM}kg
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">{getProgressIcon(stats.progressPercentage)}</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Total Progress
                    </h5>
                  </div>
                  <p className={`text-2xl font-bold ${getProgressColor(stats.progressPercentage)}`}>
                    {stats.totalProgress > 0 ? '+' : ''}{stats.totalProgress}kg
                  </p>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    ({stats.progressPercentage > 0 ? '+' : ''}{stats.progressPercentage}%)
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">📊</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Avg Weight
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-purple-500">
                    {stats.averageWeight}kg
                  </p>
                </div>
              </div>
            </div>

            {/* Volume Analysis */}
            <div className="mb-8">
              <h4 className={subtitleClass}>Volume Analysis</h4>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">📈</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Total Volume
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-orange-500">
                    {stats.totalVolume.toLocaleString()}kg
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    across all sessions
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">⚡</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Avg per Session
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-cyan-500">
                    {stats.avgVolumePerSession.toLocaleString()}kg
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    volume per workout
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">🔢</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Total Reps
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-indigo-500">
                    {stats.totalReps.toLocaleString()}
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    in {stats.totalSets} sets
                  </p>
                </div>
              </div>
            </div>

            {/* Training Consistency */}
            <div className="mb-8">
              <h4 className={subtitleClass}>Training Consistency</h4>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">📅</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Total Sessions
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-emerald-500">
                    {stats.totalSessions}
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    over {stats.daysSpanned} days
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">📊</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Frequency
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-teal-500">
                    {stats.sessionsPerWeek}x
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    per week average
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">⭐</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Consistency
                    </h5>
                  </div>
                  <p className={`text-2xl font-bold ${
                    stats.sessionsPerWeek >= 2 ? "text-green-500" :
                    stats.sessionsPerWeek >= 1 ? "text-yellow-500" : "text-red-500"
                  }`}>
                    {stats.sessionsPerWeek >= 2 ? "Great" : 
                     stats.sessionsPerWeek >= 1 ? "Good" : "Low"}
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    training regularity
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Session History */}
            <div>
              <h4 className={subtitleClass}>Complete Session History</h4>
              <div className={`rounded-lg border ${
                isDark ? "border-gray-700" : "border-gray-200"
              } overflow-hidden max-h-64 overflow-y-auto mobile-table-container`}>
                <div className="mobile-table">
                  <div className={`grid grid-cols-6 gap-2 sm:gap-4 px-2 sm:px-4 py-3 text-xs font-medium border-b sticky top-0 ${
                  isDark
                    ? "text-gray-400 border-gray-700 bg-gray-800"
                    : "text-gray-600 border-gray-200 bg-gray-50"
                }`}>
                  <div>Date</div>
                  <div>Weight</div>
                  <div>Reps</div>
                  <div>Sets</div>
                  <div>Volume</div>
                  <div>1RM Est.</div>
                </div>
                
                {strengthData?.map((session, index) => (
                  <div 
                    key={index} 
                    className={`grid grid-cols-6 gap-2 sm:gap-4 px-2 sm:px-4 py-3 text-xs sm:text-sm ${
                      index !== (strengthData?.length ?? 0) - 1
                        ? `border-b ${isDark ? "border-gray-700" : "border-gray-200"}`
                        : ""
                    } ${index === 0 ? (isDark ? "bg-blue-900/20" : "bg-blue-50") : ""}`}
                  >
                    <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                      {new Date(session.workoutDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className={`font-medium ${isDark ? "text-foreground" : "text-foreground"}`}>
                      {session.weight}kg
                    </div>
                    <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                      {session.reps}
                    </div>
                    <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                      {session.sets}
                    </div>
                    <div className={`font-medium ${isDark ? "text-foreground" : "text-foreground"}`}>
                      {(session.weight * session.reps * session.sets).toLocaleString()}kg
                    </div>
                    <div className={`font-medium ${isDark ? "text-foreground" : "text-foreground"}`}>
                      {session.oneRMEstimate}kg
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className={`text-lg font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              No strength data found
            </p>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Complete some workouts with {exerciseName} to see detailed analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
