"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExerciseCard, type ExerciseData } from "./exercise-card";
import { Toast } from "./ui/Toast";
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
import { useWorkoutSessionState } from "~/hooks/useWorkoutSessionState";

interface WorkoutSessionProps {
  sessionId: number;
}

export function WorkoutSession({ sessionId }: WorkoutSessionProps) {
  const router = useRouter();
  const {
    onWorkoutSave: _onWorkoutSave,
    invalidateWorkouts: _invalidateWorkouts,
  } = useCacheInvalidation();

  // Move complex state and effects into a dedicated hook to reduce component size.
  // This MUST be called before any conditional returns to follow Rules of Hooks
  const {
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
    saveWorkout,
    deleteWorkout,
    enqueue,
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
    updatePreferences: _updatePreferences,
    // undo integration
    lastAction,
    undoLastAction,
    setLastAction,
  } = useWorkoutSessionState({ sessionId });

  // Additional hooks that must be called before conditional returns
  const [scrollY, setScrollY] = useState(0);
  const _listContainerRef = useRef<HTMLDivElement | null>(null);
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

  const _getItemTop = (_index: number) => {
    // Approximate per-card height; lightweight and avoids layout thrash. Cards are fairly uniform in this view.
    const approx = 120; // px
    return _index * approx;
  };

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
    if (!ex.sets || ex.sets.length === 0) return {};
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
      setNotification({
        type: "error",
        message: `Please fix the following errors before saving:\n${validationErrors.join("\n")}`,
      });
      setTimeout(() => setNotification(null), 8000); // Auto-dismiss after 8 seconds
      return;
    }

    try {
      const payload = buildSavePayload();

      // If offline, enqueue and notify
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        enqueue(payload);
        setNotification({
          type: "success",
          message:
            "You’re offline. Workout queued and will sync automatically when back online. You can also tap 'Sync now' in the status bar.",
        });
        // No navigation here; let user remain on page
        setTimeout(() => setNotification(null), 6000);
        return;
      }

      // Try online save
      await saveWorkout.mutateAsync(payload);

      // Show success notification briefly before navigation
      setNotification({
        type: "success",
        message: "Workout saved successfully!",
      });
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
        enqueue(payload);
        setNotification({
          type: "success",
          message:
            "Network issue detected. Workout queued and will sync automatically on reconnect.",
        });
        setTimeout(() => setNotification(null), 6000);
        return;
      }

      // Otherwise surface validation/unknown error
      if (
        message.includes("Expected number, received null") ||
        message.includes("invalid_type")
      ) {
        setNotification({
          type: "error",
          message:
            "Please make sure all exercise fields are properly filled out. Empty fields should be left blank, not contain invalid values.",
        });
      } else {
        setNotification({
          type: "error",
          message: `Error saving workout: ${message || "Unknown error"}`,
        });
      }
      setTimeout(() => setNotification(null), 6000);
    }
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
      router.push("/");
    }
  };

  if (loading || !session) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {[...(Array(3) as number[])].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg p-3 sm:p-4" style={{ backgroundColor: "var(--color-bg-surface)" }}>
            <div className="mb-3 sm:mb-4 h-3 sm:h-4 w-1/2 rounded" style={{ backgroundColor: "var(--color-border)" }}></div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="h-8 sm:h-10 rounded" style={{ backgroundColor: "var(--color-border)" }}></div>
              <div className="h-8 sm:h-10 rounded" style={{ backgroundColor: "var(--color-border)" }}></div>
              <div className="h-8 sm:h-10 rounded" style={{ backgroundColor: "var(--color-border)" }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Notification */}
      {notification && (
        <div
          role="status"
          aria-live={notification.type === "error" ? "assertive" : "polite"}
          aria-atomic="true"
          className={`sticky top-2 sm:top-4 z-50 rounded-lg p-3 sm:p-4 shadow-lg ${
            notification.type === "error"
              ? `border-red-700 bg-red-900 text-red-100`
              : `border-green-700 bg-green-900 text-green-100`
          }"
          style={{
            borderColor: notification.type === "error" ? "var(--color-danger)" : "var(--color-success)",
            backgroundColor: notification.type === "error" 
              ? "color-mix(in oklch, var(--color-danger) 20%, var(--color-bg-surface) 80%)"
              : "color-mix(in oklch, var(--color-success) 20%, var(--color-bg-surface) 80%)",
            color: "var(--color-text)"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="whitespace-pre-line text-sm sm:text-base min-w-0 flex-1">{notification.message}</div>
            <button
              onClick={() => setNotification(null)}
              aria-label="Dismiss notification"
              className="text-lg sm:text-xl font-bold opacity-70 hover:opacity-100 flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Persistent Undo (global) */}
      {lastAction && (
        <div className="sticky bottom-4 z-[60]">
          <Toast
            open={true}
            type="info"
            message={
              lastAction.type === "swipeToEnd"
                ? "Exercise moved to end"
                : lastAction.type === "toggleCollapse"
                  ? "Exercise expanded state changed"
                  : "Order changed"
            }
            onUndo={() => {
              undoLastAction();
            }}
            onClose={() => setLastAction(null)}
          />
        </div>
      )}

      {/* Gesture Help (only show if not read-only and has exercises) */}
      {!isReadOnly && exercises.length > 0 && (
        <div className="text-muted mb-2 text-center text-xs sm:text-sm px-2">
          💡 <strong>Tip:</strong> Swipe ← → to move to bottom • Drag ↕ to
          reorder & move between sections • Works on mobile & desktop
        </div>
      )}

      {/* Exercise Cards */}
      {(shouldVirtualize
        ? displayOrder
            .slice(startIndex, endIndex + 1)
            .map((entry, i) => ({ ...entry, windowIndex: startIndex + i }))
        : displayOrder.map((entry, i) => ({ ...entry, windowIndex: i }))
      ).map(({ exercise, originalIndex, windowIndex }) => {
        const displayIndex = windowIndex;
        // Collapsed state is derived from collapsedIndexes mapped to current order
        const isCollapsed = collapsedIndexes.includes(displayIndex);
        const isExpandedNow =
          !isCollapsed && expandedExercises.includes(originalIndex);

        return (
          <div
            key={exercise.templateExerciseId ?? originalIndex}
            style={shouldVirtualize ? { minHeight: 0 } : undefined}
          >
            {/* Swiped Exercises Section Header */}
            <ExerciseCard
              exercise={exercise}
              exerciseIndex={originalIndex}
              onUpdate={updateSet}
              onToggleUnit={toggleUnit}
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
                dragState.isDragging && dragState.draggedIndex === displayIndex
              }
              dragOffset={dragState.dragOffset}
              onPointerDown={dragHandlers.onPointerDown(displayIndex)}
              setCardElement={(element) =>
                dragHandlers.setCardElement?.(displayIndex, element)
              }
            />
          </div>
        );
      })}

      {/* No Exercises State */}
      {exercises.length === 0 && (
        <div className="py-6 sm:py-8 text-center">
          <p className="text-secondary text-sm sm:text-base">No exercises in this template</p>
        </div>
      )}

      {/* Bottom action bar - editable only */}
      {!isReadOnly && (
        <div
          className="sticky bottom-2 sm:bottom-4 z-50 pt-4 sm:pt-6"
          role="region"
          aria-label="Workout actions"
        >
          <div className="glass-surface glass-hairline rounded-xl p-2 sm:p-3 shadow-lg">
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
                className="btn-secondary py-2 sm:py-3 text-sm sm:text-base"
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
                className="btn-secondary py-2 sm:py-3 text-sm sm:text-base disabled:opacity-50"
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
                className="btn-primary py-2 sm:py-3 text-sm sm:text-base"
              >
                Complete
              </button>
            </div>

            {/* Delete is secondary; keep outside the primary row */}
            <div className="mt-1.5 sm:mt-2 text-center">
              <button
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setLastAction(null);
                  vibrateSafe(10);
                }}
                disabled={deleteWorkout.isPending}
                className="btn-destructive px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold disabled:opacity-50"
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
        <div className="sticky bottom-4 space-y-2 sm:space-y-3 pt-6">
          <Link
            href={`/workout/start?templateId=${session?.templateId}`}
            className="btn-primary block w-full py-2.5 sm:py-3 text-center text-base sm:text-lg font-medium"
          >
            Repeat This Workout
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteWorkout.isPending}
            className="btn-destructive w-full py-2.5 sm:py-3 text-base sm:text-lg font-medium disabled:opacity-50"
          >
            {deleteWorkout.isPending ? "Deleting..." : "Delete Workout"}
          </button>
          <button
            onClick={() => router.back()}
            className="btn-secondary w-full py-2.5 sm:py-3 text-base sm:text-lg font-medium"
          >
            Back to History
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="bg-opacity-75 fixed inset-0 z-[9999] flex items-center justify-center bg-black p-4"
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
              className="card w-full max-w-md p-4 sm:p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                id="delete-workout-title"
                className="mb-3 sm:mb-4 text-lg sm:text-xl font-bold"
                style={{ color: "var(--color-danger)" }}
              >
                Delete Workout
              </h3>
              <p
                id="delete-workout-desc"
                className="text-secondary mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base"
              >
                Are you sure you want to delete this workout?
                <br />
                <strong style={{ color: "var(--color-danger)" }}>
                  This action cannot be undone.
                </strong>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    restoreFocusInline();
                    setShowDeleteConfirm(false);
                  }}
                  className="btn-secondary flex-1 py-2.5 sm:py-3 font-medium text-sm sm:text-base"
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
                  className="btn-destructive flex-1 py-2.5 sm:py-3 font-medium text-sm sm:text-base disabled:opacity-50"
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
          className="bg-opacity-75 fixed inset-0 z-[9999] flex items-center justify-center bg-black p-4"
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
              className="card w-full max-w-lg p-4 sm:p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                id="complete-workout-title"
                className="mb-1 text-lg sm:text-xl font-bold"
                style={{ color: "var(--color-primary)" }}
              >
                Complete Workout
              </h3>
              <p
                id="complete-workout-desc"
                className="text-secondary mb-3 sm:mb-4 text-xs sm:text-sm"
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
                    const weightBadgeStyle = curr.bestWeight && prev
                      ? weightDelta > 0
                        ? { color: "var(--color-success)" }
                        : weightDelta < 0
                          ? { color: "var(--color-danger)" }
                          : { color: "var(--color-text-muted)" }
                      : { color: "var(--color-text-muted)" };

                    const currVol = curr.bestVolume?.volume ?? 0;
                    const prevVol = (prev?.weight ?? 0) * (prev?.reps ?? 0);
                    const volDelta = currVol - prevVol;
                    const volBadgeStyle = currVol && prev
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
              <div className="mt-4 sm:mt-5 flex items-center gap-3">
                <button
                  onClick={async () => {
                    closeCompleteModal();
                    await handleSave();
                    // Navigate to main page after successful workout completion
                    router.push("/");
                  }}
                  className="btn-primary flex-1 py-2.5 sm:py-3 text-base sm:text-lg font-semibold"
                >
                  Complete Workout
                </button>
                <button
                  onClick={closeCompleteModal}
                  className="btn-secondary flex-1 py-2.5 sm:py-3 text-base sm:text-lg font-medium"
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
