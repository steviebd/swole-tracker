'use client';

import { useState } from 'react';
import { Button } from '~/app/_components/ui/Button';
import { WorkoutSession } from '~/app/_components/workout-session';
import { ReadinessIndicator } from '~/app/_components/health-advice/ReadinessIndicator';
import { SetSuggestions } from '~/app/_components/health-advice/SetSuggestions';
import { ProbabilityGauge } from '~/app/_components/health-advice/ProbabilityGauge';
import { AISummary } from '~/app/_components/health-advice/AISummary';
import { useHealthAdvice } from '~/hooks/useHealthAdvice';
import type { HealthAdviceRequest } from '~/server/api/schemas/health-advice';

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
  const [_acceptedSuggestions, setAcceptedSuggestions] = useState<Map<string, { weight?: number; reps?: number }>>(new Map());
  const { advice, loading, error, fetchAdvice } = useHealthAdvice();

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

  const mockWorkoutPlan = workoutPlan || {
    exercises: [
      {
        exercise_id: 'bench_press',
        name: 'Bench Press',
        tags: ['strength', 'hypertrophy'],
        sets: [
          { set_id: 'set_1', target_reps: 5, target_weight_kg: 80, target_rpe: 8 },
          { set_id: 'set_2', target_reps: 5, target_weight_kg: 80, target_rpe: 8 },
          { set_id: 'set_3', target_reps: 5, target_weight_kg: 80, target_rpe: 8 }
        ]
      },
      {
        exercise_id: 'squat',
        name: 'Back Squat',
        tags: ['strength', 'hypertrophy'],
        sets: [
          { set_id: 'set_4', target_reps: 8, target_weight_kg: 100, target_rpe: 7 },
          { set_id: 'set_5', target_reps: 8, target_weight_kg: 100, target_rpe: 7 },
          { set_id: 'set_6', target_reps: 8, target_weight_kg: 100, target_rpe: 7 }
        ]
      }
    ]
  };

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

  const handleGetHealthAdvice = async () => {
    const request: HealthAdviceRequest = {
      session_id: sessionId.toString(),
      user_profile: mockUserProfile,
      whoop: mockWhoopData,
      workout_plan: mockWorkoutPlan,
      prior_bests: mockPriorBests
    };

    await fetchAdvice(request);
    setShowHealthAdvice(true);
  };

  const handleAcceptSuggestion = (setId: string, suggestion: { weight?: number; reps?: number }) => {
    setAcceptedSuggestions(prev => new Map(prev).set(setId, suggestion));
    // Here you would integrate with the actual workout session to update the values
    console.log('Accepted suggestion for set', setId, ':', suggestion);
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
    <div className="space-y-6">
      {/* Health Advice Toggle */}
      <div className="flex justify-center">
        <Button
          onClick={handleGetHealthAdvice}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {loading ? 'Getting AI Advice...' : '🤖 Get Health Advice'}
        </Button>
      </div>

      {/* Health Advice Panel */}
      {showHealthAdvice && advice && (
        <div className="space-y-4 border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <h2 className="text-2xl font-bold text-center">🏋️ Today's Workout Intelligence</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Exercise Recommendations</h3>
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <h3 className="font-semibold">Health Advice Error</h3>
          <p>{error}</p>
        </div>
      )}

      {/* Original Workout Session */}
      <WorkoutSession sessionId={sessionId} />
    </div>
  );
}