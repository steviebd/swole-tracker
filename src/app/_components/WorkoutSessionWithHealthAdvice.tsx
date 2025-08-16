'use client';

import React, { useState } from 'react';
import { Button } from '~/app/_components/ui/Button';
import { WorkoutSession } from '~/app/_components/workout-session';
import { ReadinessIndicator } from '~/app/_components/health-advice/ReadinessIndicator';
import { SetSuggestions } from '~/app/_components/health-advice/SetSuggestions';
import { ProbabilityGauge } from '~/app/_components/health-advice/ProbabilityGauge';
import { AISummary } from '~/app/_components/health-advice/AISummary';
import { SubjectiveWellnessModal } from '~/app/_components/health-advice/SubjectiveWellnessModal';
import { ManualWellnessModal } from '~/app/_components/health-advice/ManualWellnessModal';
import { useHealthAdvice } from '~/hooks/useHealthAdvice';
import { api } from '~/trpc/react';
import { logger } from '~/lib/logger';
import type { HealthAdviceRequest } from '~/server/api/schemas/health-advice';
import type { SubjectiveWellnessData, ManualWellnessData } from '~/lib/subjective-wellness-mapper';

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
    experience_level: 'beginner' | 'intermediate' | 'advanced';
    min_increment_kg?: number;
    preferred_rpe?: number;
  };
  workoutPlan?: HealthAdviceRequest['workout_plan'];
  priorBests?: HealthAdviceRequest['prior_bests'];
}

