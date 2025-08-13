"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { VolumeAnalysisModal } from "./VolumeAnalysisModal";

type TimeRange = "week" | "month" | "year";
type VolumeMetric = "totalVolume" | "totalSets" | "totalReps" | "uniqueExercises";

export function VolumeTrackingSection() {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [selectedMetric, setSelectedMetric] = useState<VolumeMetric>("totalVolume");
  const [showModal, setShowModal] = useState(false);
  
  // Get volume progression data
  const { data: volumeData, isLoading: volumeLoading } = api.progress.getVolumeProgression.useQuery({
    timeRange,
  });

  // Get exercise-specific volume data
  const { } = api.progress.getExerciseList.useQuery();
  
  // Get volume breakdown by exercise
  const { data: volumeByExercise, isLoading: volumeByExerciseLoading } = api.progress.getVolumeByExercise.useQuery({
    timeRange,
  });
  
  // Get set/rep distribution analytics
  const { data: setRepData, isLoading: setRepLoading } = api.progress.getSetRepDistribution.useQuery({
    timeRange,
  });

  // Use theme-aware CSS custom properties instead of conditional classes
  const cardClass = "transition-all duration-300 rounded-xl border shadow-sm glass-surface";
  const titleClass = "text-xl font-bold mb-4" + " " + "text-[var(--color-text)]";
  const subtitleClass = "text-sm font-medium mb-2" + " " + "text-[var(--color-text-secondary)]";
  const buttonClass = "btn-secondary";
  const selectClass = "px-3 py-2 text-sm rounded-lg border transition-colors bg-[var(--color-bg-surface)] border-[var(--color-border)] text-[var(--color-text)] focus:border-[var(--color-primary)]";

  // Calculate chart data (reverse to earliest to latest for graph display)
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
    totalVolume: { label: "Total Volume", unit: "kg", color: "var(--color-primary)" },
    totalSets: { label: "Total Sets", unit: "", color: "var(--color-success)" },
    totalReps: { label: "Total Reps", unit: "", color: "var(--color-warning)" },
    uniqueExercises: { label: "Unique Exercises", unit: "", color: "var(--color-info)" },
  };

  return (
    <div className={cardClass + " p-6"}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={titleClass}>Volume Analysis</h2>
        
        {/* Time Range Selector */}
        <div className="flex space-x-1 bg-[var(--color-bg-surface)] rounded-lg p-1 border border-[var(--color-border)]">
          {(["week", "month", "year"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                timeRange === range
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
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
          <div className="animate-pulse bg-[var(--color-bg-surface)] h-64 rounded-lg"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-[var(--color-bg-surface)] h-20 rounded-lg"></div>
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
            <div className="relative h-64 p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <svg className="w-full h-full" viewBox="0 0 400 200">
                {/* Grid lines */}
                <defs>
                  <pattern id="volume-grid" width="40" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 20" fill="none" stroke="var(--color-border)" strokeWidth="0.5"/>
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
                {chartData.map((point, _index) => {
                  const x = (_index / Math.max(1, chartData.length - 1)) * 360 + 20;
                  const y = 180 - ((point[selectedMetric] - minValue) / range) * 160;
                  
                  return (
                    <g key={_index}>
                      {/* Line to next point */}
                      {_index < chartData.length - 1 && (
                        <line
                          x1={x}
                          y1={y}
                          x2={(_index + 1) / Math.max(1, chartData.length - 1) * 360 + 20}
                          y2={180 - ((chartData[_index + 1]![selectedMetric] - minValue) / range) * 160}
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
                        className="text-xs font-medium"
                        fill="var(--color-text-secondary)"
                      >
                        {point[selectedMetric]}{metricConfig[selectedMetric].unit}
                      </text>
                    </g>
                  );
                })}
                
                {/* Y-axis labels */}
                <text x="10" y="20" className="text-xs" fill="var(--color-text-muted)">
                  {maxValue}{metricConfig[selectedMetric].unit}
                </text>
                <text x="10" y="190" className="text-xs" fill="var(--color-text-muted)">
                  {minValue}{metricConfig[selectedMetric].unit}
                </text>
              </svg>
            </div>
          </div>

          {/* Volume Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <p className={subtitleClass}>Total {metricConfig[selectedMetric].label}</p>
              <p className="text-xl font-bold text-[var(--color-primary)]">
                {totalValue.toLocaleString()}{metricConfig[selectedMetric].unit}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <p className={subtitleClass}>Average per Workout</p>
              <p className="text-xl font-bold text-[var(--color-success)]">
                {averageValue.toFixed(1)}{metricConfig[selectedMetric].unit}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <p className={subtitleClass}>Workouts</p>
              <p className="text-xl font-bold text-[var(--color-info)]">
                {chartData.length}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <p className={subtitleClass}>Trend</p>
              <p className={`text-xl font-bold ${
                trendPercentage > 0
                  ? "text-[var(--color-success)]"
                  : trendPercentage < 0
                  ? "text-[var(--color-danger)]"
                  : "text-[var(--color-text-muted)]"
              }`}>
                {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Volume by Exercise Breakdown */}
          <div className="mb-6">
            <h3 className={subtitleClass}>Volume by Exercise</h3>
            {volumeByExerciseLoading ? (
              <div className="animate-pulse h-64 rounded-lg" style={{ backgroundColor: 'var(--color-bg-surface)' }}></div>
            ) : volumeByExercise && volumeByExercise.length > 0 ? (
              <div className="space-y-4">
                {/* Donut Chart */}
                <div className="relative h-80 p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
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
                          "var(--color-primary)", "var(--color-success)", "var(--color-warning)", "var(--color-info)", 
                          "var(--color-danger)", "color-mix(in srgb, var(--color-success) 80%, var(--color-info) 20%)", 
                          "color-mix(in srgb, var(--color-warning) 70%, var(--color-danger) 30%)", 
                          "color-mix(in srgb, var(--color-success) 60%, var(--color-warning) 40%)"
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
                          "var(--color-primary)", "var(--color-success)", "var(--color-warning)", "var(--color-info)", 
                          "var(--color-danger)", "color-mix(in srgb, var(--color-success) 80%, var(--color-info) 20%)", 
                          "color-mix(in srgb, var(--color-warning) 70%, var(--color-danger) 30%)", 
                          "color-mix(in srgb, var(--color-success) 60%, var(--color-warning) 40%)"
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
                              className="text-xs font-medium"
                              fill="var(--color-text-secondary)"
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
                <div className="rounded-lg border border-[var(--color-border)] overflow-hidden mobile-table-container">
                  <div className="mobile-table">
                    <div className="grid grid-cols-6 gap-2 sm:gap-4 px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-muted)]">
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
                      className={`grid grid-cols-6 gap-2 sm:gap-4 px-2 sm:px-4 py-3 text-xs sm:text-sm ${
                        index !== Math.min(9, volumeByExercise.length - 1)
                          ? "border-b border-[var(--color-border)]"
                          : ""
                      }`}
                    >
                      <div className="font-medium text-[var(--color-text)]">
                        {exercise.exerciseName}
                      </div>
                      <div className="text-[var(--color-text-secondary)]">
                        {exercise.totalVolume.toLocaleString()}kg
                      </div>
                      <div className="text-[var(--color-text-secondary)]">
                        {exercise.totalSets}
                      </div>
                      <div className="text-[var(--color-text-secondary)]">
                        {exercise.totalReps}
                      </div>
                      <div className="text-[var(--color-text-secondary)]">
                        {exercise.sessions}
                      </div>
                      <div className="font-medium text-[var(--color-primary)]">
                        {exercise.percentOfTotal.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No exercise volume data available for the selected time range.
                </p>
              </div>
            )}
          </div>

          {/* Set/Rep Distribution Analytics */}
          <div className="mb-6">
            <h3 className={subtitleClass}>Set/Rep Distribution Analysis</h3>
            {setRepLoading ? (
              <div className="animate-pulse bg-[var(--color-bg-surface)] h-64 rounded-lg"></div>
            ) : setRepData ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Rep Range Distribution */}
                <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
                  <h4 className="text-sm font-semibold mb-3 text-[var(--color-text)]">
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
                                "var(--color-danger)", "var(--color-warning)", "var(--color-success)", "var(--color-primary)", "var(--color-info)"
                              ][index % 5] 
                            }}
                          />
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {range.range}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-[var(--color-text)]">
                          {range.percentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Most Common Set/Rep Combinations */}
                <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
                  <h4 className="text-sm font-semibold mb-3 text-[var(--color-text)]">
                    Most Common Set × Rep Combinations
                  </h4>
                  <div className="space-y-2">
                    {setRepData.mostCommonSetRep.slice(0, 6).map((combo, index) => (
                      <div key={`${combo.sets}x${combo.reps}`} className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--color-text)]">
                          {combo.sets} × {combo.reps}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="h-2 rounded-full bg-[var(--color-primary)]" 
                               style={{ width: `${Math.max(combo.percentage * 2, 8)}px` }} />
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {combo.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sets Distribution Chart */}
                <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
                  <h4 className="text-sm font-semibold mb-3 text-[var(--color-text)]">
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
                              fill="var(--color-success)"
                              rx="2"
                            />
                            <text
                              x={x + barWidth/2}
                              y={95}
                              textAnchor="middle"
                              className="text-xs"
                              fill="var(--color-text-muted)"
                            >
                              {item.sets}
                            </text>
                            <text
                              x={x + barWidth/2}
                              y={y - 5}
                              textAnchor="middle"
                              className="text-xs"
                              fill="var(--color-text-secondary)"
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
                <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
                  <h4 className="text-sm font-semibold mb-3 text-[var(--color-text)]">
                    Most Common Rep Counts
                  </h4>
                  <div className="space-y-2">
                    {setRepData.repDistribution.slice(0, 6).map((item, index) => (
                      <div key={item.reps} className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--color-text)]">
                          {item.reps} reps
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="h-2 rounded-full bg-[var(--color-warning)]" 
                               style={{ width: `${Math.max(item.percentage * 2, 8)}px` }} />
                          <span className="text-xs text-[var(--color-text-secondary)]">
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
                <p className="text-sm text-[var(--color-text-muted)]">
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
            
            <div className="rounded-lg border border-[var(--color-border)] overflow-hidden mobile-table-container">
              <div className="mobile-table">
                <div className="grid grid-cols-5 gap-2 sm:gap-4 px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-muted)]">
                <div>Date</div>
                <div>Volume</div>
                <div>Sets</div>
                <div>Reps</div>
                <div>Exercises</div>
              </div>
              
              {volumeData?.slice(0, 5).map((workout, index) => (
                <div 
                  key={index} 
                  className={`grid grid-cols-5 gap-2 sm:gap-4 px-2 sm:px-4 py-3 text-xs sm:text-sm ${
                    index !== Math.min(4, chartData.length - 1)
                      ? "border-b border-[var(--color-border)]"
                      : ""
                  }`}
                >
                  <div className="text-[var(--color-text-secondary)]">
                    {new Date(workout.workoutDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="font-medium text-[var(--color-text)]">
                    {workout.totalVolume.toLocaleString()}kg
                  </div>
                  <div className="text-[var(--color-text-secondary)]">
                    {workout.totalSets}
                  </div>
                  <div className="text-[var(--color-text-secondary)]">
                    {workout.totalReps}
                  </div>
                  <div className="text-[var(--color-text-secondary)]">
                    {workout.uniqueExercises}
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="var(--color-text-muted)">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-lg font-medium mb-2 text-[var(--color-text-secondary)]">
            No volume data found
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Complete some workouts to see your volume progression and analysis.
          </p>
        </div>
      )}
      
      {/* Volume Analysis Modal */}
      <VolumeAnalysisModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        timeRange={timeRange}
      />
    </div>
  );
}
