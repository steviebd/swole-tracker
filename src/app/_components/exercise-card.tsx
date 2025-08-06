"use client";

import { SetInput, type SetData } from "./set-input";
import { useSwipeGestures, type SwipeSettings } from "~/hooks/use-swipe-gestures";
import { ExerciseHeader } from "./workout/ExerciseHeader";
import { SetList } from "./workout/SetList";
import posthog from "posthog-js";
import { vibrate } from "~/lib/client-telemetry";

export interface ExerciseData {
  templateExerciseId?: number;
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
  onPointerDown?: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent, opts?: { force?: boolean }) => void;
  setCardElement?: (element: HTMLElement | null) => void;
}

export function ExerciseCard({
  exercise,
  exerciseIndex,
  onUpdate,
  onToggleUnit,
  onAddSet,
  onDeleteSet,
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
}: ExerciseCardProps) {
  // Swipe gesture hook
  const [swipeState, swipeHandlers, resetSwipe] = useSwipeGestures(
    () => {
      if (onSwipeToBottom && !readOnly) {
        // Haptic + PostHog for swipe-to-bottom
        try { vibrate(10); } catch {}
        try { posthog.capture("haptic_action", { kind: "swipe" }); } catch {}
        onSwipeToBottom(exerciseIndex);
        // Reset the dismissed state so card can be swiped again
        setTimeout(() => resetSwipe(), 50);
      }
    },
    swipeSettings,
    "horizontal"
  );

  const getCurrentBest = () => {
    if (exercise.sets.length === 0) return null;
    
    const maxWeight = Math.max(...exercise.sets.map(set => set.weight ?? 0));
    const bestSet = exercise.sets.find(set => set.weight === maxWeight);
    
    if (!bestSet?.weight) return null;
    
    return {
      weight: bestSet.weight,
      reps: bestSet.reps,
      sets: bestSet.sets,
      unit: bestSet.unit,
    };
  };

  const hasCurrentData = exercise.sets.some(set => set.weight ?? set.reps);
  const currentBest = getCurrentBest();

  const formatBest = (best: PreviousBest | null) => {
    if (!best?.weight) return "No previous data";
    
    const parts = [`${best.weight}${best.unit}`];
    if (best.reps) parts.push(`${best.reps} reps`);
    if (best.sets && best.sets > 1) parts.push(`${best.sets} sets`);
    
    return parts.join(" × ");
  };

  // Calculate styles for animations and feedback
  // Prioritize the active gesture - swipe for horizontal, drag for vertical
  const isSwipeActive = swipeState.isDragging && Math.abs(swipeState.translateX) > 0;
  const isRightSwipeActive = isSwipeActive && swipeState.translateX > 0;
  const isLeftSwipeActive = isSwipeActive && swipeState.translateX < 0;
  const isDragActive = isDragging && Math.abs(dragOffset.y) > Math.abs(dragOffset.x);

  // Style: lock horizontal translation during vertical drag; add subtle scale/shadow
  const cardStyle = {
    transform: `translate(${isDragActive ? 0 : (swipeState.isDismissed ? 0 : swipeState.translateX)}px, ${isDragActive ? dragOffset.y : 0}px)`,
    opacity: isDragActive ? 0.9 : swipeState.isDismissed ? 1 : Math.max(0.3, 1 - Math.abs(swipeState.translateX) / 300),
    scale: isDragActive ? 1.03 : swipeState.isDismissed ? 1 : Math.max(0.9, 1 - Math.abs(swipeState.translateX) / 600),
    zIndex: isDragActive ? 50 : 1,
    transition: (swipeState.isDragging && isSwipeActive) || isDragActive ? 'none' : 'transform var(--motion-duration-base) var(--motion-ease), opacity var(--motion-duration-base) var(--motion-ease), scale var(--motion-duration-base) var(--motion-ease)',
    // Optimize touch handling: card body prefers vertical panning; drag handle will use touch-action: none
    touchAction: 'pan-y pinch-zoom',
    willChange: isDragActive ? 'transform' : undefined,
  } as React.CSSProperties;

  const containerClasses = `
    card glass-surface overflow-hidden select-none
    ${isDraggedOver ? 'glass-hairline' : ''}
    ${isDragActive ? 'shadow-xl cursor-grabbing' : ''}
  `.trim();

  // Only start swipe gestures from the card surface; drag is initiated from the right-edge handle
  const handleCardPointerDown = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
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
      onPointerDown={handleCardPointerDown}
      onMouseDown={handleCardPointerDown}
      onTouchStart={handleCardPointerDown}
      onMouseMove={handleCardMouseMove}
      onMouseUp={handleCardMouseUp}
      onMouseLeave={handleCardMouseLeave}
      onTouchMove={handleCardTouchMove}
      onTouchEnd={handleCardTouchEnd}
    >
      {/* Swipe affordance hints */}
      {isLeftSwipeActive && !readOnly && (
        <div className="absolute inset-y-0 right-2 my-auto h-6 px-2 rounded glass-surface text-xs flex items-center pointer-events-none">
          Move to end →
        </div>
      )}
      {isRightSwipeActive && !readOnly && (
        <div className="absolute inset-y-0 left-2 my-auto h-6 px-2 rounded glass-surface text-xs flex items-center pointer-events-none">
          {isExpanded ? "Collapse" : "Expand"} ←
        </div>
      )}
      {/* Exercise Header (presentational) */}
      <div
        className="w-full p-4 text-left transition-colors cursor-pointer hover:glass-hairline"
        onClick={() => onToggleExpansion(exerciseIndex)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <ExerciseHeader
              name={exercise.exerciseName}
              isExpanded={isExpanded}
              isSwiped={isSwiped}
              readOnly={readOnly ?? false}
              previousBest={hasCurrentData && currentBest ? currentBest : previousBest}
              onToggleExpansion={onToggleExpansion}
              onSwipeToBottom={onSwipeToBottom}
              exerciseIndex={exerciseIndex}
            />
          </div>
          {draggable && !readOnly && (
            <button
              type="button"
              aria-label="Drag to reorder"
              data-drag-handle="true"
              className="group ml-2 px-1 py-2 touch-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-200"
              onPointerDown={(e) => onPointerDown?.(e as any, { force: true })}
              onMouseDown={(e) => onPointerDown?.(e as any, { force: true })}
              onTouchStart={(e) => onPointerDown?.(e as any, { force: true })}
              style={{ touchAction: 'none' }}
              title="Drag to reorder"
            >
              <span className="inline-flex flex-col gap-0.5">
                <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Previous Workout Reference */}
          {previousSets && previousSets.length > 0 && !readOnly && (
            <div className="rounded-lg p-3 glass-surface glass-hairline">
              <h4 className="text-xs font-medium text-secondary mb-2">LAST WORKOUT</h4>
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
                    const isHighestWeight = index === 0 && prevSet.weight && prevSet.weight > 0;
                    
                    return (
                      <div key={originalIndex} className={`flex items-center gap-3 text-sm ${isHighestWeight ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${isHighestWeight ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-900 dark:bg-gray-600 dark:text-white'}`}>
                          {originalIndex + 1}
                        </div>
                        <div className="flex gap-4">
                          {prevSet.weight && (
                            <span className={isHighestWeight ? 'font-medium' : ''}>{prevSet.weight}{prevSet.unit}</span>
                          )}
                          {prevSet.reps && (
                            <span>{prevSet.reps} reps</span>
                          )}
                          {prevSet.sets > 1 && (
                            <span>{prevSet.sets} sets</span>
                          )}
                          {isHighestWeight && (
                            <span className="text-xs text-green-700 dark:text-green-400">← Best</span>
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
          />
        </div>
      )}
    </div>
  );
}
