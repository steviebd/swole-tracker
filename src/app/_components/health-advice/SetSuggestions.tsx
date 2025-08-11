'use client';

import { useState } from 'react';
import { Card } from '~/app/_components/ui/Card';
import { Button } from '~/app/_components/ui/Button';
import type { HealthAdviceResponse } from '~/server/api/schemas/health-advice';
import { trackSuggestionInteraction } from '~/lib/analytics/health-advice';

interface SetSuggestionsProps {
  exercise: HealthAdviceResponse['per_exercise'][0];
  onAcceptSuggestion: (setId: string, suggestion: { weight?: number; reps?: number }) => void;
  onOverrideSuggestion: (setId: string) => void;
  sessionId?: string; // For analytics tracking
}

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}

export function SetSuggestions({ exercise, onAcceptSuggestion, onOverrideSuggestion, sessionId }: SetSuggestionsProps) {
  const [acceptedSets, setAcceptedSets] = useState<Set<string>>(new Set());

  const handleAcceptSet = (setId: string, suggestion: { weight?: number; reps?: number }) => {
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
            suggestedValue: set.suggested_weight_kg,
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
            suggestedValue: set.suggested_reps,
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
            suggestedValue: set.suggested_weight_kg
          });
        }
        if (set.suggested_reps !== undefined) {
          trackSuggestionInteraction({
            sessionId,
            exerciseId: exercise.exercise_id,
            setId,
            action: 'overridden',
            suggestionType: 'reps',
            suggestedValue: set.suggested_reps
          });
        }
      }
    }
  };

  const chancePercent = Math.round(exercise.predicted_chance_to_beat_best * 100);
  const chanceColor = exercise.predicted_chance_to_beat_best >= 0.7 ? 'text-green-600 dark:text-green-400' :
                     exercise.predicted_chance_to_beat_best >= 0.5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{color: 'var(--color-text)'}}>{exercise.exercise_id}</h3>
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
                    <Button
                      size="sm"
                      onClick={() => handleAcceptSet(set.set_id, {
                        weight: set.suggested_weight_kg || undefined,
                        reps: set.suggested_reps || undefined
                      })}
                      className="btn-primary"
                    >
                      Accept
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOverrideSet(set.set_id)}
                      className="btn-secondary"
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

              {/* Rationale */}
              <div className="text-sm p-2 rounded" style={{backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 50%, var(--color-bg-app) 50%)', color: 'var(--color-text-secondary)'}}>
                <div className="text-xs text-muted mb-1">Rationale</div>
                {set.rationale}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}