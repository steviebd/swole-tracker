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
    <div className="flex items-center gap-3 rounded-lg bg-gray-700 p-3">
      {/* Set Number */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-xs font-medium">
        {setIndex + 1}
      </div>

      {/* Input Grid */}
      <div className="flex flex-1 gap-3">
        {/* Weight */}
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-400">Weight</label>
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
              placeholder="0"
              disabled={readOnly}
              className={`flex-1 rounded border px-2 py-1 text-sm focus:outline-none ${
                readOnly
                  ? "cursor-not-allowed border-gray-600 bg-gray-800 text-gray-400"
                  : "border-gray-500 bg-gray-600 focus:ring-1 focus:ring-purple-500"
              }`}
            />
            <button
              type="button"
              onClick={() => !readOnly && onToggleUnit(exerciseIndex, setIndex)}
              disabled={readOnly}
              className={`px-1 text-xs ${
                readOnly
                  ? "cursor-not-allowed text-gray-500"
                  : "text-purple-400 hover:text-purple-300"
              }`}
            >
              {set.unit}
            </button>
          </div>
        </div>

        {/* Reps */}
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-400">Reps</label>
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
            placeholder="0"
            disabled={readOnly}
            className={`w-full rounded border px-2 py-1 text-sm focus:outline-none ${
              readOnly
                ? "cursor-not-allowed border-gray-600 bg-gray-800 text-gray-400"
                : "border-gray-500 bg-gray-600 focus:ring-1 focus:ring-purple-500"
            }`}
          />
        </div>

        {/* Sets */}
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-400">Sets</label>
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
            placeholder="1"
            min="1"
            disabled={readOnly}
            className={`w-full rounded border px-2 py-1 text-sm focus:outline-none ${
              readOnly
                ? "cursor-not-allowed border-gray-600 bg-gray-800 text-gray-400"
                : "border-gray-500 bg-gray-600 focus:ring-1 focus:ring-purple-500"
            }`}
          />
        </div>
      </div>

      {/* Delete Button */}
      {!readOnly && showDelete && (
        <button
          onClick={() => onDelete(exerciseIndex, setIndex)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
          title="Delete set"
        >
          ×
        </button>
      )}
    </div>
  );
}
