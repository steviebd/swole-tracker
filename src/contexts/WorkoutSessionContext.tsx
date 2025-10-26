"use client";

import { createContext, useContext } from "react";

import { type SetData } from "~/app/_components/set-input";
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

export const WorkoutSessionContext = createContext<{
  updateSet: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetData,
    value: string | number | undefined,
  ) => void;
  exercises: any[];
  handleAcceptSuggestion: (params: AcceptSuggestionPayload) => void;
  sessionState: WorkoutSessionState;
} | null>(null);

export const useWorkoutSessionContext = () => {
  const context = useContext(WorkoutSessionContext);
  if (!context) {
    throw new Error(
      "useWorkoutSessionContext must be used within WorkoutSessionProvider",
    );
  }
  return context;
};
