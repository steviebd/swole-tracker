"use client";

import React from "react";
import { SetInput, type SetData } from "../set-input";

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
  return (
    <div className="space-y-2">
      {/* Render each set using the original SetInput component to preserve behavior */}
      {sets.map((set, setIndex) => (
        <SetInput
          key={set.id ?? `${exerciseIndex}-${setIndex}`}
          set={set}
          setIndex={setIndex}
          exerciseIndex={exerciseIndex}
          exerciseName={exerciseName}
          templateExerciseId={templateExerciseId}
          onUpdate={onUpdate}
          onToggleUnit={onToggleUnit}
          onDelete={onDeleteSet}
          readOnly={readOnly}
          showDelete={sets.length > 1}
        />
      ))}

      {/* Add Set Button */}
      {!readOnly && (
        <div>
          <button
            className="w-full py-2 text-sm rounded-md border border-gray-200 bg-white text-gray-900 hover:bg-gray-100 transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
            onClick={() => onAddSet(exerciseIndex)}
          >
            Add Set
          </button>
        </div>
      )}
    </div>
  );
}

export default SetList;
