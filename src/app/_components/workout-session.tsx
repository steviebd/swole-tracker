"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { ExerciseCard, type ExerciseData } from "./exercise-card";
import { type SetData } from "./set-input";
import { ProgressionModal } from "./progression-modal";
import { ProgressionScopeModal } from "./progression-scope-modal";
import { Toast } from "./ui/Toast";
import { useLiveRegion, useAttachLiveRegion } from "./LiveRegion";
import { FocusTrap, useReturnFocus } from "./focus-trap";

interface PreviousBest {
  weight?: number;
  reps?: number;
  sets?: number;
  unit: "kg" | "lbs";
}
import { analytics } from "~/lib/analytics";
import posthog from "posthog-js";
import { vibrate, getDeviceType, getThemeUsed, snapshotMetricsBlob } from "~/lib/client-telemetry";
import { useCacheInvalidation } from "~/hooks/use-cache-invalidation";
import { useUniversalDragReorder } from "~/hooks/use-universal-drag-reorder";
import { type SwipeSettings } from "~/hooks/use-swipe-gestures";
import { useOfflineSaveQueue } from "~/hooks/use-offline-save-queue";
import { useWorkoutSessionState } from "~/hooks/useWorkoutSessionState";

interface WorkoutSessionProps {
  sessionId: number;
}

