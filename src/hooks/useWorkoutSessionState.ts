"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import type { SetData } from "~/app/_components/set-input";
import type { SwipeSettings } from "~/hooks/use-swipe-gestures";
import { useUniversalDragReorder, type UniversalDragState, type UniversalDragHandlers } from "~/hooks/use-universal-drag-reorder";
import { useOfflineStorage } from "~/hooks/use-offline-storage";
import { api } from "~/convex/_generated/api";
import type { Id } from "~/convex/_generated/dataModel";
import { toast } from "sonner";

export interface ExerciseData {
  templateExerciseId?: Id<"templateExercises">;
  exerciseName: string;
  sets: SetData[];
  unit: "kg" | "lbs";
}

interface PreviousData {
  sets: SetData[];
  best?: {
    weight?: number;
    reps?: number;
    sets?: number;
    unit: "kg" | "lbs";
  };
}

interface Action {
  type: string;
  payload: any;
  timestamp: number;
  id: string;
}

interface WorkoutPayload {
  sessionId: Id<"workoutSessions">;
  exercises: {
    templateExerciseId?: Id<"templateExercises">;
    exerciseName: string;
    sets: {
      id: string;
      weight?: number;
      reps?: number;
      sets: number;
      unit: "kg" | "lbs";
      rpe?: number;
      rest?: number;
    }[];
    unit: "kg" | "lbs";
  }[];
  themeUsed?: string;
  deviceType?: "android" | "ios" | "desktop" | "ipad" | "other";
  perfMetrics?: any;
}

type DragState = UniversalDragState;

interface Session {
  _id: Id<"workoutSessions">;
  templateId: Id<"workoutTemplates">;
  template?: {
    _id: Id<"workoutTemplates">;
    name: string;
    exercises: {
      _id: Id<"templateExercises">;
      exerciseName: string;
      orderIndex: number;
    }[];
  };
  exercises: any[];
}

interface WorkoutSessionStateParams {
  sessionId: Id<"workoutSessions">;
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
  previousExerciseData: Map<string, PreviousData>;
  collapsedIndexes: number[];
  saveWorkout: { mutateAsync: (payload: WorkoutPayload) => Promise<void>; isPending: boolean };
  deleteWorkout: { mutateAsync: (payload: { id: Id<"workoutSessions"> }) => Promise<void>; isPending: boolean };
  enqueue: (payload: WorkoutPayload) => void;
  swipeSettings: SwipeSettings;
  dragState: DragState;
  dragHandlers: UniversalDragHandlers;
  getDisplayOrder: () => { exercise: ExerciseData; originalIndex: number }[];
  toggleExpansion: (index: number) => void;
  handleSwipeToBottom: (index: number) => void;
  updateSet: (exerciseIndex: number, setIndex: number, field: keyof SetData, value: string | number | undefined) => void;
  toggleUnit: (exerciseIndex: number, setIndex: number) => void;
  addSet: (exerciseIndex: number) => void;
  deleteSet: (exerciseIndex: number, setIndex: number) => void;
  moveSet: (exerciseIndex: number, setIndex: number, direction: "up" | "down") => void;
  buildSavePayload: () => WorkoutPayload;
  session: Session | null;
  updatePreferences: (prefs: any) => Promise<void>;
  preferences: any;
  lastAction: Action | null;
  undoLastAction: () => void;
  setLastAction: (action: Action | null) => void;
}

