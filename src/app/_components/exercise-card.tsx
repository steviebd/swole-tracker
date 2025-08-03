"use client";

import { SetInput, type SetData } from "./set-input";
import { useSwipeGestures, type SwipeSettings } from "~/hooks/use-swipe-gestures";

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
  const isDragActive = isDragging && Math.abs(dragOffset.y) > Math.abs(dragOffset.x);

  // Style: lock horizontal translation during vertical drag; add subtle scale/shadow
  const cardStyle = {
    transform: `translate(${isDragActive ? 0 : (swipeState.isDismissed ? 0 : swipeState.translateX)}px, ${isDragActive ? dragOffset.y : 0}px)`,
    opacity: isDragActive ? 0.9 : swipeState.isDismissed ? 1 : Math.max(0.3, 1 - Math.abs(swipeState.translateX) / 300),
    scale: isDragActive ? 1.03 : swipeState.isDismissed ? 1 : Math.max(0.9, 1 - Math.abs(swipeState.translateX) / 600),
    zIndex: isDragActive ? 50 : 1,
    transition: (swipeState.isDragging && isSwipeActive) || isDragActive ? 'none' : 'transform 0.18s ease-out, opacity 0.18s ease-out, scale 0.18s ease-out',
    // Optimize touch handling: card body prefers vertical panning; drag handle will use touch-action: none
    touchAction: 'pan-y pinch-zoom',
    willChange: isDragActive ? 'transform' : undefined,
  } as React.CSSProperties;

  const containerClasses = `
    rounded-lg overflow-hidden select-none
    ${isDraggedOver ? 'border-2 border-purple-500 bg-purple-900/20' : 
      isSwiped ? 'bg-gray-850 border border-gray-600' : 'bg-gray-800'}
    ${isDragActive ? 'shadow-xl cursor-grabbing' : ''}
  `.trim();

  // Only start swipe gestures from the card surface; drag is initiated from the right-edge handle
  const handleCardPointerDown = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-drag-handle="true"]')) {
      // If the user pressed the drag handle, don't start swipe here
      return;
    }
    if ('touches' in e) {
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
      {/* Exercise Header */}
      <div
        onClick={() => onToggleExpansion(exerciseIndex)}
        className="w-full p-4 text-left hover:bg-gray-750 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{exercise.exerciseName}</h3>
            <div className="text-sm text-gray-400 mt-1">
              {hasCurrentData && currentBest ? (
                <span className="text-green-400">Current: {formatBest(currentBest)}</span>
              ) : previousBest ? (
                <span>Last: {formatBest(previousBest)}</span>
              ) : (
                "No previous data"
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {draggable && !readOnly && (
              <button
                type="button"
                aria-label="Drag to reorder"
                data-drag-handle="true"
                className="group mr-2 px-1 py-2 touch-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-200"
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
            {hasCurrentData && (
              <div className="h-2 w-2 rounded-full bg-green-400"></div>
            )}
            <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Previous Workout Reference */}
          {previousSets && previousSets.length > 0 && !readOnly && (
            <div className="rounded-lg bg-gray-900 p-3 border border-gray-600">
              <h4 className="text-xs font-medium text-gray-400 mb-2">LAST WORKOUT</h4>
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
                      <div key={originalIndex} className={`flex items-center gap-3 text-sm ${isHighestWeight ? 'text-green-300' : 'text-gray-300'}`}>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${isHighestWeight ? 'bg-green-600' : 'bg-gray-600'}`}>
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
                            <span className="text-xs text-green-400">← Best</span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Current Sets */}
          <div className="space-y-2">
            {exercise.sets.map((set, setIndex) => (
              <SetInput
                key={set.id}
                set={set}
                setIndex={setIndex}
                exerciseIndex={exerciseIndex}
                exerciseName={exercise.exerciseName}
                templateExerciseId={exercise.templateExerciseId}
                onUpdate={onUpdate}
                onToggleUnit={onToggleUnit}
                onDelete={onDeleteSet}
                readOnly={readOnly}
                showDelete={exercise.sets.length > 1}
              />
            ))}
          </div>

          {/* Add Set Button */}
          {!readOnly && (
            <button
              onClick={() => onAddSet(exerciseIndex)}
              className="w-full rounded-lg border-2 border-dashed border-gray-600 py-3 text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-colors"
            >
              + Add Set
            </button>
          )}
        </div>
      )}
    </div>
  );
}
