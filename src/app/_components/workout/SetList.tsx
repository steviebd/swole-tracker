"use client";

import React from "react";
import { SetInput, type SetData } from "../set-input";

interface SetListProps {
  exerciseIndex: number;
  exerciseName: string;
  templateExerciseId?: number;
  sets: SetData[];
  readOnly: boolean;
  onUpdate: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetData,
    value: string | number | undefined,
  ) => void;
  onToggleUnit: (exerciseIndex: number, setIndex: number) => void;
  onAddSet: (exerciseIndex: number) => void;
  onDeleteSet: (exerciseIndex: number, setIndex: number) => void;
  onMoveSet: (
    exerciseIndex: number,
    setIndex: number,
    direction: "up" | "down",
  ) => void;
  preferredUnit?: "kg" | "lbs";
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
  onMoveSet,
  preferredUnit = "kg",
}: SetListProps) {
  return (
    <div className="space-y-2">
      {/* Render each set with up/down arrows */}
      {sets.map((set, setIndex) => (
        <SetInput
          key={`${exerciseIndex}-${set.id}-${setIndex}`}
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
          preferredUnit={preferredUnit}
          // Arrow button handlers
          onMoveUp={
            setIndex > 0
              ? () => {
                  console.log("[SetList] onMoveUp callback triggered", {
                    exerciseIndex,
                    setIndex,
                  });
                  onMoveSet(exerciseIndex, setIndex, "up");
                }
              : undefined
          }
          onMoveDown={
            setIndex < sets.length - 1
              ? () => {
                  console.log("[SetList] onMoveDown callback triggered", {
                    exerciseIndex,
                    setIndex,
                  });
                  onMoveSet(exerciseIndex, setIndex, "down");
                }
              : undefined
          }
        />
      ))}

      {/* Add Set Button */}
      {!readOnly && (
        <div>
          <button
            className="w-full rounded-md border border-gray-200 bg-background py-2 text-sm text-foreground transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddSet(exerciseIndex);
            }}
          >
            Add Set
          </button>
        </div>
      )}
    </div>
  );
}

export default SetList;
