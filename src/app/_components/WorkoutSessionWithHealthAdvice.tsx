"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "~/components/ui/button";
import {
  WorkoutSessionWithState,
} from "~/app/_components/workout-session";
import { ReadinessIndicator } from "~/app/_components/health-advice/ReadinessIndicator";
import { SetSuggestions } from "~/app/_components/health-advice/SetSuggestions";
import { ProbabilityGauge } from "~/app/_components/health-advice/ProbabilityGauge";
import { AISummary } from "~/app/_components/health-advice/AISummary";
import { SubjectiveWellnessModal } from "~/app/_components/health-advice/SubjectiveWellnessModal";
import { ManualWellnessModal } from "~/app/_components/health-advice/ManualWellnessModal";
import { RecoveryRecommendationsCard } from "~/app/_components/health-advice/RecoveryRecommendationsCard";
import { useHealthAdvice } from "~/hooks/useHealthAdvice";
import { api } from "~/trpc/react";
import { logger } from "~/lib/logger";
import { Toast, type ToastType } from "~/components/ui/toast";
import type { AdviceDataSource } from "~/lib/analytics/health-advice";
import type {
  HealthAdviceRequest,
  HealthAdviceResponse,
} from "~/server/api/schemas/health-advice";
import type {
  SubjectiveWellnessData,
  ManualWellnessData,
} from "~/lib/subjective-wellness-mapper";
import {
  useWorkoutSessionContext,
  type AcceptSuggestionPayload,
} from "~/contexts/WorkoutSessionContext";
import type { ExerciseData } from "~/app/_components/exercise-card";
import { findHighestWeightSetIndex } from "~/lib/workout/suggestion-helpers";

interface WorkoutSessionWithHealthAdviceProps {
  sessionId: number;
  // These would come from WHOOP integration and user profile
  whoopData?: {
    recovery_score?: number;
    sleep_performance?: number;
    hrv_now_ms?: number;
    hrv_baseline_ms?: number;
    rhr_now_bpm?: number;
    rhr_baseline_bpm?: number;
    yesterday_strain?: number;
  };
  userProfile?: {
    experience_level: "beginner" | "intermediate" | "advanced";
    min_increment_kg?: number;
    preferred_rpe?: number;
  };
  workoutPlan?: HealthAdviceRequest["workout_plan"];
  priorBests?: HealthAdviceRequest["prior_bests"];
  onAcceptSuggestion?: (params: AcceptSuggestionPayload) => void;
}

type IntegrationState = "never_connected" | "disconnected" | "connected";
type AdviceSource = AdviceDataSource;

function getIntegrationState(status: {
  hasIntegration: boolean;
  isConnected: boolean;
}): IntegrationState {
  if (status.isConnected) return "connected";
  if (status.hasIntegration) return "disconnected";
  return "never_connected";
}

