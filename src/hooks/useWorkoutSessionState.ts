import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { type SwipeSettings } from "~/hooks/use-swipe-gestures";
import { useUniversalDragReorder } from "~/hooks/use-universal-drag-reorder";
import { useOfflineSaveQueue } from "~/hooks/use-offline-save-queue";
import { api, type RouterOutputs } from "~/trpc/react";
import { type ExerciseData } from "~/app/_components/exercise-card";
import { type SetData } from "~/app/_components/set-input";
import { toast } from "~/hooks/use-toast";

type WorkoutSaveResponse = {
  success: boolean;
  playbookSessionId?: number | null;
  notifications?: {
    plateaus?: Array<{
      type: "plateau_detected";
      exerciseName: string;
      stalledWeight: number;
      stalledReps: number;
    }>;
    milestones?: Array<{
      exerciseName: string;
      achievedValue: number;
      targetValue: number;
    }>;
  };
};

import {
  applyOptimisticWorkoutDate,
  applyOptimisticVolumeMetrics,
  calculateVolumeSummaryFromExercises,
  invalidateWorkoutDependentCaches,
  warmProgressCaches,
} from "~/lib/workout-cache-helpers";
import {
  getWorkoutDraft,
  removeWorkoutDraft,
  saveWorkoutDraft,
  type StoredExercise,
} from "~/lib/workout-drafts";

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
  const [draftHydrated, setDraftHydrated] = useState(false);
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
      queryClient.setQueryData<RecentWorkoutsList | undefined>(key, data);
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
      const maybeOpts = (key as QueryKey)[1] as
        | { input?: { limit?: number } }
        | undefined;
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
      return (
        typeof obj["id"] === "number" && typeof obj["exerciseName"] === "string"
      );
    });
  }, [sessionTemplate]);

  // id generation with counter to ensure uniqueness
  const setIdCounterRef = useRef(0);
  const generateSetId = useCallback(() => {
    const counter = ++setIdCounterRef.current;
    // Use a stable timestamp on first render to avoid hydration mismatches
    const timestamp = typeof window !== "undefined" ? Date.now() : 0;
    return `set-${timestamp}-${counter}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  type StoredSet = StoredExercise["sets"][number];

  const normalizeDraftSet = useCallback(
    (
      set: StoredSet,
      fallbackUnit: "kg" | "lbs",
      setNumber: number,
    ): SetData => {
      const result: SetData = {
        id:
          typeof set.id === "string"
            ? set.id
            : `restored-${Math.random().toString(36).slice(2)}-${typeof window !== "undefined" ? Date.now().toString(36) : "0"}`,
        setNumber,
        sets: typeof set.sets === "number" && set.sets > 0 ? set.sets : 1,
        unit: (set.unit as "kg" | "lbs") ?? fallbackUnit,
      };

      if (typeof set.weight === "number") {
        result.weight = set.weight;
      }
      if (typeof set.reps === "number") {
        result.reps = set.reps;
      }
      if (typeof set.rpe === "number") {
        result.rpe = set.rpe;
      }
      if (typeof set.rest === "number") {
        result.rest = set.rest;
      }

      return result;
    },
    [],
  );

  const mergeDraftExercises = useCallback(
    (base: ExerciseData[], draftExercises: StoredExercise[]) => {
      if (!draftExercises?.length) {
        return base;
      }

      const keyFor = (exercise: {
        templateExerciseId?: number;
        exerciseName: string;
      }) =>
        typeof exercise.templateExerciseId === "number"
          ? `id:${exercise.templateExerciseId}`
          : `name:${exercise.exerciseName.toLowerCase()}`;

      const draftMap = new Map(
        draftExercises.map((exercise) => [keyFor(exercise), exercise]),
      );

      const merged = base.map((exercise) => {
        const key = keyFor(exercise);
        const draft = draftMap.get(key);
        if (!draft) return exercise;

        draftMap.delete(key);
        const fallbackUnit =
          (draft.unit as "kg" | "lbs") ??
          exercise.unit ??
          (preferences?.defaultUnit as "kg" | "lbs") ??
          "kg";
        return {
          ...exercise,
          unit: fallbackUnit,
          sets: draft.sets.map((set, index) =>
            normalizeDraftSet(set, fallbackUnit, index + 1),
          ),
        };
      });

      for (const draftExercise of draftMap.values()) {
        const fallbackUnit =
          (draftExercise.unit as "kg" | "lbs") ??
          (preferences?.defaultUnit as "kg" | "lbs") ??
          "kg";
        const exerciseData: ExerciseData = {
          exerciseName: draftExercise.exerciseName,
          unit: fallbackUnit,
          sets: draftExercise.sets.map((set, index) =>
            normalizeDraftSet(set, fallbackUnit, index + 1),
          ),
        };

        if (draftExercise.templateExerciseId !== undefined) {
          exerciseData.templateExerciseId = draftExercise.templateExerciseId;
        }

        merged.push(exerciseData);
      }

      return merged;
    },
    [normalizeDraftSet, preferences?.defaultUnit],
  );

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
      const prevOrder = exercises.map((ex) => {
        const item: { name: string; templateExerciseId?: number } = {
          name: ex.exerciseName,
        };
        if (ex.templateExerciseId !== undefined) {
          item.templateExerciseId = ex.templateExerciseId;
        }
        return item;
      });
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

  const createOptimisticWorkout = (newWorkout: any) => {
    // Support both template workouts and playbook workouts (which have no sessionTemplate)
    if (!session) return null;

    return {
      id: sessionId,
      templateId: session.templateId,
      workoutDate: session.workoutDate,
      createdAt: new Date(),
      template: sessionTemplate ?? null, // null for playbook workouts
      playbook: null, // Will be filled in by actual save response
      exercises: newWorkout.exercises.flatMap(
        (exercise: any, exerciseIndex: number) =>
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
      const existingIndex = list.findIndex(
        (w) => w.id === optimisticWorkout.id,
      );

      if (existingIndex >= 0) {
        list[existingIndex] = optimisticWorkout;
      } else {
        list.unshift(optimisticWorkout);
      }

      return list.slice(0, limit);
    });
  };

  const applyOptimisticWorkoutUpdateFromPayload = (payload: unknown) => {
    const optimisticWorkout = createOptimisticWorkout(payload);
    if (optimisticWorkout) {
      applyOptimisticWorkoutUpdate(optimisticWorkout);
    }
  };

  const saveWorkout = api.workouts.save.useMutation({
    onMutate: async (newWorkout) => {
      await queryClient.cancelQueries({ queryKey: recentQueryKeyRoot });
      const previousQueries = snapshotRecentQueries();

      const optimisticWorkout = createOptimisticWorkout(newWorkout);
      if (optimisticWorkout) {
        applyOptimisticWorkoutUpdate(optimisticWorkout);
      }
      const workoutDate =
        session?.workoutDate instanceof Date
          ? session.workoutDate
          : session?.workoutDate
            ? new Date(session.workoutDate)
            : new Date();
      applyOptimisticWorkoutDate(queryClient, workoutDate);
      const volumeSummary = calculateVolumeSummaryFromExercises(
        newWorkout.exercises,
      );
      if (volumeSummary) {
        applyOptimisticVolumeMetrics(queryClient, workoutDate, volumeSummary);
      }

      return { previousQueries } satisfies RecentMutationContext;
    },
    onError: (_err, _newWorkout, context) => {
      const mutationContext = context as RecentMutationContext | undefined;
      if (mutationContext?.previousQueries) {
        restoreRecentQueries(mutationContext.previousQueries);
      }
    },
    onSuccess: (data: WorkoutSaveResponse | undefined) => {
      // Handle plateau notifications
      if (
        data?.notifications?.plateaus &&
        data.notifications.plateaus.length > 0
      ) {
        for (const plateau of data.notifications.plateaus) {
          toast({
            title: "Plateau Detected",
            description: `${plateau.exerciseName} has stalled at ${plateau.stalledWeight}kg × ${plateau.stalledReps}`,
            duration: 8000,
          });
        }
      }

      // Handle milestone notifications
      if (
        data?.notifications?.milestones &&
        data.notifications.milestones.length > 0
      ) {
        for (const milestone of data.notifications.milestones) {
          toast({
            title: "Milestone Achieved! 🎉",
            description: `${milestone.exerciseName}: ${milestone.achievedValue}kg (target: ${milestone.targetValue}kg)`,
            duration: 8000,
          });
        }
      }
    },
    onSettled: () => {
      console.info(
        `[WORKOUT_SAVE] Cache invalidation started for session ${sessionId} at ${new Date().toISOString()}`,
      );
      const startTime = performance.now();

      void invalidateWorkoutDependentCaches(utils, [sessionId]).then(() => {
        const endTime = performance.now();
        console.info(
          `[WORKOUT_SAVE] Cache invalidation completed in ${(endTime - startTime).toFixed(2)}ms`,
        );
      });

      // Warm progress caches after successful save
      if (session?.user_id) {
        void import("~/lib/workout-cache-helpers").then(
          ({ warmProgressCaches }) => {
            void warmProgressCaches(utils, session.user_id);
          },
        );
      }
    },
  });

  const deleteWorkout = api.workouts.delete.useMutation({
    // Disable retries since they're causing multiple failed attempts
    retry: false,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: recentQueryKeyRoot });
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
      const mutationContext = context as RecentMutationContext | undefined;
      if (mutationContext?.previousQueries) {
        restoreRecentQueries(mutationContext.previousQueries);
      }
    },
    onSettled: () => {
      void invalidateWorkoutDependentCaches(utils, [sessionId]);
      // Warm progress caches after successful save
      if (session?.user_id) {
        void warmProgressCaches(utils, session.user_id);
      }
    },
  });

  // previous data loading
  useEffect(() => {
    if (isReadOnly) {
      setPreviousDataLoaded(true);
      return;
    }

    // For playbook workouts, get exercise names from session exercises
    // For template workouts, get from templateExercises
    const isPlaybookWorkout = !sessionTemplate && session;
    const exercisesToFetch: Array<{
      exerciseName: string;
      id: number | undefined;
    }> = [];

    if (templateExercises && templateExercises.length > 0) {
      // Template-based workout
      exercisesToFetch.push(
        ...templateExercises.map((te) => ({
          exerciseName: te.exerciseName,
          id: te.id,
        })),
      );
    } else if (isPlaybookWorkout && session?.exercises) {
      // Playbook workout - get unique exercise names from session
      const uniqueNames = new Set<string>();
      session.exercises.forEach((ex) => {
        if (!uniqueNames.has(ex.exerciseName)) {
          uniqueNames.add(ex.exerciseName);
          exercisesToFetch.push({
            exerciseName: ex.exerciseName,
            id: ex.templateExerciseId ?? undefined,
          });
        }
      });
    }

    if (exercisesToFetch.length === 0) {
      setPreviousDataLoaded(true);
      return;
    }

    const loadPreviousData = async () => {
      const previousDataMap = new Map();
      for (const exercise of exercisesToFetch) {
        try {
          const data = await utils.workouts.getLastExerciseData.fetch({
            exerciseName: exercise.exerciseName,
            excludeSessionId: sessionId,
            templateExerciseId: exercise.id,
          });
          if (data) {
            previousDataMap.set(exercise.exerciseName, data);
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
    sessionTemplate,
    session,
  ]);

  useEffect(() => {
    setDraftHydrated(false);
    skipDraftSaveRef.current = false;
    if (typeof window !== "undefined" && draftSaveTimeoutRef.current) {
      window.clearTimeout(draftSaveTimeoutRef.current);
      draftSaveTimeoutRef.current = null;
    }
  }, [sessionId]);

  // session init
  useEffect(() => {
    // Determine if this is a playbook workout
    const isPlaybookWorkout = !sessionTemplate && session;

    // Check if playbook workout is completed (read-only view)
    const isPlaybookCompleted =
      isPlaybookWorkout &&
      (session as { isPlaybookCompleted?: boolean | null })
        .isPlaybookCompleted === true;

    // For NEW playbook workouts, wait for previousDataLoaded to pre-fill with historical data
    // For COMPLETED playbook workouts, can initialize immediately from saved data
    // For template workouts, wait for both templateExercises and previousDataLoaded
    const canInitialize =
      (isPlaybookWorkout && (isPlaybookCompleted || previousDataLoaded)) ||
      (templateExercises && previousDataLoaded);

    if (!canInitialize) return;

    if (Array.isArray(session?.exercises) && session.exercises.length > 0) {
      // Determine read-only status FIRST to decide how to build exercises
      // For playbook workouts (no template): check if playbook session is completed
      // For template workouts with existing exercises: always read-only (viewing past workout)
      const isPlaybookWorkout = !sessionTemplate && session;
      let shouldBeReadOnly = true;

      if (isPlaybookWorkout) {
        // For playbook workouts, check the completion status
        // isPlaybookCompleted is null if not a playbook workout, true if completed, false if in-progress
        const completionStatus = (
          session as { isPlaybookCompleted?: boolean | null }
        ).isPlaybookCompleted;
        shouldBeReadOnly = completionStatus === true;
      }

      const exerciseGroups = new Map<string, typeof session.exercises>();
      session.exercises.forEach((sessionExercise) => {
        const key = sessionExercise.exerciseName;
        if (!exerciseGroups.has(key)) exerciseGroups.set(key, []);
        exerciseGroups.get(key)!.push(sessionExercise);
      });

      const defaultUnit = (preferences?.defaultUnit ?? "kg") as "kg" | "lbs";

      const existingExercises: ExerciseData[] = Array.from(
        exerciseGroups.entries(),
      ).map(([exerciseName, exerciseData]) => {
        exerciseData.sort((a, b) => (a.setOrder ?? 0) - (b.setOrder ?? 0));

        // For NEW playbook workouts (not completed), use previousExerciseData like templates do
        // This allows playbooks to pre-fill with historical data
        if (isPlaybookWorkout && !shouldBeReadOnly && previousDataLoaded) {
          const previousData = previousExerciseData.get(exerciseName);

          if (previousData?.sets && previousData.sets.length > 0) {
            // Use previous workout data to populate sets
            const exerciseResult: ExerciseData = {
              exerciseName,
              sets: previousData.sets.map((prevSet) => {
                const setResult: SetData = {
                  id: generateSetId(),
                  setNumber: prevSet.setNumber ?? 1,
                  sets: 1, // Individual sets
                  unit: prevSet.unit ?? defaultUnit,
                };

                if (prevSet.weight !== undefined) {
                  setResult.weight = prevSet.weight;
                }
                if (prevSet.reps !== undefined) {
                  setResult.reps = prevSet.reps;
                }

                return setResult;
              }),
              unit: previousData.sets[0]?.unit ?? defaultUnit,
            };

            if (
              exerciseData[0]?.templateExerciseId !== undefined &&
              exerciseData[0]?.templateExerciseId !== null
            ) {
              exerciseResult.templateExerciseId =
                exerciseData[0].templateExerciseId;
            }

            return exerciseResult;
          }
        }

        // For SAVED workouts or when no previous data, use the actual saved data
        // Check if workout uses new format with exerciseSets table
        const firstExercise = exerciseData[0] as (typeof exerciseData)[0] & {
          usesSetTable?: boolean;
          sets?: Array<{
            id: number;
            setNumber: number;
            weight: number | null;
            reps: number | null;
            rpe: number | null;
            restSeconds: number | null;
          }>;
        };
        const usesNewFormat = firstExercise?.usesSetTable === true;

        let sets: SetData[];

        if (
          usesNewFormat &&
          firstExercise?.sets &&
          firstExercise.sets.length > 0
        ) {
          // New format: use individual sets from exerciseSets table
          sets = firstExercise.sets.map((set) => {
            const setResult: SetData = {
              id: `existing-set-${set.id}`,
              setNumber: set.setNumber,
              sets: 1, // Individual set
              unit: (firstExercise.unit as "kg" | "lbs") ?? "kg",
            };

            if (set.weight !== null) {
              setResult.weight = Number(set.weight);
            }
            if (set.reps !== null) {
              setResult.reps = set.reps;
            }
            if (set.rpe !== null) {
              setResult.rpe = set.rpe;
            }
            if (set.restSeconds !== null) {
              setResult.rest = set.restSeconds;
            }

            return setResult;
          });
        } else {
          // Legacy format: each sessionExercise is one set
          sets = exerciseData.map((sessionExercise) => {
            const setResult: SetData = {
              id: `existing-${sessionExercise.id}`,
              setNumber: (sessionExercise.setOrder ?? 0) + 1,
              sets: sessionExercise.sets ?? 1,
              unit: (sessionExercise.unit as "kg" | "lbs") ?? "kg",
            };

            if (sessionExercise.weight) {
              setResult.weight = Number(sessionExercise.weight);
            }
            if (
              sessionExercise.reps !== undefined &&
              sessionExercise.reps !== null
            ) {
              setResult.reps = sessionExercise.reps;
            }

            return setResult;
          });
        }

        const exerciseResult: ExerciseData = {
          exerciseName,
          sets,
          unit: (exerciseData[0]?.unit as "kg" | "lbs") ?? "kg",
        };

        if (
          exerciseData[0]?.templateExerciseId !== undefined &&
          exerciseData[0]?.templateExerciseId !== null
        ) {
          exerciseResult.templateExerciseId =
            exerciseData[0].templateExerciseId;
        }

        return exerciseResult;
      });

      // For in-progress playbook workouts, merge with any saved draft data
      if (!shouldBeReadOnly) {
        const draft = getWorkoutDraft(sessionId);
        const resolvedExercises = draft?.exercises?.length
          ? mergeDraftExercises(existingExercises, draft.exercises)
          : existingExercises;
        setExercises(resolvedExercises);
      } else {
        setExercises(existingExercises);
        removeWorkoutDraft(sessionId);
      }

      setIsReadOnly(shouldBeReadOnly);
      setExpandedExercises(existingExercises.map((_, index) => index));
      setDraftHydrated(true);
    } else if (templateExercises) {
      // Only initialize from template if template exists
      const initialExercises: ExerciseData[] = templateExercises.map(
        (templateExercise) => {
          const previousData = previousExerciseData.get(
            templateExercise.exerciseName,
          );
          const defaultUnit = (preferences?.defaultUnit ?? "kg") as
            | "kg"
            | "lbs";

          let sets: SetData[] = [];
          if (previousData?.sets) {
            sets = previousData.sets.map((prevSet) => {
              const setResult: SetData = {
                id: generateSetId(),
                setNumber: prevSet.setNumber ?? 1,
                sets: prevSet.sets,
                unit: prevSet.unit,
              };

              if (prevSet.weight !== undefined) {
                setResult.weight = prevSet.weight;
              }
              if (prevSet.reps !== undefined) {
                setResult.reps = prevSet.reps;
              }

              return setResult;
            });
          } else {
            sets = [
              (() => {
                const setResult: SetData = {
                  id: generateSetId(),
                  setNumber: 1,
                  sets: 1,
                  unit: defaultUnit,
                };
                return setResult;
              })(),
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

      const draft = getWorkoutDraft(sessionId);
      const resolvedExercises = draft?.exercises?.length
        ? mergeDraftExercises(initialExercises, draft.exercises)
        : initialExercises;

      setExercises(resolvedExercises);
      setIsReadOnly(false);
      setDraftHydrated(true);
    } else {
      // Playbook workout with no template and no exercises yet
      // Initialize with empty array - exercises will be added in the session
      setExercises([]);
      setIsReadOnly(false);
      setDraftHydrated(true);
    }

    setLoading(false);
  }, [
    templateExercises,
    session?.exercises,
    preferences?.defaultUnit,
    previousExerciseData,
    previousDataLoaded,
    session,
    mergeDraftExercises,
    sessionId,
    generateSetId,
    sessionTemplate,
  ]);

  useEffect(() => {
    if (!draftHydrated || isReadOnly || loading) return;
    if (typeof window === "undefined") return;

    if (skipDraftSaveRef.current) {
      skipDraftSaveRef.current = false;
      return;
    }

    if (draftSaveTimeoutRef.current) {
      window.clearTimeout(draftSaveTimeoutRef.current);
    }

    draftSaveTimeoutRef.current = window.setTimeout(() => {
      saveWorkoutDraft(sessionId, exercises);
      draftSaveTimeoutRef.current = null;
    }, 400);

    return () => {
      if (draftSaveTimeoutRef.current) {
        window.clearTimeout(draftSaveTimeoutRef.current);
        draftSaveTimeoutRef.current = null;
      }
    };
  }, [draftHydrated, isReadOnly, loading, sessionId, exercises]);

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
        // Renumber all sets after restoring
        ex.sets = ex.sets.map((set, index) => ({
          ...set,
          setNumber: index + 1,
        }));
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
  const draftSaveTimeoutRef = useRef<number | null>(null);
  const skipDraftSaveRef = useRef(false);

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
        setNumber: exercise.sets.length + 1,
        sets: nextSetsCount,
        unit: unitToUse,
      };

      if (nextWeight !== undefined) {
        newSet.weight = nextWeight;
      }
      if (nextReps !== undefined) {
        newSet.reps = nextReps;
      }

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
    const timestamp = typeof window !== "undefined" ? Date.now() : 0;
    const operationId = `delete-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

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
      // Renumber remaining sets
      exercise.sets = exercise.sets.map((set, index) => ({
        ...set,
        setNumber: index + 1,
      }));
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
      .map((exercise) => {
        // Filter out empty sets
        const validSets = exercise.sets.filter(
          (set) =>
            set.weight !== undefined ||
            set.reps !== undefined ||
            (set.sets && set.sets > 0),
        );

        // Keep legacy sets for backward compatibility
        // The legacy format properly handles the "sets" count field (e.g., "3 sets of 10 reps")
        const legacySets = validSets.map((set) => {
          const result: {
            id: string;
            weight?: number;
            reps?: number;
            sets?: number;
            unit: "kg" | "lbs";
          } = {
            id:
              set.id ??
              `offline-${typeof window !== "undefined" ? Math.random().toString(36).slice(2) : "0"}`,
            unit: set.unit,
          };

          if (set.weight !== null && set.weight !== undefined) {
            result.weight = set.weight;
          }
          if (set.reps !== null && set.reps !== undefined) {
            result.reps = set.reps;
          }
          if (set.sets !== null && set.sets !== undefined) {
            result.sets = set.sets;
          }

          return result;
        });

        // Only use exerciseSets format when there are multiple individual sets with different configurations
        // (i.e., Phase 2 warm-up sets feature). For now, always use legacy format since the UI
        // uses the "sets" count field (e.g., "3 sets of 10 reps at 100kg").
        // The exerciseSets format treats each array entry as ONE set, which doesn't match
        // the legacy "sets count" semantics.
        return {
          ...exercise,
          sets: legacySets,
          // Don't send exerciseSets - use legacy format which correctly handles the "sets" count
        };
      })
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

      // Create new objects to force React re-render and swap setNumbers
      setsCopy[setIndex] = { ...setB, setNumber: setIndex + 1 };
      setsCopy[newIndex] = { ...setA, setNumber: newIndex + 1 };

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
            setNumber: ex.sets.length + 1,
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

  const clearDraft = useCallback(() => {
    skipDraftSaveRef.current = true;
    if (typeof window !== "undefined" && draftSaveTimeoutRef.current) {
      window.clearTimeout(draftSaveTimeoutRef.current);
      draftSaveTimeoutRef.current = null;
    }
    removeWorkoutDraft(sessionId);
  }, [sessionId]);

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
    clearDraft,

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

export type WorkoutSessionState = ReturnType<typeof useWorkoutSessionState>;
