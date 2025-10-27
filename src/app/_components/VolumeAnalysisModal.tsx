"use client";

import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";

type TimeRange = "week" | "month" | "year";

interface VolumeAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeRange: TimeRange;
}

export function VolumeAnalysisModal({
  isOpen,
  onClose,
  timeRange,
}: VolumeAnalysisModalProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark =
    theme !== "system" || (theme === "system" && resolvedTheme === "dark");

  const { data: volumeResponse, isLoading: volumeLoading } =
    api.progress.getVolumeProgression.useQuery(
      {
        timeRange,
      },
      { enabled: isOpen },
    );

  const { data: volumeByExercise, isLoading: exerciseLoading } =
    api.progress.getVolumeByExercise.useQuery(
      {
        timeRange,
      },
      { enabled: isOpen },
    );

  const { data: setRepDistribution, isLoading: distributionLoading } =
    api.progress.getSetRepDistribution.useQuery(
      {
        timeRange,
      },
      { enabled: isOpen },
    );

  if (!isOpen) return null;

  const cardClass = "card transition-all duration-300 rounded-xl";

  const titleClass = "text-xl font-bold mb-4 text-primary";

  const subtitleClass = "text-sm font-medium mb-2 text-secondary";

  const calculateVolumeStats = () => {
    const volumeData = volumeResponse?.data;
    if (!volumeData || volumeData.length === 0) return null;

    const totalVolume = volumeData.reduce(
      (sum: number, day) => sum + day.totalVolume,
      0,
    );
    const avgDailyVolume = totalVolume / volumeData.length;
    const maxDailyVolume = Math.max(...volumeData.map((d) => d.totalVolume));
    const minDailyVolume = Math.min(...volumeData.map((d) => d.totalVolume));

    // Calculate trend
    const firstHalf = volumeData.slice(Math.floor(volumeData.length / 2));
    const secondHalf = volumeData.slice(0, Math.floor(volumeData.length / 2));
    const firstHalfAvg =
      firstHalf.reduce((sum: number, d) => sum + d.totalVolume, 0) /
      firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum: number, d) => sum + d.totalVolume, 0) /
      secondHalf.length;
    const trend = ((firstHalfAvg - secondHalfAvg) / secondHalfAvg) * 100;

    // Workout frequency
    const workoutDays = volumeData.filter((d) => d.totalVolume > 0).length;
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
      consistency: Math.round(consistency * 10) / 10,
    };
  };

  const calculateExerciseStats = () => {
    if (!volumeByExercise || volumeByExercise.length === 0) return null;

    const totalExercises = volumeByExercise.length;
    const topExercise = volumeByExercise.reduce((max, exercise) =>
      exercise.totalVolume > max.totalVolume ? exercise : max,
    );

    const volumeDistribution = volumeByExercise.map((exercise) => ({
      ...exercise,
      percentage:
        (exercise.totalVolume /
          volumeByExercise.reduce((sum, e) => sum + e.totalVolume, 0)) *
        100,
    }));

    return {
      totalExercises,
      topExercise,
      volumeDistribution,
    };
  };

  const calculateSetRepStats = () => {
    if (
      !setRepDistribution?.repDistribution ||
      setRepDistribution.repDistribution.length === 0
    )
      return null;

    const repData = setRepDistribution.repDistribution;
    const totalSets = repData.reduce((sum, item) => sum + item.count, 0);
    const avgReps =
      repData.reduce((sum, item) => sum + item.reps * item.count, 0) /
      totalSets;

    // Most common rep range
    const mostCommonRepRange = repData.reduce((max, item) =>
      item.count > max.count ? item : max,
    );

    // Rep range distribution (using existing repRangeDistribution from API)
    const repRanges = setRepDistribution.repRangeDistribution?.reduce(
      (acc, range) => {
        if (range.range.includes("1-5")) acc.low = range.count;
        else if (range.range.includes("6-8") || range.range.includes("9-12"))
          acc.medium += range.count;
        else acc.high += range.count;
        return acc;
      },
      { low: 0, medium: 0, high: 0 },
    ) || { low: 0, medium: 0, high: 0 };

    return {
      totalSets,
      avgReps: Math.round(avgReps * 10) / 10,
      mostCommonRepRange,
      repRanges,
      repRangePercentages: {
        low: Math.round((repRanges.low / totalSets) * 100),
        medium: Math.round((repRanges.medium / totalSets) * 100),
        high: Math.round((repRanges.high / totalSets) * 100),
      },
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
    <div className="loading-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl ${cardClass} p-6`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className={titleClass}>Volume Analysis Deep Dive</h3>
            <p className={subtitleClass}>
              Comprehensive volume metrics for{" "}
              {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} view
            </p>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              isDark ? "btn-primary" : "btn-secondary"
            }`}
          >
            ✕ Close
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-lg"></div>
            ))}
          </div>
        ) : (
          <>
            {/* Volume Overview */}
            {volumeStats && (
              <div className="mb-8">
                <h4 className={subtitleClass}>Volume Overview</h4>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="mb-1 flex items-center space-x-2">
                      <span className="text-xl">💪</span>
                      <h5 className="text-muted text-xs font-medium">
                        Total Volume
                      </h5>
                    </div>
                    <p className="text-2xl font-bold text-purple-500">
                      {volumeStats.totalVolume.toLocaleString()}kg
                    </p>
                    <p className="text-muted text-xs">
                      {volumeStats.workoutDays} workout days
                    </p>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="mb-1 flex items-center space-x-2">
                      <span className="text-xl">📊</span>
                      <h5 className="text-muted text-xs font-medium">
                        Daily Average
                      </h5>
                    </div>
                    <p className="text-2xl font-bold text-blue-500">
                      {volumeStats.avgDailyVolume.toLocaleString()}kg
                    </p>
                    <p className="text-muted text-xs">per workout</p>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="mb-1 flex items-center space-x-2">
                      <span className="text-xl">
                        {getTrendIcon(volumeStats.trend)}
                      </span>
                      <h5 className="text-muted text-xs font-medium">Trend</h5>
                    </div>
                    <p
                      className={`text-2xl font-bold ${getTrendColor(volumeStats.trend)}`}
                    >
                      {volumeStats.trend > 0 ? "+" : ""}
                      {volumeStats.trend}%
                    </p>
                    <p className="text-muted text-xs">vs previous period</p>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="mb-1 flex items-center space-x-2">
                      <span className="text-xl">🎯</span>
                      <h5 className="text-muted text-xs font-medium">
                        Consistency
                      </h5>
                    </div>
                    <p
                      className={`text-2xl font-bold ${
                        volumeStats.consistency >= 70
                          ? "text-green-500"
                          : volumeStats.consistency >= 40
                            ? "text-yellow-500"
                            : "text-red-500"
                      }`}
                    >
                      {volumeStats.consistency}%
                    </p>
                    <p className="text-muted text-xs">workout frequency</p>
                  </div>
                </div>
              </div>
            )}

            {/* Exercise Volume Breakdown */}
            {exerciseStats && (
              <div className="mb-8">
                <h4 className={subtitleClass}>Exercise Volume Distribution</h4>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <h5 className="text-secondary mb-3 text-sm font-medium">
                      Top Volume Contributors
                    </h5>
                    <div className="max-h-64 space-y-3 overflow-y-auto">
                      {exerciseStats.volumeDistribution
                        .slice(0, 10)
                        .map((exercise, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between"
                          >
                            <div className="flex flex-1 items-center space-x-3">
                              <div
                                className={`text-background flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                  index < 3
                                    ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                                    : "bg-gray-500"
                                }`}
                              >
                                {index + 1}
                              </div>
                              <div>
                                <p
                                  className={`text-sm font-medium ${isDark ? "text-background" : "text-foreground"}`}
                                >
                                  {exercise.exerciseName}
                                </p>
                                <p className="text-muted text-xs">
                                  {exercise.totalSets} sets,{" "}
                                  {Math.round(exercise.averageVolume)}kg avg
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-sm font-bold ${isDark ? "text-background" : "text-foreground"}`}
                              >
                                {exercise.totalVolume.toLocaleString()}kg
                              </p>
                              <p className="text-muted text-xs">
                                {Math.round(exercise.percentage)}%
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-secondary mb-3 text-sm font-medium">
                      Volume Distribution
                    </h5>
                    <div className="bg-muted rounded-lg p-4">
                      <div className="space-y-4">
                        <div>
                          <p
                            className={`text-sm font-medium ${isDark ? "text-background" : "text-foreground"}`}
                          >
                            Most Volume:{" "}
                            {exerciseStats.topExercise.exerciseName}
                          </p>
                          <p
                            className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                          >
                            {exerciseStats.topExercise.totalVolume.toLocaleString()}
                            kg total volume
                          </p>
                        </div>

                        <div>
                          <p
                            className={`text-sm font-medium ${isDark ? "text-background" : "text-foreground"}`}
                          >
                            Exercise Variety: {exerciseStats.totalExercises}{" "}
                            different exercises
                          </p>
                          <p
                            className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                          >
                            Great exercise diversity!
                          </p>
                        </div>

                        <div className="pt-2">
                          <div className="mb-1 flex items-center justify-between">
                            <span
                              className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                            >
                              Volume concentration
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                              style={{
                                width: `${Math.min(exerciseStats.volumeDistribution[0]?.percentage || 0, 100)}%`,
                              }}
                            />
                          </div>
                          <p
                            className={`mt-1 text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}
                          >
                            Top exercise:{" "}
                            {Math.round(
                              exerciseStats.volumeDistribution[0]?.percentage ||
                                0,
                            )}
                            % of total volume
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
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="bg-muted rounded-lg p-4">
                    <h5 className="text-secondary mb-3 text-sm font-medium">
                      Rep Range Analysis
                    </h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p
                            className={`text-sm font-medium ${isDark ? "text-background" : "text-foreground"}`}
                          >
                            Strength (1-5 reps)
                          </p>
                          <p
                            className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                          >
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
                          <p
                            className={`text-sm font-medium ${isDark ? "text-background" : "text-foreground"}`}
                          >
                            Hypertrophy (6-12 reps)
                          </p>
                          <p
                            className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                          >
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
                          <p
                            className={`text-sm font-medium ${isDark ? "text-background" : "text-foreground"}`}
                          >
                            Endurance (13+ reps)
                          </p>
                          <p
                            className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                          >
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

                  <div className="bg-muted rounded-lg p-4">
                    <h5 className="text-secondary mb-3 text-sm font-medium">
                      Training Summary
                    </h5>
                    <div className="space-y-3">
                      <div>
                        <p
                          className={`text-sm font-medium ${isDark ? "text-background" : "text-foreground"}`}
                        >
                          Total Sets: {setRepStats.totalSets.toLocaleString()}
                        </p>
                        <p
                          className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                        >
                          Average: {setRepStats.avgReps} reps per set
                        </p>
                      </div>

                      <div>
                        <p
                          className={`text-sm font-medium ${isDark ? "text-background" : "text-foreground"}`}
                        >
                          Most Common: {setRepStats.mostCommonRepRange.reps}{" "}
                          reps
                        </p>
                        <p
                          className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                        >
                          {setRepStats.mostCommonRepRange.count} sets at this
                          rep count
                        </p>
                      </div>

                      <div className="pt-2">
                        <p
                          className={`mb-2 text-sm font-medium ${isDark ? "text-background" : "text-foreground"}`}
                        >
                          Training Focus
                        </p>
                        <p
                          className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                        >
                          {setRepStats.repRangePercentages.medium > 50
                            ? "🎯 Hypertrophy focused training"
                            : setRepStats.repRangePercentages.low > 40
                              ? "💪 Strength focused training"
                              : "🏃 Balanced training approach"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Volume Chart */}
            {volumeResponse?.data && volumeStats && (
              <div>
                <h4 className={subtitleClass}>Daily Volume Progression</h4>
                <div
                  className={`rounded-lg p-4 ${isDark ? "bg-gray-800" : "bg-gray-50"}`}
                >
                  <div className="relative h-64">
                    <svg className="h-full w-full" viewBox="0 0 800 200">
                      {/* Grid */}
                      <defs>
                        <pattern
                          id="grid"
                          width="40"
                          height="20"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M 40 0 L 0 0 0 20"
                            fill="none"
                            stroke="var(--color-border)"
                            strokeWidth="0.5"
                          />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />

                      {/* Volume bars */}
                      {volumeResponse?.data?.map((day, index) => {
                        const x =
                          (index /
                            Math.max(
                              1,
                              volumeResponse?.data?.length - 1 || 0,
                            )) *
                            720 +
                          40;
                        const height =
                          (day.totalVolume / volumeStats.maxDailyVolume) * 160;
                        const y = 180 - height;

                        return (
                          <g key={index}>
                            <rect
                              x={x - 8}
                              y={y}
                              width={16}
                              height={height}
                              fill="var(--color-primary)"
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
                      <text
                        x="20"
                        y="20"
                        className={`text-xs ${isDark ? "fill-gray-400" : "fill-gray-600"}`}
                      >
                        {Math.round(volumeStats.maxDailyVolume / 1000)}k
                      </text>
                      <text
                        x="20"
                        y="190"
                        className={`text-xs ${isDark ? "fill-gray-400" : "fill-gray-600"}`}
                      >
                        0
                      </text>
                    </svg>
                  </div>
                  <p
                    className={`mt-2 text-center text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
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