export function WorkoutSessionWithHealthAdvice({
  sessionId,
  whoopData,
  userProfile,
  workoutPlan,
  priorBests,
  onAcceptSuggestion,
}: WorkoutSessionWithHealthAdviceProps) {
  // Get the workout session context for UI state updates
  const { exercises, sessionState } = useWorkoutSessionContext();

  const findExerciseState = useCallback(
    (templateExerciseId: number, exerciseName: string) => {
      if (!Array.isArray(exercises)) {
        return { exercise: undefined as ExerciseData | undefined, index: -1 };
      }

      const byTemplateIndex = exercises.findIndex(
        (exercise) => exercise.templateExerciseId === templateExerciseId,
      );

      if (byTemplateIndex !== -1) {
        return {
          exercise: exercises[byTemplateIndex] as ExerciseData,
          index: byTemplateIndex,
        };
      }

      const byNameIndex = exercises.findIndex(
        (exercise) => exercise.exerciseName === exerciseName,
      );

      return {
        exercise: byNameIndex !== -1 ? (exercises[byNameIndex] as ExerciseData) : undefined,
        index: byNameIndex,
      };
    },
    [exercises],
  );

  const getHighestWeightSetIndex = useCallback(
    (exercise?: ExerciseData) => findHighestWeightSetIndex(exercise),
    [],
  );

  const [showHealthAdvice, setShowHealthAdvice] = useState(false);
  const [showWellnessModal, setShowWellnessModal] = useState(false);
  const [showManualWellnessModal, setShowManualWellnessModal] = useState(false);
  const [wellnessSubmitError, setWellnessSubmitError] = useState<string | null>(
    null,
  );
  const [isSubmittingWellness, setIsSubmittingWellness] = useState(false);
  const [toastState, setToastState] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);
  const [lastAdviceSource, setLastAdviceSource] =
    useState<AdviceSource>("unknown");
  const suggestionInteractionStartRef = useRef<number | null>(null);

  const {
    advice,
    loading,
    error,
    fetchAdvice,
    fetchAdviceWithSubjectiveData,
    fetchAdviceWithManualWellness,
    hasExistingAdvice,
    whoopStatus,
    acceptSuggestion,
    rejectSuggestion,
  } = useHealthAdvice(sessionId);

  // Fetch the actual workout session to get template exercises
  const { data: workoutSession } = api.workouts.getById.useQuery(
    { id: sessionId },
    { enabled: !!sessionId },
  );

  // Calculate elapsed time (simplified - in a real app this would track actual session time)
  const elapsedTime = React.useMemo(() => {
    if (!workoutSession?.workoutDate) return "0:00";
    const startTime = new Date(workoutSession.workoutDate);
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [workoutSession?.workoutDate]);

  // Get template name
  const templateName = React.useMemo(() => {
    const template = (workoutSession as { template?: unknown })?.template;
    if (
      template &&
      typeof template === "object" &&
      !Array.isArray(template) &&
      typeof (template as { name?: unknown }).name === "string"
    ) {
      return (template as { name: string }).name;
    }
    return "Workout";
  }, [workoutSession]);

  // Fetch user preferences to determine which wellness modal to show
  const { data: userPreferences } = api.preferences.get.useQuery();
  const isManualWellnessEnabled =
    userPreferences?.enable_manual_wellness ?? false;
  const integrationState = useMemo(
    () => getIntegrationState(whoopStatus),
    [whoopStatus],
  );
  const manualFallbackAvailable =
    isManualWellnessEnabled && integrationState !== "connected";
  const primaryActionLabel = useMemo(() => {
    if (loading || isSubmittingWellness) {
      return "Getting AI Advice...";
    }

    if (hasExistingAdvice) {
      return "🔄 Refresh Workout Intelligence";
    }

    if (integrationState === "never_connected") {
      return isManualWellnessEnabled
        ? "🎯 Quick Wellness Check"
        : "🤖 Get Workout Intelligence";
    }

    if (integrationState === "disconnected") {
      return "🔌 Reconnect WHOOP";
    }

    return "🤖 Get Workout Intelligence";
  }, [
    hasExistingAdvice,
    integrationState,
    isManualWellnessEnabled,
    isSubmittingWellness,
    loading,
  ]);

  // Wellness mutations
  const saveWellness = api.wellness.save.useMutation();

  // Use actual data from props or provide reasonable defaults
  const actualWhoopData = whoopData;

  const actualUserProfile = userProfile || {
    experience_level: "intermediate" as const,
    min_increment_kg: 2.5,
    preferred_rpe: 8,
  };

  const templateExercises = React.useMemo(
    () =>
      workoutSession?.template &&
      typeof workoutSession.template === "object" &&
      !Array.isArray(workoutSession.template) &&
      Array.isArray(
        (workoutSession.template as { exercises?: unknown }).exercises,
      )
        ? (
            workoutSession.template as {
              exercises: Array<{
                id: number;
                exerciseName: string;
              }>;
            }
          ).exercises
        : undefined,
    [workoutSession],
  );

  // Build dynamic workout plan from actual session template data
  const dynamicWorkoutPlan = React.useMemo(() => {
    if (!templateExercises) {
      return (
        workoutPlan || {
          exercises: [],
        }
      );
    }

    // Create workout plan from template exercises
    const exercises = templateExercises.map((templateExercise) => {
      // Get existing session exercises for this template exercise to determine set count
      const existingSessionSets = Array.isArray(
        (workoutSession as { exercises?: unknown })?.exercises,
      )
        ? (
            workoutSession as {
              exercises: Array<{
                exerciseName?: string;
                reps?: number | null;
                weight?: string | null;
                rpe?: number | null;
              }>;
            }
          ).exercises.filter(
            (ex) => ex.exerciseName === templateExercise.exerciseName,
          )
        : [];

      // Determine how many sets to generate (use existing data or default to 3)
      const setCount =
        existingSessionSets.length > 0 ? existingSessionSets.length : 3;

      // Generate sets with data from existing session exercises or defaults
      const sets = Array.from({ length: setCount }, (_, setIndex) => {
        const existingSet = existingSessionSets[setIndex];
        return {
          set_id: `${templateExercise.id}_${setIndex + 1}`, // Use template exercise ID for consistency
          target_reps: existingSet?.reps || null,
          target_weight_kg: existingSet?.weight
            ? parseFloat(existingSet.weight)
            : null,
          target_rpe: existingSet?.rpe || null,
        };
      });

      return {
        exercise_id: templateExercise.id.toString(), // Use template exercise ID for consistency
        name: templateExercise.exerciseName, // Include original name for later reference
        tags: ["strength"] as ("strength" | "hypertrophy" | "endurance")[], // Default tag, could be enhanced with template metadata
        sets,
      };
    });

    return { exercises };
  }, [templateExercises, workoutSession, workoutPlan]);

  const actualPriorBests = priorBests || { by_exercise_id: {} };

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      setToastState({ message, type });
    },
    [],
  );

  const dismissToast = useCallback(() => {
    setToastState(null);
  }, []);

  const getInteractionTimeMs = useCallback(() => {
    const start = suggestionInteractionStartRef.current;
    if (!start) return undefined;
    const elapsed = Math.round(performance.now() - start);
    return elapsed > 0 ? elapsed : undefined;
  }, []);

  // Show existing advice automatically and track interaction timing
  useEffect(() => {
    if (hasExistingAdvice && advice) {
      setShowHealthAdvice(true);
    }

    if (advice) {
      suggestionInteractionStartRef.current = performance.now();
    } else {
      suggestionInteractionStartRef.current = null;
    }
  }, [hasExistingAdvice, advice]);

  const handleGetHealthAdvice = async () => {
    if (integrationState === "disconnected") {
      if (manualFallbackAvailable) {
        showToast(
          "WHOOP looks disconnected. We'll use a quick wellness check for now.",
          "warning",
        );
        setShowManualWellnessModal(true);
      } else {
        showToast(
          "WHOOP connection requires attention. Reconnect to keep insights flowing.",
          "info",
        );
        handleConnectWhoop();
      }
      return;
    }

    if (whoopStatus.isConnected) {
      const request: HealthAdviceRequest = {
        session_id: sessionId.toString(),
        user_profile: actualUserProfile,
        whoop: actualWhoopData!,
        workout_plan: dynamicWorkoutPlan,
        prior_bests: actualPriorBests,
      };

      try {
        await fetchAdvice(request);
        setLastAdviceSource("whoop");
        setShowHealthAdvice(true);
      } catch (error) {
        logger.error("Failed to fetch WHOOP-backed health advice", error, {
          sessionId,
        });
        showToast(
          "We couldn't fetch WHOOP insights right now. Please try again.",
          "error",
        );
      }
      return;
    }

    if (isManualWellnessEnabled) {
      setShowManualWellnessModal(true);
      return;
    }

    setShowWellnessModal(true);
  };

  const handleSubjectiveWellnessSubmit = async (
    subjectiveData: SubjectiveWellnessData,
  ) => {
    setShowWellnessModal(false);

    const request = {
      session_id: sessionId.toString(),
      user_profile: actualUserProfile,
      workout_plan: dynamicWorkoutPlan,
      prior_bests: actualPriorBests,
    };

    try {
      await fetchAdviceWithSubjectiveData(request, subjectiveData);
      setLastAdviceSource("subjective");
      setShowHealthAdvice(true);
    } catch (error) {
      logger.error("Failed to process subjective wellness submission", error, {
        sessionId,
      });
      showToast(
        "We couldn't use your wellness inputs. Please try again.",
        "error",
      );
    }
  };

  const handleManualWellnessSubmit = async (manualData: ManualWellnessData) => {
    setIsSubmittingWellness(true);
    setWellnessSubmitError(null);

    try {
      // First, save wellness data to database
      const wellnessResult = await saveWellness.mutateAsync({
        sessionId,
        energyLevel: manualData.energyLevel,
        sleepQuality: manualData.sleepQuality,
        deviceTimezone: manualData.deviceTimezone,
        notes: manualData.notes,
        hasWhoopData: false, // Manual input means no WHOOP data
      });

      // Then fetch health advice with wellness data
      const request = {
        session_id: sessionId.toString(),
        user_profile: actualUserProfile,
        workout_plan: dynamicWorkoutPlan,
        prior_bests: actualPriorBests,
      };

      if (wellnessResult?.id) {
        await fetchAdviceWithManualWellness(
          request,
          manualData,
          wellnessResult.id,
        );
      } else {
        // Fallback to health advice without wellness data if save failed
        console.warn(
          "Wellness data save returned no ID, proceeding without wellness tracking",
        );
        await fetchAdviceWithManualWellness(request, manualData);
      }

      setShowManualWellnessModal(false);
      setLastAdviceSource("manual");
      setShowHealthAdvice(true);
      showToast(
        "Wellness check saved. Generating fresh suggestions.",
        "success",
      );
    } catch (error) {
      console.error("Failed to submit manual wellness:", error);
      setWellnessSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to submit wellness data. Please try again.",
      );
      showToast(
        "We couldn't save your wellness check. Please try again.",
        "error",
      );
    } finally {
      setIsSubmittingWellness(false);
    }
  };

  const handleConnectWhoop = () => {
    // Redirect to WHOOP connection page
    window.open("/connect-whoop", "_blank");
  };

  const trackSuggestionInteraction =
    api.suggestions.trackInteraction.useMutation();

  const resolveSetContext = useCallback(
    (
      setId: string,
    ): {
      templateExerciseId: number;
      setIndex: number;
      actualExerciseName: string;
      setAdvice:
        | {
            suggested_weight_kg: number | null | undefined;
            suggested_reps: number | null | undefined;
            suggested_rest_seconds: number | null | undefined;
            rationale: string;
          }
        | undefined;
    } | null => {
      // Handle both formats: templateExerciseId_setIndex and templateExerciseId_highest
      const match = /^(\d+)_(?:(\d+)|highest)$/.exec(setId);
      if (!match) {
        console.error(
          "Invalid setId format:",
          setId,
          "Expected format: templateExerciseId_setIndex or templateExerciseId_highest",
        );
        return null;
      }

      const templateExerciseId = Number.parseInt(match[1] ?? "", 10);
      const isHighest = match[2] === undefined; // If no second group, it's "highest"
      let setIndex: number;

      if (!Number.isFinite(templateExerciseId)) {
        console.error(
          "Unable to parse template exercise information from setId:",
          setId,
        );
        return null;
      }

      if (!templateExercises) {
        console.error(
          "Template exercises are unavailable when processing set:",
          setId,
        );
        return null;
      }

      const templateExercise = templateExercises.find(
        (ex) => ex.id === templateExerciseId,
      );

      if (!templateExercise) {
        console.error(
          "Could not find template exercise for ID:",
          templateExerciseId,
        );
        return null;
      }

      const actualExerciseName = templateExercise.exerciseName;
      const { exercise: matchingExercise } = findExerciseState(
        templateExerciseId,
        actualExerciseName,
      );

      if (isHighest) {
        setIndex = getHighestWeightSetIndex(matchingExercise);
      } else {
        setIndex = Number.parseInt(match[2] ?? "", 10) - 1;
        if (setIndex < 0) {
          console.error("Invalid set index in setId:", setId);
          return null;
        }
      }

      if (matchingExercise?.sets?.length) {
        const maxIndex = matchingExercise.sets.length - 1;
        if (setIndex > maxIndex) {
          setIndex = maxIndex;
        }
      }

      const exerciseAdvice = advice?.per_exercise.find(
        (ex) =>
          ex.exercise_id === templateExerciseId.toString() ||
          ex.name === actualExerciseName,
      );
      // For "highest" format, get the single set advice (should be the only set)
      const setAdvice = isHighest
        ? exerciseAdvice?.sets[0]
        : exerciseAdvice?.sets.find((s) => s.set_id === setId);

      return {
        templateExerciseId,
        setIndex,
        actualExerciseName,
        setAdvice: setAdvice
          ? {
              suggested_weight_kg: setAdvice.suggested_weight_kg,
              suggested_reps: setAdvice.suggested_reps,
              suggested_rest_seconds: setAdvice.suggested_rest_seconds,
              rationale: setAdvice.rationale,
            }
          : undefined,
      };
    },
    [advice, templateExercises, findExerciseState, getHighestWeightSetIndex],
  );

  const handleAcceptSuggestion = async (
    setId: string,
    suggestion: { weight?: number; reps?: number; restSeconds?: number },
  ) => {
    const context = resolveSetContext(setId);
    if (!context) return;

    const { actualExerciseName, setAdvice, templateExerciseId } = context;
    const setIndex = context.setIndex;
    const interactionTimeMs = getInteractionTimeMs();

    try {
      // Use the callback to update UI state if provided, otherwise warn for missing handler
      if (onAcceptSuggestion) {
        onAcceptSuggestion({
          exerciseName: actualExerciseName,
          templateExerciseId,
          setIndex,
          suggestion,
        });
      } else {
        console.warn(
          "No onAcceptSuggestion handler provided; suggestion not applied",
        );
        return;
      }

      if (setAdvice) {
        try {
          await trackSuggestionInteraction.mutateAsync({
            sessionId,
            exerciseName: actualExerciseName,
            setId,
            setIndex,
            suggestedWeightKg: setAdvice.suggested_weight_kg ?? undefined,
            suggestedReps: setAdvice.suggested_reps ?? undefined,
            suggestedRestSeconds: setAdvice.suggested_rest_seconds ?? undefined,
            suggestionRationale: setAdvice.rationale,
            action: "accepted",
            acceptedWeightKg: suggestion.weight,
            acceptedReps: suggestion.reps,
            progressionType: userPreferences?.progression_type ?? "adaptive",
            readinessScore: advice?.readiness.rho,
            plateauDetected:
              setAdvice.rationale.includes("Plateau Alert") ||
              setAdvice.rationale.includes("plateau detected"),
            interactionTimeMs,
          });
        } catch (trackingError) {
          console.warn(
            "Failed to track suggestion interaction:",
            trackingError,
          );
        }
      }

      await acceptSuggestion();
      showToast("Suggestion applied to your workout.", "success");
      logger.info("suggestion_applied", {
        setId,
        suggestion,
        exerciseName: actualExerciseName,
        setIndex,
        sessionId,
      });
    } catch (error) {
      logger.error("Failed to apply suggestion", error, { setId, sessionId });
      showToast(
        "We couldn't apply that suggestion. Please try again.",
        "error",
      );
    }
  };

  const handleOverrideSuggestion = async (setId: string) => {
    const context = resolveSetContext(setId);
    if (!context) return;

    const { actualExerciseName, setAdvice } = context;
    const setIndex = context.setIndex;
    const interactionTimeMs = getInteractionTimeMs();

    if (setAdvice) {
      try {
        await trackSuggestionInteraction.mutateAsync({
          sessionId,
          exerciseName: actualExerciseName,
          setId,
          setIndex,
          suggestedWeightKg: setAdvice.suggested_weight_kg ?? undefined,
          suggestedReps: setAdvice.suggested_reps ?? undefined,
          suggestedRestSeconds: setAdvice.suggested_rest_seconds ?? undefined,
          suggestionRationale: setAdvice.rationale,
          action: "rejected",
          progressionType: userPreferences?.progression_type ?? "adaptive",
          readinessScore: advice?.readiness.rho,
          plateauDetected:
            setAdvice.rationale.includes("Plateau Alert") ||
            setAdvice.rationale.includes("plateau detected"),
          interactionTimeMs,
        });
      } catch (trackingError) {
        console.warn("Failed to track rejected suggestion:", trackingError);
      }
    }

    try {
      await rejectSuggestion();
      showToast("Suggestion dismissed.", "info");
    } catch (error) {
      logger.error("Failed to mark suggestion as rejected", error, {
        setId,
        sessionId,
      });
      showToast(
        "We couldn't record that dismissal. Please try again.",
        "error",
      );
    }

    logger.info("suggestion_rejected", {
      setId,
      exerciseName: actualExerciseName,
      setIndex,
      sessionId,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {toastState && (
        <Toast
          open
          type={toastState.type}
          message={toastState.message}
          onClose={dismissToast}
        />
      )}

      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={handleGetHealthAdvice}
          disabled={loading || isSubmittingWellness}
          variant="default"
          size="lg"
        >
          {primaryActionLabel}
        </Button>
        <IntegrationStatusNotice
          state={integrationState}
          manualFallbackAvailable={manualFallbackAvailable}
          hasManualWellness={isManualWellnessEnabled}
        />
      </div>

      {showHealthAdvice && advice && (
        <HealthAdvicePanel
          advice={advice}
          sessionId={sessionId}
          onAcceptSuggestion={handleAcceptSuggestion}
          onOverrideSuggestion={handleOverrideSuggestion}
          adviceSource={lastAdviceSource}
          getInteractionTimeMs={getInteractionTimeMs}
        />
      )}

      {error && <ErrorNotice message={error} />}

      <WellnessModals
        showSubjective={showWellnessModal}
        onCloseSubjective={() => setShowWellnessModal(false)}
        onSubmitSubjective={handleSubjectiveWellnessSubmit}
        showManual={showManualWellnessModal}
        onCloseManual={() => {
          setShowManualWellnessModal(false);
          setWellnessSubmitError(null);
        }}
        onSubmitManual={handleManualWellnessSubmit}
        whoopStatus={whoopStatus}
        onConnectWhoop={handleConnectWhoop}
        isSubmittingManual={isSubmittingWellness}
        manualSubmitError={wellnessSubmitError}
        sessionId={sessionId}
      />

      <WorkoutSessionStickyHeader
        templateName={templateName}
        elapsedTime={elapsedTime}
        readiness={advice?.readiness.rho}
      />

      {sessionState ? (
        <WorkoutSessionWithState
          sessionId={sessionId}
          state={sessionState}
        />
      ) : null}
    </div>
  );
}

interface HealthAdvicePanelProps {
  advice: HealthAdviceResponse;
  sessionId: number;
  adviceSource: AdviceSource;
  onAcceptSuggestion: (
    setId: string,
    suggestion: { weight?: number; reps?: number },
  ) => void;
  onOverrideSuggestion: (setId: string) => void;
  getInteractionTimeMs: () => number | undefined;
}

function HealthAdvicePanel({
  advice,
  sessionId,
  adviceSource,
  onAcceptSuggestion,
  onOverrideSuggestion,
  getInteractionTimeMs,
}: HealthAdvicePanelProps) {
  return (
    <div className="glass-surface space-y-3 p-3 sm:space-y-4 sm:p-4">
      <h2
        className="text-center text-lg font-bold sm:text-xl md:text-2xl"
        style={{ color: "var(--color-text)" }}
      >
        🏋️ Today's Workout Intelligence
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ReadinessIndicator
            rho={advice.readiness.rho}
            flags={advice.readiness.flags}
            overloadMultiplier={advice.readiness.overload_multiplier}
          />
          <ProbabilityGauge
            probability={advice.session_predicted_chance}
            title="Session Success Chance"
            subtitle="Probability to beat your previous bests"
          />
        </div>
        <div className="space-y-4">
          <AISummary summary={advice.summary} warnings={advice.warnings} />
          {advice.recovery_recommendations && (
            <RecoveryRecommendationsCard
              recommendations={advice.recovery_recommendations}
            />
          )}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h3
          className="text-lg font-semibold sm:text-xl"
          style={{ color: "var(--color-text)" }}
        >
          Exercise Recommendations
        </h3>
        {advice.per_exercise.map((exercise) => (
          <SetSuggestions
            key={exercise.exercise_id}
            exercise={exercise}
            onAcceptSuggestion={onAcceptSuggestion}
            onOverrideSuggestion={onOverrideSuggestion}
            sessionId={sessionId.toString()}
            adviceSource={adviceSource}
            getInteractionTimeMs={getInteractionTimeMs}
          />
        ))}
      </div>
    </div>
  );
}

interface IntegrationStatusNoticeProps {
  state: IntegrationState;
  manualFallbackAvailable: boolean;
  hasManualWellness: boolean;
}

function IntegrationStatusNotice({
  state,
  manualFallbackAvailable,
  hasManualWellness,
}: IntegrationStatusNoticeProps) {
  if (state === "connected") return null;

  let message: string;

  if (state === "never_connected") {
    message = hasManualWellness
      ? "No WHOOP data yet. Use a quick wellness check to get AI guidance."
      : "Connect WHOOP or add a quick wellness check to unlock AI guidance.";
  } else {
    message = manualFallbackAvailable
      ? "WHOOP connection looks inactive. We'll prompt for a quick wellness check until you reconnect."
      : "WHOOP connection looks inactive. Reconnect to keep automated insights flowing.";
  }

  return (
    <p className="text-muted-foreground max-w-lg text-center text-sm">
      {message}
    </p>
  );
}

interface WellnessModalsProps {
  showSubjective: boolean;
  onCloseSubjective: () => void;
  onSubmitSubjective: (data: SubjectiveWellnessData) => void | Promise<void>;
  showManual: boolean;
  onCloseManual: () => void;
  onSubmitManual: (data: ManualWellnessData) => void | Promise<void>;
  whoopStatus: {
    hasIntegration: boolean;
    isConnected: boolean;
  };
  onConnectWhoop: () => void;
  isSubmittingManual: boolean;
  manualSubmitError: string | null;
  sessionId: number;
}

function WellnessModals({
  showSubjective,
  onCloseSubjective,
  onSubmitSubjective,
  showManual,
  onCloseManual,
  onSubmitManual,
  whoopStatus,
  onConnectWhoop,
  isSubmittingManual,
  manualSubmitError,
  sessionId,
}: WellnessModalsProps) {
  return (
    <>
      <SubjectiveWellnessModal
        isOpen={showSubjective}
        onClose={onCloseSubjective}
        onSubmit={onSubmitSubjective}
        hasWhoopIntegration={whoopStatus.hasIntegration}
        isWhoopConnected={whoopStatus.isConnected}
        onConnectWhoop={onConnectWhoop}
      />
      <ManualWellnessModal
        isOpen={showManual}
        onClose={onCloseManual}
        onSubmit={onSubmitManual}
        hasWhoopIntegration={whoopStatus.hasIntegration}
        isWhoopConnected={whoopStatus.isConnected}
        onConnectWhoop={onConnectWhoop}
        isSubmitting={isSubmittingManual}
        submitError={manualSubmitError ?? undefined}
        sessionId={sessionId}
      />
    </>
  );
}

interface WorkoutSessionStickyHeaderProps {
  templateName: string;
  elapsedTime: string;
  readiness?: number;
}

function WorkoutSessionStickyHeader({
  templateName,
  elapsedTime,
  readiness,
}: WorkoutSessionStickyHeaderProps) {
  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border sticky top-0 z-10 border-b backdrop-blur">
      <div className="container mx-auto px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold">{templateName}</h2>
              <p className="text-muted-foreground text-sm">
                Elapsed: {elapsedTime} • Online
              </p>
            </div>
            {typeof readiness === "number" && (
              <div
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  readiness > 0.7
                    ? "bg-green-100 text-green-800"
                    : readiness > 0.4
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                Readiness: {Math.round(readiness * 100)}%
              </div>
            )}
          </div>
          <Button variant="default" size="sm">
            Complete Workout
          </Button>
        </div>
      </div>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="glass-surface rounded-lg border border-red-500/40 p-4 text-red-600">
      <h3 className="font-semibold">Health Advice Error</h3>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  );
}
