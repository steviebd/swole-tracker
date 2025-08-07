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
      // Compute mapping from identity to original index
      const idToOriginal = new Map<string, number>();
      sets.forEach((s, i) => {
        idToOriginal.set((s.id ?? `${exerciseIndex}-${i}`).toString(), i);
      });

      // Build a list of moves [from -> to] based on the new display order
      // Ensure stable string identity for each target set
      const targetOrder: string[] = newDisplay.map((d) => {
        const id = d.set.id;
        if (id != null) return String(id);
        const original = idToOriginal.get((d.set.id as any)?.toString?.() ?? "");
        return `${exerciseIndex}-${(typeof original === "number" && original >= 0) ? original : d.originalIndex}`;
      });

      // Apply moves by swapping adjacent indices to avoid clobbering values.
      // We use field-level updates to match the parent's state model.
      const move = (from: number, to: number) => {
        if (from === to || from < 0 || to < 0) return;
        const step = from < to ? 1 : -1;
        for (let i = from; i !== to; i += step) {
          const a = i;
          const b = i + step;

          // swap fields between a and b
          const sa = sets[a];
          const sb = sets[b];
          if (!sa || !sb) continue;

          onUpdate(exerciseIndex, a, "weight", sb.weight);
          onUpdate(exerciseIndex, a, "reps", (sb.reps ?? undefined) as any);
          onUpdate(exerciseIndex, a, "sets", ((sb.sets ?? 1) as any));
          onUpdate(exerciseIndex, a, "unit", (sb.unit as any));

          onUpdate(exerciseIndex, b, "weight", sa.weight);
          onUpdate(exerciseIndex, b, "reps", (sa.reps ?? undefined) as any);
          onUpdate(exerciseIndex, b, "sets", ((sa.sets ?? 1) as any));
          onUpdate(exerciseIndex, b, "unit", (sa.unit as any));
        }
      };

      // Determine current identity order
      const currentIds = sets.map((s, i) => (s.id != null ? String(s.id) : `${exerciseIndex}-${i}`));
      const desiredIds: string[] = newDisplay.map((d) =>
        d.set.id != null ? String(d.set.id) : `${exerciseIndex}-${d.originalIndex}`
      );

      // Execute minimal swaps to transform currentIds -> desiredIds
      let cur = currentIds.slice();
      for (let to = 0; to < desiredIds.length; to++) {
        const want = desiredIds[to]!;
        const from = cur.indexOf(want);
        if (from === -1 || from === to) continue;
        move(from, to);
        const moved = cur.splice(from, 1)[0] as string;
        cur.splice(to, 0, moved);
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
              const ne = (e as unknown as { nativeEvent?: Record<string, unknown> }).nativeEvent as Record<string, unknown> | undefined;
              if (ne && ne._addSetHandled) return;
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
