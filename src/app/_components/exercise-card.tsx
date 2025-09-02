"use client";

import { type SetData } from "./set-input";
import type { Id } from "~/convex/_generated/dataModel";
import {
  useSwipeGestures,
  type SwipeSettings,
} from "~/hooks/use-swipe-gestures";
import { ExerciseHeader } from "./workout/ExerciseHeader";
import { SetList } from "./workout/SetList";
import posthog from "posthog-js";
import { vibrate } from "~/lib/client-telemetry";
import { useLiveRegion, useAttachLiveRegion } from "./LiveRegion";
import { useExerciseInsights } from "~/hooks/use-insights";

export interface ExerciseData {
  templateExerciseId?: Id<"templateExercises">;
  exerciseName: string;
  sets: SetData[];
  unit: "kg" | "lbs";
}

interface PreviousBest {
  weight?: number;
  reps?: number;
  sets?: number;
  unit: "kg" | "lbs";
}

interface ExerciseCardProps {
  exercise: ExerciseData;
  exerciseIndex: number;
  onUpdate: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetData,
    value: string | number | undefined,
  ) => void;
  onToggleUnit: (exerciseIndex: number, setIndex: number) => void;
  onAddSet: (exerciseIndex: number) => void;
  onDeleteSet: (exerciseIndex: number, setIndex: number) => void;
  onMoveSet: (
    exerciseIndex: number,
    setIndex: number,
    direction: "up" | "down",
  ) => void;
  isExpanded: boolean;
  onToggleExpansion: (exerciseIndex: number) => void;
  previousBest?: PreviousBest;
  previousSets?: SetData[];
  readOnly?: boolean;
  onSwipeToBottom?: (exerciseIndex: number) => void;
  isDraggedOver?: boolean;
  isDragging?: boolean;
  dragOffset?: { x: number; y: number };
  swipeSettings?: Partial<SwipeSettings>;
  isSwiped?: boolean;
  // Universal drag and drop props
  draggable?: boolean;
  onPointerDown?: (
    e: React.PointerEvent | React.MouseEvent | React.TouchEvent,
    opts?: { force?: boolean },
  ) => void;
  setCardElement?: (element: HTMLElement | null) => void;
  preferredUnit?: "kg" | "lbs";
  onAiSuggestionsClick?: (exerciseIndex: number, exerciseName: string, sets: SetData[]) => void;
  onSubstituteExercise?: (exerciseIndex: number, newExerciseName: string) => void;
}

