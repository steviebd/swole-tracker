"use client";

import React, { useState, useCallback } from "react";
import { useWorkoutSessionContext } from "./WorkoutSessionContext";
import { type SetData } from "~/app/_components/set-input";
import { type ExerciseData } from "~/app/_components/exercise-card";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

interface Suggestion {
  weight?: number;
  reps?: number;
  restSeconds?: number;
  rationale?: string;
}

interface ExerciseSuggestion {
  exerciseName: string;
  setIndex: number;
  suggestion: Suggestion;
}

interface HealthAdvice {
  readiness?: {
    rho: number;
    flags: string[];
  };
  perExercise?: Array<{
    exerciseName: string;
    suggestions: ExerciseSuggestion[];
  }>;
  summary?: string;
}

export interface WorkoutSessionWithHealthAdviceProps {
  sessionId: number;
  exercises?: ExerciseData[];
  isReadOnly?: boolean;
  onAcceptSuggestion?: (suggestion: ExerciseSuggestion) => void;
  onUpdateSet?: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetData,
    value: string | number | undefined,
  ) => void;
  onAddSet?: (exerciseIndex: number) => void;
  onDeleteSet?: (exerciseIndex: number, setIndex: number) => void;
  className?: string;
}

export function WorkoutSessionWithHealthAdvice({
  sessionId,
  exercises: propExercises,
  isReadOnly = false,
  onAcceptSuggestion,
  onUpdateSet,
  onAddSet,
  onDeleteSet,
  className,
}: WorkoutSessionWithHealthAdviceProps) {
  const [healthAdvice] = useState<HealthAdvice | null>(null);
  const context = useWorkoutSessionContext();
  const exercises = propExercises ?? context.sessionState.exercises;

  const handleAcceptSuggestion = useCallback(
    (exerciseName: string, setIndex: number, suggestion: Suggestion) => {
      const exerciseIndex = exercises.findIndex(
        (ex) => ex.exerciseName === exerciseName,
      );
      if (exerciseIndex === -1) return;

      onAcceptSuggestion?.({
        exerciseName,
        setIndex,
        suggestion,
      });
    },
    [exercises, onAcceptSuggestion],
  );

  const getAdviceForExercise = (exerciseName: string) => {
    return healthAdvice?.perExercise?.find(
      (ex) => ex.exerciseName === exerciseName,
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {healthAdvice?.summary && (
        <Card variant="glass" className="mb-4">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <p className="text-sm">{healthAdvice.summary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {exercises.map((exercise, exerciseIndex) => {
        const advice = getAdviceForExercise(exercise.exerciseName);

        return (
          <Card key={exercise.exerciseName} surface="elevated">
            <CardContent className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {exercise.exerciseName}
                </h3>
                {advice && (
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs">
                    AI Advice
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {exercise.sets.map((set, setIndex) => {
                  const setAdvice = advice?.suggestions.find(
                    (s) => s.setIndex === setIndex,
                  );

                  return (
                    <div
                      key={set.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg p-2",
                        setAdvice && "bg-muted/50",
                      )}
                    >
                      <span className="text-muted-foreground w-8 text-sm">
                        {set.setNumber}
                      </span>

                      <input
                        type="number"
                        value={set.weight ?? ""}
                        onChange={(e) =>
                          onUpdateSet?.(
                            exerciseIndex,
                            setIndex,
                            "weight",
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        disabled={isReadOnly}
                        placeholder="Weight"
                        className="bg-background w-20 rounded border p-2"
                        aria-label={`Weight for set ${set.setNumber}`}
                      />

                      <span className="text-muted-foreground text-sm">
                        kg ×
                      </span>

                      <input
                        type="number"
                        value={set.reps ?? ""}
                        onChange={(e) =>
                          onUpdateSet?.(
                            exerciseIndex,
                            setIndex,
                            "reps",
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        disabled={isReadOnly}
                        placeholder="Reps"
                        className="bg-background w-16 rounded border p-2"
                        aria-label={`Reps for set ${set.setNumber}`}
                      />

                      <span className="text-muted-foreground text-sm">×</span>

                      <span className="w-8 text-sm font-medium">
                        {set.sets}
                      </span>

                      {setAdvice && (
                        <div className="ml-auto flex items-center gap-2">
                          {setAdvice.suggestion.weight && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleAcceptSuggestion(
                                  exercise.exerciseName,
                                  setIndex,
                                  setAdvice.suggestion,
                                )
                              }
                              className="text-xs"
                            >
                              Use {setAdvice.suggestion.weight}kg
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!isReadOnly && (
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddSet?.(exerciseIndex)}
                  >
                    + Add Set
                  </Button>
                  {exercise.sets.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onDeleteSet?.(exerciseIndex, exercise.sets.length - 1)
                      }
                    >
                      Remove Set
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
