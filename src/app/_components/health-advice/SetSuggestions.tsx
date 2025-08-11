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
  const chanceColor = exercise.predicted_chance_to_beat_best >= 0.7 ? 'text-green-600' :
                     exercise.predicted_chance_to_beat_best >= 0.5 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{exercise.exercise_id}</h3>
        <div className="text-right">
          <div className="text-sm text-gray-600">Beat Best Chance</div>
          <div className={cx("text-lg font-bold", chanceColor)}>
            {chancePercent}%
          </div>
        </div>
      </div>

      {/* Volume comparison */}
      {(exercise.planned_volume_kg || exercise.best_volume_kg) && (
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="text-xs text-gray-500">Planned Volume</div>
            <div className="font-semibold">
              {exercise.planned_volume_kg ? `${exercise.planned_volume_kg}kg` : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Best Volume</div>
            <div className="font-semibold">
              {exercise.best_volume_kg ? `${exercise.best_volume_kg}kg` : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Set suggestions */}
      <div className="space-y-3">
        <h4 className="text-md font-medium">Set Suggestions</h4>
        {exercise.sets.map((set, index) => {
          const isAccepted = acceptedSets.has(set.set_id);
          
          return (
            <div
              key={set.set_id}
              className={cx(
                "border rounded-lg p-3 transition-all",
                isAccepted ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
              )}
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
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Accept
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOverrideSet(set.set_id)}
                      className="border-gray-300 text-gray-700"
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
                    <div className="text-xs text-gray-500">Suggested Weight</div>
                    <div className="font-semibold">{set.suggested_weight_kg}kg</div>
                  </div>
                )}
                {set.suggested_reps && (
                  <div>
                    <div className="text-xs text-gray-500">Suggested Reps</div>
                    <div className="font-semibold">{set.suggested_reps}</div>
                  </div>
                )}
              </div>

              {/* Rationale */}
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                <div className="text-xs text-gray-500 mb-1">Rationale</div>
                {set.rationale}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}