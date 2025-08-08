"use client";

import React, { useMemo } from "react";
import { SetInput, type SetData } from "../set-input";
import { useUniversalDragReorder } from "~/hooks/use-universal-drag-reorder";

interface SetListProps {
  exerciseIndex: number;
  exerciseName: string;
  templateExerciseId?: number;
  sets: SetData[];
  readOnly: boolean;
  onUpdate: (exerciseIndex: number, setIndex: number, field: keyof SetData, value: string | number | undefined) => void;
  onToggleUnit: (exerciseIndex: number, setIndex: number) => void;
  onAddSet: (exerciseIndex: number) => void;
  onDeleteSet: (exerciseIndex: number, setIndex: number) => void;
  onReorderSets: (exerciseIndex: number, from: number, to: number) => void;
}

export function SetList({
  exerciseIndex,
  exerciseName,
  templateExerciseId,
  sets,
  readOnly,
  onUpdate,
  onToggleUnit,
  onAddSet,
  onDeleteSet,
  onReorderSets,
}: SetListProps) {
  // Build a stable display order for sets, preserving identity by set.id when available
  const displayOrder = useMemo(
    () =>
      sets.map((s, index) => ({
        set: s,
        originalIndex: index,
        identity: (s.id ?? `${exerciseIndex}-${index}`).toString(),
      })),
    [sets, exerciseIndex],
  );

  const [dragState, dragHandlers] = useUniversalDragReorder(
    displayOrder,
    (newDisplay) => {
      // Find which set was moved and where
      for (let newIndex = 0; newIndex < newDisplay.length; newIndex++) {
        const currentItem = newDisplay[newIndex];
        const originalIndex = currentItem?.originalIndex;
        
        if (originalIndex !== undefined && originalIndex !== newIndex) {
          // This set was moved from originalIndex to newIndex
          onReorderSets(exerciseIndex, originalIndex, newIndex);
          break; // Only handle one move at a time
        }
      }
    },
    // When dragging starts, nothing special yet for sets
  );

  return (
    <div className="space-y-2">
      {/* Render each set with drag affordance and delegation to universal drag handlers */}
      {displayOrder.map((item, displayIndex) => (
        <div
          key={item.identity}
          className={`rounded-md ${dragState.isDragging && dragState.draggedIndex === displayIndex ? "shadow-lg" : ""}`}
          onPointerDown={dragHandlers.onPointerDown(displayIndex)}
          // Prevent browser gestures on the container while dragging
          style={{ touchAction: "none" }}
          // Provide an element ref map if needed for precise drop targeting
          ref={(el) => dragHandlers.setCardElement?.(displayIndex, el as HTMLElement | null)}
        >
          <SetInput
            set={item.set}
            setIndex={displayIndex}
            exerciseIndex={exerciseIndex}
            exerciseName={exerciseName}
            templateExerciseId={templateExerciseId}
            onUpdate={onUpdate}
            onToggleUnit={onToggleUnit}
            onDelete={onDeleteSet}
            readOnly={readOnly}
            showDelete={sets.length > 1}
            onPointerDownForSet={dragHandlers.onPointerDown(displayIndex)}
          />
        </div>
      ))}

      {/* Add Set Button */}
      {!readOnly && (
        <div>
          <button
            className="w-full py-2 text-sm rounded-md border border-gray-200 bg-white text-gray-900 hover:bg-gray-100 transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
            onClick={(e) => {
              // Prevent any parent pointer/mouse handlers from receiving this click,
              // which can cause duplicate addSet invocations.
              e.preventDefault();
              e.stopPropagation();
              // Some browsers fire both pointer and click in quick succession in nested handlers.
              // Use a per-event guard flag to avoid double-fire.
              const ne = (e as unknown as { nativeEvent?: Record<string, unknown> }).nativeEvent;
              if (ne?._addSetHandled) return;
              if (ne) ne._addSetHandled = true;
              onAddSet(exerciseIndex);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            Add Set
          </button>
        </div>
      )}
    </div>
  );
}

export default SetList;