export function WorkoutSessionWithHealthAdvice({ 
  sessionId, 
  whoopData, 
  userProfile,
  workoutPlan,
  priorBests
}: WorkoutSessionWithHealthAdviceProps) {
  const [showHealthAdvice, setShowHealthAdvice] = useState(false);
  const [showWellnessModal, setShowWellnessModal] = useState(false);
  const [showManualWellnessModal, setShowManualWellnessModal] = useState(false);
  const [, setAcceptedSuggestions] = useState<Map<string, { weight?: number; reps?: number }>>(new Map());
  const [wellnessSubmitError, setWellnessSubmitError] = useState<string | null>(null);
  const [isSubmittingWellness, setIsSubmittingWellness] = useState(false);
  
  const { 
    advice, 
    loading, 
    error, 
    fetchAdvice, 
    fetchAdviceWithSubjectiveData,
    fetchAdviceWithManualWellness,
    hasExistingAdvice,
    whoopStatus
  } = useHealthAdvice(sessionId);

  // Fetch the actual workout session to get template exercises
  const { data: workoutSession, refetch: refetchWorkoutSession } = api.workouts.getById.useQuery(
    { id: sessionId },
    { enabled: !!sessionId }
  );

  // Fetch user preferences to determine which wellness modal to show
  const { data: userPreferences } = api.preferences.get.useQuery();

  // Wellness mutations
  const saveWellness = api.wellness.save.useMutation();
  const _checkExistingWellness = api.wellness.checkExists.useQuery(
    { sessionId },
    { enabled: !!sessionId }
  );

  // Use actual data from props or provide reasonable defaults
  const actualWhoopData = whoopData;

  const actualUserProfile = userProfile || {
    experience_level: 'intermediate' as const,
    min_increment_kg: 2.5,
    preferred_rpe: 8
  };

  // Build dynamic workout plan from actual session template data
  const dynamicWorkoutPlan = React.useMemo(() => {
    if (!workoutSession?.template?.exercises) {
      return workoutPlan || {
        exercises: []
      };
    }

    // Create workout plan from template exercises
    const exercises = workoutSession.template.exercises.map((templateExercise) => {
      // Get existing session exercises for this template exercise to determine set count
      const existingSessionSets = workoutSession.exercises?.filter(
        ex => ex.exerciseName === templateExercise.exerciseName
      ) || [];

      // Determine how many sets to generate (use existing data or default to 3)
      const setCount = existingSessionSets.length > 0 ? existingSessionSets.length : 3;

      // Generate sets with data from existing session exercises or defaults
      const sets = Array.from({ length: setCount }, (_, setIndex) => {
        const existingSet = existingSessionSets[setIndex];
        return {
          set_id: `${templateExercise.id}_${setIndex + 1}`, // Use template exercise ID for consistency
          target_reps: existingSet?.reps || null,
          target_weight_kg: existingSet?.weight ? parseFloat(existingSet.weight) : null,
          target_rpe: existingSet?.rpe || null,
        };
      });

      return {
        exercise_id: templateExercise.id.toString(), // Use template exercise ID for consistency  
        name: templateExercise.exerciseName, // Include original name for later reference
        tags: ['strength'] as ('strength' | 'hypertrophy' | 'endurance')[], // Default tag, could be enhanced with template metadata
        sets,
      };
    });

    return { exercises };
  }, [workoutSession, workoutPlan]);

  const actualPriorBests = priorBests || { by_exercise_id: {} };

  // Show existing advice automatically
  React.useEffect(() => {
    if (hasExistingAdvice && advice) {
      setShowHealthAdvice(true);
    }
  }, [hasExistingAdvice, advice]);

  const handleGetHealthAdvice = async () => {
    // Determine which wellness system to use based on user preferences
    const isManualWellnessEnabled = userPreferences?.enable_manual_wellness ?? false;
    
    // Check if user has WHOOP connected
    if (whoopStatus.isConnected) {
      // User has WHOOP - use actual WHOOP data
      const request: HealthAdviceRequest = {
        session_id: sessionId.toString(),
        user_profile: actualUserProfile,
        whoop: actualWhoopData!,
        workout_plan: dynamicWorkoutPlan,
        prior_bests: actualPriorBests
      };

      await fetchAdvice(request);
      setShowHealthAdvice(true);
    } else if (isManualWellnessEnabled) {
      // User has manual wellness enabled - show simplified modal
      setShowManualWellnessModal(true);
    } else {
      // User doesn't have WHOOP and manual wellness disabled - show legacy 4-input modal
      setShowWellnessModal(true);
    }
  };

  const handleSubjectiveWellnessSubmit = async (subjectiveData: SubjectiveWellnessData) => {
    setShowWellnessModal(false);
    
    const request = {
      session_id: sessionId.toString(),
      user_profile: actualUserProfile,
      workout_plan: dynamicWorkoutPlan,
      prior_bests: actualPriorBests
    };

    await fetchAdviceWithSubjectiveData(request, subjectiveData);
    setShowHealthAdvice(true);
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
        prior_bests: actualPriorBests
      };

      if (wellnessResult?.id) {
        await fetchAdviceWithManualWellness(request, manualData, wellnessResult.id);
      } else {
        // Fallback to health advice without wellness data if save failed
        console.warn('Wellness data save returned no ID, proceeding without wellness tracking');
        await fetchAdviceWithManualWellness(request, manualData);
      }
      
      setShowManualWellnessModal(false);
      setShowHealthAdvice(true);
      
    } catch (error) {
      console.error('Failed to submit manual wellness:', error);
      setWellnessSubmitError(
        error instanceof Error ? error.message : 'Failed to submit wellness data. Please try again.'
      );
    } finally {
      setIsSubmittingWellness(false);
    }
  };

  const handleConnectWhoop = () => {
    // Redirect to WHOOP connection page
    window.open('/connect-whoop', '_blank');
  };

  const updateSessionSets = api.workouts.updateSessionSets.useMutation({
    onSuccess: async () => {
      console.log('Successfully updated session sets');
      // Refresh the workout session data to show updated values
      await refetchWorkoutSession();
    },
    onError: (error) => {
      console.error('Failed to update session sets:', error);
    },
  });

  // Create a mapping from normalized exercise names to original names
  const _exerciseNameMapping = React.useMemo(() => {
    const mapping: Record<string, string> = {};
    if (workoutSession?.template?.exercises) {
      for (const exercise of workoutSession.template.exercises) {
        const normalizedName = exercise.exerciseName.toLowerCase().replace(/\s+/g, '_');
        mapping[normalizedName] = exercise.exerciseName;
      }
    }
    return mapping;
  }, [workoutSession?.template?.exercises]);

  const trackSuggestionInteraction = api.suggestions.trackInteraction.useMutation();

  const handleAcceptSuggestion = async (setId: string, suggestion: { weight?: number; reps?: number }) => {
    setAcceptedSuggestions(prev => new Map(prev).set(setId, suggestion));
    
    // Extract template exercise ID and set index from setId format: "{templateExerciseId}_{setIndex}"
    const match = /^(\d+)_(\d+)$/.exec(setId);
    if (!match) {
      console.error('Invalid setId format:', setId, 'Expected format: templateExerciseId_setIndex');
      return;
    }
    
    const templateExerciseId = parseInt(match[1]!);
    const setIndex = parseInt(match[2]!) - 1; // Convert to 0-based index
    
    if (!templateExerciseId) {
      console.error('No template exercise ID captured from setId:', setId);
      return;
    }
    
    // Find the template exercise to get the actual exercise name
    const templateExercise = workoutSession?.template?.exercises.find(ex => ex.id === templateExerciseId);
    
    if (!templateExercise) {
      console.error('Could not find template exercise for ID:', templateExerciseId);
      return;
    }
    
    const actualExerciseName = templateExercise.exerciseName;

    try {
      await updateSessionSets.mutateAsync({
        sessionId,
        updates: [{
          setId,
          exerciseName: actualExerciseName,
          setIndex, // Include set index for proper targeting
          weight: suggestion.weight,
          reps: suggestion.reps,
          unit: 'kg', // Default to kg, could be made configurable
        }],
      });

      // Track the suggestion interaction for analytics
      const currentAdvice = advice;
      if (currentAdvice) {
        const exercise = currentAdvice.per_exercise.find(ex => 
          ex.exercise_id === templateExerciseId.toString() || 
          ex.name === actualExerciseName
        );
        const set = exercise?.sets.find(s => s.set_id === setId);
        
        if (set) {
          try {
            await trackSuggestionInteraction.mutateAsync({
              sessionId,
              exerciseName: actualExerciseName,
              setId,
              setIndex,
              suggestedWeightKg: set.suggested_weight_kg,
              suggestedReps: set.suggested_reps,
              suggestedRestSeconds: set.suggested_rest_seconds,
              suggestionRationale: set.rationale,
              action: 'accepted',
              acceptedWeightKg: suggestion.weight,
              acceptedReps: suggestion.reps,
              progressionType: userPreferences?.progression_type ?? 'adaptive',
              readinessScore: currentAdvice.readiness.rho,
              plateauDetected: set.rationale.includes('Plateau Alert') || set.rationale.includes('plateau detected'),
            });
          } catch (trackingError) {
            console.warn('Failed to track suggestion interaction:', trackingError);
            // Don't fail the main operation if tracking fails
          }
        }
      }
      
      logger.info('suggestion_applied', { 
        setId, 
        suggestion, 
        exerciseName: actualExerciseName, 
        setIndex,
        sessionId 
      });
    } catch (error) {
      logger.error('Failed to apply suggestion', error, { setId, sessionId });
      // Revert the UI state if the backend update failed
      setAcceptedSuggestions(prev => {
        const newMap = new Map(prev);
        newMap.delete(setId);
        return newMap;
      });
    }
  };

  const handleOverrideSuggestion = (setId: string) => {
    setAcceptedSuggestions(prev => {
      const newMap = new Map(prev);
      newMap.delete(setId);
      return newMap;
    });
    console.log('Overridden suggestion for set', setId);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Health Advice Toggle */}
      <div className="flex justify-center">
        <Button
          onClick={handleGetHealthAdvice}
          disabled={loading || isSubmittingWellness}
          variant="primary"
          size="lg"
        >
          {loading || isSubmittingWellness
            ? 'Getting AI Advice...' 
            : hasExistingAdvice 
              ? '🔄 Refresh Workout Intelligence' 
              : userPreferences?.enable_manual_wellness && !whoopStatus.isConnected
                ? '🎯 Quick Wellness Check'
                : '🤖 Get Workout Intelligence'
          }
        </Button>
      </div>

      {/* Health Advice Panel */}
      {showHealthAdvice && advice && (
        <div className="space-y-3 sm:space-y-4 glass-surface p-3 sm:p-4" style={{backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)'}}>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center" style={{ color: 'var(--color-text)' }}>🏋️ Today's Workout Intelligence</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Readiness and Overall Chance */}
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

            {/* AI Summary */}
            <AISummary 
              summary={advice.summary}
              warnings={advice.warnings}
            />
          </div>

          {/* Exercise-specific suggestions */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Exercise Recommendations</h3>
            {advice.per_exercise.map((exercise) => (
              <SetSuggestions
                key={exercise.exercise_id}
                exercise={exercise}
                onAcceptSuggestion={handleAcceptSuggestion}
                onOverrideSuggestion={handleOverrideSuggestion}
                sessionId={sessionId.toString()}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 rounded-lg glass-surface" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
          <h3 className="font-semibold">Health Advice Error</h3>
          <p>{error}</p>
        </div>
      )}

      {/* Subjective Wellness Modal (Legacy 4-input system) */}
      <SubjectiveWellnessModal
        isOpen={showWellnessModal}
        onClose={() => setShowWellnessModal(false)}
        onSubmit={handleSubjectiveWellnessSubmit}
        hasWhoopIntegration={whoopStatus.hasIntegration}
        isWhoopConnected={whoopStatus.isConnected}
        onConnectWhoop={handleConnectWhoop}
      />

      {/* Manual Wellness Modal (Simplified 2-input system) */}
      <ManualWellnessModal
        isOpen={showManualWellnessModal}
        onClose={() => {
          setShowManualWellnessModal(false);
          setWellnessSubmitError(null);
        }}
        onSubmit={handleManualWellnessSubmit}
        hasWhoopIntegration={whoopStatus.hasIntegration}
        isWhoopConnected={whoopStatus.isConnected}
        onConnectWhoop={handleConnectWhoop}
        isSubmitting={isSubmittingWellness}
        submitError={wellnessSubmitError ?? undefined}
        sessionId={sessionId}
      />

      {/* Original Workout Session */}
      <WorkoutSession sessionId={sessionId} />
    </div>
  );
}
