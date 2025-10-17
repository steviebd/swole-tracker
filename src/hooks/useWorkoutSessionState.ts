import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { type SwipeSettings } from "~/hooks/use-swipe-gestures";
import { useUniversalDragReorder } from "~/hooks/use-universal-drag-reorder";
import { useOfflineSaveQueue } from "~/hooks/use-offline-save-queue";
import { api, type RouterOutputs } from "~/trpc/react";
import { type ExerciseData } from "~/app/_components/exercise-card";
import { type SetData } from "~/app/_components/set-input";
import { type RecentWorkout } from "~/lib/workout-metrics";

interface PreviousBest {
  weight?: number;
  reps?: number;
  sets?: number;
  unit: "kg" | "lbs";
}

export interface UseWorkoutSessionStateArgs {
  sessionId: number;
}

export function useWorkoutSessionState({
  sessionId,
}: UseWorkoutSessionStateArgs) {
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<number[]>([0]);
  const [loading, setLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previousExerciseData, setPreviousExerciseData] = useState<
    Map<string, { best?: PreviousBest; sets?: SetData[] }>
  >(new Map());
  const [previousDataLoaded, setPreviousDataLoaded] = useState(false);
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

  const utils = api.useUtils();
  const queryClient = useQueryClient();
  type RecentWorkoutsList = RouterOutputs["workouts"]["getRecent"];
  type RecentWorkoutsQueryKey = QueryKey;
  type RecentQueriesSnapshot = Array<
    [RecentWorkoutsQueryKey, RecentWorkoutsList | undefined]
  >;

  const recentQueryKeyRoot = getQueryKey(api.workouts.getRecent);

  const snapshotRecentQueries = (): RecentQueriesSnapshot => {
    const matches = queryClient.getQueriesData<RecentWorkoutsList>({
      queryKey: recentQueryKeyRoot,
    });

    const snapshot: RecentQueriesSnapshot = [];
    for (const [key, data] of matches) {
      snapshot.push([key, data]);
    }

    return snapshot;
  };

  const restoreRecentQueries = (snapshot: RecentQueriesSnapshot) => {
    for (const [key, data] of snapshot) {
      queryClient.setQueryData<RecentWorkoutsList | undefined>(
        key,
        data,
      );
    }
  };

  const updateRecentQueries = (
    updater: (
      current: RecentWorkoutsList | undefined,
      input: { limit?: number } | undefined,
    ) => RecentWorkoutsList | undefined,
  ) => {
    const queries = queryClient.getQueriesData<RecentWorkoutsList>({
      queryKey: recentQueryKeyRoot,
    });

    for (const [key] of queries) {
      const maybeOpts =
        (key as QueryKey)[1] as { input?: { limit?: number } } | undefined;
      const input = maybeOpts?.input;

      queryClient.setQueryData<RecentWorkoutsList | undefined>(
        key,
        (current: RecentWorkoutsList | undefined) => updater(current, input),
      );
    }
  };

  type RecentMutationContext = {
    previousQueries: RecentQueriesSnapshot;
  };
  const { data: session } = api.workouts.getById.useQuery(
    { id: sessionId },
    { enabled: sessionId > 0 }, // Only run query if we have a valid session ID
  );
  const { data: preferences } = api.preferences.get.useQuery();
  const updatePreferencesMutation = api.preferences.update.useMutation();
  // Strongly type the input using the router's inferred type to avoid union misinference
  type UpdatePrefsInput = { defaultWeightUnit: "kg" | "lbs" };
  const updatePreferences = (input: UpdatePrefsInput) => {
    updatePreferencesMutation.mutate(
      input as unknown as Parameters<
        typeof updatePreferencesMutation.mutate
      >[0],
    );
  };

  const { enqueue } = useOfflineSaveQueue();

  type SessionRecord = NonNullable<typeof session>;
  type SessionTemplate = SessionRecord["template"];

  const sessionTemplate = useMemo<SessionTemplate | undefined>(() => {
    if (!session) {
      return undefined;
    }

    const templateCandidate = (session as { template?: unknown }).template;
    if (
      templateCandidate &&
      typeof templateCandidate === "object" &&
      !Array.isArray(templateCandidate)
    ) {
      return templateCandidate as SessionTemplate;
    }

    return undefined;
  }, [session]);

  type TemplateExerciseRecord = {
    id: number;
    exerciseName: string;
  } & Record<string, unknown>;

  const templateExercises = useMemo(() => {
    if (!sessionTemplate) {
      return undefined;
    }

    const exercises = (sessionTemplate as { exercises?: unknown }).exercises;
    if (!Array.isArray(exercises)) {
      return undefined;
    }

    return exercises.filter((exercise): exercise is TemplateExerciseRecord => {
      if (
        !exercise ||
        typeof exercise !== "object" ||
        Array.isArray(exercise)
      ) {
        return false;
      }
      const obj = exercise as Record<string, unknown>;
      return typeof obj.id === "number" && typeof obj.exerciseName === "string";
    });
  }, [sessionTemplate]);

  // id generation with counter to ensure uniqueness
  const setIdCounterRef = useRef(0);
  const generateSetId = () => {
    const counter = ++setIdCounterRef.current;
    return `set-${Date.now()}-${counter}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // swipe settings
  // Phase 3: allow asymmetric thresholds via preferences (future: per-direction)
  const swipeSettings: Partial<SwipeSettings> = {
    dismissThreshold: 140,
    velocityThreshold: 4,
    friction: 0.88,
    minimumVelocity: 0.15,
  };

  // display order
  const getDisplayOrder = useCallback(
    () =>
      exercises.map((exercise, index) => ({ exercise, originalIndex: index })),
    [exercises],
  );

  // drag + reorder
  const displayOrder = useMemo(() => getDisplayOrder(), [getDisplayOrder]);
  const [dragState, dragHandlers] = useUniversalDragReorder(
    displayOrder,
    (newDisplayOrder) => {
      // Capture previous order for Undo
      const prevOrder = exercises.map((ex) => ({
        name: ex.exerciseName,
        templateExerciseId: ex.templateExerciseId,
      }));
      const newExercises = newDisplayOrder.map(
        (item: { exercise: ExerciseData; originalIndex: number }) =>
          item.exercise,
      );
      setExercises(newExercises);

      // record undo action
      setLastAction({
        type: "dragReorder",
        previousOrder: prevOrder,
      });

      // maintain collapsed by identity
      const idFor = (ex: ExerciseData) =>
        ex.templateExerciseId ?? `name:${ex.exerciseName}`;
      const collapsedIdSet = new Set(
        collapsedIndexes
          .map((i) => exercises[i])
          .filter(Boolean)
          .map((ex) => idFor(ex!)),
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
          return newExercises.findIndex(
            (ex) => ex.templateExerciseId === exerciseId,
          );
        })
        .filter((index) => index !== -1);
      setExpandedExercises(newExpandedIndexes);
    },
    (draggedDisplayIndex) => {
      const originalIndex = displayOrder[draggedDisplayIndex]?.originalIndex;
      if (originalIndex !== undefined) {
        setExpandedExercises((prev) =>
          prev.filter((index) => index !== originalIndex),
        );
      }
    },
  );

  const createOptimisticWorkout = (newWorkout: any): any => {
    if (!session || !sessionTemplate) return null;

    return {
      id: sessionId,
      templateId: session.templateId,
      workoutDate: session.workoutDate,
      createdAt: new Date(),
      template: sessionTemplate,
      exercises: newWorkout.exercises.flatMap(
        (exercise: any, exerciseIndex: number) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          exercise.sets.map((set: any, setIndex: number) => ({
            id: -(exerciseIndex * 100 + setIndex),
            exerciseName: exercise.exerciseName,
            setOrder: setIndex,
            weight: set.weight ?? null,
            reps: set.reps ?? null,
            sets: set.sets ?? null,
            unit: set.unit as string,
            templateExerciseId: exercise.templateExerciseId ?? null,
            one_rm_estimate: null,
            volume_load: null,
          })),
      ),
    };
  };

  const applyOptimisticWorkoutUpdate = (
    optimisticWorkout: NonNullable<ReturnType<typeof createOptimisticWorkout>>,
  ) => {
    updateRecentQueries((current, input) => {
      const limit = input?.limit ?? 10;
      const list = current ? [...current] : [];
      const existingIndex = list.findIndex((w) => w.id === optimisticWorkout.id);

      if (existingIndex >= 0) {
        list[existingIndex] = optimisticWorkout;
      } else {
        list.unshift(optimisticWorkout);
      }

      return list.slice(0, limit);
    });
  };

  const applyOptimisticWorkoutUpdateFromPayload = (payload: any) => {
    const optimisticWorkout = createOptimisticWorkout(payload);
    if (optimisticWorkout) {
      applyOptimisticWorkoutUpdate(optimisticWorkout);
    }
  };

  const saveWorkout = api.workouts.save.useMutation({
    onMutate: async (newWorkout) => {
      await utils.workouts.getRecent.cancel();
      const previousQueries = snapshotRecentQueries();

      const optimisticWorkout = createOptimisticWorkout(newWorkout);
      if (optimisticWorkout) {
        applyOptimisticWorkoutUpdate(optimisticWorkout);
      }

      return { previousQueries } satisfies RecentMutationContext;
    },
    onError: (_err, _newWorkout, context) => {
      const mutationContext = context as
        | RecentMutationContext
        | undefined;
      if (mutationContext?.previousQueries) {
        restoreRecentQueries(mutationContext.previousQueries);
      }
    },
    onSettled: () => {
      void utils.workouts.getRecent.invalidate();
    },
  });

  const deleteWorkout = api.workouts.delete.useMutation({
    // Disable retries since they're causing multiple failed attempts
    retry: false,
    onMutate: async (variables) => {
      await utils.workouts.getRecent.cancel();
      const previousQueries = snapshotRecentQueries();

      // Optimistic update - remove from cache immediately
      const deleteId = variables.id;
      updateRecentQueries((current) =>
        current ? current.filter((workout) => workout.id !== deleteId) : [],
      );

      return { previousQueries } satisfies RecentMutationContext;
    },
    onSuccess: () => {
      console.log("Workout deleted successfully");
    },
    onError: (_err, variables, context) => {
      console.error("Failed to delete workout:", _err.message);

      // For new/unsaved workouts, treat "not found" as success
      if (_err.message === "Workout session not found") {
        console.log(
          "Workout not found in database - likely an unsaved session, treating as successful deletion",
        );
        return; // Don't restore cache, deletion was conceptually successful
      }

      // Only restore cache for actual server errors
      const mutationContext = context as
        | RecentMutationContext
        | undefined;
      if (mutationContext?.previousQueries) {
        restoreRecentQueries(mutationContext.previousQueries);
      }
    },
    onSettled: () => {
      void utils.workouts.getRecent.invalidate();
    },
  });

  // previous data loading
  useEffect(() => {
    if (!templateExercises || isReadOnly) {
      setPreviousDataLoaded(true);
      return;
    }

    const loadPreviousData = async () => {
      const previousDataMap = new Map();
      for (const templateExercise of templateExercises) {
        try {
          const data = await utils.workouts.getLastExerciseData.fetch({
            exerciseName: templateExercise.exerciseName,
            excludeSessionId: sessionId,
            templateExerciseId: templateExercise.id,
          });
          if (data) {
            previousDataMap.set(templateExercise.exerciseName, data);
          }
        } catch {
          // noop
        }
      }
      setPreviousExerciseData(previousDataMap);
      setPreviousDataLoaded(true);
    };

    void loadPreviousData();
  }, [
    templateExercises,
    isReadOnly,
    utils.workouts.getLastExerciseData,
    sessionId,
  ]);

  // session init
  useEffect(() => {
    if (!templateExercises || !previousDataLoaded) return;

    if (Array.isArray(session?.exercises) && session.exercises.length > 0) {
      const exerciseGroups = new Map<string, typeof session.exercises>();
      session.exercises.forEach((sessionExercise) => {
        const key = sessionExercise.exerciseName;
        if (!exerciseGroups.has(key)) exerciseGroups.set(key, []);
        exerciseGroups.get(key)!.push(sessionExercise);
      });

      const existingExercises: ExerciseData[] = Array.from(
        exerciseGroups.entries(),
      ).map(([exerciseName, exerciseData]) => {
        exerciseData.sort((a, b) => (a.setOrder ?? 0) - (b.setOrder ?? 0));
        return {
          templateExerciseId: exerciseData[0]?.templateExerciseId ?? undefined,
          exerciseName,
          sets: exerciseData.map((sessionExercise) => ({
            id: `existing-${sessionExercise.id}`,
            weight: sessionExercise.weight
              ? Number(sessionExercise.weight)
              : undefined,
            reps: sessionExercise.reps ?? undefined,
            sets: sessionExercise.sets ?? 1,
            unit: (sessionExercise.unit as "kg" | "lbs") ?? "kg",
          })),
          unit: (exerciseData[0]?.unit as "kg" | "lbs") ?? "kg",
        };
      });

      setExercises(existingExercises);
      setIsReadOnly(true);
      setExpandedExercises(existingExercises.map((_, index) => index));
    } else {
      const initialExercises: ExerciseData[] = templateExercises.map(
        (templateExercise) => {
          const previousData = previousExerciseData.get(
            templateExercise.exerciseName,
          );
          const defaultUnit = (preferences?.defaultWeightUnit ?? "kg") as
            | "kg"
            | "lbs";

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
  }, [
    templateExercises,
    session?.exercises,
    preferences?.defaultWeightUnit,
    previousExerciseData,
    previousDataLoaded,
    session,
  ]);

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
        const idFor = (ex: ExerciseData) =>
          (ex.templateExerciseId ?? `name:${ex.exerciseName}`).toString();
        const srcIndex = prev.findIndex(
          (ex) => idFor(ex) === lastAction.exerciseId,
        );
        if (srcIndex === -1) return prev;
        const next = [...prev];
        const [item] = next.splice(srcIndex, 1);
        next.splice(lastAction.fromIndex, 0, item!);
        return next;
      });
      // Also clear collapsed flag for correctness
      setCollapsedIndexes((prevCollapsed) =>
        prevCollapsed.filter((i) => i !== -1),
      );
    } else if (lastAction.type === "toggleCollapse") {
      // Restore previous expanded state
      setExpandedExercises((prev) => {
        const exerciseIndex = exercises.findIndex(
          (ex) =>
            (ex.templateExerciseId ?? `name:${ex.exerciseName}`).toString() ===
            lastAction.exerciseId,
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
        const idFor = (ex: ExerciseData) =>
          (ex.templateExerciseId ?? `name:${ex.exerciseName}`).toString();
        const byId = new Map(prev.map((ex) => [idFor(ex), ex]));
        const restored: ExerciseData[] = [];
        for (const item of lastAction.previousOrder) {
          const key = (
            item.templateExerciseId ?? `name:${item.name}`
          ).toString();
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
        const insertAt = Math.min(
          Math.max(0, lastAction.deletedSet.index),
          ex.sets.length,
        );
        ex.sets.splice(insertAt, 0, lastAction.deletedSet.data);
        return next;
      });
    } else if (lastAction.type === "toggleUnit") {
      // Restore previous unit
      setExercises((prev) => {
        const next = [...prev];
        if (lastAction.type !== "toggleUnit") return prev;
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
    console.log("[WorkoutSessionState]", ...args);
  };

  // Action dedupe flags (same-tick guard)
  const addSetInFlightRef = useRef(false);
  const deleteSetInFlightRef = useRef(false);
  const reorderInProgressRef = useRef(false);
  const lastAddedSetIdRef = useRef<string | null>(null);
  const deleteOperationIdRef = useRef<string | null>(null);

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetData,
    value: string | number | undefined,
  ) => {
    debugLog("updateSet:start", {
      exerciseIndex,
      setIndex,
      field,
      value,
      len: exercises[exerciseIndex]?.sets.length,
    });
    const newExercises = [...exercises];
    const target = newExercises[exerciseIndex]?.sets[setIndex];
    if (target) {
      const before: Partial<SetData> = {
        [field]: target[field],
      } as Partial<SetData>;

      (target as any)[field] = value;
      const after: Partial<SetData> = { [field]: value } as Partial<SetData>;
      setExercises(newExercises);
      debugLog("updateSet:applied", {
        exerciseIndex,
        setIndex,
        field,
        before,
        after,
      });
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
      previousUnit: currentUnit,
    });
    setRedoStack([]);
    updateSet(exerciseIndex, setIndex, "unit", newUnit);
    // preferences mutation expects object shape { defaultWeightUnit }
    updatePreferences({
      defaultWeightUnit: newUnit as unknown as "kg" | "lbs",
    });
  };

  const addSet = (exerciseIndex: number) => {
    if (addSetInFlightRef.current) {
      debugLog("addSet:suppressedDuplicate", { exerciseIndex });
      return;
    }
    addSetInFlightRef.current = true;
    debugLog("addSet:start", { exerciseIndex });

    // Pre-generate the new set ID outside the state update
    const newId = generateSetId();

    setExercises((prev) => {
      // Double-check if we've already added a set with this exact ID
      if (lastAddedSetIdRef.current === newId) {
        debugLog("addSet:suppressedDuplicateId", { exerciseIndex, newId });
        return prev;
      }

      const next = [...prev];
      const exercise = next[exerciseIndex];
      if (!exercise) {
        addSetInFlightRef.current = false;
        return prev;
      }

      // Additional check: see if this exact set ID already exists in the exercise
      if (exercise.sets.some((set) => set.id === newId)) {
        debugLog("addSet:suppressedExistingId", { exerciseIndex, newId });
        return prev;
      }

      const lastSet = exercise.sets[exercise.sets.length - 1];

      // Phase 3: Predictive defaults engine (simple strategy v1)
      const predictiveEnabled =
        (preferences as any)?.predictive_defaults_enabled === true;

      // Determine base values
      let nextWeight: number | undefined = undefined;
      let nextReps: number | undefined = undefined;
      let nextSetsCount: number | undefined = 1;
      const unitToUse = lastSet?.unit ?? exercise.unit;

      if (predictiveEnabled) {
        const recent = [...exercise.sets]
          .reverse()
          .find((s) => (s.weight ?? s.reps ?? s.sets) !== undefined);
        if (recent) {
          nextWeight = recent.weight;
          nextReps = recent.reps;
          nextSetsCount = recent.sets ?? 1;
        }
      }

      const newSet: SetData = {
        id: newId,
        weight: nextWeight,
        reps: nextReps,
        sets: nextSetsCount,
        unit: unitToUse,
      };

      // Replace sets array reference to force reconciliation
      const beforeIds = exercise.sets.map((s) => s.id);
      exercise.sets = [...exercise.sets, newSet];
      const afterIds = exercise.sets.map((s) => s.id);

      // Track the last added set ID
      lastAddedSetIdRef.current = newId;

      debugLog("addSet:added", {
        exerciseIndex,
        newId,
        beforeIds,
        afterIds,
        totalSets: exercise.sets.length,
      });

      return next;
    });

    // Set the last action and clear redo stack after state update
    setLastAction({ type: "addSet", exerciseIndex, newSetId: newId });
    setRedoStack([]);

    // Release guard immediately after state update is queued
    addSetInFlightRef.current = false;
  };

  const deleteSet = (exerciseIndex: number, setIndex: number) => {
    if (deleteSetInFlightRef.current) {
      debugLog("deleteSet:suppressedDuplicate", { exerciseIndex, setIndex });
      return;
    }
    deleteSetInFlightRef.current = true;

    debugLog("deleteSet:click", {
      exerciseIndex,
      setIndex,
      lenBefore: exercises[exerciseIndex]?.sets.length,
    });

    // Generate unique operation ID for this specific delete operation
    const operationId = `delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let removedSet: SetData | null = null;
    let clampedIndex = -1;

    setExercises((prev) => {
      // Check if we've already processed this exact operation to prevent duplicate executions
      if (deleteOperationIdRef.current === operationId) {
        debugLog("deleteSet:suppressedDuplicateOperation", {
          exerciseIndex,
          setIndex,
          operationId,
        });
        return prev;
      }

      const next = [...prev];
      const exercise = next[exerciseIndex];
      if (!exercise) {
        debugLog("deleteSet:exerciseNotFound", { exerciseIndex });
        deleteSetInFlightRef.current = false;
        return prev;
      }
      if (exercise.sets.length === 0) {
        debugLog("deleteSet:noSets", { exerciseIndex });
        deleteSetInFlightRef.current = false;
        return prev;
      }

      // Defensive clamp of index to current bounds
      clampedIndex = Math.max(0, Math.min(setIndex, exercise.sets.length - 1));
      const removed = exercise.sets[clampedIndex];
      if (!removed) {
        debugLog("deleteSet:setNotFound", { exerciseIndex, setIndex });
        deleteSetInFlightRef.current = false;
        return prev;
      }

      // Mark this operation as processed to prevent duplicate executions
      deleteOperationIdRef.current = operationId;

      // Store the removed set for undo functionality
      removedSet = removed;

      const beforeIds = exercise.sets.map((s) => s.id);
      exercise.sets = exercise.sets.filter((_, i) => i !== clampedIndex); // replace array ref for React reconciliation
      const afterIds = exercise.sets.map((s) => s.id);
      debugLog("deleteSet:removed", {
        exerciseIndex,
        setIndex: clampedIndex,
        removedId: removed.id,
        beforeIds,
        afterIds,
        lenAfter: exercise.sets.length,
      });

      return next;
    });

    // Set the last action and clear redo stack after state update
    if (removedSet && clampedIndex !== -1) {
      setLastAction({
        type: "deleteSet",
        exerciseIndex,
        deletedSet: { index: clampedIndex, data: removedSet },
      });
      setRedoStack([]);
    }

    // Release guard immediately after state update is queued
    deleteSetInFlightRef.current = false;
  };

  const toggleExpansion = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise) return;

    const wasExpanded = expandedExercises.includes(exerciseIndex);
    setExpandedExercises((prev) =>
      wasExpanded
        ? prev.filter((i) => i !== exerciseIndex)
        : [...prev, exerciseIndex],
    );

    // record undo action
    setLastAction({
      type: "toggleCollapse",
      exerciseId: (
        exercise.templateExerciseId ?? `name:${exercise.exerciseName}`
      ).toString(),
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
        exerciseId: (
          item.templateExerciseId ?? `name:${item.exerciseName}`
        ).toString(),
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
            (set) =>
              set.weight !== undefined ||
              set.reps !== undefined ||
              (set.sets && set.sets > 0),
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

  // Move sets within an exercise using simple up/down operations
  const moveSet = (
    exerciseIndex: number,
    setIndex: number,
    direction: "up" | "down",
  ) => {
    const operationKey = `${exerciseIndex}-${setIndex}-${direction}`;
    console.log("[moveSet] Called with:", {
      exerciseIndex,
      setIndex,
      direction,
      operationKey,
    });

    if (reorderInProgressRef.current) {
      console.log("[moveSet] Operation already in progress, skipping");
      return;
    }

    reorderInProgressRef.current = true;
    console.log("[moveSet] Starting move operation", {
      exerciseIndex,
      setIndex,
      direction,
    });

    // Add a small delay to allow React to process any pending updates
    setTimeout(() => {
      reorderInProgressRef.current = false;
    }, 100);

    setExercises((prev) => {
      const next = [...prev];
      const ex = next[exerciseIndex];
      if (!ex?.sets?.[setIndex]) {
        reorderInProgressRef.current = false;
        return prev;
      }

      const newIndex = direction === "up" ? setIndex - 1 : setIndex + 1;

      // Check bounds
      if (newIndex < 0 || newIndex >= ex.sets.length) {
        console.log("[moveSet] Move out of bounds, skipping");
        reorderInProgressRef.current = false;
        return prev;
      }

      // Simple swap operation with proper type safety and forced re-render
      const setsCopy = [...ex.sets];
      const setA = setsCopy[setIndex];
      const setB = setsCopy[newIndex];

      if (!setA || !setB) {
        console.log("[moveSet] Invalid sets for swap, skipping");
        reorderInProgressRef.current = false;
        return prev;
      }

      // Create new objects to force React re-render
      setsCopy[setIndex] = { ...setB };
      setsCopy[newIndex] = { ...setA };

      // Replace the entire exercise object to ensure React sees the change
      next[exerciseIndex] = {
        ...ex,
        sets: setsCopy,
      };

      console.log("[moveSet] Successfully moved set", direction, {
        from: setIndex,
        to: newIndex,
      });

      // history for undo: store move operation
      setLastAction({
        type: "editSetFields",
        exerciseIndex,
        setIndex: newIndex,
        before: {},
        after: {},
      });
      setRedoStack([]);

      // Trigger auto-save after move
      const savePayload = {
        sessionId: session?.id || 0,
        exercises: next
          .map((exercise) => ({
            ...exercise,
            sets: exercise.sets
              .filter(
                (set) =>
                  set.weight !== undefined ||
                  set.reps !== undefined ||
                  set.sets !== undefined,
              )
              .map((set) => ({ ...set, unit: set.unit || "kg" })),
          }))
          .filter((exercise) => exercise.sets.length > 0),
      };
      console.log("[moveSet] Enqueuing save after move");
      enqueue(savePayload);

      debugLog("moveSet:applied", {
        exerciseIndex,
        setIndex,
        direction,
        newIndex,
      });

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
        const idFor = (ex: ExerciseData) =>
          (ex.templateExerciseId ?? `name:${ex.exerciseName}`).toString();
        const srcIndex = prev.findIndex(
          (ex) => idFor(ex) === action.exerciseId,
        );
        if (srcIndex === -1) return prev;
        const next = [...prev];
        const [item] = next.splice(srcIndex, 1);
        next.push(item!);
        return next;
      });
    } else if (action.type === "toggleCollapse") {
      setExpandedExercises((prev) => {
        const exerciseIndex = exercises.findIndex(
          (ex) =>
            (ex.templateExerciseId ?? `name:${ex.exerciseName}`).toString() ===
            action.exerciseId,
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
        const idx = ex.sets.findIndex(
          (s) => s.id === action.deletedSet.data.id,
        );
        if (idx !== -1) {
          ex.sets.splice(idx, 1);
        }
        return next;
      });
    } else if (action.type === "toggleUnit") {
      // Re-apply unit toggle by flipping from previous
      setExercises((prev) => {
        const next = [...prev];
        if (action.type !== "toggleUnit") return prev;
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
        if (action.type !== "editSetFields") return prev;
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
    collapsedIndexes,

    // trpc utils and prefs
    utils,
    preferences,

    // mutations and queue
    saveWorkout,
    deleteWorkout,
    enqueue,
    applyOptimisticWorkoutUpdate,
    applyOptimisticWorkoutUpdateFromPayload,

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
    moveSet,
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
