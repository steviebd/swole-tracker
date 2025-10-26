"use client";

import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { StrengthAnalysisModal } from "./StrengthAnalysisModal";

type TimeRange = "week" | "month" | "year";

export function StrengthProgressSection() {
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRange>("year");
  const [showModal, setShowModal] = useState(false);
  
  // Get list of exercises
  const { data: exerciseList, isLoading: exerciseListLoading } = api.progress.getExerciseList.useQuery();
  
  // Backfill the first exercise once list data arrives so charts populate automatically
  useEffect(() => {
    if (!selectedExercise && !exerciseListLoading && exerciseList?.length) {
      setSelectedExercise(exerciseList[0]!.exerciseName);
    }
  }, [selectedExercise, exerciseList, exerciseListLoading]);

  // Get strength progression data for selected exercise
  const { data: strengthData, isLoading: strengthLoading } = api.progress.getStrengthProgression.useQuery(
    {
      exerciseName: selectedExercise,
      timeRange,
    },
    { 
      enabled: !!selectedExercise 
    }
  );

  const cardClass = "transition-all duration-300 rounded-xl border shadow-sm glass-surface";
  const titleClass = "text-xl font-bold mb-4 text-content-primary";
  const subtitleClass = "text-sm font-medium mb-2 text-content-secondary";
  const buttonClass = "btn-secondary";
  const selectClass = "px-3 py-2 text-sm rounded-lg border transition-colors bg-surface-secondary border-default text-content-primary focus:border-interactive-primary";

  // Prepare numeric weights for chart scaling
  const weightValues =
    strengthData?.map((session) => Number(session.weight ?? 0)) ?? [];
  const hasWeightData = weightValues.length > 0;
  const maxWeight = hasWeightData ? Math.max(...weightValues) : 0;
  const minWeight = hasWeightData ? Math.min(...weightValues) : 0;
  const baseRange = maxWeight - minWeight;
  const isFlatProgress = hasWeightData && baseRange < 0.5;
  const padding = hasWeightData
    ? Math.max(
        isFlatProgress
          ? Math.max(5, maxWeight * 0.1 || 5)
          : Math.max(baseRange * 0.2, 2.5),
        2.5,
      )
    : 5;
  const chartMin = Math.max(0, (hasWeightData ? minWeight : 0) - padding);
  const chartMax = (hasWeightData ? maxWeight : padding) + padding;
  const chartRange = Math.max(chartMax - chartMin, 1);
  const chartWidth = 360;
  const chartOffset = 20;
  const chartData = strengthData ? [...strengthData].reverse() : [];
  const clampWeight = (value?: number | null) => {
    if (value == null || Number.isNaN(value)) {
      return null;
    }
    return Math.min(chartMax, Math.max(chartMin, value));
  };

  return (
    <div className={cardClass + " p-6"}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={titleClass}>Strength Progression</h2>
        
        {/* Time Range Selector */}
        <div className="flex space-x-1 bg-surface-secondary rounded-lg p-1 border border-default">
          {(["week", "month", "year"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                timeRange === range
                  ? "bg-[var(--color-primary)] text-background shadow-sm"
                  : "text-content-muted hover:text-content-primary"
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Selector */}
      <div className="mb-6">
        <label htmlFor="exercise-select" className={subtitleClass}>
          Select Exercise
        </label>
        {exerciseListLoading ? (
          <div className="animate-pulse bg-surface-secondary h-10 rounded-lg"></div>
        ) : (
          <select
            id="exercise-select"
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className={selectClass + " w-full"}
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

      {selectedExercise ? (
        <>
          {strengthLoading ? (
            <div className="space-y-4">
              <div className="animate-pulse bg-surface-secondary h-64 rounded-lg"></div>
              <div className="animate-pulse bg-surface-secondary h-32 rounded-lg"></div>
            </div>
          ) : strengthData && strengthData.length > 0 ? (
            <>
              {/* Simple Line Chart Visualization */}
              <div className="mb-6">
                <h3 className={subtitleClass}>Top Set Weight Progress</h3>
                <div className="relative h-64 p-4 rounded-lg bg-surface-secondary border border-default">
                  <svg className="w-full h-full" viewBox="0 0 400 200">
                    {/* Grid lines */}
                    <defs>
                      <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 20" fill="none" stroke="var(--color-border)" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    
                    {/* Data points and line */}
                    {chartData.map((point, index) => {
                      const denominator = Math.max(1, chartData.length - 1);
                      const numericWeight = Number(point.weight ?? 0);
                      const normalizedWeight =
                        clampWeight(numericWeight) ?? chartMin;
                      const progress =
                        (normalizedWeight - chartMin) / chartRange;
                      const x = (index / denominator) * chartWidth + chartOffset;
                      const y = 180 - progress * 160;
                      
                      const nextPoint = chartData[index + 1];
                      const nextNumericWeight =
                        nextPoint !== undefined
                          ? Number(nextPoint.weight ?? 0)
                          : null;
                      const nextNormalizedWeight =
                        nextNumericWeight === null
                          ? null
                          : clampWeight(nextNumericWeight);
                      const nextProgress =
                        nextNormalizedWeight === null
                          ? null
                          : (nextNormalizedWeight - chartMin) / chartRange;
                      const nextX =
                        ((index + 1) / denominator) * chartWidth + chartOffset;
                      const nextY =
                        nextProgress === null ? null : 180 - nextProgress * 160;

                      return (
                        <g key={index}>
                          {/* Line to next point */}
                          {nextY !== null && (
                            <line
                              x1={x}
                              y1={y}
                              x2={nextX}
                              y2={nextY}
                              stroke="var(--color-chart-1)"
                              strokeWidth="3"
                              opacity="0.8"
                            />
                          )}
                          
                          {/* Data point */}
                          <circle
                            cx={x}
                            cy={y}
                            r="4"
                            fill="var(--color-chart-1)"
                            stroke="white"
                            strokeWidth="2"
                            className="hover:r-6 cursor-pointer transition-all"
                            style={{
                              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                            }}
                          />
                          
                          {/* Weight label */}
                          <text
                            x={x}
                            y={y - 10}
                            textAnchor="middle"
                            className="text-xs font-medium"
                            fill="var(--color-text)"
                          >
                            {numericWeight}kg
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* Y-axis labels */}
                    <text x="10" y="20" className="text-xs font-medium" fill="var(--color-text-secondary)">
                      {maxWeight}kg
                    </text>
                    <text x="10" y="190" className="text-xs font-medium" fill="var(--color-text-secondary)">
                      {minWeight}kg
                    </text>
                  </svg>
                </div>
                {isFlatProgress && (
                  <p className="mt-2 text-xs text-muted-foreground text-right">
                    Scale padded to highlight consistent sessions.
                  </p>
                )}
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-surface-secondary border border-default">
                  <p className={subtitleClass}>Current Max</p>
                  <p className="text-xl font-bold text-[var(--color-primary)]">
                    {Math.max(...strengthData.map(d => d.weight))}kg
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-surface-secondary border border-default">
                  <p className={subtitleClass}>Best 1RM Est.</p>
                  <p className="text-xl font-bold text-[var(--color-success)]">
                    {Math.max(...strengthData.map(d => d.oneRMEstimate))}kg
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-surface-secondary border border-default">
                  <p className={subtitleClass}>Sessions</p>
                  <p className="text-xl font-bold text-[var(--color-info)]">
                    {strengthData.length}
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-surface-secondary border border-default">
                  <p className={subtitleClass}>Progress</p>
                  <p className={`text-xl font-bold ${
                    strengthData.length >= 2 && strengthData[0]!.weight > strengthData[strengthData.length - 1]!.weight
                      ? "text-[var(--color-success)]"
                      : strengthData.length >= 2 && strengthData[0]!.weight < strengthData[strengthData.length - 1]!.weight
                      ? "text-[var(--color-danger)]"
                      : "text-content-muted"
                  }`}>
                    {strengthData.length >= 2 
                      ? `${strengthData[0]!.weight > strengthData[strengthData.length - 1]!.weight ? '+' : ''}${(strengthData[0]!.weight - strengthData[strengthData.length - 1]!.weight).toFixed(1)}kg`
                      : "N/A"
                    }
                  </p>
                </div>
              </div>

              {/* Recent Sessions Table */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={subtitleClass}>Recent Sessions</h3>
                  <button
                    onClick={() => setShowModal(true)}
                    className={buttonClass}
                  >
                    View Details
                  </button>
                </div>
                
                <div className="rounded-lg border border-default overflow-hidden mobile-table-container">
                  <div className="mobile-table">
                    <div className="grid grid-cols-5 gap-2 sm:gap-4 px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b border-default bg-surface-secondary text-content-muted">
                    <div>Date</div>
                    <div>Weight</div>
                    <div>Reps</div>
                    <div>Sets</div>
                    <div>1RM Est.</div>
                  </div>
                  
                  {strengthData.slice(0, 5).map((session, index) => (
                    <div 
                      key={index} 
                      className={`grid grid-cols-5 gap-2 sm:gap-4 px-2 sm:px-4 py-3 text-xs sm:text-sm ${
                        index !== Math.min(4, strengthData.length - 1)
                          ? "border-b border-default"
                          : ""
                      }`}
                    >
                      <div className="text-content-secondary">
                        {new Date(session.workoutDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="font-medium text-content-primary">
                        {session.weight}kg
                      </div>
                      <div className="text-content-secondary">
                        {session.reps}
                      </div>
                      <div className="text-content-secondary">
                        {session.sets}
                      </div>
                      <div className="font-medium text-content-primary">
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
              <p className="text-lg font-medium mb-2 text-content-secondary">
                No data found
              </p>
              <p className="text-sm text-content-muted">
                Complete some workouts with this exercise to see your strength progression.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p className="text-lg font-medium mb-2 text-content-secondary">
            Select an Exercise
          </p>
          <p className="text-sm text-content-muted">
            Choose an exercise from the dropdown to view your strength progression.
          </p>
        </div>
      )}
      
      {/* Detailed Analysis Modal */}
      <StrengthAnalysisModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        exerciseName={selectedExercise}
        timeRange={timeRange}
      />
    </div>
  );
}