export function ExerciseCard({
  exercise,
  exerciseIndex,
  onUpdate,
  onToggleUnit,
  onAddSet,
  onDeleteSet,
  onMoveSet,
  isExpanded,
  onToggleExpansion,
  previousBest,
  previousSets,
  readOnly = false,
  onSwipeToBottom,
  isDraggedOver = false,
  isDragging = false,
  dragOffset = { x: 0, y: 0 },
  swipeSettings,
  isSwiped = false,
  draggable = false,
  onPointerDown,
  setCardElement,
  preferredUnit = "kg",
  onAiSuggestionsClick,
  onSubstituteExercise,
}: ExerciseCardProps) {
  // Accessibility live region
  const announce = useLiveRegion();
  useAttachLiveRegion(announce);

  // Swipe gesture hook
  const [swipeState, swipeHandlers, resetSwipe] = useSwipeGestures(
    () => {
      if (onSwipeToBottom && !readOnly) {
        // Haptic + PostHog for swipe-to-bottom
        try {
          vibrate(10);
        } catch {}
        try {
          posthog.capture("haptic_action", { kind: "swipe" });
        } catch {}
        try {
          announce(`Moved ${exercise.exerciseName} to end`, {
            assertive: true,
          });
        } catch {}
        onSwipeToBottom(exerciseIndex);
        // Reset the dismissed state so card can be swiped again
        setTimeout(() => resetSwipe(), 50);
      }
    },
    swipeSettings,
    "horizontal",
  );

  const getCurrentBest = () => {
    if (exercise.sets.length === 0) return null;

    const maxWeight = Math.max(...exercise.sets.map((set) => set.weight ?? 0));
    const bestSet = exercise.sets.find((set) => set.weight === maxWeight);

    if (!bestSet?.weight) return null;

    return {
      weight: bestSet.weight,
      reps: bestSet.reps,
      sets: bestSet.sets,
      unit: bestSet.unit,
    };
  };

  const hasCurrentData = exercise.sets.some((set) => set.weight ?? set.reps);
  const currentBest = getCurrentBest();

  // Insights hook (read-only)
  const { data: insights } = useExerciseInsights({
    exerciseName: exercise.exerciseName,
    templateExerciseId: exercise.templateExerciseId,
    unit: exercise.unit,
    limitSessions: 10,
  });

  // Calculate styles for animations and feedback
  // Prioritize the active gesture - swipe for horizontal, drag for vertical
  const isSwipeActive =
    swipeState.isDragging && Math.abs(swipeState.translateX) > 0;
  const isRightSwipeActive = isSwipeActive && swipeState.translateX > 0;
  const isLeftSwipeActive = isSwipeActive && swipeState.translateX < 0;
  const isDragActive =
    isDragging && Math.abs(dragOffset.y) > Math.abs(dragOffset.x);

  // Enhanced visual feedback for drag and swipe
  const cardStyle = {
    transform: `translate3d(${isDragActive ? 0 : swipeState.isDismissed ? 0 : swipeState.translateX}px, ${isDragActive ? dragOffset.y : 0}px, ${isDragActive ? '10px' : '0px'})`,
    opacity: isDragActive
      ? 0.95
      : swipeState.isDismissed
        ? 1
        : Math.max(0.3, 1 - Math.abs(swipeState.translateX) / 300),
    scale: isDragActive
      ? 1.05
      : swipeState.isDismissed
        ? 1
        : Math.max(0.9, 1 - Math.abs(swipeState.translateX) / 600),
    zIndex: isDragActive ? 50 : isDraggedOver ? 25 : 1,
    boxShadow: isDragActive
      ? "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.3)"
      : isDraggedOver
        ? "0 10px 25px -5px rgba(59, 130, 246, 0.15), 0 0 0 1px rgba(59, 130, 246, 0.2)"
        : undefined,
    rotate: isDragActive ? '1deg' : '0deg',
    transition:
      (swipeState.isDragging && isSwipeActive) || isDragActive
        ? "none"
        : "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    // Optimize touch handling: card body prefers vertical panning; drag handle will use touch-action: none
    touchAction: "pan-y pinch-zoom",
    willChange: isDragActive || isSwipeActive ? "transform, opacity, box-shadow" : undefined,
  } as React.CSSProperties;

  const containerClasses = `
    card glass-surface overflow-hidden select-none
    ${isDraggedOver ? "glass-hairline" : ""}
    ${isDragActive ? "shadow-xl cursor-grabbing" : ""}
  `.trim();

  // Only start swipe gestures from the card surface; drag is initiated from the right-edge handle
  const handleCardPointerDown = (
    e: React.PointerEvent | React.MouseEvent | React.TouchEvent,
  ) => {
    const target = e.target as HTMLElement;

    // 1) Never start swipe from the explicit drag handle
    if (target.closest('[data-drag-handle="true"]')) {
      return;
    }

    // 2) Do NOT start swipe when interacting with inputs or interactive controls
    const interactiveSelectors = [
      "input",
      "textarea",
      "select",
      "button",
      "label",
      "[contenteditable='true']",
      "[role='textbox']",
      "[role='spinbutton']",
      "[role='button']",
    ].join(",");

    if (target.closest(interactiveSelectors)) {
      // Let the control handle the event (typing, focusing, etc.)
      return;
    }

    // 3) Otherwise, begin swipe handling
    if ("touches" in e) {
      swipeHandlers.onTouchStart(e);
    } else {
      swipeHandlers.onMouseDown(e as React.MouseEvent);
    }
  };

  const handleCardMouseMove = swipeHandlers.onMouseMove;
  const handleCardMouseUp = swipeHandlers.onMouseUp;
  const handleCardMouseLeave = swipeHandlers.onMouseLeave;
  const handleCardTouchMove = swipeHandlers.onTouchMove;
  const handleCardTouchEnd = swipeHandlers.onTouchEnd;

  return (
    <div
      ref={setCardElement}
      className={containerClasses}
      style={cardStyle}
      role="group"
      aria-roledescription="Exercise card"
      aria-label={`${exercise.exerciseName}`}
      onPointerDown={handleCardPointerDown}
      onMouseDown={handleCardPointerDown}
      onTouchStart={handleCardPointerDown}
      onMouseMove={handleCardMouseMove}
      onMouseUp={handleCardMouseUp}
      onMouseLeave={handleCardMouseLeave}
      onTouchMove={handleCardTouchMove}
      onTouchEnd={handleCardTouchEnd}
    >
      {/* Enhanced swipe feedback indicators */}
      {isLeftSwipeActive && !readOnly && (
        <div
          className={`pointer-events-none absolute inset-y-0 right-3 my-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            Math.abs(swipeState.translateX) > 120 
              ? "bg-red-500 text-white shadow-lg" 
              : "bg-orange-500/80 text-white"
          }`}
          role="status"
          aria-live="polite"
          style={{
            transform: `translateX(${Math.min(0, swipeState.translateX + 100)}px)`,
            opacity: Math.min(1, Math.abs(swipeState.translateX) / 60)
          }}
        >
          <span>Move to bottom</span>
          <span className="text-lg">→</span>
        </div>
      )}
      {isRightSwipeActive && !readOnly && (
        <div
          className="pointer-events-none absolute inset-y-0 left-3 my-auto flex items-center gap-2 rounded-lg bg-blue-500/80 px-3 py-2 text-sm font-medium text-white"
          role="status"
          aria-live="polite"
          style={{
            transform: `translateX(${Math.max(0, swipeState.translateX - 100)}px)`,
            opacity: Math.min(1, Math.abs(swipeState.translateX) / 60)
          }}
        >
          <span className="text-lg">←</span>
          <span>{isExpanded ? "Collapse" : "Expand"}</span>
        </div>
      )}
      {/* Exercise Header (presentational) */}
      <div
        className="hover:glass-hairline w-full cursor-pointer p-4 text-left transition-colors"
        role="button"
        aria-expanded={isExpanded ? "true" : "false"}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${exercise.exerciseName}`}
        onClick={() => onToggleExpansion(exerciseIndex)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <ExerciseHeader
              name={exercise.exerciseName}
              isExpanded={isExpanded}
              isSwiped={isSwiped}
              readOnly={readOnly ?? false}
              previousBest={previousBest}
              currentBest={hasCurrentData && currentBest ? currentBest : undefined}
              completedSets={exercise.sets.filter(set => set.weight && set.reps).length}
              totalSets={exercise.sets.length}
              onToggleExpansion={onToggleExpansion}
              onSwipeToBottom={onSwipeToBottom}
              onAiSuggestionsClick={() => onAiSuggestionsClick?.(exerciseIndex, exercise.exerciseName, exercise.sets)}
              exerciseIndex={exerciseIndex}
            />
          </div>
          {draggable && !readOnly && (
            <button
              type="button"
              aria-label="Drag to reorder"
              data-drag-handle="true"
              className={`group ml-2 touch-none p-2 rounded-lg transition-all ${
                isDragActive 
                  ? "bg-primary/20 text-primary cursor-grabbing scale-110" 
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-200/10 cursor-grab active:scale-95"
              }`}
              onPointerDown={(e) =>
                onPointerDown?.(
                  e as React.PointerEvent | React.MouseEvent | React.TouchEvent,
                  { force: true },
                )
              }
              onMouseDown={(e) =>
                onPointerDown?.(
                  e as React.PointerEvent | React.MouseEvent | React.TouchEvent,
                  { force: true },
                )
              }
              onTouchStart={(e) =>
                onPointerDown?.(
                  e as React.PointerEvent | React.MouseEvent | React.TouchEvent,
                  { force: true },
                )
              }
              style={{ 
                touchAction: "none",
                minWidth: "44px", // Accessibility touch target
                minHeight: "44px"
              }}
              title="Drag to reorder"
            >
              <span className="inline-flex flex-col gap-1 items-center justify-center">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80"></span>
                </span>
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                </span>
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80"></span>
                </span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-3 px-4 pb-4">
          {/* Insights Row */}
          {!readOnly && (
            <div className="glass-surface glass-hairline rounded-lg p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-secondary text-xs font-medium">
                    INSIGHTS
                  </span>
                  {insights?.bestSet ? (
                    <span className="text-sm">
                      Best:{" "}
                      <strong>
                        {insights.bestSet.weight}
                        {insights.bestSet.unit}
                      </strong>
                      {insights.bestSet.reps ? (
                        <> × {insights.bestSet.reps}</>
                      ) : null}
                      {typeof insights.best1RM === "number" ? (
                        <span className="text-muted ml-2 text-xs">
                          1RM≈ {insights.best1RM.toFixed(1)}
                          {exercise.unit}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-muted text-sm">No history yet</span>
                  )}
                </div>

                {/* Recommendation pill */}
                {insights?.recommendation ? (
                  <button
                    type="button"
                    className="glass-surface hover:glass-hairline ml-auto shrink-0 rounded-full px-3 py-1 text-xs transition-colors"
                    aria-label="Apply auto-progression recommendation"
                    onClick={() => {
                      try {
                        vibrate(5);
                      } catch {}
                      try {
                        const recommendation = insights.recommendation;
                        posthog.capture("insights_apply_recommendation", {
                          exerciseName: exercise.exerciseName,
                          type: recommendation?.type,
                          nextWeight:
                            recommendation?.type === "weight"
                              ? recommendation.nextWeight
                              : undefined,
                          nextReps:
                            recommendation?.type === "reps"
                              ? recommendation.nextReps
                              : undefined,
                          unit: recommendation?.unit,
                        });
                      } catch (err: unknown) {
                        if (err instanceof Error) {
                          // handle error
                        }
                      }
                      // Prefill the last set with recommendation conservatively
                      const rec = insights.recommendation;
                      if (
                        rec &&
                        rec.type === "weight" &&
                        Object.prototype.hasOwnProperty.call(
                          rec,
                          "nextWeight",
                        ) &&
                        typeof (rec as { nextWeight: unknown }).nextWeight ===
                          "number"
                      ) {
                        const lastIndex = exercise.sets.length - 1;
                        onUpdate(
                          exerciseIndex,
                          Math.max(0, lastIndex),
                          "weight",
                          (rec as unknown as { nextWeight: number }).nextWeight,
                        );
                      } else if (
                        rec &&
                        rec.type === "reps" &&
                        Object.prototype.hasOwnProperty.call(rec, "nextReps") &&
                        typeof (rec as { nextReps: unknown }).nextReps ===
                          "number"
                      ) {
                        const lastIndex = exercise.sets.length - 1;
                        const current =
                          exercise.sets[Math.max(0, lastIndex)]?.reps ?? 0;
                        onUpdate(
                          exerciseIndex,
                          Math.max(0, lastIndex),
                          "reps",
                          current +
                            ((rec as unknown as { nextReps: number })
                              .nextReps ?? 0),
                        );
                      }
                    }}
                    title={insights.recommendation.rationale}
                  >
                    {insights.recommendation.type === "weight"
                      ? `Suggest: ${insights.recommendation.nextWeight}${insights.recommendation.unit}`
                      : `Suggest: +${insights.recommendation.nextReps} rep`}
                  </button>
                ) : null}
              </div>

              {/* Simple sparkline (css-only, tiny) */}
              {insights?.volumeSparkline &&
                insights.volumeSparkline.length >= 2 && (
                  <div className="mt-2">
                    <div
                      className="flex h-8 items-end gap-1"
                      aria-hidden="true"
                    >
                      {(() => {
                        const vols = insights.volumeSparkline.map(
                          (p) => p.volume,
                        );
                        const max = Math.max(...vols);
                        const min = Math.min(...vols);
                        const range = Math.max(1, max - min);
                        return insights.volumeSparkline.map((p, i) => {
                          const h = Math.round(
                            ((p.volume - min) / range) * 100,
                          );
                          return (
                            <span
                              key={i}
                              className="w-1.5 rounded-sm bg-emerald-500/70 dark:bg-emerald-400/70"
                              style={{ height: `${Math.max(8, h)}%` }}
                              title={`${new Date(p.date).toLocaleDateString()}: Vol ${p.volume.toFixed(0)}`}
                            />
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

              {/* Heuristic suggestions */}
              {insights?.suggestions && insights.suggestions.length > 0 && (
                <ul className="text-muted mt-2 list-disc space-y-1 pl-5 text-xs">
                  {insights.suggestions.slice(0, 2).map((s, idx) => (
                    <li key={idx}>{s.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {/* Previous Workout Reference */}
          {previousSets && previousSets.length > 0 && !readOnly && (
            <div className="glass-surface glass-hairline rounded-lg p-3">
              <h4 className="text-secondary mb-2 text-xs font-medium">
                LAST WORKOUT
              </h4>
              <div className="space-y-2">
                {(() => {
                  // Sort previous sets by weight (highest first), then by original order
                  const sortedSets = [...previousSets].sort((a, b) => {
                    const weightA = a.weight ?? 0;
                    const weightB = b.weight ?? 0;
                    if (weightA !== weightB) {
                      return weightB - weightA; // Higher weight first
                    }
                    // If weights are equal, maintain original order
                    return previousSets.indexOf(a) - previousSets.indexOf(b);
                  });

                  return sortedSets.map((prevSet, index) => {
                    const originalIndex = previousSets.indexOf(prevSet);
                    const isHighestWeight =
                      index === 0 && prevSet.weight && prevSet.weight > 0;

                    return (
                      <div
                        key={originalIndex}
                        className={`flex items-center gap-3 text-sm ${isHighestWeight ? "text-green-700 dark:text-green-300" : "text-gray-700 dark:text-gray-300"}`}
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${isHighestWeight ? "bg-green-600 text-background" : "bg-muted text-muted-foreground"}`}
                        >
                          {originalIndex + 1}
                        </div>
                        <div className="flex gap-4">
                          {prevSet.weight && (
                            <span
                              className={isHighestWeight ? "font-medium" : ""}
                            >
                              {prevSet.weight}
                              {prevSet.unit}
                            </span>
                          )}
                          {prevSet.reps && <span>{prevSet.reps} reps</span>}
                          {prevSet.sets > 1 && <span>{prevSet.sets} sets</span>}
                          {isHighestWeight && (
                            <span className="text-xs text-green-700 dark:text-green-400">
                              ← Best
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Current Sets (presentational) */}
          <SetList
            exerciseIndex={exerciseIndex}
            exerciseName={exercise.exerciseName}
            templateExerciseId={exercise.templateExerciseId}
            sets={exercise.sets}
            readOnly={readOnly ?? false}
            onUpdate={onUpdate}
            onToggleUnit={onToggleUnit}
            onAddSet={onAddSet}
            onDeleteSet={onDeleteSet}
            onMoveSet={onMoveSet}
            preferredUnit={preferredUnit}
          />
        </div>
      )}
    </div>
  );
}
