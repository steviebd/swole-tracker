"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { analytics } from "~/lib/analytics";

interface ExerciseData {
  templateExerciseId?: number;
  exerciseName: string;
  weight?: number;
  reps?: number;
  sets?: number;
  unit: "kg" | "lbs";
}

interface ExerciseInputProps {
  exercise: ExerciseData;
  index: number;
  onUpdate: (
    index: number,
    field: keyof ExerciseData,
    value: string | number | undefined,
  ) => void;
  onToggleUnit: (index: number) => void;
  readOnly?: boolean;
}

export function ExerciseInput({
  exercise,
  index,
  onUpdate,
  onToggleUnit,
  readOnly = false,
}: ExerciseInputProps) {
  const [hasLoadedLastData, setHasLoadedLastData] = useState(false);

  const { data: lastData, isSuccess } =
    api.workouts.getLastExerciseData.useQuery(
      { exerciseName: exercise.exerciseName },
      { enabled: !readOnly }, // Don't fetch last data if read-only
    );

  // Pre-populate with last exercise data when it loads (only if not read-only)
  useEffect(() => {
    if (!readOnly && isSuccess && !hasLoadedLastData) {
      if (lastData?.weight !== undefined) {
        onUpdate(index, "weight", lastData.weight);
      }
      if (lastData?.reps !== undefined && lastData.reps !== null) {
        onUpdate(index, "reps", lastData.reps);
      }
      if (lastData?.sets !== undefined && lastData.sets !== null) {
        onUpdate(index, "sets", lastData.sets);
      }
      if (lastData?.unit) {
        onUpdate(index, "unit", lastData.unit);
      }
      setHasLoadedLastData(true);
    }
  }, [readOnly, lastData, isSuccess, hasLoadedLastData, index, onUpdate]);

  const hasPrefilledData =
    lastData && (lastData.weight ?? lastData.reps ?? lastData.sets);

  return (
    <div className="rounded-lg bg-gray-800 p-4">
      <h3 className="mb-4 font-semibold">{exercise.exerciseName}</h3>

      {/* Input Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Weight */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Weight</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              value={exercise.weight ?? ""}
              onChange={(e) => {
                const value = e.target.value
                  ? parseFloat(e.target.value)
                  : undefined;
                onUpdate(index, "weight", value);
                if (value && exercise.sets) {
                  analytics.exerciseLogged(
                    exercise.templateExerciseId?.toString() ?? "custom",
                    exercise.exerciseName,
                    exercise.sets,
                    value,
                  );
                }
              }}
              placeholder="0"
              disabled={readOnly}
              className={`flex-1 rounded border px-2 py-1 text-sm focus:outline-none ${
                readOnly
                  ? "cursor-not-allowed border-gray-700 bg-gray-800 text-gray-400"
                  : "border-gray-600 bg-gray-700 focus:ring-1 focus:ring-purple-500"
              }`}
            />
            <button
              type="button"
              onClick={() => !readOnly && onToggleUnit(index)}
              disabled={readOnly}
              className={`px-1 text-xs ${
                readOnly
                  ? "cursor-not-allowed text-gray-500"
                  : "text-purple-400 hover:text-purple-300"
              }`}
            >
              {exercise.unit}
            </button>
          </div>
        </div>

        {/* Reps */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Reps</label>
          <input
            type="number"
            value={exercise.reps ?? ""}
            onChange={(e) =>
              onUpdate(
                index,
                "reps",
                e.target.value ? parseInt(e.target.value) : undefined,
              )
            }
            placeholder="0"
            disabled={readOnly}
            className={`w-full rounded border px-2 py-1 text-sm focus:outline-none ${
              readOnly
                ? "cursor-not-allowed border-gray-700 bg-gray-800 text-gray-400"
                : "border-gray-600 bg-gray-700 focus:ring-1 focus:ring-purple-500"
            }`}
          />
        </div>

        {/* Sets */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Sets</label>
          <input
            type="number"
            value={exercise.sets ?? ""}
            onChange={(e) =>
              onUpdate(
                index,
                "sets",
                e.target.value ? parseInt(e.target.value) : undefined,
              )
            }
            placeholder="0"
            disabled={readOnly}
            className={`w-full rounded border px-2 py-1 text-sm focus:outline-none ${
              readOnly
                ? "cursor-not-allowed border-gray-700 bg-gray-800 text-gray-400"
                : "border-gray-600 bg-gray-700 focus:ring-1 focus:ring-purple-500"
            }`}
          />
        </div>
      </div>

      {/* Previous Data Hint */}
      {hasPrefilledData && (
        <div className="mt-2 text-xs text-gray-500">
          💡 Pre-filled with your last recorded data
        </div>
      )}
    </div>
  );
}
