"use client";

import { useState } from "react";
import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";

type TimeRange = "week" | "month" | "year" | "all";
type RecordType = "weight" | "volume" | "both";

interface PRHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName?: string;
}

export function PRHistoryModal({ isOpen, onClose, exerciseName }: PRHistoryModalProps) {
  const { theme, resolvedTheme } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [recordType, setRecordType] = useState<RecordType>("both");
  const [filterExercise, setFilterExercise] = useState<string>(exerciseName || "");
  
  const isDark = theme !== "system" || (theme === "system" && resolvedTheme === "dark");

  const { data: personalRecords, isLoading } = api.progress.getPersonalRecords.useQuery(
    { 
      timeRange: timeRange === "all" ? "year" : timeRange, 
      recordType 
    },
    { enabled: isOpen }
  );

  // Get unique exercises for filter dropdown
  const uniqueExercises = personalRecords 
    ? Array.from(new Set(personalRecords.map(pr => pr.exerciseName))).sort()
    : [];

  // Filter records based on exercise filter and time range
  const filteredRecords = personalRecords?.filter(record => {
    const exerciseMatch = !filterExercise || record.exerciseName === filterExercise;
    
    if (timeRange === "all") return exerciseMatch;
    
    const recordDate = new Date(record.workoutDate);
    const now = new Date();
    
    let timeMatch = true;
    if (timeRange === "week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      timeMatch = recordDate >= oneWeekAgo;
    } else if (timeRange === "month") {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      timeMatch = recordDate >= oneMonthAgo;
    } else if (timeRange === "year") {
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      timeMatch = recordDate >= oneYearAgo;
    }
    
    return exerciseMatch && timeMatch;
  }) || [];

  if (!isOpen) return null;

  const cardClass = `transition-all duration-300 rounded-xl border shadow-sm ${
    isDark
      ? "bg-gray-900 border-gray-800 shadow-lg" 
      : "bg-background border-gray-200 dark:bg-gray-900 dark:border-gray-800"
  }`;

  const titleClass = `text-xl font-bold mb-4 ${
    isDark ? "text-background" : "text-gray-900 dark:text-background"
  }`;

  const subtitleClass = `text-sm font-medium mb-2 ${
    isDark ? "text-gray-300" : "text-gray-700 dark:text-gray-300"
  }`;

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  

  const getPRBadgeColor = (recordType: string) => {
    switch (recordType) {
      case "weight": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "volume": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    }
  };

  // Group records by exercise for analysis
  const recordsByExercise = filteredRecords.reduce((acc, record) => {
    const exercise = record.exerciseName;
    if (!acc[exercise]) {
      acc[exercise] = { weight: [], volume: [] };
    }
    acc[exercise][record.recordType].push(record);
    return acc;
  }, {} as Record<string, { weight: any[], volume: any[] }>);

  // Calculate PR statistics
  const calculateStats = () => {
    const weightPRs = filteredRecords.filter(pr => pr.recordType === "weight");
    const volumePRs = filteredRecords.filter(pr => pr.recordType === "volume");
    
    // Find biggest improvements
    const improvements = Object.entries(recordsByExercise).map(([exercise, records]) => {
      const weightRecords = records.weight.sort((a, b) => new Date(a.workoutDate).getTime() - new Date(b.workoutDate).getTime());
      const volumeRecords = records.volume.sort((a, b) => new Date(a.workoutDate).getTime() - new Date(b.workoutDate).getTime());
      
      let weightImprovement = 0;
      let volumeImprovement = 0;
      
      if (weightRecords.length >= 2) {
        const first = weightRecords[0];
        const last = weightRecords[weightRecords.length - 1];
        weightImprovement = last.weight - first.weight;
      }
      
      if (volumeRecords.length >= 2) {
        const first = volumeRecords[0];
        const last = volumeRecords[volumeRecords.length - 1];
        volumeImprovement = (last.weight * last.reps) - (first.weight * first.reps);
      }
      
      return {
        exercise,
        weightImprovement,
        volumeImprovement,
        totalPRs: records.weight.length + records.volume.length
      };
    }).sort((a, b) => b.totalPRs - a.totalPRs);

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPRs = filteredRecords.filter(pr => new Date(pr.workoutDate) >= thirtyDaysAgo);

    return {
      totalPRs: filteredRecords.length,
      weightPRs: weightPRs.length,
      volumePRs: volumePRs.length,
      exercisesWithPRs: Object.keys(recordsByExercise).length,
      improvements,
      recentPRs: recentPRs.length,
      avgPRsPerExercise: Object.keys(recordsByExercise).length > 0 
        ? (filteredRecords.length / Object.keys(recordsByExercise).length).toFixed(1)
        : 0
    };
  };

  const stats = calculateStats();

  return (
    <div className="fixed inset-0 bg-background bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`max-w-6xl w-full max-h-[90vh] overflow-y-auto rounded-xl ${cardClass} p-6`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={titleClass}>Complete PR History</h3>
            <p className={subtitleClass}>
              {filterExercise ? `${filterExercise} - ` : ""}Personal Records Timeline & Analysis
            </p>
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Exercise Filter */}
          <div>
            <label className={`text-xs font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Exercise:
            </label>
            <select
              value={filterExercise}
              onChange={(e) => setFilterExercise(e.target.value)}
              className={`ml-2 px-3 py-1 text-sm rounded-md border transition-all ${
                isDark
                  ? "bg-gray-800 border-gray-600 text-white"
                  : "bg-background border-gray-300 text-gray-900"
              }`}
            >
              <option value="">All Exercises</option>
              {uniqueExercises.map(exercise => (
                <option key={exercise} value={exercise}>{exercise}</option>
              ))}
            </select>
          </div>

          {/* Record Type Filter */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(["both", "weight", "volume"] as RecordType[]).map((type) => (
              <button
                key={type}
                onClick={() => setRecordType(type)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  recordType === type
                    ? "bg-background dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {type === "both" ? "All Types" : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Time Range Filter */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(["all", "year", "month", "week"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  timeRange === range
                    ? "bg-background dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {range === "all" ? "All Time" : range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
            ))}
          </div>
        ) : filteredRecords.length > 0 ? (
          <>
            {/* PR Statistics Overview */}
            <div className="mb-8">
              <h4 className={subtitleClass}>PR Statistics</h4>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">🏆</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Total PRs
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-purple-500">
                    {stats.totalPRs}
                  </p>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    records set
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">🏋️</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Weight PRs
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-blue-500">
                    {stats.weightPRs}
                  </p>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    max weight
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">📊</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Volume PRs
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-green-500">
                    {stats.volumePRs}
                  </p>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    total volume
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">🎯</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Exercises
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-orange-500">
                    {stats.exercisesWithPRs}
                  </p>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    with PRs
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">🔥</span>
                    <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Recent
                    </h5>
                  </div>
                  <p className="text-2xl font-bold text-red-500">
                    {stats.recentPRs}
                  </p>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                    last 30 days
                  </p>
                </div>
              </div>
            </div>

            {/* Top Performing Exercises */}
            <div className="mb-8">
              <h4 className={subtitleClass}>Top Performing Exercises</h4>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {stats.improvements.slice(0, 3).map((improvement, index) => (
                  <div key={improvement.exercise} className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className={`font-semibold ${isDark ? "text-background" : "text-foreground"}`}>
                        {improvement.exercise}
                      </h5>
                      <span className={`text-2xl ${
                        index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"
                      }`}>
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className={isDark ? "text-gray-400" : "text-gray-600"}>Total PRs:</span>
                        <span className={`font-semibold ${isDark ? "text-background" : "text-foreground"}`}>
                          {improvement.totalPRs}
                        </span>
                      </div>
                      {improvement.weightImprovement > 0 && (
                        <div className="flex justify-between">
                          <span className={isDark ? "text-gray-400" : "text-gray-600"}>Weight gain:</span>
                          <span className="font-semibold text-blue-500">
                            +{improvement.weightImprovement}kg
                          </span>
                        </div>
                      )}
                      {improvement.volumeImprovement > 0 && (
                        <div className="flex justify-between">
                          <span className={isDark ? "text-gray-400" : "text-gray-600"}>Volume gain:</span>
                          <span className="font-semibold text-green-500">
                            +{improvement.volumeImprovement}kg
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete PR Timeline */}
            <div>
              <h4 className={subtitleClass}>Complete PR Timeline</h4>
              <div className={`rounded-lg border ${
                isDark ? "border-gray-700" : "border-gray-200"
              } max-h-96 overflow-y-auto mobile-table-container`}>
                <div className="mobile-table">
                  <div className={`grid grid-cols-7 gap-2 sm:gap-4 px-2 sm:px-4 py-3 text-xs font-medium border-b sticky top-0 ${
                    isDark
                      ? "text-gray-400 border-gray-700 bg-gray-800"
                      : "text-gray-600 border-gray-200 bg-gray-50"
                  }`}>
                  <div>Date</div>
                  <div>Exercise</div>
                  <div>Type</div>
                  <div>Weight</div>
                  <div>Reps</div>
                  <div>Volume</div>
                  <div>1RM Est.</div>
                </div>
                
                {filteredRecords
                  .sort((a, b) => new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime())
                  .map((record, index) => (
                    <div 
                      key={index} 
                      className={`grid grid-cols-7 gap-2 sm:gap-4 px-2 sm:px-4 py-3 text-xs sm:text-sm ${
                        index !== filteredRecords.length - 1
                          ? `border-b ${isDark ? "border-gray-700" : "border-gray-200"}`
                          : ""
                      } ${
                        new Date(record.workoutDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                          ? (isDark ? "bg-green-900/20" : "bg-green-50")
                          : ""
                      }`}
                    >
                      <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                        {formatDate(record.workoutDate)}
                      </div>
                      <div className={`font-medium ${isDark ? "text-background" : "text-foreground"}`}>
                        {record.exerciseName}
                      </div>
                      <div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPRBadgeColor(record.recordType)}`}>
                          {record.recordType === "weight" ? "Weight" : "Volume"}
                        </span>
                      </div>
                      <div className={`font-medium ${isDark ? "text-background" : "text-foreground"}`}>
                        {record.weight}kg
                      </div>
                      <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                        {record.reps}
                      </div>
                      <div className={`font-medium ${isDark ? "text-background" : "text-foreground"}`}>
                        {(record.weight * record.reps).toLocaleString()}kg
                      </div>
                      <div className={`font-medium ${isDark ? "text-background" : "text-foreground"}`}>
                        {record.oneRMEstimate || '-'}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <p className={`text-lg font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              No personal records found
            </p>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {filterExercise 
                ? `No PRs found for ${filterExercise} in the selected time range.`
                : "Complete some workouts to start achieving personal records."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
