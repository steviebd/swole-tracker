'use client';

import { Card } from '~/app/_components/ui/Card';

interface AISummaryProps {
  summary: string;
  warnings: string[];
}

// Removed unused cx function

export function AISummary({ summary, warnings }: AISummaryProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          🤖 AI Coach Summary
        </h3>
        
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 leading-relaxed">{summary}</p>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-amber-700 flex items-center gap-1">
            ⚠️ Important Notes
          </h4>
          <div className="space-y-1">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div className="text-amber-600 flex-shrink-0 mt-0.5">⚠️</div>
                <p className="text-sm text-amber-800">{warning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 italic">
          💡 This is not medical advice. These recommendations are based on your WHOOP data and workout history. 
          Always listen to your body and consult healthcare professionals for medical concerns.
        </p>
      </div>
    </Card>
  );
}