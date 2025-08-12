'use client';

import { Card } from '~/app/_components/ui/Card';

interface ProbabilityGaugeProps {
  probability: number; // 0-1
  title: string;
  subtitle?: string;
}

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}

export function ProbabilityGauge({ probability, title, subtitle }: ProbabilityGaugeProps) {
  const percent = Math.round(probability * 100);
  
  // Determine color based on probability
  const getColor = (prob: number) => {
    if (prob >= 0.8) return { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-200' };
    if (prob >= 0.6) return { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-200' };
    if (prob >= 0.4) return { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-200' };
    if (prob >= 0.2) return { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-200' };
    return { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-200' };
  };

  const colors = getColor(probability);

  // Calculate the stroke-dasharray for the circular progress
  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDashoffset = circumference - (probability * circumference);

  return (
    <Card className="p-4 text-center">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        
        {/* Circular gauge */}
        <div className="relative w-24 h-24 mx-auto">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cx(colors.bg.replace('bg-', 'text-'), "transition-all duration-1000 ease-out")}
            />
          </svg>
          {/* Percentage in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cx("text-2xl font-bold", colors.text)}>
              {percent}%
            </span>
          </div>
        </div>

        {/* Status indicator */}
        <div className={cx(
          "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border",
          colors.text,
          colors.bg.replace('bg-', 'bg-').replace('-500', '-50'),
          colors.border
        )}>
          {probability >= 0.8 ? '🔥 Excellent' :
           probability >= 0.6 ? '💪 Good' :
           probability >= 0.4 ? '⚖️ Moderate' :
           probability >= 0.2 ? '⚠️ Low' : '🚨 Very Low'}
        </div>
      </div>
    </Card>
  );
}