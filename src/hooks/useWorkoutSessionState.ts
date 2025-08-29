"use client";

import { useState } from "react";
import type { SetData } from "~/app/_components/set-input";
import type { SwipeSettings } from "~/hooks/use-swipe-gestures";

interface ExerciseData {
  templateExerciseId?: number;
  exerciseName: string;
  sets: SetData[];
  unit: "kg" | "lbs";
}


interface DragState {
  isDragging: boolean;
  dragIndex: number | null;
  dragOverIndex: number | null;
  draggedIndex: number | null;
  dragOffset?: { x: number; y: number };
}

interface Session {
  id: number;
  name: string;
  completed: boolean;
  templateId?: number;
}

interface WorkoutSessionStateParams {
  sessionId: number;
}

interface WorkoutSessionState {
  exercises: ExerciseData[];
  setExercises: (exercises: ExerciseData[]) => void;
  expandedExercises: number[];
  setExpandedExercises: (expanded: number[]) => void;
  loading: boolean;
  isReadOnly: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  previousExerciseData: Record<string, any>;
  collapsedIndexes: number[];
  saveWorkout: { mutateAsync: (payload: any) => Promise<void>; isPending: boolean };
  deleteWorkout: { mutateAsync: (payload?: any) => Promise<void>; isPending: boolean };
  enqueue: (action: any) => void;
  swipeSettings: SwipeSettings;
  dragState: DragState;
  dragHandlers: any;
  getDisplayOrder: () => { exercise: ExerciseData; originalIndex: number }[];
  toggleExpansion: (index: number) => void;
  handleSwipeToBottom: (index: number) => void;
  updateSet: (exerciseIndex: number, setIndex: number, field: keyof SetData, value: string | number | undefined) => void;
  toggleUnit: (exerciseIndex: number, setIndex: number) => void;
  addSet: (exerciseIndex: number) => void;
  deleteSet: (exerciseIndex: number, setIndex: number) => void;
  moveSet: (exerciseIndex: number, setIndex: number, direction: "up" | "down") => void;
  buildSavePayload: () => any;
  session: Session | null;
  updatePreferences: (prefs: any) => Promise<void>;
  preferences: any;
  lastAction: any;
  undoLastAction: () => void;
  setLastAction: (action: any) => void;
}

export function useWorkoutSessionState({ sessionId }: WorkoutSessionStateParams): WorkoutSessionState {
  // Basic state
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dragState] = useState<DragState>({ isDragging: false, dragIndex: null, dragOverIndex: null, draggedIndex: null });
  const [lastAction, setLastAction] = useState<any>(null);

  // Basic implementations - these are stubs that can be enhanced later
  const saveWorkout = {
    mutateAsync: async (payload: any) => {
      console.log("Save workout - stub implementation", payload);
    },
    isPending: false
  };

  const deleteWorkout = {
    mutateAsync: async (payload?: any) => {
      console.log("Delete workout - stub implementation", payload);
    },
    isPending: false
  };

  const enqueue = (action: any) => {
    console.log("Enqueue action - stub implementation", action);
  };

  const getDisplayOrder = () => {
    return exercises.map((exercise, index) => ({ exercise, originalIndex: index }));
  };

  const toggleExpansion = (index: number) => {
    const newExpanded = [...expandedExercises];
    const existingIndex = newExpanded.indexOf(index);
    if (existingIndex >= 0) {
      newExpanded.splice(existingIndex, 1);
    } else {
      newExpanded.push(index);
    }
    setExpandedExercises(newExpanded);
  };

  const handleSwipeToBottom = (index: number) => {
    console.log("Swipe to bottom - stub implementation", index);
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetData, value: string | number | undefined) => {
    console.log("Update set - stub implementation", { exerciseIndex, setIndex, field, value });
  };

  const toggleUnit = (exerciseIndex: number, setIndex: number) => {
    console.log("Toggle unit - stub implementation", { exerciseIndex, setIndex });
  };

  const addSet = (exerciseIndex: number) => {
    console.log("Add set - stub implementation", exerciseIndex);
  };

  const deleteSet = (exerciseIndex: number, setIndex: number) => {
    console.log("Delete set - stub implementation", { exerciseIndex, setIndex });
  };

  const moveSet = (exerciseIndex: number, setIndex: number, direction: "up" | "down") => {
    console.log("Move set - stub implementation", { exerciseIndex, setIndex, direction });
  };

  const buildSavePayload = () => {
    return { exercises };
  };

  const updatePreferences = async (prefs: any) => {
    console.log("Update preferences - stub implementation", prefs);
  };

  const undoLastAction = () => {
    console.log("Undo last action - stub implementation");
  };

  return {
    exercises,
    setExercises,
    expandedExercises,
    setExpandedExercises,
    loading: false,
    isReadOnly: false,
    showDeleteConfirm,
    setShowDeleteConfirm,
    previousExerciseData: {},
    collapsedIndexes: [],
    saveWorkout,
    deleteWorkout,
    enqueue,
    swipeSettings: {
      dismissThreshold: 150,
      velocityThreshold: 8,
      friction: 0.95,
      minimumVelocity: 0.5,
      framesPerSecond: 60,
    },
    dragState,
    dragHandlers: {},
    getDisplayOrder,
    toggleExpansion,
    handleSwipeToBottom,
    updateSet,
    toggleUnit,
    addSet,
    deleteSet,
    moveSet,
    buildSavePayload,
    session: { id: sessionId, name: "Workout Session", completed: false, templateId: 1 },
    updatePreferences,
    preferences: {},
    lastAction,
    undoLastAction,
    setLastAction,
  };
}