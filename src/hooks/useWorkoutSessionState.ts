import { useEffect, useMemo, useState } from "react";
import { type SwipeSettings } from "~/hooks/use-swipe-gestures";
import { useUniversalDragReorder } from "~/hooks/use-universal-drag-reorder";
import { useOfflineSaveQueue } from "~/hooks/use-offline-save-queue";
import { api } from "~/trpc/react";
import { type ExerciseData } from "~/app/_components/exercise-card";
import { type SetData } from "~/app/_components/set-input";

interface PreviousBest {
  weight?: number;
  reps?: number;
  sets?: number;
  unit: "kg" | "lbs";
}

export interface UseWorkoutSessionStateArgs {
  sessionId: number;
}

export function useWorkoutSessionState({ sessionId }: UseWorkoutSessionStateArgs) {
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<number[]>([0]);
  const [loading, setLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previousExerciseData, setPreviousExerciseData] = useState<
    Map<string, { best?: PreviousBest; sets?: SetData[] }>
  >(new Map());
  const [previousDataLoaded, setPreviousDataLoaded] = useState(false);
  const [notification, setNotification] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [collapsedIndexes, setCollapsedIndexes] = useState<number[]>([]);
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

  const utils = api.useUtils();
  const { data: session } = api.workouts.getById.useQuery({ id: sessionId });
  const { data: preferences } = api.preferences.get.useQuery();
  const updatePreferencesMutation = api.preferences.update.useMutation();
  // Strongly type the input using the router's inferred type to avoid union misinference
  type UpdatePrefsInput = { defaultWeightUnit: "kg" | "lbs" };
  const updatePreferences = (input: UpdatePrefsInput) => {
    updatePreferencesMutation.mutate(input as unknown as Parameters<typeof updatePreferencesMutation.mutate>[0]);
  };

  const { enqueue, flush, queueSize, isFlushing } = useOfflineSaveQueue();

  // id generation
  const generateSetId = () => `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // swipe settings
  const swipeSettings: Partial<SwipeSettings> = {
    dismissThreshold: 140,
    velocityThreshold: 4,
    friction: 0.88,
    minimumVelocity: 0.15,
  };

  // display order
  const getDisplayOrder = () =>
    exercises.map((exercise, index) => ({ exercise, originalIndex: index }));

  // drag + reorder
  const displayOrder = useMemo(() => getDisplayOrder(), [exercises]);
  const [dragState, dragHandlers] = useUniversalDragReorder(
    displayOrder,
    (newDisplayOrder) => {
      const newExercises = newDisplayOrder.map((item) => item.exercise);
      setExercises(newExercises);

      // maintain collapsed by identity
      const idFor = (ex: ExerciseData) => ex.templateExerciseId ?? `name:${ex.exerciseName}`;
      const collapsedIdSet = new Set(
        collapsedIndexes
          .map((i) => exercises[i])
          .filter(Boolean)
          .map((ex) => idFor(ex as ExerciseData)),
      );

      const rebuiltCollapsedIndexes: number[] = [];
      newExercises.forEach((ex, idx) => {
        if (collapsedIdSet.has(idFor(ex))) {
          rebuiltCollapsedIndexes.push(idx);
        }
      });
      setCollapsedIndexes(rebuiltCollapsedIndexes);

      // update expanded indices based on identity
      const newExpandedIndexes = expandedExercises
        .map((oldIndex) => {
          const exerciseId = exercises[oldIndex]?.templateExerciseId;
          return newExercises.findIndex((ex) => ex.templateExerciseId === exerciseId);
        })
        .filter((index) => index !== -1);
      setExpandedExercises(newExpandedIndexes);
    },
    (draggedDisplayIndex) => {
      const originalIndex = displayOrder[draggedDisplayIndex]?.originalIndex;
      if (originalIndex !== undefined) {
        setExpandedExercises((prev) => prev.filter((index) => index !== originalIndex));
      }
    }
  );

  const saveWorkout = api.workouts.save.useMutation({
    onMutate: async (newWorkout) => {
      await utils.workouts.getRecent.cancel();
      const previousWorkouts = utils.workouts.getRecent.getData({ limit: 5 });

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
              id: -(exerciseIndex * 100 + setIndex),
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

        utils.workouts.getRecent.setData({ limit: 5 }, (old) =>
          old ? [optimisticWorkout, ...old.slice(0, 4)] : [optimisticWorkout],
        );
      }

      return { previousWorkouts };
    },
    onError: (_err, _newWorkout, context) => {
      if (context?.previousWorkouts) {
        utils.workouts.getRecent.setData({ limit: 5 }, context.previousWorkouts);
      }
    },
    onSettled: () => {
      void utils.workouts.getRecent.invalidate();
    },
  });

  const deleteWorkout = api.workouts.delete.useMutation({
    onMutate: async () => {
      await utils.workouts.getRecent.cancel();
      const previousWorkouts = utils.workouts.getRecent.getData({ limit: 5 });

      utils.workouts.getRecent.setData({ limit: 5 }, (old) =>
        old ? old.filter((workout) => workout.id !== sessionId) : [],
      );

      return { previousWorkouts };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousWorkouts) {
        utils.workouts.getRecent.setData({ limit: 5 }, context.previousWorkouts);
      }
    },
    onSettled: () => {
      void utils.workouts.getRecent.invalidate();
    },
  });

  // previous data loading
  useEffect(() => {
    if (!session?.template || isReadOnly) {
      setPreviousDataLoaded(true);
      return;
    }

    const loadPreviousData = async () => {
      const previousDataMap = new Map();
      for (const templateExercise of session.template.exercises) {
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
          // noop
        }
      }
      setPreviousExerciseData(previousDataMap);
      setPreviousDataLoaded(true);
    };

    void loadPreviousData();
  }, [session?.template, isReadOnly, utils.workouts.getLastExerciseData, sessionId]);

  // session init
  useEffect(() => {
    if (!session?.template || !previousDataLoaded) return;

    if (session.exercises && session.exercises.length > 0) {
      const exerciseGroups = new Map<string, typeof session.exercises>();
      session.exercises.forEach((sessionExercise) => {
        const key = sessionExercise.exerciseName;
        if (!exerciseGroups.has(key)) exerciseGroups.set(key, []);
        exerciseGroups.get(key)!.push(sessionExercise);
      });

      const existingExercises: ExerciseData[] = Array.from(exerciseGroups.entries()).map(
        ([exerciseName, exerciseData]) => {
          exerciseData.sort((a, b) => (a.setOrder ?? 0) - (b.setOrder ?? 0));
          return {
            templateExerciseId: exerciseData[0]?.templateExerciseId ?? undefined,
            exerciseName,
            sets: exerciseData.map((sessionExercise) => ({
              id: `existing-${sessionExercise.id}`,
              weight: sessionExercise.weight ? parseFloat(sessionExercise.weight) : undefined,
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
      setExpandedExercises(existingExercises.map((_, index) => index));
    } else {
      const initialExercises: ExerciseData[] = session.template.exercises.map(
        (templateExercise: { id: number; exerciseName: string }) => {
          const previousData = previousExerciseData.get(templateExercise.exerciseName);
          const defaultUnit = (preferences?.defaultWeightUnit ?? "kg") as "kg" | "lbs";

          let sets: SetData[] = [];
          if (previousData?.sets) {
            sets = previousData.sets.map((prevSet) => ({
              id: generateSetId(),
              weight: prevSet.weight,
              reps: prevSet.reps,
              sets: prevSet.sets,
              unit: prevSet.unit,
            }));
          } else {
            sets = [
              {
                id: generateSetId(),
                weight: undefined,
                reps: undefined,
                sets: 1,
                unit: defaultUnit,
              },
            ];
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

  // auto-progression modal
  useEffect(() => {
    const isNewWorkout = !session?.exercises || session.exercises.length === 0;
    const safeToShowModal = session && !isReadOnly && previousDataLoaded;

    if (!loading && safeToShowModal && isNewWorkout && exercises.length > 0 && !progressionModal && !hasShownAutoProgression) {
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
          setHasShownAutoProgression(true);
          break;
        }
      }
    }
  }, [loading, isReadOnly, exercises, previousExerciseData, progressionModal, hasShownAutoProgression, session, previousDataLoaded]);

  // helpers exposed to component
  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetData, value: string | number | undefined) => {
    const newExercises = [...exercises];
    if (newExercises[exerciseIndex]?.sets[setIndex]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (newExercises[exerciseIndex]!.sets[setIndex] as any)[field] = value;
      setExercises(newExercises);
    }
  };

  const toggleUnit = (exerciseIndex: number, setIndex: number) => {
    const currentUnit = exercises[exerciseIndex]?.sets[setIndex]?.unit ?? "kg";
    const newUnit = currentUnit === "kg" ? "lbs" : "kg";
    updateSet(exerciseIndex, setIndex, "unit", newUnit);
    // preferences mutation expects object shape { defaultWeightUnit }
    updatePreferences({ defaultWeightUnit: (newUnit as unknown) as "kg" | "lbs" });
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
    setExpandedExercises((prev) =>
      prev.includes(exerciseIndex) ? prev.filter((i) => i !== exerciseIndex) : [...prev, exerciseIndex],
    );
  };

  const handleSwipeToBottom = (exerciseIndex: number) => {
    setExercises((prev) => {
      if (exerciseIndex < 0 || exerciseIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(exerciseIndex, 1);
      next.push(item!);
      return next;
    });

    setCollapsedIndexes((prevCollapsed) => {
      const newCollapsed = prevCollapsed.filter((i) => i !== exerciseIndex);
      return [...newCollapsed, -1];
    });

    setExpandedExercises((prev) => prev.filter((idx) => idx !== exerciseIndex));
  };

  const buildSavePayload = () => {
    const cleanedExercises = exercises
      .map((exercise) => ({
        ...exercise,
        sets: exercise.sets
          .filter(
            (set) => set.weight !== undefined || set.reps !== undefined || (set.sets && set.sets > 0),
          )
          .map((set) => ({
            ...set,
            id: set.id ?? `offline-${Math.random().toString(36).slice(2)}`,
            weight: set.weight === null ? undefined : set.weight,
            reps: set.reps === null ? undefined : set.reps,
            sets: set.sets === null ? 1 : set.sets,
          })),
      }))
      .filter((exercise) => exercise.sets.length > 0);

    return {
      sessionId,
      exercises: cleanedExercises,
    };
  };

  return {
    // state
    exercises,
    setExercises,
    expandedExercises,
    setExpandedExercises,
    loading,
    isReadOnly,
    showDeleteConfirm,
    setShowDeleteConfirm,
    previousExerciseData,
    notification,
    setNotification,
    collapsedIndexes,
    progressionModal,
    setProgressionModal,
    hasShownAutoProgression,
    setHasShownAutoProgression,
    progressionScopeModal,
    setProgressionScopeModal,

    // trpc utils and prefs
    utils,
    preferences,

    // mutations and queue
    saveWorkout,
    deleteWorkout,
    enqueue,
    flush,
    queueSize,
    isFlushing,

    // interactions
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
    buildSavePayload,

    // expose updatePreferences for component use where needed
    updatePreferences,
    session,
  };
}
