"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

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
  onUpdate: (index: number, field: keyof ExerciseData, value: string | number | undefined) => void;
  onToggleUnit: (index: number) => void;
  readOnly?: boolean;
}

export function ExerciseInput({ exercise, index, onUpdate, onToggleUnit, readOnly = false }: ExerciseInputProps) {
  const [hasLoadedLastData, setHasLoadedLastData] = useState(false);
  
  const { data: lastData, isSuccess } = api.workouts.getLastExerciseData.useQuery(
    { exerciseName: exercise.exerciseName },
    { enabled: !readOnly } // Don't fetch last data if read-only
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

  const hasPrefilledData = lastData && (lastData.weight ?? lastData.reps ?? lastData.sets);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="font-semibold mb-4">{exercise.exerciseName}</h3>
      
      {/* Input Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Weight */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Weight</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              value={exercise.weight ?? ""}
              onChange={(e) => onUpdate(index, "weight", e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0"
              disabled={readOnly}
              className={`flex-1 border rounded px-2 py-1 text-sm focus:outline-none ${
                readOnly 
                  ? "bg-gray-800 border-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gray-700 border-gray-600 focus:ring-1 focus:ring-purple-500"
              }`}
            />
            <button
              type="button"
              onClick={() => !readOnly && onToggleUnit(index)}
              disabled={readOnly}
              className={`text-xs px-1 ${
                readOnly 
                  ? "text-gray-500 cursor-not-allowed"
                  : "text-purple-400 hover:text-purple-300"
              }`}
            >
              {exercise.unit}
            </button>
          </div>
        </div>

        {/* Reps */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Reps</label>
          <input
            type="number"
            value={exercise.reps ?? ""}
            onChange={(e) => onUpdate(index, "reps", e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="0"
            disabled={readOnly}
            className={`w-full border rounded px-2 py-1 text-sm focus:outline-none ${
              readOnly 
                ? "bg-gray-800 border-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-gray-700 border-gray-600 focus:ring-1 focus:ring-purple-500"
            }`}
          />
        </div>

        {/* Sets */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Sets</label>
          <input
            type="number"
            value={exercise.sets ?? ""}
            onChange={(e) => onUpdate(index, "sets", e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="0"
            disabled={readOnly}
            className={`w-full border rounded px-2 py-1 text-sm focus:outline-none ${
              readOnly 
                ? "bg-gray-800 border-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-gray-700 border-gray-600 focus:ring-1 focus:ring-purple-500"
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
