"use client";

import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";

type TimeRange = "week" | "month" | "year";

interface VolumeAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeRange: TimeRange;
}

export function VolumeAnalysisModal({ isOpen, onClose, timeRange }: VolumeAnalysisModalProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme !== "system" || (theme === "system" && resolvedTheme === "dark");

  const { data: volumeData, isLoading: volumeLoading } = api.progress.getVolumeProgression.useQuery({
    timeRange,
  }, { enabled: isOpen });

  const { data: volumeByExercise, isLoading: exerciseLoading } = api.progress.getVolumeByExercise.useQuery({
    timeRange,
  }, { enabled: isOpen });

  const { data: setRepDistribution, isLoading: distributionLoading } = api.progress.getSetRepDistribution.useQuery({
    timeRange,
  }, { enabled: isOpen });

  if (!isOpen) return null;

  const cardClass = `transition-all duration-300 rounded-xl border shadow-sm ${
    isDark
      ? "bg-gray-900 border-gray-800 shadow-lg" 
      : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800"
  }`;

  const titleClass = `text-xl font-bold mb-4 ${
    isDark ? "text-white" : "text-gray-900 dark:text-white"
  }`;

  const subtitleClass = `text-sm font-medium mb-2 ${
    isDark ? "text-gray-300" : "text-gray-700 dark:text-gray-300"
  }`;

  const calculateVolumeStats = () => {
    if (!volumeData || volumeData.length === 0) return null;

    const totalVolume = volumeData.reduce((sum, day) => sum + day.totalVolume, 0);
    const avgDailyVolume = totalVolume / volumeData.length;
    const maxDailyVolume = Math.max(...volumeData.map(d => d.totalVolume));
    const minDailyVolume = Math.min(...volumeData.map(d => d.totalVolume));
    
    // Calculate trend
    const firstHalf = volumeData.slice(Math.floor(volumeData.length / 2));
    const secondHalf = volumeData.slice(0, Math.floor(volumeData.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.totalVolume, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.totalVolume, 0) / secondHalf.length;
    const trend = ((firstHalfAvg - secondHalfAvg) / secondHalfAvg) * 100;

    // Workout frequency
    const workoutDays = volumeData.filter(d => d.totalVolume > 0).length;
    const totalDays = volumeData.length;
    const consistency = (workoutDays / totalDays) * 100;

    return {
      totalVolume: Math.round(totalVolume),
      avgDailyVolume: Math.round(avgDailyVolume),
      maxDailyVolume: Math.round(maxDailyVolume),
      minDailyVolume: Math.round(minDailyVolume),
      trend: Math.round(trend * 10) / 10,
      workoutDays,
      totalDays,
      consistency: Math.round(consistency * 10) / 10
    };
  };

  const calculateExerciseStats = () => {
    if (!volumeByExercise || volumeByExercise.length === 0) return null;

    const totalExercises = volumeByExercise.length;
    const topExercise = volumeByExercise.reduce((max, exercise) => 
      exercise.totalVolume > max.totalVolume ? exercise : max
    );
    
    const volumeDistribution = volumeByExercise.map(exercise => ({
      ...exercise,
      percentage: (exercise.totalVolume / volumeByExercise.reduce((sum, e) => sum + e.totalVolume, 0)) * 100
    }));

    return {
      totalExercises,
      topExercise,
      volumeDistribution
    };
  };

  const calculateSetRepStats = () => {
    if (!setRepDistribution || !setRepDistribution.repDistribution || setRepDistribution.repDistribution.length === 0) return null;

    const repData = setRepDistribution.repDistribution;
    const totalSets = repData.reduce((sum, item) => sum + item.count, 0);
    const avgReps = repData.reduce((sum, item) => sum + (item.reps * item.count), 0) / totalSets;
    
    // Most common rep range
    const mostCommonRepRange = repData.reduce((max, item) => 
      item.count > max.count ? item : max
    );

    // Rep range distribution (using existing repRangeDistribution from API)
    const repRanges = setRepDistribution.repRangeDistribution?.reduce((acc, range) => {
      if (range.range.includes("1-5")) acc.low = range.count;
      else if (range.range.includes("6-8") || range.range.includes("9-12")) acc.medium += range.count;
      else acc.high += range.count;
      return acc;
    }, { low: 0, medium: 0, high: 0 }) || { low: 0, medium: 0, high: 0 };

    return {
      totalSets,
      avgReps: Math.round(avgReps * 10) / 10,
      mostCommonRepRange,
      repRanges,
      repRangePercentages: {
        low: Math.round((repRanges.low / totalSets) * 100),
        medium: Math.round((repRanges.medium / totalSets) * 100),
        high: Math.round((repRanges.high / totalSets) * 100)
      }
    };
  };

  const volumeStats = calculateVolumeStats();
  const exerciseStats = calculateExerciseStats();
  const setRepStats = calculateSetRepStats();

  const isLoading = volumeLoading || exerciseLoading || distributionLoading;

  const getTrendColor = (trend: number) => {
    if (trend > 5) return "text-green-500";
    if (trend > -5) return "text-blue-500";
    return "text-red-500";
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return "📈";
    if (trend > -5) return "📊";
    return "📉";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`max-w-6xl w-full max-h-[90vh] overflow-y-auto rounded-xl ${cardClass} p-6`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={titleClass}>Volume Analysis Deep Dive</h3>
            <p className={subtitleClass}>Comprehensive volume metrics for {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} view</p>
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
        ) : (
          <>
            {/* Volume Overview */}
            {volumeStats && (
              <div className="mb-8">
                <h4 className={subtitleClass}>Volume Overview</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xl">💪</span>
                      <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Total Volume
                      </h5>
                    </div>
                    <p className="text-2xl font-bold text-purple-500">
                      {volumeStats.totalVolume.toLocaleString()}kg
                    </p>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                      {volumeStats.workoutDays} workout days
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xl">📊</span>
                      <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Daily Average
                      </h5>
                    </div>
                    <p className="text-2xl font-bold text-blue-500">
                      {volumeStats.avgDailyVolume.toLocaleString()}kg
                    </p>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                      per workout
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xl">{getTrendIcon(volumeStats.trend)}</span>
                      <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Trend
                      </h5>
                    </div>
                    <p className={`text-2xl font-bold ${getTrendColor(volumeStats.trend)}`}>
                      {volumeStats.trend > 0 ? '+' : ''}{volumeStats.trend}%
                    </p>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                      vs previous period
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xl">🎯</span>
                      <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Consistency
                      </h5>
                    </div>
                    <p className={`text-2xl font-bold ${
                      volumeStats.consistency >= 70 ? "text-green-500" : 
                      volumeStats.consistency >= 40 ? "text-yellow-500" : "text-red-500"
                    }`}>
                      {volumeStats.consistency}%
                    </p>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                      workout frequency
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Exercise Volume Breakdown */}
            {exerciseStats && (
              <div className="mb-8">
                <h4 className={subtitleClass}>Exercise Volume Distribution</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h5 className={`text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Top Volume Contributors
                    </h5>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {exerciseStats.volumeDistribution.slice(0, 10).map((exercise, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                              index < 3 ? "bg-gradient-to-r from-yellow-400 to-orange-500" : "bg-gray-500"
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                {exercise.exerciseName}
                              </p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {exercise.totalSets} sets, {Math.round(exercise.averageVolume)}kg avg
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                              {exercise.totalVolume.toLocaleString()}kg
                            </p>
                            <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                              {Math.round(exercise.percentage)}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className={`text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Volume Distribution
                    </h5>
                    <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                      <div className="space-y-4">
                        <div>
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            Most Volume: {exerciseStats.topExercise.exerciseName}
                          </p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {exerciseStats.topExercise.totalVolume.toLocaleString()}kg total volume
                          </p>
                        </div>
                        
                        <div>
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            Exercise Variety: {exerciseStats.totalExercises} different exercises
                          </p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            Great exercise diversity!
                          </p>
                        </div>

                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              Volume concentration
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                              style={{ width: `${Math.min(exerciseStats.volumeDistribution[0]?.percentage || 0, 100)}%` }}
                            />
                          </div>
                          <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                            Top exercise: {Math.round(exerciseStats.volumeDistribution[0]?.percentage || 0)}% of total volume
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Set/Rep Analysis */}
            {setRepStats && (
              <div className="mb-8">
                <h4 className={subtitleClass}>Set & Rep Distribution</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <h5 className={`text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Rep Range Analysis
                    </h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            Strength (1-5 reps)
                          </p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {setRepStats.repRanges.low} sets
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-500">
                            {setRepStats.repRangePercentages.low}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            Hypertrophy (6-12 reps)
                          </p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {setRepStats.repRanges.medium} sets
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-500">
                            {setRepStats.repRangePercentages.medium}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            Endurance (13+ reps)
                          </p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {setRepStats.repRanges.high} sets
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-500">
                            {setRepStats.repRangePercentages.high}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <h5 className={`text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Training Summary
                    </h5>
                    <div className="space-y-3">
                      <div>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          Total Sets: {setRepStats.totalSets.toLocaleString()}
                        </p>
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          Average: {setRepStats.avgReps} reps per set
                        </p>
                      </div>

                      <div>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          Most Common: {setRepStats.mostCommonRepRange.reps} reps
                        </p>
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          {setRepStats.mostCommonRepRange.count} sets at this rep count
                        </p>
                      </div>

                      <div className="pt-2">
                        <p className={`text-sm font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                          Training Focus
                        </p>
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          {setRepStats.repRangePercentages.medium > 50 ? 
                            "🎯 Hypertrophy focused training" :
                            setRepStats.repRangePercentages.low > 40 ?
                            "💪 Strength focused training" :
                            "🏃 Balanced training approach"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Volume Chart */}
            {volumeData && volumeStats && (
              <div>
                <h4 className={subtitleClass}>Daily Volume Progression</h4>
                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="relative h-64">
                    <svg className="w-full h-full" viewBox="0 0 800 200">
                      {/* Grid */}
                      <defs>
                        <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 20" fill="none" stroke={isDark ? "#374151" : "#E5E7EB"} strokeWidth="0.5"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                      
                      {/* Volume bars */}
                      {volumeData.map((day, index) => {
                        const x = (index / Math.max(1, volumeData.length - 1)) * 720 + 40;
                        const height = (day.totalVolume / volumeStats.maxDailyVolume) * 160;
                        const y = 180 - height;
                        
                        return (
                          <g key={index}>
                            <rect
                              x={x - 8}
                              y={y}
                              width={16}
                              height={height}
                              fill={isDark ? "#60A5FA" : "#3B82F6"}
                              className="hover:opacity-75"
                            />
                            {day.totalVolume > 0 && (
                              <text
                                x={x}
                                y={y - 5}
                                textAnchor="middle"
                                className={`text-xs ${isDark ? "fill-gray-400" : "fill-gray-600"}`}
                              >
                                {Math.round(day.totalVolume / 1000)}k
                              </text>
                            )}
                          </g>
                        );
                      })}
                      
                      {/* Axis labels */}
                      <text x="20" y="20" className={`text-xs ${isDark ? "fill-gray-400" : "fill-gray-600"}`}>
                        {Math.round(volumeStats.maxDailyVolume / 1000)}k
                      </text>
                      <text x="20" y="190" className={`text-xs ${isDark ? "fill-gray-400" : "fill-gray-600"}`}>
                        0
                      </text>
                    </svg>
                  </div>
                  <p className={`text-xs text-center mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Daily volume progression over {timeRange}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}