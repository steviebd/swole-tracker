'use client';

import { Card } from '~/app/_components/ui/Card';

interface ReadinessIndicatorProps {
  rho: number; // 0-1
  flags: string[];
  overloadMultiplier: number; // 0.9-1.1
}

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}

export function ReadinessIndicator({ rho, flags, overloadMultiplier }: ReadinessIndicatorProps) {
  // Calculate readiness level and color
  const readinessPercent = Math.round(rho * 100);
  const readinessLevel = rho >= 0.8 ? 'high' : rho >= 0.6 ? 'medium' : rho >= 0.35 ? 'low' : 'very-low';
  
  const colorClasses = {
    'very-low': 'text-red-600 bg-red-50 border-red-200',
    'low': 'text-orange-600 bg-orange-50 border-orange-200',
    'medium': 'text-yellow-600 bg-yellow-50 border-yellow-200',
    'high': 'text-green-600 bg-green-50 border-green-200'
  };

  const progressColorClasses = {
    'very-low': 'bg-red-500',
    'low': 'bg-orange-500',
    'medium': 'bg-yellow-500',
    'high': 'bg-green-500'
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Readiness Score</h3>
        <span className={cx(
          "text-2xl font-bold",
          colorClasses[readinessLevel].split(' ')[0]
        )}>
          {readinessPercent}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={cx(
            "h-3 rounded-full transition-all duration-300",
            progressColorClasses[readinessLevel]
          )}
          style={{ width: `${readinessPercent}%` }}
        />
      </div>

      {/* Overload multiplier */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Load Adjustment:</span>
        <span className={cx(
          "font-semibold",
          overloadMultiplier > 1 ? "text-blue-600" : 
          overloadMultiplier < 1 ? "text-orange-600" : "text-gray-600"
        )}>
          {overloadMultiplier > 1 ? '+' : ''}
          {Math.round((overloadMultiplier - 1) * 100)}%
        </span>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Status Flags:</h4>
          <div className="flex flex-wrap gap-1">
            {flags.map((flag, index) => (
              <span
                key={index}
                className={cx(
                  "px-2 py-1 text-xs rounded-full border",
                  flag.includes('good') || flag.includes('high') ? 
                    "text-green-700 bg-green-50 border-green-200" :
                  flag.includes('low') || flag.includes('poor') || flag.includes('missing') ?
                    "text-orange-700 bg-orange-50 border-orange-200" :
                    "text-gray-700 bg-gray-50 border-gray-200"
                )}
              >
                {flag.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}