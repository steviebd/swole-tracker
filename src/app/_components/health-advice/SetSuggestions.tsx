"use client";

import { useState } from "react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import type { HealthAdviceResponse } from "~/server/api/schemas/health-advice";
import {
  trackSuggestionInteraction,
  type AdviceDataSource,
} from "~/lib/analytics/health-advice";

type ProgressionPreference = "ai_recommended";

interface SetSuggestionsProps {
  exercise: HealthAdviceResponse["per_exercise"][0];
  onAcceptSuggestion: (
    setId: string,
    suggestion: { weight?: number; reps?: number; restSeconds?: number },
  ) => void;
  onOverrideSuggestion: (setId: string) => void;
  sessionId?: string; // For analytics tracking
  adviceSource?: AdviceDataSource;
  getInteractionTimeMs?: () => number | undefined;
}

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

export function SetSuggestions({
  exercise,
  onAcceptSuggestion,
  onOverrideSuggestion,
  sessionId,
  adviceSource = "unknown",
  getInteractionTimeMs,
}: SetSuggestionsProps) {
  const [acceptedSets, setAcceptedSets] = useState<Set<string>>(new Set());

  // Use only the first set (AI should generate exactly one set per exercise)
  const recommendationSet = exercise.sets.length > 0 ? exercise.sets[0] : null;

  const handleAcceptSet = (
    setId: string,
    suggestion: { weight?: number; reps?: number; restSeconds?: number },
    _progressionType: ProgressionPreference = "ai_recommended",
  ) => {
    setAcceptedSets((prev) => new Set(prev).add(setId));
    onAcceptSuggestion(setId, suggestion);

    // Track analytics for accepted suggestions
    if (sessionId) {
      const set = exercise.sets.find((s) => s.set_id === setId);
      if (set) {
        const interactionTime = getInteractionTimeMs?.();
        if (
          suggestion.weight !== undefined &&
          set.suggested_weight_kg !== undefined
        ) {
          const interactionData: Parameters<
            typeof trackSuggestionInteraction
          >[0] = {
            sessionId,
            exerciseId: exercise.exercise_id,
            setId,
            action: "accepted",
            suggestionType: "weight",
            acceptedValue: suggestion.weight,
            dataSource: adviceSource,
          };
          if (
            set.suggested_weight_kg !== null &&
            set.suggested_weight_kg !== undefined
          ) {
            interactionData.suggestedValue = set.suggested_weight_kg;
          }
          if (interactionTime !== undefined) {
            interactionData.interactionTimeMs = interactionTime;
          }
          trackSuggestionInteraction(interactionData);
        }
        if (suggestion.reps !== undefined && set.suggested_reps !== undefined) {
          const interactionData: Parameters<
            typeof trackSuggestionInteraction
          >[0] = {
            sessionId,
            exerciseId: exercise.exercise_id,
            setId,
            action: "accepted",
            suggestionType: "reps",
            acceptedValue: suggestion.reps,
            dataSource: adviceSource,
          };
          if (set.suggested_reps !== null && set.suggested_reps !== undefined) {
            interactionData.suggestedValue = set.suggested_reps;
          }
          if (interactionTime !== undefined) {
            interactionData.interactionTimeMs = interactionTime;
          }
          trackSuggestionInteraction(interactionData);
        }
      }
    }
  };

  const handleOverrideSet = (setId: string) => {
    setAcceptedSets((prev) => {
      const newSet = new Set(prev);
      newSet.delete(setId);
      return newSet;
    });
    onOverrideSuggestion(setId);

    // Track analytics for rejected suggestions
    if (sessionId) {
      const set = exercise.sets.find((s) => s.set_id === setId);
      if (set) {
        const interactionTime = getInteractionTimeMs?.();
        if (set.suggested_weight_kg !== undefined) {
          const interactionData: Parameters<
            typeof trackSuggestionInteraction
          >[0] = {
            sessionId,
            exerciseId: exercise.exercise_id,
            setId,
            action: "rejected",
            suggestionType: "weight",
            dataSource: adviceSource,
          };
          if (set.suggested_weight_kg !== null) {
            interactionData.suggestedValue = set.suggested_weight_kg;
          }
          if (interactionTime !== undefined) {
            interactionData.interactionTimeMs = interactionTime;
          }
          trackSuggestionInteraction(interactionData);
        }
        if (set.suggested_reps !== undefined) {
          const interactionData: Parameters<
            typeof trackSuggestionInteraction
          >[0] = {
            sessionId,
            exerciseId: exercise.exercise_id,
            setId,
            action: "rejected",
            suggestionType: "reps",
            dataSource: adviceSource,
          };
          if (set.suggested_reps !== null && set.suggested_reps !== undefined) {
            interactionData.suggestedValue = set.suggested_reps;
          }
          if (interactionTime !== undefined) {
            interactionData.interactionTimeMs = interactionTime;
          }
          trackSuggestionInteraction(interactionData);
        }
      }
    }
  };

  const chancePercent = Math.round(
    exercise.predicted_chance_to_beat_best * 100,
  );
  const chanceColorClass =
    exercise.predicted_chance_to_beat_best >= 0.7
      ? "text-[var(--md-sys-color-tertiary)]"
      : exercise.predicted_chance_to_beat_best >= 0.5
        ? "text-[var(--md-sys-color-secondary)]"
        : "text-[var(--md-sys-color-error)]";

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--md-sys-color-on-surface)]">
          {exercise.name || exercise.exercise_id}
        </h3>
        <div className="text-right">
          <div className="text-sm text-[var(--md-sys-color-on-surface-variant)]">
            Beat Best Chance
          </div>
          <div className={cx("text-lg font-bold", chanceColorClass)}>
            {chancePercent}%
          </div>
        </div>
      </div>

      {/* Volume comparison */}
      {(exercise.planned_volume_kg || exercise.best_volume_kg) && (
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-[color-mix(in_oklab,var(--md-sys-color-surface-variant)_50%,var(--md-sys-color-surface)_50%)] p-3">
          <div>
            <div className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
              Planned Volume
            </div>
            <div className="font-semibold">
              {exercise.planned_volume_kg
                ? `${exercise.planned_volume_kg}kg`
                : "N/A"}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
              Best Volume
            </div>
            <div className="font-semibold">
              {exercise.best_volume_kg ? `${exercise.best_volume_kg}kg` : "N/A"}
            </div>
          </div>
        </div>
      )}

      {/* Set suggestions */}
      <div className="space-y-3">
        <h4 className="text-md font-medium text-[var(--md-sys-color-on-surface)]">
          Set Suggestions
        </h4>
        {recommendationSet &&
          (() => {
            const set = recommendationSet;
            const isAccepted = acceptedSets.has(set.set_id);

            // Don't render accepted suggestions to avoid visual blocking
            if (isAccepted) return null;

            const suggestionVariantClasses =
              "border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface)]";

            return (
              <div
                key={set.set_id}
                className={cx(
                  "rounded-lg border p-3 transition-all",
                  suggestionVariantClasses,
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Highest Weight Set
                  </span>
                  <div className="flex gap-2">
                    {!isAccepted ? (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() =>
                            handleAcceptSet(
                              set.set_id,
                              {
                                ...(set.suggested_weight_kg !== null && {
                                  weight: set.suggested_weight_kg,
                                }),
                                ...(set.suggested_reps !== null && {
                                  reps: set.suggested_reps,
                                }),
                                ...((set as any).suggested_rest_seconds && {
                                  restSeconds: (set as any)
                                    .suggested_rest_seconds,
                                }),
                              },
                              "ai_recommended",
                            )
                          }
                        >
                          Accept AI
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
                <div className="mb-2 grid grid-cols-2 gap-3">
                  {set.suggested_weight_kg && (
                    <div>
                      <div className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                        Suggested Weight
                      </div>
                      <div className="font-semibold">
                        {set.suggested_weight_kg}kg
                      </div>
                    </div>
                  )}
                  {set.suggested_reps && (
                    <div>
                      <div className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                        Suggested Reps
                      </div>
                      <div className="font-semibold">{set.suggested_reps}</div>
                    </div>
                  )}
                </div>

                {/* Rest period suggestion */}
                {(set as any).suggested_rest_seconds && (
                  <div className="mb-2">
                    <div className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                      Suggested Rest
                    </div>
                    <div className="font-semibold">
                      {Math.round((set as any).suggested_rest_seconds / 60)}{" "}
                      minutes
                    </div>
                  </div>
                )}

                {/* Rationale */}
                <div className="rounded bg-[color-mix(in_oklab,var(--md-sys-color-surface-variant)_50%,var(--md-sys-color-surface)_50%)] p-2 text-sm text-[var(--md-sys-color-on-surface-variant)]">
                  <div className="mb-1 text-xs text-[var(--md-sys-color-on-surface-variant)]">
                    AI Rationale
                  </div>
                  {set.rationale}
                </div>
              </div>
            );
          })()}
      </div>
    </Card>
  );
}
