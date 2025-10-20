"use client";

import { createContext, useContext } from "react";

export const WorkoutSessionContext = createContext<{
  updateSet: (
    exerciseIndex: number,
    setIndex: number,
    field: string,
    value: any,
  ) => void;
  exercises: any[];
  handleAcceptSuggestion: (
    exerciseName: string,
    setIndex: number,
    suggestion: { weight?: number; reps?: number },
  ) => void;
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
