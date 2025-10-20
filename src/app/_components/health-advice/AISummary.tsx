'use client';

import { useState } from 'react';
import { Card } from '~/components/ui/card';

interface AISummaryProps {
  summary: string;
  warnings: string[];
}

export function AISummary({ summary, warnings }: AISummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left"
        >
          <h3 className="flex items-center justify-between gap-2 text-lg font-semibold">
            <span className="flex items-center gap-2">🤖 AI Coach Summary</span>
            <span className="text-sm text-[var(--color-text-muted)]">
              {isExpanded ? "▼" : "▶"}
            </span>
          </h3>
        </button>

        {isExpanded && (
          <div className="prose prose-sm max-w-none">
            <p className="leading-relaxed text-[var(--color-text)] opacity-90">
              {summary}
            </p>
          </div>
        )}
      </div>

      {/* Warnings */}
      {isExpanded && warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1 text-sm font-medium text-[var(--color-status-warning-default)]">
            ⚠️ Important Notes
          </h4>
          <div className="space-y-1">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className="flex items-start gap-2 rounded-lg border bg-[color-mix(in_srgb,_var(--color-status-warning)_5%,_transparent_95%)] p-3 border-[color-mix(in_srgb,_var(--color-status-warning)_20%,_transparent_80%)]"
              >
                <div className="mt-0.5 flex-shrink-0 text-[var(--color-status-warning-default)]">
                  ⚠️
                </div>
                <p className="text-sm text-[var(--color-text)]">{warning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)] pt-3">
          <p className="text-xs italic text-[var(--color-text-muted)]">
            💡 This is not medical advice. These recommendations are based on
            your WHOOP data and workout history. Always listen to your body and
            consult healthcare professionals for medical concerns.
          </p>
        </div>
      )}
    </Card>
  );
}
