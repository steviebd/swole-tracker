"use client";

import { analytics } from "~/lib/analytics";

export interface SetData {
  id: string;
  weight?: number;
  reps?: number;
  sets: number;
  unit: "kg" | "lbs";
}

interface SetInputProps {
  set: SetData;
  setIndex: number;
  exerciseIndex: number;
  exerciseName: string;
  templateExerciseId?: number;
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
}

export function SetInput({
  set,
  setIndex,
  exerciseIndex,
  exerciseName,
  templateExerciseId,
  onUpdate,
  onToggleUnit,
  onDelete,
  readOnly = false,
  showDelete = true,
}: SetInputProps) {
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

  return (
    <div className="flex items-center gap-3 rounded-lg p-3 select-none glass-surface glass-hairline text-gray-900 dark:text-white">
      {/* Set Number */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-xs font-medium text-white">
        {setIndex + 1}
      </div>

      {/* Input Grid */}
      <div className="flex flex-1 gap-3">
        {/* Weight */}
        <div className="flex-1">
          <label className="mb-1 block text-xs text-secondary">Weight</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              value={set.weight ?? ""}
              onChange={(e) => {
                const value = e.target.value
                  ? parseFloat(e.target.value)
                  : undefined;
                handleWeightChange(value);
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              disabled={readOnly}
              className={`input flex-1 bg-transparent ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
            />
            <button
              type="button"
              onClick={() => !readOnly && onToggleUnit(exerciseIndex, setIndex)}
              disabled={readOnly}
              className={`px-2 text-xs btn-secondary ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
              title="Toggle unit"
            >
              {set.unit}
            </button>
          </div>
        </div>

        {/* Reps */}
        <div className="flex-1">
          <label className="mb-1 block text-xs text-secondary">Reps</label>
          <input
            type="number"
            value={set.reps ?? ""}
            onChange={(e) =>
              onUpdate(
                exerciseIndex,
                setIndex,
                "reps",
                e.target.value ? parseInt(e.target.value) : undefined,
              )
            }
            onFocus={(e) => e.target.select()}
            placeholder="0"
            disabled={readOnly}
            className={`input w-full bg-transparent ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
          />
        </div>

        {/* Sets */}
        <div className="flex-1">
          <label className="mb-1 block text-xs text-secondary">Sets</label>
          <input
            type="number"
            value={set.sets}
            onChange={(e) =>
              onUpdate(
                exerciseIndex,
                setIndex,
                "sets",
                e.target.value ? parseInt(e.target.value) : 1,
              )
            }
            onFocus={(e) => e.target.select()}
            placeholder="1"
            min="1"
            disabled={readOnly}
            className={`input w-full bg-transparent ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
          />
        </div>
      </div>

      {/* Right-edge drag handle (sets) */}
      {!readOnly && (
        <button
          type="button"
          aria-label="Drag set to reorder"
          data-drag-handle="true"
          className="ml-1 mr-1 px-1 py-2 touch-none cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          // The parent component that renders SetInput will bind the onPointerDown
          // via event delegation on the card/list level using data-drag-handle
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

      {/* Delete Button */}
      {!readOnly && showDelete && (
        <button
          onClick={() => onDelete(exerciseIndex, setIndex)}
          className="flex h-8 w-8 items-center justify-center rounded-full btn-destructive"
          title="Delete set"
        >
          ×
        </button>
      )}
    </div>
  );
}
