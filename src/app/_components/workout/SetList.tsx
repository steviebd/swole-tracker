"use client";

import React from "react";
import { SetInput, type SetData } from "../set-input";
import { Plus, Target } from "lucide-react";
import { cn } from "~/lib/utils";
import type { Id } from "~/convex/_generated/dataModel";

interface SetListProps {
  exerciseIndex: number;
  exerciseName: string;
  templateExerciseId?: Id<"templateExercises">;
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
  const hasCompletedSets = sets.some(set => set.weight && set.reps);
  const completedSetsCount = sets.filter(set => set.weight && set.reps).length;
  
  return (
    <div className="space-y-3">
      {/* Set Summary Header */}
      {sets.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-2">
            <Target className="w-3 h-3" />
            <span>Sets ({completedSetsCount}/{sets.length} completed)</span>
          </div>
          {hasCompletedSets && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              {completedSetsCount > 0 && `${Math.round((completedSetsCount / sets.length) * 100)}% complete`}
            </span>
          )}
        </div>
      )}
      
      {/* Set List */}
      <div className="space-y-2">
        {sets.map((set, setIndex) => {
          const isCompleted = !!(set.weight && set.reps);
          const isLastSet = setIndex === sets.length - 1;
          
          return (
            <div 
              key={`${exerciseIndex}-${set.id}-${setIndex}`}
              className={cn(
                "relative transition-all duration-200",
                isCompleted && "ring-1 ring-green-200 dark:ring-green-800"
              )}
            >
              <SetInput
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
                // Arrow button handlers for reordering
                onMoveUp={
                  setIndex > 0 && !readOnly
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
                  setIndex < sets.length - 1 && !readOnly
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
              
              {/* Completion Indicator */}
              {isCompleted && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full" />
              )}
              
              {/* Set Connector Line */}
              {!isLastSet && (
                <div className="absolute left-4 -bottom-1 w-0.5 h-2 bg-border/50" />
              )}
            </div>
          );
        })}
      </div>

      {/* Add Set Button - Enhanced for mobile */}
      {!readOnly && (
        <div className="pt-2">
          <button
            className={cn(
              "w-full flex items-center justify-center gap-2",
              "py-3 px-4 rounded-lg transition-all duration-200",
              "border-2 border-dashed border-muted-foreground/30",
              "text-muted-foreground hover:text-foreground",
              "hover:border-primary hover:bg-primary/5",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "active:scale-[0.98] active:bg-primary/10"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddSet(exerciseIndex);
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium">Add Set</span>
          </button>
        </div>
      )}
      
      {/* Empty State */}
      {sets.length === 0 && !readOnly && (
        <div className="text-center py-6 text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No sets added yet</p>
          <p className="text-xs mt-1">Tap "Add Set" to get started</p>
        </div>
      )}
    </div>
  );
}

export default SetList;
