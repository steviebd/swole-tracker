"use client";

import { analytics } from "~/lib/analytics";
import type { Id } from "~/convex/_generated/dataModel";

export interface SetData {
  id: string;
  weight?: number;
  reps?: number;
  sets: number;
  unit: "kg" | "lbs";
  rpe?: number; // 6–10
  rest?: number; // seconds
}

interface SetInputProps {
  set: SetData;
  setIndex: number;
  exerciseIndex: number;
  exerciseName: string;
  templateExerciseId?: Id<"templateExercises">;
  onUpdate: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetData,
    value: string | number | undefined,
  ) => void;
  onToggleUnit: (exerciseIndex: number, setIndex: number) => void;
  onDelete: (exerciseIndex: number, setIndex: number) => void;
  readOnly?: boolean;
  showDelete?: boolean;
  // Arrow button handlers for reordering sets
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  // User's preferred weight unit
  preferredUnit?: "kg" | "lbs";
  // All current sets for pattern analysis
  allSets?: SetData[];
}

import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import { usePredictiveDefaults } from "~/hooks/use-predictive-defaults";

export function SetInput({
  set,
  setIndex,
  exerciseIndex,
  exerciseName,
  templateExerciseId,
  onUpdate,
  onToggleUnit: _onToggleUnit,
  onDelete,
  readOnly = false,
  showDelete = true,
  onMoveUp,
  onMoveDown,
  preferredUnit = "kg",
  allSets = [],
}: SetInputProps) {
  const weightInputRef = useRef<HTMLInputElement>(null);
  const repsInputRef = useRef<HTMLInputElement>(null);
  const restInputRef = useRef<HTMLInputElement>(null);
  const lastUsedWeight = useRef<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get predictive defaults for this set
  const { bestPrediction, isLoading: predictionsLoading } = usePredictiveDefaults({
    exerciseName,
    templateExerciseId,
    setIndex,
    currentSets: allSets,
    unit: preferredUnit,
  });

  // Check if current set is empty and we should show predictions
  const isEmpty = !set.weight && !set.reps;
  const shouldShowPredictions = isEmpty && bestPrediction && bestPrediction.confidence > 0.6;

  useEffect(() => {
    // remember last used weight for shortcuts
    if (typeof set.weight === "number" && !Number.isNaN(set.weight)) {
      lastUsedWeight.current = set.weight;
    }
  }, [set.weight]);

  const handleWeightChange = (value: number | undefined) => {
    onUpdate(exerciseIndex, setIndex, "weight", value);
    if (value && set.sets) {
      analytics.exerciseLogged(
        templateExerciseId?.toString() ?? "custom",
        exerciseName,
        set.sets,
        value,
      );
    }
  };

  const handleRepsChange = (value: number | undefined) => {
    onUpdate(exerciseIndex, setIndex, "reps", value);
  };

  const handleSetsChange = (value: number | undefined) => {
    onUpdate(exerciseIndex, setIndex, "sets", value ?? 1);
  };

  const handleRpeChange = (value: number) => {
    onUpdate(exerciseIndex, setIndex, "rpe", value);
  };

  const handleRestChange = (value: number | undefined) => {
    onUpdate(exerciseIndex, setIndex, "rest", value);
  };

  // Apply AI prediction
  const applyPrediction = () => {
    if (bestPrediction && !readOnly) {
      if (bestPrediction.weight) {
        handleWeightChange(bestPrediction.weight);
      }
      if (bestPrediction.reps) {
        handleRepsChange(bestPrediction.reps);
      }
      if (bestPrediction.sets) {
        handleSetsChange(bestPrediction.sets);
      }
      setShowSuggestions(false);
    }
  };

  const isCompleted = !!(set.weight && set.reps);
  const hasPartialData = !!(set.weight || set.reps || (set.sets && set.sets > 1));

  return (
    <div className="relative">
      {/* AI Suggestion Overlay */}
      {shouldShowPredictions && !readOnly && (
        <div className="absolute inset-0 z-10 flex items-center justify-between rounded-lg bg-purple-50/95 dark:bg-purple-950/95 border border-purple-200 dark:border-purple-800 backdrop-blur-sm">
          <div className="flex items-center gap-3 p-3 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white text-xs font-semibold">
              AI
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Suggested: {bestPrediction.weight && `${bestPrediction.weight}${preferredUnit}`}
                {bestPrediction.reps && ` × ${bestPrediction.reps}`}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-300">
                {bestPrediction.rationale} ({Math.round(bestPrediction.confidence * 100)}% confidence)
              </div>
            </div>
          </div>
          <div className="flex gap-2 p-3">
            <button
              onClick={() => setShowSuggestions(false)}
              className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Skip
            </button>
            <button
              onClick={applyPrediction}
              className="px-3 py-1 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      <div className={cn(
        "glass-card glass-hairline flex items-center gap-3 rounded-lg p-3 text-foreground select-none card-interactive transition-all duration-200",
        isCompleted && "ring-2 ring-green-200 dark:ring-green-800 bg-green-50/50 dark:bg-green-950/30",
        hasPartialData && !isCompleted && "ring-1 ring-blue-200 dark:ring-blue-800 bg-blue-50/30 dark:bg-blue-950/20",
        shouldShowPredictions && "opacity-60"
      )}>
        {/* Set Number with Status */}
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200",
          isCompleted 
            ? "bg-green-500 text-white shadow-sm" 
            : hasPartialData 
            ? "bg-blue-500 text-white shadow-sm"
            : "bg-muted text-muted-foreground"
        )}>
          {setIndex + 1}
        </div>

      {/* Input Grid */}
      <div className="flex flex-1 flex-wrap gap-3">
        {/* Weight */}
        <div className="min-w-[130px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Weight</label>
          <div className="relative flex items-center">
            <input
              ref={weightInputRef}
              type="number"
              step="0.5"
              inputMode="decimal"
              pattern="[0-9]*"
              value={set.weight ?? ""}
              onChange={(e) => {
                const value = e.target.value
                  ? parseFloat(e.target.value)
                  : undefined;
                handleWeightChange(value);
              }}
              onFocus={(e) => {
                e.target.select();
                try {
                  e.currentTarget.scrollIntoView({
                    block: "center",
                    behavior: "smooth",
                  });
                } catch {}
              }}
              placeholder="0"
              disabled={readOnly}
              className={cn(
                "input-primary w-full pr-12 text-center text-base font-medium transition-all duration-200",
                "focus:ring-2 focus:ring-primary focus:ring-offset-1",
                set.weight && "text-foreground font-semibold",
                readOnly && "cursor-not-allowed opacity-60"
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none select-none">
              {preferredUnit}
            </span>
          </div>
        </div>

        {/* Reps */}
        <div className="min-w-[110px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Reps</label>
          <input
            ref={repsInputRef}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={set.reps ?? ""}
            onChange={(e) => {
              const value = e.target.value
                ? parseInt(e.target.value)
                : undefined;
              handleRepsChange(value);
            }}
            onFocus={(e) => {
              e.target.select();
              try {
                e.currentTarget.scrollIntoView({
                  block: "center",
                  behavior: "smooth",
                });
              } catch {}
            }}
            placeholder="0"
            disabled={readOnly}
            className={cn(
              "input-primary w-full text-center text-base font-medium transition-all duration-200",
              "focus:ring-2 focus:ring-primary focus:ring-offset-1",
              set.reps && "text-foreground font-semibold",
              readOnly && "cursor-not-allowed opacity-60"
            )}
          />
        </div>

        {/* Sets */}
        <div className="min-w-[90px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Sets</label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={set.sets}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : 1;
              handleSetsChange(value);
            }}
            onFocus={(e) => {
              e.target.select();
              try {
                e.currentTarget.scrollIntoView({
                  block: "center",
                  behavior: "smooth",
                });
              } catch {}
            }}
            placeholder="1"
            min="1"
            disabled={readOnly}
            className={cn(
              "input-primary w-full text-center text-base font-medium transition-all duration-200",
              "focus:ring-2 focus:ring-primary focus:ring-offset-1",
              set.sets > 1 && "text-foreground font-semibold",
              readOnly && "cursor-not-allowed opacity-60"
            )}
          />
        </div>
        {/* RPE segmented [6-10] - More compact for mobile */}
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">RPE</label>
          <div className="flex items-center gap-1">
            {[6, 7, 8, 9, 10].map((r) => {
              const active = set.rpe === r;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={readOnly}
                  onClick={() => !readOnly && handleRpeChange(r)}
                  className={cn(
                    "w-7 h-7 rounded-md text-xs font-medium transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                    active 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                    readOnly && "cursor-not-allowed opacity-60"
                  )}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rest with quick chips - Mobile optimized */}
        <div className="min-w-[140px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Rest (s)</label>
          <div className="flex items-center gap-1">
            <input
              ref={restInputRef}
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={set.rest ?? ""}
              onChange={(e) => {
                const value = e.target.value
                  ? parseInt(e.target.value)
                  : undefined;
                handleRestChange(value);
              }}
              onFocus={(e) => {
                e.target.select();
                try {
                  e.currentTarget.scrollIntoView({
                    block: "center",
                    behavior: "smooth",
                  });
                } catch {}
              }}
              placeholder="60"
              disabled={readOnly}
              className={cn(
                "input-primary flex-1 text-center text-sm transition-all duration-200",
                "focus:ring-2 focus:ring-primary focus:ring-offset-1",
                set.rest && "font-semibold",
                readOnly && "cursor-not-allowed opacity-60"
              )}
            />
            {[30, 60, 90].map((sec) => (
              <button
                key={sec}
                type="button"
                disabled={readOnly}
                onClick={() => !readOnly && handleRestChange(sec)}
                className={cn(
                  "w-8 h-8 rounded-md text-xs font-medium transition-all duration-200",
                  "bg-muted text-muted-foreground hover:bg-muted/80",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                  set.rest === sec && "bg-primary text-primary-foreground",
                  readOnly && "cursor-not-allowed opacity-60"
                )}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Up/Down arrow buttons for reordering sets - Enhanced for mobile */}
      {!readOnly && (onMoveUp || onMoveDown) && (
        <div className="flex flex-col gap-1 ml-2">
          {/* Move Up Button */}
          <button
            type="button"
            onClick={() => {
              console.log("[SetInput] Move Up button clicked", {
                exerciseIndex,
                setIndex,
              });
              onMoveUp?.();
            }}
            disabled={!onMoveUp}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-md transition-all duration-200",
              "hover:bg-muted active:bg-muted/80",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
              "disabled:cursor-not-allowed disabled:opacity-30",
              onMoveUp ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50"
            )}
            title="Move set up"
            aria-label="Move set up"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14l5-5 5 5z" />
            </svg>
          </button>

          {/* Move Down Button */}
          <button
            type="button"
            onClick={() => {
              console.log("[SetInput] Move Down button clicked", {
                exerciseIndex,
                setIndex,
              });
              onMoveDown?.();
            }}
            disabled={!onMoveDown}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-md transition-all duration-200",
              "hover:bg-muted active:bg-muted/80",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
              "disabled:cursor-not-allowed disabled:opacity-30",
              onMoveDown ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50"
            )}
            title="Move set down"
            aria-label="Move set down"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </button>
        </div>
      )}

      {/* Delete Button - Enhanced for mobile */}
      {!readOnly && showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(exerciseIndex, setIndex);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200",
            "bg-red-500 text-white shadow-sm",
            "hover:bg-red-600 active:bg-red-700 active:scale-95",
            "focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
          )}
          title="Delete set"
          aria-label={`Delete set ${setIndex + 1}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      )}
      </div>
    </div>
  );
}