export function useWorkoutSessionState({ sessionId }: WorkoutSessionStateParams): WorkoutSessionState {
  // Core state
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [collapsedIndexes, setCollapsedIndexes] = useState<number[]>([]);
  const [previousExerciseData, setPreviousExerciseData] = useState<Map<string, PreviousData>>(new Map());
  const [lastAction, setLastAction] = useState<Action | null>(null);
  
  // Auto-save state
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  
  // Convex queries and mutations
  const session = useQuery(api.workouts.getWorkout, { id: sessionId });
  const saveWorkoutMutation = useMutation(api.workouts.updateWorkout);
  const deleteWorkoutMutation = useMutation(api.workouts.deleteWorkout);
  const userPreferences = useQuery(api.preferences.getPreferences);
  const updatePreferencesMutation = useMutation(api.preferences.updatePreferences);
  
  // Offline storage
  const { addPendingAction } = useOfflineStorage();
  
  // Drag and drop functionality
  const [dragState, dragHandlers] = useUniversalDragReorder(
    exercises,
    (reorderedExercises: ExerciseData[]) => {
      setExercises(reorderedExercises);
      recordAction({
        type: 'REORDER_EXERCISES',
        payload: { from: exercises, to: reorderedExercises },
        timestamp: Date.now(),
        id: crypto.randomUUID()
      });
    }
  );
  
  // Initialize exercises from template/session data
  useEffect(() => {
    if (session && exercises.length === 0) {
      if (session.exercises && session.exercises.length > 0) {
        // Existing session with data - populate from session exercises
        const exerciseGroups = new Map<string, any[]>();
        
        // Group session exercises by exercise name
        session.exercises.forEach((sessionEx: any) => {
          if (!exerciseGroups.has(sessionEx.exerciseName)) {
            exerciseGroups.set(sessionEx.exerciseName, []);
          }
          exerciseGroups.get(sessionEx.exerciseName)!.push(sessionEx);
        });
        
        // Convert to ExerciseData format
        const initialExercises: ExerciseData[] = Array.from(exerciseGroups.entries()).map(([exerciseName, sessionExercises]) => {
          // Sort by setOrder
          const sortedSets = sessionExercises.sort((a, b) => (a.setOrder || 0) - (b.setOrder || 0));
          
          return {
            templateExerciseId: sortedSets[0]?.templateExerciseId || undefined,
            exerciseName,
            sets: sortedSets.map((set, idx) => ({
              id: `${exerciseName}-set-${idx}`,
              weight: set.weight || undefined,
              reps: set.reps || undefined,
              sets: set.sets || 1,
              unit: (set.unit as "kg" | "lbs") || "kg",
              rpe: set.rpe || undefined,
              rest: set.restSeconds || undefined
            })),
            unit: (sortedSets[0]?.unit as "kg" | "lbs") || "kg"
          };
        });
        
        setExercises(initialExercises);
      } else if (session.template?.exercises) {
        // New session - populate from template
        const initialExercises: ExerciseData[] = session.template.exercises
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((templateEx) => ({
            templateExerciseId: templateEx._id,
            exerciseName: templateEx.exerciseName,
            sets: [
              {
                id: `${templateEx.exerciseName}-set-0`,
                weight: undefined,
                reps: undefined,
                sets: 1,
                unit: userPreferences?.defaultWeightUnit as "kg" | "lbs" || "kg"
              }
            ],
            unit: userPreferences?.defaultWeightUnit as "kg" | "lbs" || "kg"
          }));
        
        setExercises(initialExercises);
        setExpandedExercises([0]); // Expand first exercise by default
      }
    }
  }, [session, exercises.length, userPreferences]);
  
  // Load previous exercise data for comparison
  useEffect(() => {
    if (exercises.length > 0) {
      const loadPreviousData = async () => {
        const previousDataMap = new Map<string, PreviousData>();
        
        for (const exercise of exercises) {
          if (exercise.templateExerciseId) {
            // This would call a Convex query to get previous performance
            // For now, using placeholder data
            const mockPreviousData: PreviousData = {
              sets: [
                {
                  id: 'prev-1',
                  weight: 100,
                  reps: 8,
                  sets: 1,
                  unit: exercise.unit
                }
              ],
              best: {
                weight: 100,
                reps: 8,
                sets: 1,
                unit: exercise.unit
              }
            };
            previousDataMap.set(exercise.exerciseName, mockPreviousData);
          }
        }
        
        setPreviousExerciseData(previousDataMap);
      };
      
      loadPreviousData();
    }
  }, [exercises]);
  
  // Auto-save functionality
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (Date.now() - lastSaveTime > AUTO_SAVE_INTERVAL) {
        handleAutoSave();
      }
    }, AUTO_SAVE_INTERVAL);
    
    return () => clearInterval(autoSaveInterval);
  }, [lastSaveTime]);
  
  const handleAutoSave = useCallback(async () => {
    if (exercises.length === 0) return;
    
    try {
      const payload = buildSavePayload();
      await saveWorkoutMutation(payload);
      setLastSaveTime(Date.now());
    } catch (error) {
      // Silent auto-save failure - user can manually save
      console.warn('Auto-save failed:', error);
    }
  }, [exercises]);
  
  // Record action for undo/redo system
  const recordAction = useCallback((action: Action) => {
    setLastAction(action);
  }, []);
  
  // Undo last action
  const undoLastAction = useCallback(() => {
    if (!lastAction) return;
    
    switch (lastAction.type) {
      case 'REORDER_EXERCISES':
        setExercises(lastAction.payload.from);
        break;
      case 'UPDATE_SET':
        const { exerciseIndex, setIndex, field, oldValue } = lastAction.payload;
        updateSet(exerciseIndex, setIndex, field, oldValue);
        break;
      case 'ADD_SET':
        const { exerciseIndex: exIdx } = lastAction.payload;
        if (exercises[exIdx]) {
          deleteSet(exIdx, exercises[exIdx].sets.length - 1);
        }
        break;
      case 'DELETE_SET':
        const { exerciseIndex: delExIdx, setIndex: delSetIdx, deletedSet } = lastAction.payload;
        // Re-add the deleted set
        if (exercises[delExIdx]) {
          const newSets = [...exercises[delExIdx].sets];
          newSets.splice(delSetIdx, 0, deletedSet as SetData);
          setExercises(prev => prev.map((ex, idx) => 
            idx === delExIdx ? { ...ex, sets: newSets } : ex
          ));
        }
        break;
    }
    
    setLastAction(null);
    toast.success('Action undone');
  }, [lastAction, exercises]);
  
  // Exercise management functions
  const toggleExpansion = useCallback((index: number) => {
    setExpandedExercises(prev => {
      const newExpanded = [...prev];
      const existingIndex = newExpanded.indexOf(index);
      if (existingIndex >= 0) {
        newExpanded.splice(existingIndex, 1);
      } else {
        newExpanded.push(index);
      }
      return newExpanded;
    });
  }, []);
  
  const handleSwipeToBottom = useCallback((index: number) => {
    setCollapsedIndexes(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
    
    recordAction({
      type: 'SWIPE_TO_BOTTOM',
      payload: { exerciseIndex: index },
      timestamp: Date.now(),
      id: crypto.randomUUID()
    });
  }, []);
  
  const updateSet = useCallback((exerciseIndex: number, setIndex: number, field: keyof SetData, value: string | number | undefined) => {
    const oldValue = exercises[exerciseIndex]?.sets[setIndex]?.[field];
    
    setExercises(prev => prev.map((ex, i) => 
      i === exerciseIndex 
        ? {
            ...ex,
            sets: ex.sets.map((set, si) => 
              si === setIndex 
                ? { ...set, [field]: value }
                : set
            )
          }
        : ex
    ));
    
    recordAction({
      type: 'UPDATE_SET',
      payload: { exerciseIndex, setIndex, field, oldValue, newValue: value },
      timestamp: Date.now(),
      id: crypto.randomUUID()
    });
  }, [exercises]);
  
  const toggleUnit = useCallback((exerciseIndex: number, setIndex: number) => {
    const currentUnit = exercises[exerciseIndex]?.sets[setIndex]?.unit;
    const newUnit = currentUnit === 'kg' ? 'lbs' : 'kg';
    updateSet(exerciseIndex, setIndex, 'unit', newUnit);
  }, [exercises, updateSet]);
  
  const addSet = useCallback((exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise) return;
    
    const newSetId = `${exercise.exerciseName}-set-${exercise.sets.length}`;
    const newSet: SetData = {
      id: newSetId,
      weight: undefined,
      reps: undefined,
      sets: 1,
      unit: exercise.unit
    };
    
    // Auto-fill from previous set or previous workout data
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const previousData = previousExerciseData.get(exercise.exerciseName);
    
    if (lastSet && (lastSet.weight || lastSet.reps)) {
      // Copy from last set
      newSet.weight = lastSet.weight;
      newSet.reps = lastSet.reps;
    } else if (previousData?.sets?.[0]) {
      // Copy from previous workout
      const prevSet = previousData.sets[0];
      newSet.weight = prevSet.weight;
      newSet.reps = prevSet.reps;
    }
    
    setExercises(prev => prev.map((ex, i) => 
      i === exerciseIndex 
        ? { ...ex, sets: [...ex.sets, newSet] }
        : ex
    ));
    
    recordAction({
      type: 'ADD_SET',
      payload: { exerciseIndex },
      timestamp: Date.now(),
      id: crypto.randomUUID()
    });
  }, [exercises, previousExerciseData]);
  
  const deleteSet = useCallback((exerciseIndex: number, setIndex: number) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise || exercise.sets.length <= 1) return;
    
    const deletedSet = exercise.sets[setIndex];
    
    setExercises(prev => prev.map((ex, i) => 
      i === exerciseIndex 
        ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIndex) }
        : ex
    ));
    
    recordAction({
      type: 'DELETE_SET',
      payload: { exerciseIndex, setIndex, deletedSet },
      timestamp: Date.now(),
      id: crypto.randomUUID()
    });
  }, [exercises]);
  
  const moveSet = useCallback((exerciseIndex: number, setIndex: number, direction: "up" | "down") => {
    const exercise = exercises[exerciseIndex];
    if (!exercise) return;
    
    const newIndex = direction === 'up' ? setIndex - 1 : setIndex + 1;
    if (newIndex < 0 || newIndex >= exercise.sets.length) return;
    
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      
      const newSets = [...ex.sets];
      const temp = newSets[setIndex];
      const targetSet = newSets[newIndex];
      if (temp && targetSet) {
        newSets[setIndex] = targetSet;
        newSets[newIndex] = temp;
      }
      
      return { ...ex, sets: newSets };
    }));
    
    recordAction({
      type: 'MOVE_SET',
      payload: { exerciseIndex, setIndex, direction },
      timestamp: Date.now(),
      id: crypto.randomUUID()
    });
  }, [exercises]);
  
  // Build save payload
  const buildSavePayload = useCallback((): WorkoutPayload => {
    return {
      sessionId,
      exercises: exercises.map(exercise => ({
        templateExerciseId: exercise.templateExerciseId,
        exerciseName: exercise.exerciseName,
        sets: exercise.sets.filter(set => 
          set.weight !== undefined || set.reps !== undefined || (set.sets && set.sets > 0)
        ).map(set => ({
          id: set.id,
          weight: set.weight,
          reps: set.reps,
          sets: set.sets,
          unit: set.unit,
          rpe: set.rpe,
          rest: set.rest
        })),
        unit: exercise.unit
      })),
      themeUsed: typeof window !== 'undefined' ? 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 'light',
      deviceType: typeof window !== 'undefined' ? 
        (/Mobi|Android/i.test(navigator.userAgent) ? 'android' : 'desktop') : 'desktop'
    };
  }, [sessionId, exercises]);
  
  // Enhanced save/delete with offline support
  const enqueue = useCallback((payload: WorkoutPayload) => {
    addPendingAction({
      type: 'save_workout',
      data: payload as unknown as Record<string, unknown>
    });
    toast.success('Workout queued for sync when online');
  }, [addPendingAction]);
  
  const saveWorkout = useMemo(() => ({
    mutateAsync: async (payload: WorkoutPayload) => {
      try {
        await saveWorkoutMutation(payload);
        setLastSaveTime(Date.now());
        toast.success('Workout saved!');
      } catch (error) {
        console.error('Save failed:', error);
        throw error;
      }
    },
    isPending: false // TODO: Get correct pending state from Convex mutation
  }), [saveWorkoutMutation]);
  
  const deleteWorkout = useMemo(() => ({
    mutateAsync: async (payload: { id: Id<"workoutSessions"> }) => {
      try {
        await deleteWorkoutMutation(payload);
        toast.success('Workout deleted');
      } catch (error) {
        console.error('Delete failed:', error);
        throw error;
      }
    },
    isPending: false // TODO: Get correct pending state from Convex mutation
  }), [deleteWorkoutMutation]);
  
  const updatePreferences = useCallback(async (prefs: any) => {
    try {
      await updatePreferencesMutation(prefs);
      toast.success('Preferences updated');
    } catch (error) {
      console.error('Preferences update failed:', error);
    }
  }, [updatePreferencesMutation]);
  
  const getDisplayOrder = useCallback(() => {
    // Return exercises with their original indices, filtered by collapsed state
    return exercises
      .map((exercise, index) => ({ exercise, originalIndex: index }))
      .filter((item: { exercise: ExerciseData; originalIndex: number }, index: number) => !collapsedIndexes.includes(index));
  }, [exercises, collapsedIndexes]);
  
  const swipeSettings: SwipeSettings = useMemo(() => ({
    dismissThreshold: 120,
    velocityThreshold: 6,
    friction: 0.92,
    minimumVelocity: 0.3,
    framesPerSecond: 60,
  }), []);
  
  return {
    exercises,
    setExercises,
    expandedExercises,
    setExpandedExercises,
    loading: session === undefined,
    isReadOnly: false, // TODO: Implement read-only logic based on session state
    showDeleteConfirm,
    setShowDeleteConfirm,
    previousExerciseData,
    collapsedIndexes,
    saveWorkout,
    deleteWorkout,
    enqueue,
    swipeSettings,
    dragState,
    dragHandlers,
    getDisplayOrder,
    toggleExpansion,
    handleSwipeToBottom,
    updateSet,
    toggleUnit,
    addSet,
    deleteSet,
    moveSet,
    buildSavePayload,
    session: session ?? null,
    updatePreferences,
    preferences: userPreferences,
    lastAction,
    undoLastAction,
    setLastAction,
  };
}