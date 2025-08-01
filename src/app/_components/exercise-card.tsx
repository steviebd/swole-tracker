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
  onPointerDown?: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
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
  // Don't apply swipe transform if card was dismissed - let it stay in place
  const cardStyle = {
    transform: `translate(${isDragging ? dragOffset.x : (swipeState.isDismissed ? 0 : swipeState.translateX)}px, ${isDragging ? dragOffset.y : 0}px)`,
    opacity: isDragging ? 0.7 : swipeState.isDismissed ? 1 : Math.max(0.3, 1 - Math.abs(swipeState.translateX) / 300),
    scale: isDragging ? 0.95 : swipeState.isDismissed ? 1 : Math.max(0.9, 1 - Math.abs(swipeState.translateX) / 600),
    zIndex: isDragging ? 50 : 1,
    transition: swipeState.isDragging || isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    // Only set touchAction when not dragging to avoid conflicts
    touchAction: isDragging ? 'none' : 'pan-y',
  };

  const containerClasses = `
    rounded-lg overflow-hidden select-none
    ${isDraggedOver ? 'border-2 border-purple-500 bg-purple-900/20' : 
      isSwiped ? 'bg-gray-850 border border-gray-600' : 'bg-gray-800'}
    ${isDragging ? 'shadow-2xl cursor-grabbing' : ''}
    ${draggable && !readOnly && !isDragging ? 'cursor-grab hover:bg-gray-750 active:cursor-grabbing' : ''}
  `.trim();

  // Handle pointer events for universal drag or swipe
  const handlePointerDown = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    // Prevent dragging when clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) {
      return;
    }
    
    // For drag reordering, call the drag handler
    if (draggable && onPointerDown) {
      onPointerDown(e);
      return;
    }
    
    // For swipe gestures, convert to the appropriate handler
    if ('touches' in e) {
      swipeHandlers.onTouchStart(e);
    } else {
      swipeHandlers.onMouseDown(e as React.MouseEvent);
    }
  };

  return (
    <div 
      ref={setCardElement}
      className={containerClasses}
      style={cardStyle}
      onPointerDown={handlePointerDown}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      onMouseMove={draggable ? undefined : swipeHandlers.onMouseMove}
      onMouseUp={draggable ? undefined : swipeHandlers.onMouseUp}
      onMouseLeave={draggable ? undefined : swipeHandlers.onMouseLeave}
      onTouchMove={draggable ? undefined : swipeHandlers.onTouchMove}
      onTouchEnd={draggable ? undefined : swipeHandlers.onTouchEnd}
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
              <div className="flex flex-col gap-0.5 text-gray-400 hover:text-gray-200 transition-colors cursor-grab active:cursor-grabbing mr-2 px-1" title="Drag anywhere to reorder">
                <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
              </div>
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
                {previousSets.map((prevSet, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm text-gray-300">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-600 text-xs">
                      {index + 1}
                    </div>
                    <div className="flex gap-4">
                      {prevSet.weight && (
                        <span>{prevSet.weight}{prevSet.unit}</span>
                      )}
                      {prevSet.reps && (
                        <span>{prevSet.reps} reps</span>
                      )}
                      {prevSet.sets > 1 && (
                        <span>{prevSet.sets} sets</span>
                      )}
                    </div>
                  </div>
                ))}
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
