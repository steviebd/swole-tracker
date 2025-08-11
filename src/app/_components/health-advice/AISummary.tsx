'use client';

import { useState } from 'react';
import { Card } from '~/app/_components/ui/Card';

interface AISummaryProps {
  summary: string;
  warnings: string[];
}

export function AISummary({ summary, warnings }: AISummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left"
        >
          <h3 className="text-lg font-semibold flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              🤖 AI Coach Summary
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {isExpanded ? '▼' : '▶'}
            </span>
          </h3>
        </button>
        
        {isExpanded && (
          <div className="prose prose-sm max-w-none">
            <p className="leading-relaxed text-current opacity-90">{summary}</p>
          </div>
        )}
      </div>

      {/* Warnings */}
      {isExpanded && warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
            ⚠️ Important Notes
          </h4>
          <div className="space-y-1">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg"
              >
                <div className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">⚠️</div>
                <p className="text-sm text-amber-800 dark:text-amber-200">{warning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      {isExpanded && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            💡 This is not medical advice. These recommendations are based on your WHOOP data and workout history. 
            Always listen to your body and consult healthcare professionals for medical concerns.
          </p>
        </div>
      )}
    </Card>
  );
}