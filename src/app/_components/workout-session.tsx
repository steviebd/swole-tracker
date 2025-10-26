"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExerciseCard, type ExerciseData } from "./exercise-card";
import { useLiveRegion, useAttachLiveRegion } from "./LiveRegion";
import { FocusTrap, useReturnFocus } from "./focus-trap";

import { analytics } from "~/lib/analytics";
import posthog from "posthog-js";
import {
  vibrate,
  getDeviceType,
  getThemeUsed,
  snapshotMetricsBlob,
} from "~/lib/client-telemetry";
import { useCacheInvalidation } from "~/hooks/use-cache-invalidation";
import {
  useWorkoutSessionState,
  type WorkoutSessionState,
} from "~/hooks/useWorkoutSessionState";

interface WorkoutSessionProps {
  sessionId: number;
  children?: (
    updateSet: (
      exerciseIndex: number,
      setIndex: number,
      field: string,
      value: any,
    ) => void,
  ) => React.ReactNode;
}

interface WorkoutSessionWithStateProps {
  sessionId: number;
  state: WorkoutSessionState;
}

function WorkoutSessionContent({
  sessionId,
  state,
}: WorkoutSessionWithStateProps) {
  const router = useRouter();
  const { invalidateWorkouts: _invalidateWorkouts } = useCacheInvalidation();

  // Move complex state and effects into a dedicated hook to reduce component size.
  // This MUST be called before any conditional returns to follow Rules of Hooks
  const {
    exercises,
    expandedExercises,
    loading,
    isReadOnly,
    showDeleteConfirm,
    setShowDeleteConfirm,
    previousExerciseData,
    collapsedIndexes,
    saveWorkout,
    deleteWorkout,
    enqueue,
    applyOptimisticWorkoutUpdate,
    applyOptimisticWorkoutUpdateFromPayload,
    swipeSettings,
    dragState,
    dragHandlers,
    getDisplayOrder,
    toggleExpansion,
    handleSwipeToBottom,
    updateSet: hookUpdateSet,
    toggleUnit: hookToggleUnit,
    addSet: hookAddSet,
    deleteSet: hookDeleteSet,
    moveSet,
    buildSavePayload,
    session,
    preferences,
    // undo integration
    setLastAction,
    clearDraft,
  } = state;

  // Additional hooks that must be called before conditional returns
  const [scrollY, setScrollY] = useState(0);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Accessibility live region
  const announce = useLiveRegion();
  useAttachLiveRegion(announce);

  // Focus restore for inline modals
  const { restoreFocus: restoreFocusInline } = useReturnFocus();

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Generate unique ID for sets
  // id generation handled in hook

  // Swipe settings for all exercise cards - adjusted for slower, more controlled feel
  // swipeSettings provided by hook

  // Get the display order of exercises (normal exercises first, then swiped to bottom)
  // getDisplayOrder provided by hook

  // Universal drag and drop functionality - works on both mobile and desktop
  // drag state/handlers provided by hook
  const displayOrder = getDisplayOrder();

  // Conservative virtualization window for very large templates
  const VIRTUALIZE_THRESHOLD = 20;
  const WINDOW_BEFORE = 6;
  const WINDOW_AFTER = 6;

  const totalCount = displayOrder.length;
  const shouldVirtualize = totalCount >= VIRTUALIZE_THRESHOLD;

  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : 800;
  const startIndex = shouldVirtualize
    ? Math.max(0, Math.floor(scrollY / 120) - WINDOW_BEFORE)
    : 0;
  const endIndex = shouldVirtualize
    ? Math.min(
        totalCount - 1,
        Math.ceil((scrollY + viewportHeight) / 120) + WINDOW_AFTER,
      )
    : totalCount - 1;

  // previous data loading handled in hook

  // session initialization handled in hook

  // auto-progression modal logic handled in hook

  // ===== COMPLETE WORKOUT MODAL STATE =====

  type BestMetrics = {
    bestWeight?: {
      weight: number;
      reps?: number;
      sets?: number;
      unit: "kg" | "lbs";
    };
    bestVolume?: {
      volume: number;
      weight?: number;
      reps?: number;
      unit: "kg" | "lbs";
    };
  };

  const computeCurrentBest = (ex: ExerciseData): BestMetrics => {
    if (ex.sets?.length === 0) return {};
    // Max weight, tie-break by reps
    const maxWeight = Math.max(...ex.sets.map((s) => s.weight ?? 0));
    const weightCandidates = ex.sets.filter(
      (s) => (s.weight ?? 0) === maxWeight,
    );
    const bestByWeight = weightCandidates.sort(
      (a, b) => (b.reps ?? 0) - (a.reps ?? 0),
    )[0];
    // Max volume (weight * reps)
    const withVolume = ex.sets
      .map((s) => ({ ...s, volume: (s.weight ?? 0) * (s.reps ?? 0) }))
      .filter((s) => s.volume && s.volume > 0);
    const bestByVolume = withVolume.sort((a, b) => b.volume - a.volume)[0];

    return {
      bestWeight: bestByWeight?.weight
        ? {
            weight: bestByWeight.weight,
            reps: bestByWeight.reps,
            sets: bestByWeight.sets,
            unit: bestByWeight.unit,
          }
        : undefined,
      bestVolume: bestByVolume
        ? {
            volume: bestByVolume.volume,
            weight: bestByVolume.weight,
            reps: bestByVolume.reps,
            unit: bestByVolume.unit,
          }
        : undefined,
    };
  };

  const openCompleteModal = () => {
    setShowCompleteModal(true);
  };
  const closeCompleteModal = () => {
    setShowCompleteModal(false);
  };

  // thin wrappers to call hook helpers (keeps JSX unchanged)
  const updateSet = hookUpdateSet;
  const toggleUnit = hookToggleUnit;
  const addSet = hookAddSet;
  const vibrateSafe = (pattern: number | number[]) => {
    try {
      vibrate(pattern);
    } catch {}
  };
  const deleteSet = hookDeleteSet;

  // toggleExpansion provided by hook

  // use handler from hook
  // handleSwipeToBottom provided by hook

  // buildSavePayload provided by hook

  const handleSave = async () => {
    // Validate that exercises have required data
    const validationErrors: string[] = [];

    exercises.forEach((exercise, _exerciseIndex) => {
      exercise.sets.forEach((set, setIndex) => {
        const hasData =
          set.weight !== undefined ||
          set.reps !== undefined ||
          (set.sets && set.sets > 0);

        if (hasData) {
          // If the set has some data, validate that numeric fields are proper numbers
          if (
            set.weight !== undefined &&
            (set.weight === null || isNaN(set.weight))
          ) {
            validationErrors.push(
              `${exercise.exerciseName}, Set ${setIndex + 1}: Weight must be a valid number`,
            );
          }
          if (
            set.reps !== undefined &&
            (set.reps === null || isNaN(set.reps) || set.reps <= 0)
          ) {
            validationErrors.push(
              `${exercise.exerciseName}, Set ${setIndex + 1}: Reps must be a valid positive number`,
            );
          }
          if (
            set.sets !== undefined &&
            (set.sets === null || isNaN(set.sets) || set.sets <= 0)
          ) {
            validationErrors.push(
              `${exercise.exerciseName}, Set ${setIndex + 1}: Sets must be a valid positive number`,
            );
          }
        }
      });
    });

    if (validationErrors.length > 0) {
      console.error("Validation errors:", validationErrors);
      return;
    }

    try {
      const payload = buildSavePayload();

      // If offline, enqueue and notify
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        applyOptimisticWorkoutUpdateFromPayload(payload);
        enqueue(payload);
        clearDraft();
        // No navigation here; let user remain on page
        return;
      }

      // Try online save
      await saveWorkout.mutateAsync(payload);
      clearDraft();
    } catch (error) {
      console.error("Error saving workout:", error);
      analytics.error(error as Error, {
        context: "workout_save",
        sessionId: sessionId?.toString() || "unknown",
      });

      // If likely a network error, enqueue for offline
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as Error).message)
          : "";

      if (
        message.includes("Failed to fetch") ||
        message.includes("NetworkError") ||
        message.includes("TypeError")
      ) {
        const payload = buildSavePayload();
        applyOptimisticWorkoutUpdateFromPayload(payload);
        enqueue(payload);
        clearDraft();
        return;
      }

      // Otherwise surface validation/unknown error
      if (
        message.includes("Expected number, received null") ||
        message.includes("invalid_type")
      ) {
        console.error("Validation error:", message);
      } else {
        console.error("Error saving workout:", message || "Unknown error");
      }
    }
  };

  const handleBulkUnitChange = (exerciseIndex: number, unit: "kg" | "lbs") => {
    // Update all sets in the exercise to the new unit
    const exercise = exercises[exerciseIndex];
    if (!exercise) return;

    exercise.sets.forEach((_, setIndex) => {
      updateSet(exerciseIndex, setIndex, "unit", unit);
    });
  };

  const handleDelete = async () => {
    // Prevent multiple rapid calls
    if (deleteWorkout.isPending) {
      console.log("Delete already in progress, ignoring duplicate call");
      return;
    }

    // Validate sessionId before proceeding
    if (!sessionId || typeof sessionId !== "number") {
      console.error("Invalid sessionId for workout deletion:", sessionId);
      alert("Cannot delete workout: invalid session ID");
      return;
    }

    try {
      console.log("Attempting to delete workout session:", sessionId);

      // Try to delete from database
      await deleteWorkout.mutateAsync({ id: sessionId });

      // If we get here, deletion succeeded (either database delete or handled as unsaved session)
      console.log("Workout deletion completed successfully");

      // Navigate to home after successful deletion
      setShowDeleteConfirm(false);
      clearDraft();
      router.push("/");
    } catch (error) {
      // This should rarely happen now due to our error handling in the mutation
      console.error("Unexpected error during workout deletion:", error);
      analytics.error(error as Error, {
        context: "workout_delete",
        sessionId: sessionId?.toString() || "unknown",
      });

      // Even on error, close dialog and navigate away since the optimistic update already happened
      setShowDeleteConfirm(false);
      clearDraft();
      router.push("/");
    }
  };

  if (loading || !session) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {[...(Array(3) as number[])].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg bg-[var(--color-bg-surface)] p-3 sm:p-4"
          >
            <div
              className="mb-3 h-3 w-1/2 rounded bg-[var(--color-border)] sm:mb-4 sm:h-4"
            />
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div
                className="h-8 rounded bg-[var(--color-border)] sm:h-10"
              />
              <div
                className="h-8 rounded bg-[var(--color-border)] sm:h-10"
              />
              <div
                className="h-8 rounded bg-[var(--color-border)] sm:h-10"
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Gesture Help (only show if not read-only and has exercises) */}
      {!isReadOnly && exercises.length > 0 && (
        <div className="text-muted mb-2 px-2 text-center text-xs sm:text-sm">
          💡 <strong>Tip:</strong> Swipe ← → to move to bottom • Drag ↕ to
          reorder & move between sections • Works on mobile & desktop
        </div>
      )}

      {/* Exercise Navigation */}
      {exercises.length > 5 && (
        <div className="mb-4">
          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="border-border bg-muted/50 flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">Jump to Exercise</span>
                <span className="text-muted-foreground text-sm">
                  {exercises.length} exercises
                </span>
              </div>
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {exercises.map((exercise, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const element = document.getElementById(
                      `exercise-${index}`,
                    );
                    element?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  className="border-border bg-background hover:bg-muted/50 rounded border p-2 text-left text-sm"
                >
                  {exercise.exerciseName}
                </button>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Exercise Cards */}
      {(shouldVirtualize
        ? displayOrder
            .slice(startIndex, endIndex + 1)
            .map(
              (entry: { exercise: any; originalIndex: number }, i: number) => ({
                ...entry,
                windowIndex: startIndex + i,
              }),
            )
        : displayOrder.map(
            (entry: { exercise: any; originalIndex: number }, i: number) => ({
              ...entry,
              windowIndex: i,
            }),
          )
      ).map(
        ({
          exercise,
          originalIndex,
          windowIndex,
        }: {
          exercise: any;
          originalIndex: number;
          windowIndex: number;
        }) => {
          const displayIndex = windowIndex;
          // Collapsed state is derived from collapsedIndexes mapped to current order
          const isCollapsed = collapsedIndexes.includes(displayIndex);
          const isExpandedNow =
            !isCollapsed && expandedExercises.includes(originalIndex);

          return (
            <div
              key={exercise.templateExerciseId ?? originalIndex}
              id={`exercise-${originalIndex}`}
              style={shouldVirtualize ? { minHeight: 0 } : undefined}
            >
              {/* Swiped Exercises Section Header */}
              <ExerciseCard
                exercise={exercise}
                exerciseIndex={originalIndex}
                onUpdate={updateSet}
                onToggleUnit={toggleUnit}
                onBulkUnitChange={handleBulkUnitChange}
                onAddSet={addSet}
                onDeleteSet={deleteSet}
                onMoveSet={moveSet}
                isExpanded={isExpandedNow}
                onToggleExpansion={toggleExpansion}
                previousBest={
                  previousExerciseData.get(exercise.exerciseName)?.best
                }
                previousSets={
                  previousExerciseData.get(exercise.exerciseName)?.sets
                }
                readOnly={isReadOnly}
                onSwipeToBottom={handleSwipeToBottom}
                swipeSettings={swipeSettings}
                isSwiped={isCollapsed}
                draggable={!isReadOnly}
                isDraggedOver={
                  dragState.dragOverIndex === displayIndex ||
                  dragState.dragOverIndex === displayIndex + 1
                }
                isDragging={
                  dragState.isDragging &&
                  dragState.draggedIndex === displayIndex
                }
                dragOffset={dragState.dragOffset}
                onPointerDown={dragHandlers.onPointerDown}
                setCardElement={(element) =>
                  dragHandlers.setCardElement?.(displayIndex, element)
                }
                preferredUnit={
                  (preferences?.defaultWeightUnit as "kg" | "lbs") ?? "kg"
                }
              />
            </div>
          );
        },
      )}

      {/* No Exercises State */}
      {exercises.length === 0 && (
        <div className="py-6 text-center sm:py-8">
          <p className="text-secondary text-sm sm:text-base">
            No exercises in this template
          </p>
        </div>
      )}

      {/* Bottom action bar - editable only */}
      {!isReadOnly && (
        <div
          className="sticky bottom-2 z-50 pt-4 sm:bottom-4 sm:pt-6"
          role="region"
          aria-label="Workout actions"
        >
          <div className="glass-surface glass-hairline rounded-xl p-2 shadow-lg sm:p-3">
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              <button
                onClick={(e) => {
                  // Avoid double-fire from multiple pointer/mouse handlers or event bubbling
                  e.preventDefault();
                  e.stopPropagation();
                  if ((e as any).nativeEvent?._addSetHandled) return;
                  (e as any).nativeEvent._addSetHandled = true;

                  // Add a set to the first expanded exercise, or first exercise as fallback
                  const targetIndex =
                    expandedExercises[0] !== undefined
                      ? expandedExercises[0]
                      : 0;
                  if (typeof targetIndex === "number") {
                    addSet(targetIndex);
                    // clear undo since a new action happened
                    setLastAction(null);
                    // Haptic + PostHog
                    vibrateSafe(10);
                    try {
                      posthog.capture("haptic_action", { kind: "add_set" });
                    } catch {}
                    // Live announcement
                    try {
                      announce("Set added", { assertive: false });
                    } catch {}
                    // Smooth scroll to bottom to keep newly added set visible
                    try {
                      window.scrollTo({
                        top: document.body.scrollHeight,
                        behavior: "smooth",
                      });
                    } catch {}
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="btn-secondary py-2 text-sm sm:py-3 sm:text-base"
                aria-label="Add set to current exercise"
              >
                Add Set
              </button>

              <button
                onClick={async () => {
                  // PostHog-only telemetry snapshot at save tap
                  try {
                    const theme_used = getThemeUsed();
                    const device_type = getDeviceType();
                    const perf = snapshotMetricsBlob();
                    posthog.capture("workout_save", {
                      theme_used,
                      device_type,
                      tti: perf.tti,
                      tbt: perf.tbt,
                      input_latency_avg: (perf.inputLatency as any)?.avg,
                      input_latency_p95: (perf.inputLatency as any)?.p95,
                    });
                  } catch {}
                  await handleSave();
                  // Haptic feedback on save attempt (short-long-short)
                  vibrateSafe([10, 30, 10]);
                  try {
                    posthog.capture("haptic_action", { kind: "save" });
                  } catch {}
                  // Live announcement
                  try {
                    announce("Workout saved", { assertive: true });
                  } catch {}
                }}
                disabled={saveWorkout.isPending}
                className="btn-secondary py-2 text-sm disabled:opacity-50 sm:py-3 sm:text-base"
                aria-busy={saveWorkout.isPending ? "true" : "false"}
                aria-label="Save workout"
              >
                {saveWorkout.isPending ? "Saving…" : "Save"}
              </button>

              <button
                onClick={() => {
                  openCompleteModal();
                  // Optional subtle haptic to acknowledge opening modal
                  vibrateSafe(10);
                  try {
                    posthog.capture("haptic_action", { kind: "save" });
                  } catch {}
                }}
                className="btn-primary py-2 text-sm sm:py-3 sm:text-base"
              >
                Complete
              </button>
            </div>

            {/* Delete is secondary; keep outside the primary row */}
            <div className="mt-1.5 text-center sm:mt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setLastAction(null);
                  vibrateSafe(10);
                }}
                disabled={deleteWorkout.isPending}
                className="btn-destructive px-3 py-1.5 text-xs font-semibold disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
                aria-describedby="delete-workout-help"
              >
                {deleteWorkout.isPending ? "Deleting…" : "Delete Workout"}
              </button>
              <span id="delete-workout-help" className="sr-only">
                Opens a confirmation dialog
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Read-only Actions */}
      {isReadOnly && (
        <div className="sticky bottom-4 space-y-2 pt-6 sm:space-y-3">
          <Link
            href={`/workout/start?templateId=${session?.templateId}`}
            className="btn-primary block w-full py-2.5 text-center text-base font-medium sm:py-3 sm:text-lg"
          >
            Repeat This Workout
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteWorkout.isPending}
            className="btn-destructive w-full py-2.5 text-base font-medium disabled:opacity-50 sm:py-3 sm:text-lg"
          >
            {deleteWorkout.isPending ? "Deleting..." : "Delete Workout"}
          </button>
          <button
            onClick={() => router.back()}
            className="btn-secondary w-full py-2.5 text-base font-medium sm:py-3 sm:text-lg"
          >
            Back to History
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="bg-opacity-75 bg-background fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-workout-title"
          aria-describedby="delete-workout-desc"
          onClick={() => {
            restoreFocusInline();
            setShowDeleteConfirm(false);
          }}
        >
          <FocusTrap
            onEscape={() => {
              restoreFocusInline();
              setShowDeleteConfirm(false);
            }}
            preventScroll
          >
            <div
              className="card w-full max-w-md p-4 shadow-2xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                id="delete-workout-title"
                className="mb-3 text-lg font-bold text-[var(--color-danger)] sm:mb-4 sm:text-xl"
              >
                Delete Workout
              </h3>
              <p
                id="delete-workout-desc"
                className="text-secondary mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base"
              >
                Are you sure you want to delete this workout?
                <br />
                <strong className="text-[var(--color-danger)]">
                  This action cannot be undone.
                </strong>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    restoreFocusInline();
                    setShowDeleteConfirm(false);
                  }}
                  className="btn-secondary flex-1 py-2.5 text-sm font-medium sm:py-3 sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    restoreFocusInline();
                    setShowDeleteConfirm(false);
                    void handleDelete();
                  }}
                  disabled={deleteWorkout.isPending}
                  className="btn-destructive flex-1 py-2.5 text-sm font-medium disabled:opacity-50 sm:py-3 sm:text-base"
                >
                  {deleteWorkout.isPending ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}

      {/* Complete Workout Modal */}
      {showCompleteModal && (
        <div
          className="bg-opacity-75 bg-background fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-workout-title"
          aria-describedby="complete-workout-desc"
          onClick={() => {
            restoreFocusInline();
            closeCompleteModal();
          }}
        >
          <FocusTrap
            onEscape={() => {
              restoreFocusInline();
              closeCompleteModal();
            }}
            preventScroll
          >
            <div
              className="card w-full max-w-lg p-4 shadow-2xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                id="complete-workout-title"
                className="mb-1 text-lg font-bold text-[var(--color-primary)] sm:text-xl"
              >
                Complete Workout
              </h3>
              <p
                id="complete-workout-desc"
                className="text-secondary mb-3 text-xs sm:mb-4 sm:text-sm"
              >
                Review your performance compared to your previous best for each
                exercise.
              </p>
              <div className="max-h-[50vh] overflow-y-auto pr-1">
                <div className="space-y-3">
                  {exercises.map((ex, idx) => {
                    const curr = computeCurrentBest(ex);
                    const prev = previousExerciseData.get(
                      ex.exerciseName,
                    )?.best;

                    // helpers to compare
                    const currWeight = curr.bestWeight?.weight ?? 0;
                    const prevWeight = prev?.weight ?? 0;
                    const weightDelta = currWeight - prevWeight;
                    const weightBadgeStyle =
                      curr.bestWeight && prev
                        ? weightDelta > 0
                          ? { color: "var(--color-success)" }
                          : weightDelta < 0
                            ? { color: "var(--color-danger)" }
                            : { color: "var(--color-text-muted)" }
                        : { color: "var(--color-text-muted)" };

                    const currVol = curr.bestVolume?.volume ?? 0;
                    const prevVol = (prev?.weight ?? 0) * (prev?.reps ?? 0);
                    const volDelta = currVol - prevVol;
                    const volBadgeStyle =
                      currVol && prev
                        ? volDelta > 0
                          ? { color: "var(--color-success)" }
                          : volDelta < 0
                            ? { color: "var(--color-danger)" }
                            : { color: "var(--color-text-muted)" }
                        : { color: "var(--color-text-muted)" };

                    const fmtSet = (
                      w?: number,
                      r?: number,
                      u?: "kg" | "lbs",
                    ) => (w ? `${w}${u ?? "kg"}${r ? ` × ${r}` : ""}` : "N/A");

                    return (
                      <div
                        key={`${ex.exerciseName}-${idx}`}
                        className="card p-3"
                      >
                        <div className="mb-2 text-sm font-semibold">
                          {ex.exerciseName}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-muted mb-1 text-xs">
                              Previous Best
                            </div>
                            <div>
                              Weight:{" "}
                              {fmtSet(prev?.weight, prev?.reps, prev?.unit)}
                            </div>
                            <div>
                              Volume:{" "}
                              {prev
                                ? (prev.weight ?? 0) * (prev.reps ?? 0)
                                : "N/A"}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted mb-1 text-xs">
                              Current Best
                            </div>
                            <div style={weightBadgeStyle}>
                              Weight:{" "}
                              {fmtSet(
                                curr.bestWeight?.weight,
                                curr.bestWeight?.reps,
                                curr.bestWeight?.unit,
                              )}
                              {prev && curr.bestWeight?.weight !== undefined ? (
                                <span className="ml-2 text-xs opacity-80">
                                  {weightDelta > 0
                                    ? `(+${weightDelta})`
                                    : weightDelta < 0
                                      ? `(${weightDelta})`
                                      : "(=)"}
                                </span>
                              ) : null}
                            </div>
                            <div style={volBadgeStyle}>
                              Volume: {curr.bestVolume?.volume ?? "N/A"}
                              {prev ? (
                                <span className="ml-2 text-xs opacity-80">
                                  {volDelta > 0
                                    ? `(+${volDelta})`
                                    : volDelta < 0
                                      ? `(${volDelta})`
                                      : "(=)"}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 sm:mt-5">
                <button
                  onClick={async () => {
                    closeCompleteModal();
                    await handleSave();
                    // Navigate to main page after successful workout completion
                    router.push("/");
                  }}
                  className="btn-primary flex-1 py-2.5 text-base font-semibold sm:py-3 sm:text-lg"
                >
                  Complete Workout
                </button>
                <button
                  onClick={closeCompleteModal}
                  className="btn-secondary flex-1 py-2.5 text-base font-medium sm:py-3 sm:text-lg"
                >
                  Continue Workout
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}

export function WorkoutSession({ sessionId }: WorkoutSessionProps) {
  const state = useWorkoutSessionState({ sessionId });
  return <WorkoutSessionContent sessionId={sessionId} state={state} />;
}

export function WorkoutSessionWithState(
  props: WorkoutSessionWithStateProps,
) {
  return <WorkoutSessionContent {...props} />;
}