export function WorkoutSession({ sessionId }: WorkoutSessionProps) {
  const router = useRouter();
  const { onWorkoutSave, invalidateWorkouts } = useCacheInvalidation();

  // Move complex state and effects into a dedicated hook to reduce component size.
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
    progressionModal,
    setProgressionModal,
    hasShownAutoProgression,
    setHasShownAutoProgression,
    progressionScopeModal,
    setProgressionScopeModal,
    saveWorkout,
    deleteWorkout,
    enqueue,
    flush,
    queueSize,
    isFlushing,
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
    buildSavePayload,
    session,
    updatePreferences,
    // undo integration
    lastAction,
    undoLastAction,
    setLastAction,
  } = useWorkoutSessionState({ sessionId });

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

  const [scrollY, setScrollY] = useState(0);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const getItemTop = (index: number) => {
    // Approximate per-card height; lightweight and avoids layout thrash. Cards are fairly uniform in this view.
    const approx = 120; // px
    return index * approx;
  };

  const totalCount = displayOrder.length;
  const shouldVirtualize = totalCount >= VIRTUALIZE_THRESHOLD;

  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const startIndex = shouldVirtualize ? Math.max(0, Math.floor(scrollY / 120) - WINDOW_BEFORE) : 0;
  const endIndex = shouldVirtualize ? Math.min(totalCount - 1, Math.ceil((scrollY + viewportHeight) / 120) + WINDOW_AFTER) : totalCount - 1;

  // Accessibility live region
  const announce = useLiveRegion();
  useAttachLiveRegion(announce);

  // previous data loading handled in hook

  // session initialization handled in hook

  // auto-progression modal logic handled in hook

  // ===== COMPLETE WORKOUT MODAL STATE =====
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  // Focus restore for inline modals
  const { restoreFocus: restoreFocusInline } = useReturnFocus();

  type BestMetrics = {
    bestWeight?: { weight: number; reps?: number; sets?: number; unit: "kg" | "lbs" };
    bestVolume?: { volume: number; weight?: number; reps?: number; unit: "kg" | "lbs" };
  };

  const computeCurrentBest = (ex: ExerciseData): BestMetrics => {
    if (!ex.sets || ex.sets.length === 0) return {};
    // Max weight, tie-break by reps
    const maxWeight = Math.max(...ex.sets.map((s) => s.weight ?? 0));
    const weightCandidates = ex.sets.filter((s) => (s.weight ?? 0) === maxWeight);
    const bestByWeight = weightCandidates.sort((a, b) => (b.reps ?? 0) - (a.reps ?? 0))[0];
    // Max volume (weight * reps)
    const withVolume = ex.sets
      .map((s) => ({ ...s, volume: (s.weight ?? 0) * (s.reps ?? 0) }))
      .filter((s) => s.volume && s.volume > 0);
    const bestByVolume = withVolume.sort((a, b) => (b.volume! - a.volume!))[0];

    return {
      bestWeight: bestByWeight?.weight
        ? { weight: bestByWeight.weight, reps: bestByWeight.reps, sets: bestByWeight.sets, unit: bestByWeight.unit }
        : undefined,
      bestVolume: bestByVolume
        ? { volume: bestByVolume.volume!, weight: bestByVolume.weight, reps: bestByVolume.reps, unit: bestByVolume.unit }
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

  // buildSavePayload provided by hook

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
        sessionId: sessionId.toString(),
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
      if (message.includes("Expected number, received null") || message.includes("invalid_type")) {
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
        <div
          role="status"
          aria-live={notification.type === "error" ? "assertive" : "polite"}
          aria-atomic="true"
          className={`sticky top-4 z-50 rounded-lg p-4 shadow-lg ${
            notification.type === "error" 
              ? "bg-red-900 border border-red-700 text-red-100" 
              : "bg-green-900 border border-green-700 text-green-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="whitespace-pre-line">{notification.message}</div>
            <button
              onClick={() => setNotification(null)}
              aria-label="Dismiss notification"
              className="ml-4 text-lg font-bold opacity-70 hover:opacity-100"
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
        <div className="text-center text-sm text-muted mb-2">
          💡 <strong>Tip:</strong> Swipe ← → to move to bottom • Drag ↕ to reorder & move between sections • Works on mobile & desktop
        </div>
      )}

      {/* Exercise Cards */}
      {(shouldVirtualize
        ? displayOrder.slice(startIndex, endIndex + 1).map((entry, i) => ({ ...entry, windowIndex: startIndex + i }))
        : displayOrder.map((entry, i) => ({ ...entry, windowIndex: i }))
      ).map(({ exercise, originalIndex, windowIndex }) => {
        const displayIndex = windowIndex;
        // Collapsed state is derived from collapsedIndexes mapped to current order
        const isCollapsed = collapsedIndexes.includes(displayIndex);
        const isExpandedNow = !isCollapsed && expandedExercises.includes(originalIndex);

        
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
              isExpanded={isExpandedNow}
              onToggleExpansion={toggleExpansion}
              previousBest={previousExerciseData.get(exercise.exerciseName)?.best}
              previousSets={previousExerciseData.get(exercise.exerciseName)?.sets}
              readOnly={isReadOnly}
              onSwipeToBottom={handleSwipeToBottom}
              swipeSettings={swipeSettings}
              isSwiped={isCollapsed}
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
          <p className="text-secondary">No exercises in this template</p>
        </div>
      )}

      {/* Bottom action bar - editable only */}
      {!isReadOnly && (
        <div className="sticky bottom-4 z-50 pt-6" role="region" aria-label="Workout actions">
          <div className="glass-surface glass-hairline rounded-xl p-3 shadow-lg">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={(e) => {
                  // Avoid double-fire from multiple pointer/mouse handlers or event bubbling
                  e.preventDefault();
                  e.stopPropagation();
                  if ((e as any).nativeEvent?._addSetHandled) return;
                  (e as any).nativeEvent._addSetHandled = true;

                  // Add a set to the first expanded exercise, or first exercise as fallback
                  const targetIndex =
                    expandedExercises[0] !== undefined ? expandedExercises[0] : 0;
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
                      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                    } catch {}
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="btn-secondary py-3"
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
                className="btn-secondary py-3 disabled:opacity-50"
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
                className="btn-primary py-3"
              >
                Complete
              </button>
            </div>

            {/* Offline queue status row */}
            {queueSize > 0 && (
              <div className="mt-3 rounded-lg border p-2 text-xs flex items-center justify-between border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-100">
                <span>
                  {isFlushing
                    ? "Syncing queued workouts…"
                    : `${queueSize} workout${queueSize > 1 ? "s" : ""} pending sync`}
                </span>
                <button
                  onClick={() => {
                    try {
                      announce("Syncing queued workouts", { assertive: false });
                    } catch {}
                    void flush();
                  }}
                  className="ml-3 rounded border border-yellow-300 px-2 py-0.5 text-[11px] font-medium hover:bg-yellow-100 dark:border-yellow-600 dark:hover:bg-yellow-900/50"
                  aria-label="Sync queued workouts now"
                >
                  Sync now
                </button>
              </div>
            )}

            {/* Delete is secondary; keep outside the primary row */}
            <div className="mt-2 text-center">
              <button
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setLastAction(null);
                  vibrateSafe(10);
                }}
                disabled={deleteWorkout.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-red-700 disabled:opacity-50"
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
        <div className="sticky bottom-4 space-y-3 pt-6">
          <Link
            href={`/workout/start?templateId=${session?.templateId}`}
            className="btn-primary block w-full py-3 text-center text-lg font-medium"
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
              className="w-full max-w-md card p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="delete-workout-title" className="mb-4 text-xl font-bold text-rose-600 dark:text-rose-400">
                Delete Workout
              </h3>
              <p id="delete-workout-desc" className="mb-6 leading-relaxed text-secondary">
                Are you sure you want to delete this workout?
                <br />
                <strong className="text-red-400">
                  This action cannot be undone.
                </strong>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    restoreFocusInline();
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 rounded-lg bg-gray-200 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
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
                  className="flex-1 rounded-lg bg-red-600 py-3 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteWorkout.isPending ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </FocusTrap>
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
              className="w-full max-w-lg card p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="complete-workout-title" className="mb-1 text-xl font-bold text-purple-700 dark:text-purple-300">
                Complete Workout
              </h3>
              <p id="complete-workout-desc" className="mb-4 text-sm text-secondary">
                Review your performance compared to your previous best for each exercise.
              </p>
              <div className="max-h-[50vh] overflow-y-auto pr-1">
                <div className="space-y-3">
                  {exercises.map((ex, idx) => {
                    const curr = computeCurrentBest(ex);
                    const prev = previousExerciseData.get(ex.exerciseName)?.best;

                    // helpers to compare
                    const currWeight = curr.bestWeight?.weight ?? 0;
                    const prevWeight = prev?.weight ?? 0;
                    const weightDelta = currWeight - prevWeight;
                    const weightBadge =
                      curr.bestWeight && prev
                        ? weightDelta > 0
                          ? "text-green-300"
                          : weightDelta < 0
                          ? "text-red-300"
                          : "text-gray-300"
                        : "text-gray-300";

                    const currVol = curr.bestVolume?.volume ?? 0;
                    const prevVol = (prev?.weight ?? 0) * (prev?.reps ?? 0);
                    const volDelta = currVol - prevVol;
                    const volBadge =
                      currVol && prev
                        ? volDelta > 0
                          ? "text-green-300"
                          : volDelta < 0
                          ? "text-red-300"
                          : "text-gray-300"
                        : "text-gray-300";

                    const fmtSet = (w?: number, r?: number, u?: "kg" | "lbs") =>
                      w ? `${w}${u ?? "kg"}${r ? ` × ${r}` : ""}` : "N/A";

                    return (
                      <div key={`${ex.exerciseName}-${idx}`} className="card p-3">
                        <div className="mb-2 text-sm font-semibold">{ex.exerciseName}</div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-muted mb-1">Previous Best</div>
                            <div>Weight: {fmtSet(prev?.weight, prev?.reps, prev?.unit)}</div>
                            <div>Volume: {prev ? (prev.weight ?? 0) * (prev.reps ?? 0) : "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted mb-1">Current Best</div>
                            <div className={weightBadge}>
                              Weight: {fmtSet(curr.bestWeight?.weight, curr.bestWeight?.reps, curr.bestWeight?.unit)}
                              {prev && curr.bestWeight?.weight !== undefined ? (
                                <span className="ml-2 text-xs opacity-80">
                                  {weightDelta > 0 ? `(+${weightDelta})` : weightDelta < 0 ? `(${weightDelta})` : "(=)"}
                                </span>
                              ) : null}
                            </div>
                            <div className={volBadge}>
                              Volume: {curr.bestVolume?.volume ?? "N/A"}
                              {prev ? (
                                <span className="ml-2 text-xs opacity-80">
                                  {volDelta > 0 ? `(+${volDelta})` : volDelta < 0 ? `(${volDelta})` : "(=)"}
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
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={async () => {
                    closeCompleteModal();
                    await handleSave();
                    // Navigate to history immediately after existing save flow handles navigation/notifications
                  }}
                  className="btn-primary flex-1 py-3 text-lg font-semibold"
                >
                  Complete Workout
                </button>
                <button
                  onClick={closeCompleteModal}
                  className="flex-1 rounded-lg bg-gray-200 py-3 text-lg font-medium transition-colors hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
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
