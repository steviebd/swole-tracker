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
  const checkExistingWellness = api.wellness.checkExists.useQuery(
    { sessionId },
    { enabled: !!sessionId }
  );

  // Mock data for demonstration - in real implementation, this would come from props
  const mockWhoopData = whoopData || {
    recovery_score: 75,
    sleep_performance: 82,
    hrv_now_ms: 48,
    hrv_baseline_ms: 45,
    rhr_now_bpm: 52,
    rhr_baseline_bpm: 55,
    yesterday_strain: 12.5
  };

  const mockUserProfile = userProfile || {
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
          set_id: `${templateExercise.exerciseName.toLowerCase().replace(/\s+/g, '_')}_set_${setIndex + 1}`,
          target_reps: existingSet?.reps || null,
          target_weight_kg: existingSet?.weight ? parseFloat(existingSet.weight) : null,
          target_rpe: existingSet?.rpe || null,
        };
      });

      return {
        exercise_id: templateExercise.exerciseName.toLowerCase().replace(/\s+/g, '_'),
        name: templateExercise.exerciseName, // Include original name for later reference
        tags: ['strength'] as ('strength' | 'hypertrophy' | 'endurance')[], // Default tag, could be enhanced with template metadata
        sets,
      };
    });

    return { exercises };
  }, [workoutSession, workoutPlan]);

  const mockPriorBests = priorBests || {
    by_exercise_id: {
      'bench_press': {
        best_total_volume_kg: 1200,
        best_e1rm_kg: 90
      },
      'squat': {
        best_total_volume_kg: 2400,
        best_e1rm_kg: 120
      }
    }
  };

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
        user_profile: mockUserProfile,
        whoop: mockWhoopData,
        workout_plan: dynamicWorkoutPlan,
        prior_bests: mockPriorBests
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
      user_profile: mockUserProfile,
      workout_plan: dynamicWorkoutPlan,
      prior_bests: mockPriorBests
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
        user_profile: mockUserProfile,
        workout_plan: dynamicWorkoutPlan,
        prior_bests: mockPriorBests
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
  const exerciseNameMapping = React.useMemo(() => {
    const mapping: Record<string, string> = {};
    if (workoutSession?.template?.exercises) {
      for (const exercise of workoutSession.template.exercises) {
        const normalizedName = exercise.exerciseName.toLowerCase().replace(/\s+/g, '_');
        mapping[normalizedName] = exercise.exerciseName;
      }
    }
    return mapping;
  }, [workoutSession?.template?.exercises]);

  const handleAcceptSuggestion = async (setId: string, suggestion: { weight?: number; reps?: number }) => {
    setAcceptedSuggestions(prev => new Map(prev).set(setId, suggestion));
    
    // Extract normalized exercise name from setId format: "{exercise_name}_set_{index}"
    const match = /^(.+)_set_\d+$/.exec(setId);
    if (!match) {
      console.error('Invalid setId format:', setId);
      return;
    }
    
    const normalizedName = match[1];
    if (!normalizedName) {
      console.error('No normalized name captured from setId:', setId);
      return;
    }
    
    const actualExerciseName = exerciseNameMapping[normalizedName];

    if (!actualExerciseName) {
      console.error('Could not find exercise name for normalized name:', normalizedName, 'Available mappings:', exerciseNameMapping);
      return;
    }

    try {
      await updateSessionSets.mutateAsync({
        sessionId,
        updates: [{
          setId,
          exerciseName: actualExerciseName,
          weight: suggestion.weight,
          reps: suggestion.reps,
          unit: 'kg', // Default to kg, could be made configurable
        }],
      });
      console.log('Accepted and applied suggestion for set', setId, ':', suggestion, 'Exercise:', actualExerciseName);
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
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
          className="btn-primary text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3"
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
