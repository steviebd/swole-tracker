"use client";

import React, { createContext, useContext, useCallback } from "react";
import { type SetData } from "~/app/_components/set-input";
import { type ExerciseData } from "~/app/_components/exercise-card";
import { type WorkoutSessionState } from "~/hooks/useWorkoutSessionState";

export interface LocalSuggestion {
  weight?: number;
  reps?: number;
  restSeconds?: number;
}

export interface AcceptSuggestionPayload {
  exerciseName: string;
  templateExerciseId?: number;
  setIndex: number;
  suggestion: LocalSuggestion;
}

export interface WorkoutSessionContextValue {
  updateSet: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetData,
    value: string | number | undefined,
  ) => void;
  exercises: ExerciseData[];
  handleAcceptSuggestion: (params: AcceptSuggestionPayload) => void;
  sessionState: WorkoutSessionState;
}

export const WorkoutSessionContext =
  createContext<WorkoutSessionContextValue | null>(null);

export interface WorkoutSessionProviderProps {
  children: React.ReactNode;
  sessionState: WorkoutSessionState;
}

export function WorkoutSessionProvider({
  children,
  sessionState,
}: WorkoutSessionProviderProps) {
  const handleAcceptSuggestion = useCallback(
    (params: AcceptSuggestionPayload) => {
      const { exerciseName, setIndex, suggestion } = params;
      const exerciseIndex = sessionState.exercises.findIndex(
        (ex) => ex.exerciseName === exerciseName,
      );

      if (exerciseIndex === -1) return;

      if (suggestion.weight !== undefined) {
        sessionState.updateSet(
          exerciseIndex,
          setIndex,
          "weight",
          suggestion.weight,
        );
      }
      if (suggestion.reps !== undefined) {
        sessionState.updateSet(
          exerciseIndex,
          setIndex,
          "reps",
          suggestion.reps,
        );
      }
      if (suggestion.restSeconds !== undefined) {
        sessionState.updateSet(
          exerciseIndex,
          setIndex,
          "rest",
          suggestion.restSeconds,
        );
      }
    },
    [sessionState],
  );

  const value: WorkoutSessionContextValue = {
    updateSet: sessionState.updateSet,
    exercises: sessionState.exercises,
    handleAcceptSuggestion,
    sessionState,
  };

  return (
    <WorkoutSessionContext.Provider value={value}>
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSessionContext(): WorkoutSessionContextValue {
  const context = useContext(WorkoutSessionContext);
  if (!context) {
    throw new Error(
      "useWorkoutSessionContext must be used within WorkoutSessionProvider",
    );
  }
  return context;
}
