"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { ExerciseCard, type ExerciseData } from "./exercise-card";
import { type SetData } from "./set-input";
import { ProgressionModal } from "./progression-modal";
import { ProgressionScopeModal } from "./progression-scope-modal";

interface PreviousBest {
  weight?: number;
  reps?: number;
  sets?: number;
  unit: "kg" | "lbs";
}
import { analytics } from "~/lib/analytics";
import { useCacheInvalidation } from "~/hooks/use-cache-invalidation";
import { useUniversalDragReorder } from "~/hooks/use-universal-drag-reorder";
import { type SwipeSettings } from "~/hooks/use-swipe-gestures";

interface WorkoutSessionProps {
  sessionId: number;
}

export function WorkoutSession({ sessionId }: WorkoutSessionProps) {
  const router = useRouter();
  const { onWorkoutSave, invalidateWorkouts } = useCacheInvalidation();
  
  // ===== GESTURE CONTROLS =====
  // 1. DRAG: Drag exercise cards up/down to reorder (desktop & mobile)
  // 2. SWIPE: Swipe exercise cards left/right to move to bottom & collapse
  // 3. Both features work together - swiped exercises can be dragged back up
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<number[]>([0]); // First exercise expanded by default
  const [loading, setLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previousExerciseData, setPreviousExerciseData] = useState<Map<string, { best?: PreviousBest; sets?: SetData[] }>>(new Map());
  const [previousDataLoaded, setPreviousDataLoaded] = useState(false);
  const [notification, setNotification] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [swipedToBottomIndexes, setSwipedToBottomIndexes] = useState<number[]>([]); // Track order of swiped exercises
  const [progressionModal, setProgressionModal] = useState<{
    isOpen: boolean;
    exerciseIndex: number;
    exerciseName: string;
    previousBest: {
      weight?: number;
      reps?: number;
      sets: number;
      unit: "kg" | "lbs";
    };
  } | null>(null);
  const [hasShownAutoProgression, setHasShownAutoProgression] = useState(false);
  const [progressionScopeModal, setProgressionScopeModal] = useState<{
    isOpen: boolean;
    exerciseIndex: number;
    progressionType: "weight" | "reps";
    increment: string;
    previousBest: {
      weight?: number;
      reps?: number;
      sets: number;
      unit: "kg" | "lbs";
    };
  } | null>(null);

  const { data: session } = api.workouts.getById.useQuery({ id: sessionId });
  const { data: preferences } = api.preferences.get.useQuery();
  const { mutate: updatePreferences } = api.preferences.update.useMutation();
  const utils = api.useUtils();

  const saveWorkout = api.workouts.save.useMutation({
    onMutate: async (newWorkout) => {
      // Cancel any outgoing refetches
      await utils.workouts.getRecent.cancel();

      // Snapshot the previous value
      const previousWorkouts = utils.workouts.getRecent.getData({ limit: 5 });

      // Optimistically update the cache
      if (session?.template) {
        const optimisticWorkout = {
          id: sessionId,
          user_id: session.user_id,
          templateId: session.templateId,
          workoutDate: session.workoutDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          template: session.template,
          exercises: newWorkout.exercises.flatMap((exercise, exerciseIndex) =>
            exercise.sets.map((set, setIndex) => ({
              id: -(exerciseIndex * 100 + setIndex), // Temporary negative ID
              user_id: session.user_id,
              sessionId: sessionId,
              templateExerciseId: exercise.templateExerciseId ?? null,
              exerciseName: exercise.exerciseName,
              setOrder: setIndex,
              weight: set.weight?.toString() ?? null,
              reps: set.reps ?? null,
              sets: set.sets ?? null,
              unit: set.unit as string,
              createdAt: new Date(),
            }))
          ),
        };

        // Add to the beginning of recent workouts
        utils.workouts.getRecent.setData({ limit: 5 }, (old) =>
          old
            ? [optimisticWorkout, ...old.slice(0, 4)]
            : [optimisticWorkout],
        );
      }

      return { previousWorkouts };
    },
    onError: (err, newWorkout, context) => {
      // Rollback on error
      if (context?.previousWorkouts) {
        utils.workouts.getRecent.setData(
          { limit: 5 },
          context.previousWorkouts,
        );
      }
    },
    onSuccess: () => {
      // Track workout completion
      const duration = session?.workoutDate
        ? Math.round(
            (Date.now() - new Date(session.workoutDate).getTime()) / 1000 / 60,
          )
        : 0;
      const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
      analytics.workoutCompleted(
        sessionId.toString(),
        duration,
        totalSets,
      );

      // Comprehensive cache invalidation for workout save
      onWorkoutSave();

      // Navigate immediately since we've already updated the cache optimistically
      router.push("/");
    },
    onSettled: () => {
      // Always refetch to ensure we have the latest data
      void utils.workouts.getRecent.invalidate();
    },
  });

  const deleteWorkout = api.workouts.delete.useMutation({
    onMutate: async () => {
      // Cancel any outgoing refetches
      await utils.workouts.getRecent.cancel();

      // Snapshot the previous value
      const previousWorkouts = utils.workouts.getRecent.getData({ limit: 5 });

      // Optimistically remove from cache
      utils.workouts.getRecent.setData({ limit: 5 }, (old) =>
        old ? old.filter((workout) => workout.id !== sessionId) : [],
      );

      return { previousWorkouts };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousWorkouts) {
        utils.workouts.getRecent.setData(
          { limit: 5 },
          context.previousWorkouts,
        );
      }
    },
    onSuccess: () => {
      // Comprehensive cache invalidation for workout deletion
      invalidateWorkouts();
      
      // Navigate back to home
      router.push("/");
    },
    onSettled: () => {
      // Always refetch to ensure we have the latest data
      void utils.workouts.getRecent.invalidate();
    },
  });

  // Generate unique ID for sets
  const generateSetId = () => `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Swipe settings for all exercise cards - adjusted for slower, more controlled feel
  const swipeSettings: Partial<SwipeSettings> = {
    dismissThreshold: 140,    // Distance in pixels to trigger swipe-to-bottom (increased for slower activation)
    velocityThreshold: 4,     // Speed threshold for momentum dismissal (reduced for less aggressive)
    friction: 0.88,           // Momentum decay (reduced for quicker deceleration)
    minimumVelocity: 0.15,    // Minimum speed to start momentum animation (reduced for gentler start)
  };

  // Get the display order of exercises (normal exercises first, then swiped to bottom)
  const getDisplayOrder = () => {
    const normalExercises: { exercise: ExerciseData; originalIndex: number }[] = [];
    const swipedExercises: { exercise: ExerciseData; originalIndex: number }[] = [];

    exercises.forEach((exercise, index) => {
      if (swipedToBottomIndexes.includes(index)) {
        swipedExercises.push({ exercise, originalIndex: index });
      } else {
        normalExercises.push({ exercise, originalIndex: index });
      }
    });

    // Sort swiped exercises by the order they were swiped (last swiped goes to bottom)
    swipedExercises.sort((a, b) => {
      const aSwipeOrder = swipedToBottomIndexes.indexOf(a.originalIndex);
      const bSwipeOrder = swipedToBottomIndexes.indexOf(b.originalIndex);
      return aSwipeOrder - bSwipeOrder;
    });

    return [...normalExercises, ...swipedExercises];
  };

  // Universal drag and drop functionality - works on both mobile and desktop
  const displayOrder = getDisplayOrder();
  const [dragState, dragHandlers] = useUniversalDragReorder(
    displayOrder,
    (newDisplayOrder) => {
      // Reconstruct exercises array and swiped state from new display order
      const newExercises = newDisplayOrder.map(item => item.exercise);
      setExercises(newExercises);
      
      // New approach: Only keep exercises swiped if they're still in swiped positions
      // Don't force section sizes - let them be dynamic based on user intent
      const newSwipedIndexes: number[] = [];
      
      // Find where swiped exercises naturally cluster at the bottom
      // An exercise should be swiped if:
      // 1. It was swiped before AND hasn't been moved to the top area, OR
      // 2. It's a normal exercise that was moved to the bottom area
      
      // Find the natural clustering point - where swiped exercises start to appear
      let swipedClusterStart = newDisplayOrder.length;
      for (let i = newDisplayOrder.length - 1; i >= 0; i--) {
        const item = newDisplayOrder[i];
        const wasSwipedBefore = swipedToBottomIndexes.includes(item!.originalIndex);
        
        if (wasSwipedBefore) {
          swipedClusterStart = i;
        } else {
          // If we hit a non-swiped exercise, stop looking backwards
          break;
        }
      }
      
      // Only exercises from the cluster start to the end should be swiped
      // This prevents arbitrary exercises from being forced into swiped state
      for (let i = swipedClusterStart; i < newDisplayOrder.length; i++) {
        const item = newDisplayOrder[i];
        const wasSwipedBefore = swipedToBottomIndexes.includes(item!.originalIndex);
        
        // Keep it swiped only if it was swiped before and is still in the bottom cluster
        if (wasSwipedBefore) {
          newSwipedIndexes.push(i);
        }
      }
      
      setSwipedToBottomIndexes(newSwipedIndexes);
      
      // Update expanded exercises indices based on the new exercise order
      const newExpandedIndexes = expandedExercises.map(oldIndex => {
        const exerciseId = exercises[oldIndex]?.templateExerciseId;
        return newExercises.findIndex(ex => ex.templateExerciseId === exerciseId);
      }).filter(index => index !== -1);
      setExpandedExercises(newExpandedIndexes);
    },
    (draggedDisplayIndex) => {
      // Collapse the dragged exercise when starting drag
      const originalIndex = displayOrder[draggedDisplayIndex]?.originalIndex;
      if (originalIndex !== undefined) {
        setExpandedExercises(prev => prev.filter(index => index !== originalIndex));
      }
    }
  );

  // Load previous exercise data for all exercises
  useEffect(() => {
    if (!session?.template || isReadOnly) {
      setPreviousDataLoaded(true);
      return;
    }

    const loadPreviousData = async () => {
      const previousDataMap = new Map();
      
      for (const templateExercise of session.template.exercises) {
        try {
          // Always use getLastExerciseData to get ALL sets from previous workout
          try {
            const data = await utils.workouts.getLastExerciseData.fetch({
              exerciseName: templateExercise.exerciseName,
              excludeSessionId: sessionId,
              templateExerciseId: templateExercise.id,
            });
            if (data) {
              previousDataMap.set(templateExercise.exerciseName, data);
            }
          } catch (error) {
            console.error(`Failed to load previous data for ${templateExercise.exerciseName}:`, error);
          }
        } catch (error) {
          console.error(`Failed to load previous data for ${templateExercise.exerciseName}:`, error);
        }
      }
      setPreviousExerciseData(previousDataMap);
      setPreviousDataLoaded(true);
    };

    void loadPreviousData();
  }, [session?.template, isReadOnly, utils.workouts.getLastExerciseData, utils.workouts.getLatestPerformanceForTemplateExercise]);

  // Initialize exercises from template or existing session data
  useEffect(() => {
    if (!session?.template || !previousDataLoaded) return;

    // Check if this session already has exercises (completed workout)
    if (session.exercises && session.exercises.length > 0) {
      // This is a completed workout, show existing data
      // Group exercises by name and setOrder
      const exerciseGroups = new Map<string, typeof session.exercises>();
      
      session.exercises.forEach((sessionExercise) => {
        const key = sessionExercise.exerciseName;
        if (!exerciseGroups.has(key)) {
          exerciseGroups.set(key, []);
        }
        exerciseGroups.get(key)!.push(sessionExercise);
      });

      const existingExercises: ExerciseData[] = Array.from(exerciseGroups.entries()).map(
        ([exerciseName, exerciseData]) => {
          // Sort by setOrder
          exerciseData.sort((a, b) => (a.setOrder ?? 0) - (b.setOrder ?? 0));
          
          return {
            templateExerciseId: exerciseData[0]?.templateExerciseId ?? undefined,
            exerciseName,
            sets: exerciseData.map((sessionExercise, _index) => ({
              id: `existing-${sessionExercise.id}`,
              weight: sessionExercise.weight
                ? parseFloat(sessionExercise.weight)
                : undefined,
              reps: sessionExercise.reps ?? undefined,
              sets: sessionExercise.sets ?? 1,
              unit: (sessionExercise.unit as "kg" | "lbs") ?? "kg",
            })),
            unit: (exerciseData[0]?.unit as "kg" | "lbs") ?? "kg",
          };
        }
      );
      
      setExercises(existingExercises);
      setIsReadOnly(true);
      // Expand all exercises in read-only mode
      setExpandedExercises(existingExercises.map((_, index) => index));
    } else {
      // This is a new session, initialize from template
      const initialExercises: ExerciseData[] = session.template.exercises.map(
        (templateExercise: { id: number; exerciseName: string }) => {
          const previousData = previousExerciseData.get(templateExercise.exerciseName);
          const defaultUnit = (preferences?.defaultWeightUnit ?? "kg") as "kg" | "lbs";
          
          // Create sets based on previous workout or default to one empty set
          let sets: SetData[] = [];
          
          if (previousData?.sets) {
            // Create sets from previous workout data (no automatic progression)
            sets = previousData.sets.map((prevSet) => ({
              id: generateSetId(),
              weight: prevSet.weight,
              reps: prevSet.reps,
              sets: prevSet.sets,
              unit: prevSet.unit,
            }));
          } else {
            // No previous data, create one empty set
            sets = [{
              id: generateSetId(),
              weight: undefined,
              reps: undefined,
              sets: 1,
              unit: defaultUnit,
            }];
          }

          return {
            templateExerciseId: templateExercise.id,
            exerciseName: templateExercise.exerciseName,
            sets,
            unit: defaultUnit,
          };
        },
      );
      setExercises(initialExercises);
      setIsReadOnly(false);
    }

    setLoading(false);
  }, [session?.template, session?.exercises, preferences?.defaultWeightUnit, previousExerciseData, previousDataLoaded]);

  // Auto-show progression modal for first exercise with previous data
  useEffect(() => {
    // Only show for new workouts (no existing exercises in session)
    const isNewWorkout = !session?.exercises || session.exercises.length === 0;
    
    // Additional safety checks to prevent race conditions:
    // 1. Session must be fully loaded
    // 2. Must not be read-only (which gets set after session data loads)
    // 3. Previous data must be loaded (to avoid showing modal before we know if there's previous data)
    const safeToShowModal = session && !isReadOnly && previousDataLoaded;
    
    if (!loading && safeToShowModal && isNewWorkout && exercises.length > 0 && !progressionModal && !hasShownAutoProgression) {
      // Find first exercise with previous best performance
      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];
        const previousData = previousExerciseData.get(exercise?.exerciseName ?? "");
        
        if (exercise && previousData?.best && previousData.best.weight && previousData.best.sets) {
          setProgressionModal({
            isOpen: true,
            exerciseIndex: i,
            exerciseName: exercise.exerciseName,
            previousBest: {
              weight: previousData.best.weight,
              reps: previousData.best.reps,
              sets: previousData.best.sets,
              unit: previousData.best.unit,
            },
          });
          setHasShownAutoProgression(true); // Prevent showing again
          break; // Only show for first exercise with data
        }
      }
    }
  }, [loading, isReadOnly, exercises, previousExerciseData, progressionModal, hasShownAutoProgression, session, previousDataLoaded]);

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetData,
    value: string | number | undefined,
  ) => {
    const newExercises = [...exercises];
    if (newExercises[exerciseIndex]?.sets[setIndex]) {
      // Type assertion is safe here since we're controlling the field and value types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (newExercises[exerciseIndex]!.sets[setIndex] as any)[field] = value;
      setExercises(newExercises);
    }
  };

  const toggleUnit = (exerciseIndex: number, setIndex: number) => {
    const currentUnit = exercises[exerciseIndex]?.sets[setIndex]?.unit ?? "kg";
    const newUnit = currentUnit === "kg" ? "lbs" : "kg";
    updateSet(exerciseIndex, setIndex, "unit", newUnit);

    // Update user preference
    updatePreferences({ defaultWeightUnit: newUnit });
  };

  const addSet = (exerciseIndex: number) => {
    const newExercises = [...exercises];
    const exercise = newExercises[exerciseIndex];
    if (exercise) {
      const lastSet = exercise.sets[exercise.sets.length - 1];
      const newSet: SetData = {
        id: generateSetId(),
        weight: undefined,
        reps: undefined,
        sets: 1,
        unit: lastSet?.unit ?? exercise.unit,
      };
      exercise.sets.push(newSet);
      setExercises(newExercises);
    }
  };

  const deleteSet = (exerciseIndex: number, setIndex: number) => {
    const newExercises = [...exercises];
    const exercise = newExercises[exerciseIndex];
    if (exercise && exercise.sets.length > 1) {
      exercise.sets.splice(setIndex, 1);
      setExercises(newExercises);
    }
  };

  const toggleExpansion = (exerciseIndex: number) => {
    // Normal expansion/collapse behavior
    setExpandedExercises(prev => 
      prev.includes(exerciseIndex) 
        ? prev.filter(i => i !== exerciseIndex)
        : [...prev, exerciseIndex]
    );
  };

  const handleSwipeToBottom = (exerciseIndex: number) => {
    setSwipedToBottomIndexes(prev => {
      // Remove from previous position if already swiped
      const filtered = prev.filter(index => index !== exerciseIndex);
      // Add to the end (last swiped goes to bottom)
      return [...filtered, exerciseIndex];
    });
    
    // Collapse the swiped exercise
    setExpandedExercises(prev => prev.filter(index => index !== exerciseIndex));
  };

  const handleProgressionChoice = (type: "weight" | "reps" | "none") => {
    if (!progressionModal) {
      return;
    }
    
    const { exerciseIndex, previousBest } = progressionModal;
    
    if (type === "none") {
      // No progression, just expand and close
      setExpandedExercises(prev => {
        if (!prev.includes(exerciseIndex)) {
          return [...prev, exerciseIndex];
        }
        return prev;
      });
      setProgressionModal(null);
      return;
    }
    
    // For weight/reps progression, show scope selection modal
    const increment = type === "weight" 
      ? `+${previousBest.unit === "kg" ? "2.5" : "5"}${previousBest.unit}`
      : "+1 rep";
    
    setProgressionScopeModal({
      isOpen: true,
      exerciseIndex,
      progressionType: type,
      increment,
      previousBest,
    });
    
    // Close first modal
    setProgressionModal(null);
  };

  const applyProgressionToAll = () => {
    if (!progressionScopeModal) return;
    
    const { exerciseIndex, progressionType, previousBest } = progressionScopeModal;
    
    setExercises(prev => {
      const newExercises = [...prev];
      const exercise = newExercises[exerciseIndex];
      
      if (exercise) {
        // Apply progression to ALL sets
        exercise.sets = exercise.sets.map(set => {
          const updatedSet = { ...set };
          
          if (progressionType === "weight" && updatedSet.weight) {
            const increment = updatedSet.unit === "kg" ? 2.5 : 5;
            updatedSet.weight += increment;
          } else if (progressionType === "reps" && updatedSet.reps) {
            updatedSet.reps += 1;
          }
          
          return updatedSet;
        });
      }
      
      return newExercises;
    });
    
    // Expand the exercise
    setExpandedExercises(prev => {
      if (!prev.includes(exerciseIndex)) {
        return [...prev, exerciseIndex];
      }
      return prev;
    });
  };

  const applyProgressionToHighest = () => {
    if (!progressionScopeModal) return;
    
    const { exerciseIndex, progressionType, previousBest } = progressionScopeModal;
    
    setExercises(prev => {
      const newExercises = [...prev];
      const exercise = newExercises[exerciseIndex];
      
      if (exercise) {
        // Find the set that matches the previous best performance
        const bestSetIndex = exercise.sets.findIndex(set => 
          set.weight === previousBest.weight &&
          set.reps === previousBest.reps &&
          set.sets === previousBest.sets
        );
        
        if (bestSetIndex !== -1) {
          const updatedSet = { ...exercise.sets[bestSetIndex]! };
          
          if (progressionType === "weight" && updatedSet.weight) {
            const increment = updatedSet.unit === "kg" ? 2.5 : 5;
            updatedSet.weight += increment;
          } else if (progressionType === "reps" && updatedSet.reps) {
            updatedSet.reps += 1;
          }
          
          exercise.sets[bestSetIndex] = updatedSet;
        }
      }
      
      return newExercises;
    });
    
    // Expand the exercise
    setExpandedExercises(prev => {
      if (!prev.includes(exerciseIndex)) {
        return [...prev, exerciseIndex];
      }
      return prev;
    });
  };

  const handleSave = async () => {
    // Validate that exercises have required data
    const validationErrors: string[] = [];
    
    exercises.forEach((exercise, exerciseIndex) => {
      exercise.sets.forEach((set, setIndex) => {
        const hasData = set.weight !== undefined || set.reps !== undefined || (set.sets && set.sets > 0);
        
        if (hasData) {
          // If the set has some data, validate that numeric fields are proper numbers
          if (set.weight !== undefined && (set.weight === null || isNaN(set.weight))) {
            validationErrors.push(`${exercise.exerciseName}, Set ${setIndex + 1}: Weight must be a valid number`);
          }
          if (set.reps !== undefined && (set.reps === null || isNaN(set.reps) || set.reps <= 0)) {
            validationErrors.push(`${exercise.exerciseName}, Set ${setIndex + 1}: Reps must be a valid positive number`);
          }
          if (set.sets !== undefined && (set.sets === null || isNaN(set.sets) || set.sets <= 0)) {
            validationErrors.push(`${exercise.exerciseName}, Set ${setIndex + 1}: Sets must be a valid positive number`);
          }
        }
      });
    });

    if (validationErrors.length > 0) {
      setNotification({
        type: "error",
        message: `Please fix the following errors before saving:\n${validationErrors.join('\n')}`
      });
      setTimeout(() => setNotification(null), 8000); // Auto-dismiss after 8 seconds
      return;
    }

    try {
      // Clean the data before sending to API - convert null to undefined and filter out empty sets
      const cleanedExercises = exercises
        .map(exercise => ({
          ...exercise,
          sets: exercise.sets
            .filter(set => set.weight !== undefined || set.reps !== undefined || (set.sets && set.sets > 0))
            .map(set => ({
              ...set,
              weight: set.weight === null ? undefined : set.weight,
              reps: set.reps === null ? undefined : set.reps,
              sets: set.sets === null ? 1 : set.sets,
            }))
        }))
        .filter(exercise => exercise.sets.length > 0);

      await saveWorkout.mutateAsync({
        sessionId,
        exercises: cleanedExercises,
      });
      
      // Show success notification briefly before navigation
      setNotification({
        type: "success",
        message: "Workout saved successfully!"
      });
    } catch (error) {
      console.error("Error saving workout:", error);
      analytics.error(error as Error, {
        context: "workout_save",
        sessionId: sessionId.toString(),
      });
      
      // Check if it's a validation error
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as Error).message;
        if (errorMessage.includes('Expected number, received null') || errorMessage.includes('invalid_type')) {
          setNotification({
            type: "error",
            message: "Please make sure all exercise fields are properly filled out. Empty fields should be left blank, not contain invalid values."
          });
        } else {
          setNotification({
            type: "error",
            message: `Error saving workout: ${errorMessage}`
          });
        }
      } else {
        setNotification({
          type: "error",
          message: "Error saving workout. Please try again."
        });
      }
      setTimeout(() => setNotification(null), 6000); // Auto-dismiss after 6 seconds
    }
  };

  const handleDelete = async () => {
    try {
      await deleteWorkout.mutateAsync({ id: sessionId });
    } catch (error) {
      console.error("Error deleting workout:", error);
      analytics.error(error as Error, {
        context: "workout_delete",
        sessionId: sessionId.toString(),
      });
      alert("Error deleting workout. Please try again.");
    }
  };

  if (loading || !session) {
    return (
      <div className="space-y-4">
        {[...(Array(3) as number[])].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg bg-gray-800 p-4">
            <div className="mb-4 h-4 w-1/2 rounded bg-gray-700"></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="h-10 rounded bg-gray-700"></div>
              <div className="h-10 rounded bg-gray-700"></div>
              <div className="h-10 rounded bg-gray-700"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Notification */}
      {notification && (
        <div className={`sticky top-4 z-50 rounded-lg p-4 shadow-lg ${
          notification.type === "error" 
            ? "bg-red-900 border border-red-700 text-red-100" 
            : "bg-green-900 border border-green-700 text-green-100"
        }`}>
          <div className="flex items-center justify-between">
            <div className="whitespace-pre-line">{notification.message}</div>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-lg font-bold opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Gesture Help (only show if not read-only and has exercises) */}
      {!isReadOnly && exercises.length > 0 && (
        <div className="text-center text-sm text-gray-500 mb-2">
          💡 <strong>Tip:</strong> Swipe ← → to move to bottom • Drag ↕ to reorder & move between sections • Works on mobile & desktop
        </div>
      )}

      {/* Exercise Cards */}
      {getDisplayOrder().map(({ exercise, originalIndex }, displayIndex) => {
        const isSwiped = swipedToBottomIndexes.includes(originalIndex);
        const prevExercise = getDisplayOrder()[displayIndex - 1];
        const isFirstSwipedExercise = isSwiped && displayIndex > 0 && prevExercise && !swipedToBottomIndexes.includes(prevExercise.originalIndex);

        
        return (
          <div key={exercise.templateExerciseId ?? originalIndex}>
            {/* Swiped Exercises Section Header */}
            {isFirstSwipedExercise && (
              <div className="flex items-center gap-3 py-4">
                <div className="flex-1 h-px bg-gray-600"></div>
                <span className="text-sm text-gray-400 font-medium">Swiped Exercises</span>
                <div className="flex-1 h-px bg-gray-600"></div>
              </div>
            )}
            
            <ExerciseCard
            exercise={exercise}
            exerciseIndex={originalIndex}
            onUpdate={updateSet}
            onToggleUnit={toggleUnit}
            onAddSet={addSet}
            onDeleteSet={deleteSet}
            isExpanded={!isSwiped && expandedExercises.includes(originalIndex)}
            onToggleExpansion={toggleExpansion}
            previousBest={previousExerciseData.get(exercise.exerciseName)?.best}
            previousSets={previousExerciseData.get(exercise.exerciseName)?.sets}
            readOnly={isReadOnly}
            onSwipeToBottom={handleSwipeToBottom}
            swipeSettings={swipeSettings}
            isSwiped={isSwiped}
            draggable={!isReadOnly}
            isDraggedOver={dragState.dragOverIndex === displayIndex || dragState.dragOverIndex === displayIndex + 1}
            isDragging={dragState.isDragging && dragState.draggedIndex === displayIndex}
            dragOffset={dragState.dragOffset}
            onPointerDown={dragHandlers.onPointerDown(displayIndex)}
            setCardElement={(element) => dragHandlers.setCardElement?.(displayIndex, element)}
            />
          </div>
        );
      })}

      {/* No Exercises State */}
      {exercises.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-gray-400">No exercises in this template</p>
        </div>
      )}

      {/* Save Button - only show for new workouts */}
      {!isReadOnly && (
        <div className="sticky bottom-4 space-y-3 pt-6">
          <button
            onClick={handleSave}
            disabled={saveWorkout.isPending}
            className="w-full rounded-lg bg-purple-600 py-3 text-lg font-medium transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {saveWorkout.isPending ? "Saving..." : "Save Workout"}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteWorkout.isPending}
            className="w-full rounded-lg bg-red-600 py-3 text-lg font-medium transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {deleteWorkout.isPending ? "Deleting..." : "Delete Workout"}
          </button>
        </div>
      )}

      {/* Read-only Actions */}
      {isReadOnly && (
        <div className="sticky bottom-4 space-y-3 pt-6">
          <Link
            href={`/workout/start?templateId=${session?.templateId}`}
            className="block w-full rounded-lg bg-purple-600 py-3 text-center text-lg font-medium transition-colors hover:bg-purple-700"
          >
            Repeat This Workout
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteWorkout.isPending}
            className="w-full rounded-lg bg-red-600 py-3 text-lg font-medium transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {deleteWorkout.isPending ? "Deleting..." : "Delete Workout"}
          </button>
          <button
            onClick={() => router.back()}
            className="w-full rounded-lg bg-gray-700 py-3 text-lg font-medium transition-colors hover:bg-gray-600"
          >
            Back to History
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="bg-opacity-75 fixed inset-0 z-[9999] flex items-center justify-center bg-black p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-bold text-red-400">
              ⚠️ Delete Workout
            </h3>
            <p className="mb-6 leading-relaxed text-gray-300">
              Are you sure you want to delete this workout?
              <br />
              <strong className="text-red-400">
                This action cannot be undone.
              </strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg bg-gray-600 py-3 font-medium text-white transition-colors hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  void handleDelete();
                }}
                disabled={deleteWorkout.isPending}
                className="flex-1 rounded-lg bg-red-600 py-3 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleteWorkout.isPending ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progression Modal */}
      {progressionModal && (
        <ProgressionModal
          isOpen={progressionModal.isOpen}
          onClose={() => setProgressionModal(null)}
          exerciseName={progressionModal.exerciseName}
          previousBest={progressionModal.previousBest}
          onApplyProgression={handleProgressionChoice}
        />
      )}

      {/* Progression Scope Modal */}
      {progressionScopeModal && (
        <ProgressionScopeModal
          isOpen={progressionScopeModal.isOpen}
          onClose={() => setProgressionScopeModal(null)}
          progressionType={progressionScopeModal.progressionType}
          increment={progressionScopeModal.increment}
          onApplyToAll={applyProgressionToAll}
          onApplyToHighest={applyProgressionToHighest}
        />
      )}
    </div>
  );
}
