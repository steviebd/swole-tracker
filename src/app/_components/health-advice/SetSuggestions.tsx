'use client';

import { useState } from 'react';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import type { HealthAdviceResponse } from '~/server/api/schemas/health-advice';
import { trackSuggestionInteraction } from '~/lib/analytics/health-advice';

type ProgressionPreference = 'weight_focus' | 'reps_focus' | 'balanced' | 'ai_recommended';

interface AlternativeSuggestion {
  weight_kg: number;
  reps: number;
  rationale: string;
  progression_type: ProgressionPreference;
}

interface SetSuggestionsProps {
  exercise: HealthAdviceResponse['per_exercise'][0] & { name?: string };
  onAcceptSuggestion: (setId: string, suggestion: { weight?: number; reps?: number }) => void;
  onOverrideSuggestion: (setId: string) => void;
  sessionId?: string; // For analytics tracking
}

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}

export function SetSuggestions({ exercise, onAcceptSuggestion, onOverrideSuggestion, sessionId }: SetSuggestionsProps) {
  const [acceptedSets, setAcceptedSets] = useState<Set<string>>(new Set());
  const [, _setProgressionPreference] = useState<ProgressionPreference>('ai_recommended');
  const [showAlternatives, setShowAlternatives] = useState<Record<string, boolean>>({});

  // Generate alternative suggestions based on progression preference
  const generateAlternatives = (originalWeight: number, originalReps: number): AlternativeSuggestion[] => {
    const alternatives: AlternativeSuggestion[] = [];
    
    // Weight-focused progression (increase weight, maintain or slightly reduce reps)
    alternatives.push({
      weight_kg: Math.round((originalWeight + 2.5) * 10) / 10,
      reps: Math.max(originalReps - 1, originalReps),
      rationale: "Weight-focused: Prioritize strength gains through load increases",
      progression_type: 'weight_focus'
    });
    
    // Reps-focused progression (maintain weight, increase reps)
    alternatives.push({
      weight_kg: originalWeight,
      reps: originalReps + 1,
      rationale: "Reps-focused: Build endurance and volume tolerance",
      progression_type: 'reps_focus'
    });
    
    // Balanced progression (moderate increases in both)
    alternatives.push({
      weight_kg: Math.round((originalWeight + 1.25) * 10) / 10,
      reps: originalReps,
      rationale: "Balanced: Steady progression in both strength and volume",
      progression_type: 'balanced'
    });
    
    return alternatives;
  };
  
  const handleAcceptSet = (setId: string, suggestion: { weight?: number; reps?: number }, _progressionType: ProgressionPreference = 'ai_recommended') => {
    setAcceptedSets(prev => new Set(prev).add(setId));
    onAcceptSuggestion(setId, suggestion);
    
    // Track analytics for accepted suggestions
    if (sessionId) {
      const set = exercise.sets.find(s => s.set_id === setId);
      if (set) {
        if (suggestion.weight !== undefined && set.suggested_weight_kg !== undefined) {
          trackSuggestionInteraction({
            sessionId,
            exerciseId: exercise.exercise_id,
            setId,
            action: 'accepted',
            suggestionType: 'weight',
            suggestedValue: set.suggested_weight_kg ?? undefined,
            acceptedValue: suggestion.weight
          });
        }
        if (suggestion.reps !== undefined && set.suggested_reps !== undefined) {
          trackSuggestionInteraction({
            sessionId,
            exerciseId: exercise.exercise_id,
            setId,
            action: 'accepted',
            suggestionType: 'reps',
            suggestedValue: set.suggested_reps ?? undefined,
            acceptedValue: suggestion.reps
          });
        }
      }
    }
  };

  const handleOverrideSet = (setId: string) => {
    setAcceptedSets(prev => {
      const newSet = new Set(prev);
      newSet.delete(setId);
      return newSet;
    });
    onOverrideSuggestion(setId);
    
    // Track analytics for overridden suggestions
    if (sessionId) {
      const set = exercise.sets.find(s => s.set_id === setId);
      if (set) {
        if (set.suggested_weight_kg !== undefined) {
          trackSuggestionInteraction({
            sessionId,
            exerciseId: exercise.exercise_id,
            setId,
            action: 'overridden',
            suggestionType: 'weight',
            suggestedValue: set.suggested_weight_kg ?? undefined
          });
        }
        if (set.suggested_reps !== undefined) {
          trackSuggestionInteraction({
            sessionId,
            exerciseId: exercise.exercise_id,
            setId,
            action: 'overridden',
            suggestionType: 'reps',
            suggestedValue: set.suggested_reps ?? undefined
          });
        }
      }
    }
  };

  const chancePercent = Math.round(exercise.predicted_chance_to_beat_best * 100);
  const chanceColor = exercise.predicted_chance_to_beat_best >= 0.7 ? 'text-success' :
                     exercise.predicted_chance_to_beat_best >= 0.5 ? 'text-warning' : 'text-danger';

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{color: 'var(--color-text)'}}>{exercise.name || exercise.exercise_id}</h3>
        <div className="text-right">
          <div className="text-sm text-muted">Beat Best Chance</div>
          <div className={cx("text-lg font-bold", chanceColor)}>
            {chancePercent}%
          </div>
        </div>
      </div>

      {/* Volume comparison */}
      {(exercise.planned_volume_kg || exercise.best_volume_kg) && (
        <div className="grid grid-cols-2 gap-4 p-3 rounded-lg" style={{backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 50%, var(--color-bg-app) 50%)'}}>
          <div>
            <div className="text-xs text-muted">Planned Volume</div>
            <div className="font-semibold">
              {exercise.planned_volume_kg ? `${exercise.planned_volume_kg}kg` : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Best Volume</div>
            <div className="font-semibold">
              {exercise.best_volume_kg ? `${exercise.best_volume_kg}kg` : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Set suggestions */}
      <div className="space-y-3">
        <h4 className="text-md font-medium" style={{color: 'var(--color-text)'}}>Set Suggestions</h4>
        {exercise.sets.map((set, index) => {
          const isAccepted = acceptedSets.has(set.set_id);
          
          return (
            <div
              key={set.set_id}
              className={cx(
                "border rounded-lg p-3 transition-all",
                isAccepted 
                  ? "border-green-200 dark:border-green-700" 
                  : ""
              )}
              style={{
                backgroundColor: isAccepted 
                  ? 'color-mix(in oklab, var(--color-success) 10%, var(--color-bg-surface))' 
                  : 'var(--color-bg-surface)',
                borderColor: isAccepted 
                  ? 'var(--color-success)' 
                  : 'var(--color-border)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Set {index + 1}</span>
                <div className="flex gap-2">
                  {!isAccepted ? (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAcceptSet(set.set_id, {
                          weight: set.suggested_weight_kg || undefined,
                          reps: set.suggested_reps || undefined
                        }, 'ai_recommended')}
                      >
                        Accept AI
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowAlternatives(prev => ({
                          ...prev,
                          [set.set_id]: !prev[set.set_id]
                        }))}
                      >
                        {showAlternatives[set.set_id] ? 'Hide' : 'Options'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOverrideSet(set.set_id)}
                    >
                      Override
                    </Button>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-2 gap-3 mb-2">
                {set.suggested_weight_kg && (
                  <div>
                    <div className="text-xs text-muted">Suggested Weight</div>
                    <div className="font-semibold">{set.suggested_weight_kg}kg</div>
                  </div>
                )}
                {set.suggested_reps && (
                  <div>
                    <div className="text-xs text-muted">Suggested Reps</div>
                    <div className="font-semibold">{set.suggested_reps}</div>
                  </div>
                )}
              </div>

              {/* Rest period suggestion */}
              {(set as any).suggested_rest_seconds && (
                <div className="mb-2">
                  <div className="text-xs text-muted">Suggested Rest</div>
                  <div className="font-semibold">{Math.round((set as any).suggested_rest_seconds / 60)} minutes</div>
                </div>
              )}
              
              {/* Alternative suggestions based on progression preference */}
              {showAlternatives[set.set_id] && !isAccepted && set.suggested_weight_kg && set.suggested_reps && (
                <div className="mt-3 p-3 rounded-lg" style={{backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 70%, var(--color-bg-app) 30%)', borderColor: 'var(--color-border)'}}>
                  <div className="text-xs text-muted mb-2">Alternative Progressions</div>
                  <div className="space-y-2">
                    {generateAlternatives(set.suggested_weight_kg, set.suggested_reps).map((alt, altIndex) => (
                      <div key={altIndex} className="flex items-center justify-between p-2 rounded" style={{backgroundColor: 'var(--color-bg-surface)'}}>
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {alt.weight_kg}kg × {alt.reps} reps
                          </div>
                          <div className="text-xs text-muted">{alt.rationale}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAcceptSet(set.set_id, {
                            weight: alt.weight_kg,
                            reps: alt.reps
                          }, alt.progression_type)}
                          className="ml-2"
                        >
                          Use This
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Rationale */}
              <div className="text-sm p-2 rounded" style={{backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 50%, var(--color-bg-app) 50%)', color: 'var(--color-text-secondary)'}}>
                <div className="text-xs text-muted mb-1">AI Rationale</div>
                {set.rationale}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
