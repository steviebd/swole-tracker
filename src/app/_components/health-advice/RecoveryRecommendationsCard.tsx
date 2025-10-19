"use client";

import { Card } from "~/components/ui/card";
import type { HealthAdviceResponse } from "~/server/api/schemas/health-advice";

type RecoveryRecommendations = NonNullable<
  HealthAdviceResponse["recovery_recommendations"]
>;

interface RecoveryRecommendationsCardProps {
  recommendations: RecoveryRecommendations;
}

export function RecoveryRecommendationsCard({
  recommendations,
}: RecoveryRecommendationsCardProps) {
  const {
    recommended_rest_between_sets: restBetweenSets,
    recommended_rest_between_sessions: restBetweenSessions,
    session_duration_estimate: sessionDurationEstimate,
    additional_recovery_notes: additionalNotes,
  } = recommendations;

  const recoveryNotes = (additionalNotes ?? []).filter(
    (note) => typeof note === "string" && note.trim().length > 0,
  );

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Recovery Recommendations
        </h3>
        <span className="text-xl" aria-hidden="true">
          🧘
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-muted text-xs uppercase tracking-wide">
            Between Sets
          </div>
          <p className="text-sm font-medium">{restBetweenSets}</p>
        </div>
        <div>
          <div className="text-muted text-xs uppercase tracking-wide">
            Between Sessions
          </div>
          <p className="text-sm font-medium">{restBetweenSessions}</p>
        </div>
        {sessionDurationEstimate && (
          <div className="md:col-span-2">
            <div className="text-muted text-xs uppercase tracking-wide">
              Estimated Session Length
            </div>
            <p className="text-sm font-medium">{sessionDurationEstimate}</p>
          </div>
        )}
      </div>

      {recoveryNotes.length > 0 && (
        <div>
          <div className="text-muted text-xs uppercase tracking-wide">
            Additional Notes
          </div>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {recoveryNotes.map((note, index) => (
              <li key={`${index}-${note.slice(0, 16)}`}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
