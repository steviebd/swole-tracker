"use client";

import { useState } from "react";
import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";

type TimeRange = "week" | "month" | "year";
type VolumeMetric = "totalVolume" | "totalSets" | "totalReps" | "uniqueExercises";

export function VolumeTrackingSection() {
  const { theme, resolvedTheme } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [selectedMetric, setSelectedMetric] = useState<VolumeMetric>("totalVolume");
  const [showModal, setShowModal] = useState(false);
  
  const isDark = theme !== "system" || (theme === "system" && resolvedTheme === "dark");
  
  // Get volume progression data
  const { data: volumeData, isLoading: volumeLoading } = api.progress.getVolumeProgression.useQuery({
    timeRange,
  });

  // Get exercise-specific volume data
  const { data: exerciseList, isLoading: exerciseListLoading } = api.progress.getExerciseList.useQuery();
  
  // Get volume breakdown by exercise
  const { data: volumeByExercise, isLoading: volumeByExerciseLoading } = api.progress.getVolumeByExercise.useQuery({
    timeRange,
  });
  
  // Get set/rep distribution analytics
  const { data: setRepData, isLoading: setRepLoading } = api.progress.getSetRepDistribution.useQuery({
    timeRange,
  });

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

  const buttonClass = `px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
    isDark
      ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
  }`;

  const selectClass = `px-3 py-2 text-sm rounded-lg border transition-colors ${
    isDark
      ? "bg-gray-800 border-gray-700 text-white focus:border-blue-500"
      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
  }`;

  // Calculate chart data
  const chartData = volumeData ? [...volumeData].reverse() : [];
  
  // Get metric-specific data for visualization
  const getMetricValue = (data: typeof volumeData, metric: VolumeMetric): number[] => {
    if (!data || data.length === 0) return [];
    return data.map(d => d[metric]);
  };

  const metricValues = getMetricValue(volumeData, selectedMetric);
  const maxValue = metricValues.length > 0 ? Math.max(...metricValues, 1) : 1;
  const minValue = metricValues.length > 0 ? Math.min(...metricValues, 0) : 0;
  const range = maxValue - minValue || 1;

  // Calculate total and average for the period
  const totalValue = metricValues.reduce((sum, val) => sum + val, 0);
  const averageValue = metricValues.length > 0 ? totalValue / metricValues.length : 0;

  // Calculate progressive overload trend (last 30% vs first 30% of data)
  const calculateTrend = () => {
    if (metricValues.length < 3) return 0;
    const segmentSize = Math.max(1, Math.floor(metricValues.length * 0.3));
    const recentValues = metricValues.slice(-segmentSize);
    const earlierValues = metricValues.slice(0, segmentSize);
    
    const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const earlierAvg = earlierValues.reduce((sum, val) => sum + val, 0) / earlierValues.length;
    
    return earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
  };

  const trendPercentage = calculateTrend();

  const metricConfig = {
    totalVolume: { label: "Total Volume", unit: "kg", color: "#3B82F6" },
    totalSets: { label: "Total Sets", unit: "", color: "#10B981" },
    totalReps: { label: "Total Reps", unit: "", color: "#F59E0B" },
    uniqueExercises: { label: "Unique Exercises", unit: "", color: "#8B5CF6" },
  };

  return (
    <div className={cardClass + " p-6"}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={titleClass}>Volume Analysis</h2>
        
        {/* Time Range Selector */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(["week", "month", "year"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
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

      {/* Metric Selector */}
      <div className="mb-6">
        <label htmlFor="metric-select" className={subtitleClass}>
          Volume Metric
        </label>
        <select
          id="metric-select"
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value as VolumeMetric)}
          className={selectClass + " w-full"}
        >
          {Object.entries(metricConfig).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {volumeLoading ? (
        <div className="space-y-4">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-20 rounded-lg"></div>
            ))}
          </div>
        </div>
      ) : chartData.length > 0 ? (
        <>
          {/* Volume Progression Chart */}
          <div className="mb-6">
            <h3 className={subtitleClass}>
              {metricConfig[selectedMetric].label} Over Time
            </h3>
            <div className={`relative h-64 p-4 rounded-lg ${
              isDark ? "bg-gray-800" : "bg-gray-50"
            }`}>
              <svg className="w-full h-full" viewBox="0 0 400 200">
                {/* Grid lines */}
                <defs>
                  <pattern id="volume-grid" width="40" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 20" fill="none" stroke={isDark ? "#374151" : "#E5E7EB"} strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#volume-grid)" />
                
                {/* Volume area chart */}
                <defs>
                  <linearGradient id="volume-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={metricConfig[selectedMetric].color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={metricConfig[selectedMetric].color} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                
                {/* Area fill */}
                {chartData.length > 1 && (
                  <polygon
                    points={`20,180 ${chartData.map((point, index) => {
                      const x = (index / Math.max(1, chartData.length - 1)) * 360 + 20;
                      const y = 180 - ((point[selectedMetric] - minValue) / range) * 160;
                      return `${x},${y}`;
                    }).join(' ')} ${20 + (chartData.length - 1) / Math.max(1, chartData.length - 1) * 360},180`}
                    fill="url(#volume-gradient)"
                  />
                )}
                
                {/* Data line and points */}
                {chartData.map((point, index) => {
                  const x = (index / Math.max(1, chartData.length - 1)) * 360 + 20;
                  const y = 180 - ((point[selectedMetric] - minValue) / range) * 160;
                  
                  return (
                    <g key={index}>
                      {/* Line to next point */}
                      {index < chartData.length - 1 && (
                        <line
                          x1={x}
                          y1={y}
                          x2={(index + 1) / Math.max(1, chartData.length - 1) * 360 + 20}
                          y2={180 - ((chartData[index + 1]![selectedMetric] - minValue) / range) * 160}
                          stroke={metricConfig[selectedMetric].color}
                          strokeWidth="3"
                        />
                      )}
                      
                      {/* Data point */}
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill={metricConfig[selectedMetric].color}
                        className="hover:r-6 cursor-pointer transition-all"
                      />
                      
                      {/* Value label */}
                      <text
                        x={x}
                        y={y - 10}
                        textAnchor="middle"
                        className={`text-xs font-medium ${
                          isDark ? "fill-gray-300" : "fill-gray-700"
                        }`}
                      >
                        {point[selectedMetric]}{metricConfig[selectedMetric].unit}
                      </text>
                    </g>
                  );
                })}
                
                {/* Y-axis labels */}
                <text x="10" y="20" className={`text-xs ${isDark ? "fill-gray-400" : "fill-gray-600"}`}>
                  {maxValue}{metricConfig[selectedMetric].unit}
                </text>
                <text x="10" y="190" className={`text-xs ${isDark ? "fill-gray-400" : "fill-gray-600"}`}>
                  {minValue}{metricConfig[selectedMetric].unit}
                </text>
              </svg>
            </div>
          </div>

          {/* Volume Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${
              isDark ? "bg-gray-800" : "bg-gray-50"
            }`}>
              <p className={subtitleClass}>Total {metricConfig[selectedMetric].label}</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {totalValue.toLocaleString()}{metricConfig[selectedMetric].unit}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg ${
              isDark ? "bg-gray-800" : "bg-gray-50"
            }`}>
              <p className={subtitleClass}>Average per Workout</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {averageValue.toFixed(1)}{metricConfig[selectedMetric].unit}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg ${
              isDark ? "bg-gray-800" : "bg-gray-50"
            }`}>
              <p className={subtitleClass}>Workouts</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {chartData.length}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg ${
              isDark ? "bg-gray-800" : "bg-gray-50"
            }`}>
              <p className={subtitleClass}>Trend</p>
              <p className={`text-xl font-bold ${
                trendPercentage > 0
                  ? "text-green-600 dark:text-green-400"
                  : trendPercentage < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}>
                {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Volume by Exercise Breakdown */}
          <div className="mb-6">
            <h3 className={subtitleClass}>Volume by Exercise</h3>
            {volumeByExerciseLoading ? (
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>
            ) : volumeByExercise && volumeByExercise.length > 0 ? (
              <div className="space-y-4">
                {/* Donut Chart */}
                <div className={`relative h-80 p-4 rounded-lg ${
                  isDark ? "bg-gray-800" : "bg-gray-50"
                }`}>
                  <svg className="w-full h-full" viewBox="0 0 400 300">
                    <g transform="translate(200, 150)">
                      {/* Donut chart segments */}
                      {volumeByExercise.slice(0, 8).map((exercise, index) => {
                        const radius = 80;
                        const innerRadius = 40;
                        const total = volumeByExercise.reduce((sum, ex) => sum + ex.totalVolume, 0);
                        const percentage = exercise.totalVolume / total;
                        
                        // Calculate angles
                        const startAngle = volumeByExercise.slice(0, index).reduce((sum, ex) => 
                          sum + (ex.totalVolume / total) * 2 * Math.PI, 0);
                        const endAngle = startAngle + percentage * 2 * Math.PI;
                        
                        // Calculate arc path
                        const x1 = Math.cos(startAngle - Math.PI/2) * radius;
                        const y1 = Math.sin(startAngle - Math.PI/2) * radius;
                        const x2 = Math.cos(endAngle - Math.PI/2) * radius;
                        const y2 = Math.sin(endAngle - Math.PI/2) * radius;
                        
                        const x3 = Math.cos(endAngle - Math.PI/2) * innerRadius;
                        const y3 = Math.sin(endAngle - Math.PI/2) * innerRadius;
                        const x4 = Math.cos(startAngle - Math.PI/2) * innerRadius;
                        const y4 = Math.sin(startAngle - Math.PI/2) * innerRadius;
                        
                        const largeArc = percentage > 0.5 ? 1 : 0;
                        
                        const pathData = [
                          `M ${x1} ${y1}`,
                          `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                          `L ${x3} ${y3}`,
                          `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
                          'Z'
                        ].join(' ');
                        
                        const colors = [
                          "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", 
                          "#EF4444", "#14B8A6", "#F97316", "#84CC16"
                        ];
                        
                        return (
                          <g key={exercise.exerciseName}>
                            <path
                              d={pathData}
                              fill={colors[index % colors.length]}
                              className="hover:opacity-80 cursor-pointer transition-all"
                            />
                            {/* Label */}
                            {percentage > 0.05 && (
                              <text
                                x={Math.cos((startAngle + endAngle)/2 - Math.PI/2) * (radius + innerRadius)/2}
                                y={Math.sin((startAngle + endAngle)/2 - Math.PI/2) * (radius + innerRadius)/2}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className={`text-xs font-medium fill-white`}
                              >
                                {percentage > 0.1 ? exercise.exerciseName.split(' ')[0] : ''}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                    
                    {/* Legend */}
                    <g transform="translate(20, 20)">
                      {volumeByExercise.slice(0, 8).map((exercise, index) => {
                        const colors = [
                          "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", 
                          "#EF4444", "#14B8A6", "#F97316", "#84CC16"
                        ];
                        
                        return (
                          <g key={exercise.exerciseName} transform={`translate(0, ${index * 20})`}>
                            <rect
                              width="12"
                              height="12"
                              fill={colors[index % colors.length]}
                              rx="2"
                            />
                            <text
                              x="20"
                              y="9"
                              className={`text-xs font-medium ${
                                isDark ? "fill-gray-300" : "fill-gray-700"
                              }`}
                            >
                              {exercise.exerciseName} ({exercise.percentOfTotal.toFixed(1)}%)
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                </div>
                
                {/* Exercise Volume Table */}
                <div className={`rounded-lg border ${
                  isDark ? "border-gray-700" : "border-gray-200"
                } overflow-hidden`}>
                  <div className={`grid grid-cols-6 gap-4 px-4 py-3 text-sm font-medium border-b ${
                    isDark
                      ? "text-gray-400 border-gray-700 bg-gray-800"
                      : "text-gray-600 border-gray-200 bg-gray-50"
                  }`}>
                    <div>Exercise</div>
                    <div>Volume</div>
                    <div>Sets</div>
                    <div>Reps</div>
                    <div>Sessions</div>
                    <div>% of Total</div>
                  </div>
                  
                  {volumeByExercise.slice(0, 10).map((exercise, index) => (
                    <div 
                      key={exercise.exerciseName} 
                      className={`grid grid-cols-6 gap-4 px-4 py-3 text-sm ${
                        index !== Math.min(9, volumeByExercise.length - 1)
                          ? `border-b ${isDark ? "border-gray-700" : "border-gray-200"}`
                          : ""
                      }`}
                    >
                      <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        {exercise.exerciseName}
                      </div>
                      <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                        {exercise.totalVolume.toLocaleString()}kg
                      </div>
                      <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                        {exercise.totalSets}
                      </div>
                      <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                        {exercise.totalReps}
                      </div>
                      <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                        {exercise.sessions}
                      </div>
                      <div className={`font-medium ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                        {exercise.percentOfTotal.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  No exercise volume data available for the selected time range.
                </p>
              </div>
            )}
          </div>

          {/* Set/Rep Distribution Analytics */}
          <div className="mb-6">
            <h3 className={subtitleClass}>Set/Rep Distribution Analysis</h3>
            {setRepLoading ? (
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>
            ) : setRepData ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Rep Range Distribution */}
                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <h4 className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    Training Style Distribution
                  </h4>
                  <div className="space-y-2">
                    {setRepData.repRangeDistribution.map((range, index) => (
                      <div key={range.range} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ 
                              backgroundColor: [
                                "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"
                              ][index % 5] 
                            }}
                          />
                          <span className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {range.range}
                          </span>
                        </div>
                        <span className={`text-xs font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          {range.percentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Most Common Set/Rep Combinations */}
                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <h4 className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    Most Common Set × Rep Combinations
                  </h4>
                  <div className="space-y-2">
                    {setRepData.mostCommonSetRep.slice(0, 6).map((combo, index) => (
                      <div key={`${combo.sets}x${combo.reps}`} className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          {combo.sets} × {combo.reps}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className={`h-2 rounded-full bg-blue-500`} 
                               style={{ width: `${Math.max(combo.percentage * 2, 8)}px` }} />
                          <span className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {combo.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sets Distribution Chart */}
                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <h4 className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    Sets per Exercise Distribution
                  </h4>
                  <div className="relative h-32">
                    <svg className="w-full h-full" viewBox="0 0 300 100">
                      {setRepData.setDistribution.map((item, index) => {
                        const barWidth = 25;
                        const maxHeight = 70;
                        const maxPercentage = Math.max(...setRepData.setDistribution.map(d => d.percentage));
                        const barHeight = (item.percentage / maxPercentage) * maxHeight;
                        const x = index * 35 + 20;
                        const y = 80 - barHeight;
                        
                        return (
                          <g key={item.sets}>
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              fill="#10B981"
                              rx="2"
                            />
                            <text
                              x={x + barWidth/2}
                              y={95}
                              textAnchor="middle"
                              className={`text-xs ${isDark ? "fill-gray-400" : "fill-gray-600"}`}
                            >
                              {item.sets}
                            </text>
                            <text
                              x={x + barWidth/2}
                              y={y - 5}
                              textAnchor="middle"
                              className={`text-xs ${isDark ? "fill-gray-300" : "fill-gray-700"}`}
                            >
                              {item.percentage.toFixed(0)}%
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Top Rep Counts */}
                <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <h4 className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    Most Common Rep Counts
                  </h4>
                  <div className="space-y-2">
                    {setRepData.repDistribution.slice(0, 6).map((item, index) => (
                      <div key={item.reps} className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          {item.reps} reps
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className={`h-2 rounded-full bg-yellow-500`} 
                               style={{ width: `${Math.max(item.percentage * 2, 8)}px` }} />
                          <span className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  No set/rep distribution data available for the selected time range.
                </p>
              </div>
            )}
          </div>

          {/* Recent Workouts Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={subtitleClass}>Recent Volume Performance</h3>
              <button
                onClick={() => setShowModal(true)}
                className={buttonClass}
              >
                View Details
              </button>
            </div>
            
            <div className={`rounded-lg border ${
              isDark ? "border-gray-700" : "border-gray-200"
            } overflow-hidden`}>
              <div className={`grid grid-cols-5 gap-4 px-4 py-3 text-sm font-medium border-b ${
                isDark
                  ? "text-gray-400 border-gray-700 bg-gray-800"
                  : "text-gray-600 border-gray-200 bg-gray-50"
              }`}>
                <div>Date</div>
                <div>Volume</div>
                <div>Sets</div>
                <div>Reps</div>
                <div>Exercises</div>
              </div>
              
              {chartData.slice(0, 5).map((workout, index) => (
                <div 
                  key={index} 
                  className={`grid grid-cols-5 gap-4 px-4 py-3 text-sm ${
                    index !== Math.min(4, chartData.length - 1)
                      ? `border-b ${isDark ? "border-gray-700" : "border-gray-200"}`
                      : ""
                  }`}
                >
                  <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                    {new Date(workout.workoutDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {workout.totalVolume.toLocaleString()}kg
                  </div>
                  <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                    {workout.totalSets}
                  </div>
                  <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                    {workout.totalReps}
                  </div>
                  <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                    {workout.uniqueExercises}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className={`text-lg font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            No volume data found
          </p>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Complete some workouts to see your volume progression and analysis.
          </p>
        </div>
      )}
      
      {/* Modal for detailed volume analysis */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`max-w-6xl w-full rounded-xl ${cardClass} p-6 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={titleClass}>Detailed Volume Analysis - {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} View</h3>
              <button
                onClick={() => setShowModal(false)}
                className={buttonClass}
              >
                Close
              </button>
            </div>
            
            {volumeLoading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
                ))}
              </div>
            ) : chartData.length > 0 && volumeByExercise && setRepData ? (
              <div className="space-y-8">
                {/* Volume Progression Over Time - Detailed */}
                <div>
                  <h4 className={subtitleClass}>Volume Progression Timeline</h4>
                  <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${isDark ? "text-green-400" : "text-green-600"}`}>
                          {totalValue.toLocaleString()}kg
                        </p>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Total Volume</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                          {averageValue.toFixed(0)}kg
                        </p>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Avg per Workout</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                          {chartData.length}
                        </p>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Total Workouts</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${
                          trendPercentage > 0 ? "text-green-400" : trendPercentage < 0 ? "text-red-400" : "text-gray-400"
                        }`}>
                          {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
                        </p>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Progress Trend</p>
                      </div>
                    </div>
                    
                    {/* Detailed workout timeline */}
                    <div className="overflow-x-auto">
                      <table className={`w-full text-sm border-collapse ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                        <thead>
                          <tr className={`border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                            <th className={`text-left p-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Date</th>
                            <th className={`text-right p-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Volume</th>
                            <th className={`text-right p-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Sets</th>
                            <th className={`text-right p-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Reps</th>
                            <th className={`text-right p-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Exercises</th>
                            <th className={`text-right p-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Avg Volume/Set</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.map((workout, index) => (
                            <tr key={index} className={`border-b ${isDark ? "border-gray-700" : "border-gray-200"} last:border-0`}>
                              <td className={`p-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                {new Date(workout.workoutDate).toLocaleDateString('en-US', { 
                                  weekday: 'short',
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </td>
                              <td className={`p-2 text-right font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                {workout.totalVolume.toLocaleString()}kg
                              </td>
                              <td className={`p-2 text-right ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                {workout.totalSets}
                              </td>
                              <td className={`p-2 text-right ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                {workout.totalReps}
                              </td>
                              <td className={`p-2 text-right ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                {workout.uniqueExercises}
                              </td>
                              <td className={`p-2 text-right ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                {(workout.totalVolume / workout.totalSets).toFixed(1)}kg
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Exercise Performance Breakdown */}
                <div>
                  <h4 className={subtitleClass}>Exercise Performance Analysis</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                      <h5 className={`font-semibold mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                        Top Exercises by Volume
                      </h5>
                      <div className="space-y-3">
                        {volumeByExercise.slice(0, 10).map((exercise, index) => (
                          <div key={exercise.exerciseName} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                                index < 3 
                                  ? "bg-yellow-500 text-white" 
                                  : isDark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                  {exercise.exerciseName}
                                </p>
                                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                  {exercise.sessions} sessions • {exercise.totalSets} sets
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                                {exercise.totalVolume.toLocaleString()}kg
                              </p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {exercise.percentOfTotal.toFixed(1)}% of total
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                      <h5 className={`font-semibold mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                        Training Style Breakdown
                      </h5>
                      <div className="space-y-3">
                        {setRepData.repRangeDistribution.map((range, index) => (
                          <div key={range.range} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ 
                                  backgroundColor: [
                                    "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"
                                  ][index % 5] 
                                }}
                              />
                              <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                {range.range}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                {range.percentage.toFixed(1)}%
                              </span>
                              <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {range.count} sets
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Volume Insights & Recommendations */}
                <div>
                  <h4 className={subtitleClass}>Training Insights & Recommendations</h4>
                  <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className={`font-semibold mb-2 ${isDark ? "text-green-400" : "text-green-600"}`}>
                          💪 Strengths
                        </h5>
                        <ul className={`text-sm space-y-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          <li>• Most volume from {volumeByExercise[0]?.exerciseName || "compound movements"}</li>
                          <li>• Consistent {setRepData.mostCommonSetRep[0] ? `${setRepData.mostCommonSetRep[0].sets}×${setRepData.mostCommonSetRep[0].reps}` : "3×8"} approach</li>
                          <li>• {trendPercentage > 0 ? `${trendPercentage.toFixed(1)}% progress trend` : "Maintaining volume consistency"}</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className={`font-semibold mb-2 ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>
                          🎯 Opportunities
                        </h5>
                        <ul className={`text-sm space-y-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          <li>• Consider progressive overload in lower volume exercises</li>
                          <li>• {setRepData.repRangeDistribution[0]?.range.includes("1-5") ? "Add more hypertrophy work" : "Add strength work (1-5 reps)"}</li>
                          <li>• Track volume progression for specific muscle groups</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className={`text-lg font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  No detailed data available
                </p>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Complete more workouts to see detailed volume analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}