import { useEffect, useMemo, useState, useRef } from "react";
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
  // Track last reversible action for persistent Undo behavior
  type HistoryAction =
    | {
        type: "swipeToEnd";
        exerciseId: string;
        fromIndex: number;
        toIndex: number;
      }
    | {
        type: "toggleCollapse";
        exerciseId: string;
        previousExpanded: boolean;
      }
    | {
        type: "dragReorder";
        previousOrder: Array<{ name: string; templateExerciseId?: number }>;
      }
    | {
        type: "addSet";
        exerciseIndex: number;
        newSetId: string;
      }
    | {
        type: "deleteSet";
        exerciseIndex: number;
        deletedSet: { index: number; data: SetData };
      }
    | {
        type: "toggleUnit";
        exerciseIndex: number;
        setIndex: number;
        previousUnit: "kg" | "lbs";
      }
    | {
        type: "editSetFields";
        exerciseIndex: number;
        setIndex: number;
        before: Partial<SetData>;
        after: Partial<SetData>;
      };

  const [lastAction, setLastAction] = useState<HistoryAction | null>(null);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
  const REDO_LIMIT = 30;
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
  // Phase 3: allow asymmetric thresholds via preferences (future: per-direction)
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
      // Capture previous order for Undo
      const prevOrder = exercises.map((ex) => ({ name: ex.exerciseName, templateExerciseId: ex.templateExerciseId }));
      const newExercises = newDisplayOrder.map((item) => item.exercise);
      setExercises(newExercises);

      // record undo action
      setLastAction({
        type: "dragReorder",
        previousOrder: prevOrder,
      });

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
          // Phase 3 telemetry fields with safe defaults to match cache type
          theme_used: (session as any).theme_used ?? null,
          device_type: (session as any).device_type ?? null,
          perf_metrics: (session as any).perf_metrics ?? null,
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
              // Provide Phase 2 nullable fields to satisfy cache type
              rpe: null as unknown as number | null,
              rest_seconds: null as unknown as number | null,
              is_estimate: false,
              is_default_applied: false,
              createdAt: new Date(),
            }))
          ),
        } as const;

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

  // Undo handlers to be used by the component (define before return so it exists)
  const undoLastAction = () => {
    if (!lastAction) return;

    // Push to redo stack
    setRedoStack((prev) => {
      const next = [lastAction, ...prev];
      return next.slice(0, REDO_LIMIT);
    });

    if (lastAction.type === "swipeToEnd") {
      // Move the exercise back to original index
      setExercises((prev) => {
        const idFor = (ex: ExerciseData) => (ex.templateExerciseId ?? `name:${ex.exerciseName}`).toString();
        const srcIndex = prev.findIndex((ex) => idFor(ex) === lastAction.exerciseId);
        if (srcIndex === -1) return prev;
        const next = [...prev];
        const [item] = next.splice(srcIndex, 1);
        next.splice(lastAction.fromIndex, 0, item!);
        return next;
      });
      // Also clear collapsed flag for correctness
      setCollapsedIndexes((prevCollapsed) => prevCollapsed.filter((i) => i !== -1));
    } else if (lastAction.type === "toggleCollapse") {
      // Restore previous expanded state
      setExpandedExercises((prev) => {
        const exerciseIndex = exercises.findIndex(
          (ex) => (ex.templateExerciseId ?? `name:${ex.exerciseName}`).toString() === lastAction.exerciseId,
        );
        if (exerciseIndex === -1) return prev;
        const isCurrentlyExpanded = prev.includes(exerciseIndex);
        if (lastAction.previousExpanded && !isCurrentlyExpanded) {
          return [...prev, exerciseIndex];
        }
        if (!lastAction.previousExpanded && isCurrentlyExpanded) {
          return prev.filter((i) => i !== exerciseIndex);
        }
        return prev;
      });
    } else if (lastAction.type === "dragReorder") {
      // Restore previous order based on identity
      setExercises((prev) => {
        const idFor = (ex: ExerciseData) => (ex.templateExerciseId ?? `name:${ex.exerciseName}`).toString();
        const byId = new Map(prev.map((ex) => [idFor(ex), ex]));
        const restored: ExerciseData[] = [];
        for (const item of lastAction.previousOrder) {
          const key = (item.templateExerciseId ?? `name:${item.name}`).toString();
          const ex = byId.get(key);
          if (ex) restored.push(ex);
        }
        // Include any extras that might have been added (safety)
        for (const ex of prev) {
          const key = idFor(ex);
          if (!restored.find((r) => idFor(r) === key)) restored.push(ex);
        }
        return restored;
      });
    } else if (lastAction.type === "addSet") {
      // Remove the set that was just added
      setExercises((prev) => {
        const next = [...prev];
        const ex = next[lastAction.exerciseIndex];
        if (!ex) return prev;
        const idx = ex.sets.findIndex((s) => s.id === lastAction.newSetId);
        if (idx !== -1) {
          ex.sets.splice(idx, 1);
        }
        return next;
      });
    } else if (lastAction.type === "deleteSet") {
      // Reinsert the deleted set at its original position
      setExercises((prev) => {
        const next = [...prev];
        const ex = next[lastAction.exerciseIndex];
        if (!ex) return prev;
        const insertAt = Math.min(Math.max(0, lastAction.deletedSet.index), ex.sets.length);
        ex.sets.splice(insertAt, 0, lastAction.deletedSet.data);
        return next;
      });
    } else if (lastAction.type === "toggleUnit") {
      // Restore previous unit
      setExercises((prev) => {
        const next = [...prev];
        const ex = next[lastAction.exerciseIndex];
        if (!ex) return prev;
        const s = ex.sets[lastAction.setIndex];
        if (!s) return prev;
        s.unit = lastAction.previousUnit;
        return next;
      });
    } else if (lastAction.type === "editSetFields") {
      // Restore previous field values
      setExercises((prev) => {
        const next = [...prev];
        const ex = next[lastAction.exerciseIndex];
        if (!ex) return prev;
        const s = ex.sets[lastAction.setIndex];
        if (!s) return prev;
        Object.assign(s, lastAction.before);
        return next;
      });
    }

    // Clear last action after undo
    setLastAction(null);
  };

  // DEBUG helpers
  const debugLog = (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.log("[WorkoutSessionState]", ...args);
  };

  // Action dedupe flags (same-tick guard)
  const addSetInFlightRef = useRef(false);
  const deleteSetInFlightRef = useRef(false);

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetData, value: string | number | undefined) => {
    debugLog("updateSet:start", { exerciseIndex, setIndex, field, value, len: exercises[exerciseIndex]?.sets.length });
    const newExercises = [...exercises];
    const target = newExercises[exerciseIndex]?.sets[setIndex];
    if (target) {
      const before: Partial<SetData> = { [field]: target[field] } as Partial<SetData>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (target as any)[field] = value;
      const after: Partial<SetData> = { [field]: value } as Partial<SetData>;
      setExercises(newExercises);
      debugLog("updateSet:applied", { exerciseIndex, setIndex, field, before, after });
      // push history
      setLastAction({
        type: "editSetFields",
        exerciseIndex,
        setIndex,
        before,
        after,
      });
      // clear redo on new action
      setRedoStack([]);
    }
  };

  const toggleUnit = (exerciseIndex: number, setIndex: number) => {
    const currentUnit = exercises[exerciseIndex]?.sets[setIndex]?.unit ?? "kg";
    const newUnit = currentUnit === "kg" ? "lbs" : "kg";
    // record explicit toggle action for precise undo
    setLastAction({
      type: "toggleUnit",
      exerciseIndex,
      setIndex,
      previousUnit: currentUnit as "kg" | "lbs",
    });
    setRedoStack([]);
    updateSet(exerciseIndex, setIndex, "unit", newUnit);
    // preferences mutation expects object shape { defaultWeightUnit }
    updatePreferences({ defaultWeightUnit: (newUnit as unknown) as "kg" | "lbs" });
  };

  const addSet = (exerciseIndex: number) => {
    if (addSetInFlightRef.current) {
      debugLog("addSet:suppressedDuplicate", { exerciseIndex });
      return;
    }
    addSetInFlightRef.current = true;
    debugLog("addSet:start", { exerciseIndex });
    setExercises((prev) => {
      const next = [...prev];
      const exercise = next[exerciseIndex];
      if (!exercise) return prev;

      const lastSet = exercise.sets[exercise.sets.length - 1];

      // Phase 3: Predictive defaults engine (simple strategy v1)
      const predictiveEnabled = (preferences as any)?.predictive_defaults_enabled === true;

      // Determine base values
      let nextWeight: number | undefined = undefined;
      let nextReps: number | undefined = undefined;
      let nextSetsCount: number | undefined = 1;
      const unitToUse = (lastSet?.unit ?? exercise.unit) as "kg" | "lbs";

      if (predictiveEnabled) {
        const recent = [...exercise.sets].reverse().find(s => (s.weight ?? s.reps ?? s.sets) !== undefined);
        if (recent) {
          nextWeight = recent.weight;
          nextReps = recent.reps;
          nextSetsCount = recent.sets ?? 1;
        }
      }

      const newId = generateSetId();
      const newSet: SetData = {
        id: newId,
        weight: nextWeight,
        reps: nextReps,
        sets: nextSetsCount,
        unit: unitToUse,
      };

      // Replace sets array reference to force reconciliation
      const beforeIds = exercise.sets.map(s => s.id);
      exercise.sets = [...exercise.sets, newSet];
      const afterIds = exercise.sets.map(s => s.id);

      debugLog("addSet:added", { exerciseIndex, newId, beforeIds, afterIds, totalSets: exercise.sets.length });
      setLastAction({ type: "addSet", exerciseIndex, newSetId: newId });
      setRedoStack([]);

      return next;
    });
    // Release guard after a short delay to prevent rapid double-clicks
    setTimeout(() => { addSetInFlightRef.current = false; }, 150);
  };

  const deleteSet = (exerciseIndex: number, setIndex: number) => {
    if (deleteSetInFlightRef.current) {
      debugLog("deleteSet:suppressedDuplicate", { exerciseIndex, setIndex });
      return;
    }
    deleteSetInFlightRef.current = true;

    debugLog("deleteSet:click", { exerciseIndex, setIndex, lenBefore: exercises[exerciseIndex]?.sets.length });
    setExercises((prev) => {
      const next = [...prev];
      const exercise = next[exerciseIndex];
      if (!exercise) {
        debugLog("deleteSet:exerciseNotFound", { exerciseIndex });
        return prev;
      }
      if (exercise.sets.length === 0) {
        debugLog("deleteSet:noSets", { exerciseIndex });
        return prev;
      }
      // Defensive clamp of index to current bounds
      const clampedIndex = Math.max(0, Math.min(setIndex, exercise.sets.length - 1));
      const removed = exercise.sets[clampedIndex];
      if (!removed) {
        debugLog("deleteSet:setNotFound", { exerciseIndex, setIndex });
        return prev;
      }
      const beforeIds = exercise.sets.map((s) => s.id);
      exercise.sets = exercise.sets.filter((_, i) => i !== clampedIndex); // replace array ref for React reconciliation
      const afterIds = exercise.sets.map((s) => s.id);
      debugLog("deleteSet:removed", { exerciseIndex, setIndex: clampedIndex, removedId: removed.id, beforeIds, afterIds, lenAfter: exercise.sets.length });
      // record undo uses clamped index so reinsert is correct against new array
      setLastAction({ type: "deleteSet", exerciseIndex, deletedSet: { index: clampedIndex, data: removed } });
      setRedoStack([]);
      return next;
    });
    // Release guard on the next tick to coalesce duplicate events from the same user action
    queueMicrotask(() => { deleteSetInFlightRef.current = false; });
  };

  const toggleExpansion = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise) return;

    const wasExpanded = expandedExercises.includes(exerciseIndex);
    setExpandedExercises((prev) =>
      wasExpanded ? prev.filter((i) => i !== exerciseIndex) : [...prev, exerciseIndex],
    );

    // record undo action
    setLastAction({
      type: "toggleCollapse",
      exerciseId: (exercise.templateExerciseId ?? `name:${exercise.exerciseName}`).toString(),
      previousExpanded: wasExpanded,
    });
  };

  const handleSwipeToBottom = (exerciseIndex: number) => {
    setExercises((prev) => {
      if (exerciseIndex < 0 || exerciseIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(exerciseIndex, 1);
      if (!item) return prev;
      const toIndex = next.length; // will be pushed to end
      next.push(item);

      // record undo action
      setLastAction({
        type: "swipeToEnd",
        exerciseId: (item.templateExerciseId ?? `name:${item.exerciseName}`).toString(),
        fromIndex: exerciseIndex,
        toIndex,
      });

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

  // Reorder sets within an exercise (true array reorder, not field swapping)
  const reorderSets = (exerciseIndex: number, from: number, to: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const ex = next[exerciseIndex];
      if (!ex) return prev;
      const beforeIds = ex.sets.map((s) => s.id);
      const setsCopy = [...ex.sets];
      const [moved] = setsCopy.splice(from, 1);
      if (!moved) return prev;
      const clampedTo = Math.max(0, Math.min(to, setsCopy.length));
      setsCopy.splice(clampedTo, 0, moved);
      ex.sets = setsCopy; // replace ref
      const afterIds = ex.sets.map((s) => s.id);
      debugLog("reorderSets:applied", { exerciseIndex, from, to: clampedTo, beforeIds, afterIds });

      // history for undo: store previous order (lightweight)
      setLastAction({
        type: "editSetFields",
        exerciseIndex,
        setIndex: clampedTo,
        before: {},
        after: {},
      });
      setRedoStack([]);
      return next;
    });
  };

  const redoLastUndo = () => {
    const action = redoStack[0];
    if (!action) return;
    const rest = redoStack.slice(1);
    setRedoStack(rest);

    // Re-apply the action we undid
    if (action.type === "swipeToEnd") {
      setExercises((prev) => {
        const idFor = (ex: ExerciseData) => (ex.templateExerciseId ?? `name:${ex.exerciseName}`).toString();
        const srcIndex = prev.findIndex((ex) => idFor(ex) === action.exerciseId);
        if (srcIndex === -1) return prev;
        const next = [...prev];
        const [item] = next.splice(srcIndex, 1);
        next.push(item!);
        return next;
      });
    } else if (action.type === "toggleCollapse") {
      setExpandedExercises((prev) => {
        const exerciseIndex = exercises.findIndex(
          (ex) => (ex.templateExerciseId ?? `name:${ex.exerciseName}`).toString() === action.exerciseId,
        );
        if (exerciseIndex === -1) return prev;
        const isCurrentlyExpanded = prev.includes(exerciseIndex);
        // redo does the inverse of undo: apply what original action did
        if (action.previousExpanded) {
          // original action collapsed; redo collapse if currently expanded
          return prev.filter((i) => i !== exerciseIndex);
        } else {
          // original action expanded; redo expand
          if (!isCurrentlyExpanded) return [...prev, exerciseIndex];
          return prev;
        }
      });
    } else if (action.type === "dragReorder") {
      // Reapply a drag isn't trivially reconstructable; leave noop for redo to avoid unstable reorder.
      // Alternatively, we could store the 'after' order. For now, skip.
    } else if (action.type === "addSet") {
      // Re-apply add by inserting a stub set if original id not present
      setExercises((prev) => {
        const next = [...prev];
        const ex = next[action.exerciseIndex];
        if (!ex) return prev;
        if (!ex.sets.find((s) => s.id === action.newSetId)) {
          ex.sets.push({
            id: action.newSetId,
            unit: ex.unit,
            sets: 1,
          } as SetData);
        }
        return next;
      });
    } else if (action.type === "deleteSet") {
      // Re-apply delete by removing the set matching the saved data id if present
      setExercises((prev) => {
        const next = [...prev];
        const ex = next[action.exerciseIndex];
        if (!ex) return prev;
        const idx = ex.sets.findIndex((s) => s.id === action.deletedSet.data.id);
        if (idx !== -1) {
          ex.sets.splice(idx, 1);
        }
        return next;
      });
    } else if (action.type === "toggleUnit") {
      // Re-apply unit toggle by flipping from previous
      setExercises((prev) => {
        const next = [...prev];
        const ex = next[action.exerciseIndex];
        if (!ex) return prev;
        const s = ex.sets[action.setIndex];
        if (!s) return prev;
        s.unit = action.previousUnit === "kg" ? "lbs" : "kg";
        return next;
      });
    } else if (action.type === "editSetFields") {
      // Re-apply field edits by setting 'after' values
      setExercises((prev) => {
        const next = [...prev];
        const ex = next[action.exerciseIndex];
        if (!ex) return prev;
        const s = ex.sets[action.setIndex];
        if (!s) return prev;
        Object.assign(s, action.after);
        return next;
      });
    }
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
    reorderSets,
    buildSavePayload,

    // expose updatePreferences for component use where needed
    updatePreferences,
    session,

    // undo surface
    lastAction,
    // expose setLastAction for advanced cases
    setLastAction,
    // redo + undo
    redoLastUndo,
    redoStack,
    undoLastAction,
  };
}
