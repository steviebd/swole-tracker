'use client';

import { Card } from '~/components/ui/card';

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
  const variant =
    probability >= 0.8
      ? "excellent"
      : probability >= 0.6
        ? "good"
        : probability >= 0.4
          ? "moderate"
          : probability >= 0.2
            ? "low"
            : "veryLow";

  const variantConfig = {
    excellent: {
      percentClass: "text-[var(--color-status-success-default)]",
      progressClass: "text-[var(--color-status-success-default)]",
      pillClasses:
        "text-[var(--color-status-success-default)] bg-[color-mix(in_srgb,_var(--color-status-success)_10%,_transparent_90%)] border-[color-mix(in_srgb,_var(--color-status-success)_30%,_transparent_70%)]",
      label: "🔥 Excellent",
    },
    good: {
      percentClass: "text-[var(--color-primary-default)]",
      progressClass: "text-[var(--color-primary-default)]",
      pillClasses:
        "text-[var(--color-primary-default)] bg-[color-mix(in_srgb,_var(--color-primary)_10%,_transparent_90%)] border-[color-mix(in_srgb,_var(--color-primary)_30%,_transparent_70%)]",
      label: "💪 Good",
    },
    moderate: {
      percentClass: "text-[var(--color-text)]",
      progressClass: "text-[var(--color-text-secondary)]",
      pillClasses:
        "text-[var(--color-text)] bg-[color-mix(in_srgb,_var(--color-bg-surface)_50%,_var(--color-bg-app)_50%)] border-[var(--color-border)]",
      label: "⚖️ Moderate",
    },
    low: {
      percentClass: "text-[var(--color-status-warning-default)]",
      progressClass: "text-[var(--color-status-warning-default)]",
      pillClasses:
        "text-[var(--color-status-warning-default)] bg-[color-mix(in_srgb,_var(--color-status-warning)_10%,_transparent_90%)] border-[color-mix(in_srgb,_var(--color-status-warning)_30%,_transparent_70%)]",
      label: "⚠️ Low",
    },
    veryLow: {
      percentClass: "text-[var(--color-status-danger-default)]",
      progressClass: "text-[var(--color-status-danger-default)]",
      pillClasses:
        "text-[var(--color-status-danger-default)] bg-[color-mix(in_srgb,_var(--color-status-danger)_10%,_transparent_90%)] border-[color-mix(in_srgb,_var(--color-status-danger)_30%,_transparent_70%)]",
      label: "🚨 Very Low",
    },
  } as const;
  const config = variantConfig[variant];

  // Calculate the stroke-dasharray for the circular progress
  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDashoffset = circumference - (probability * circumference);

  return (
    <Card className="p-4 text-center">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {subtitle}
          </p>
        )}

        {/* Circular gauge */}
        <div className="relative mx-auto h-24 w-24">
          <svg className="h-24 w-24 -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-[var(--color-border)]"
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
              className={cx(
                "transition-all duration-1000 ease-out",
                config.progressClass,
              )}
            />
          </svg>
          {/* Percentage in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cx("text-2xl font-bold", config.percentClass)}>
              {percent}%
            </span>
          </div>
        </div>

        {/* Status indicator */}
        <div
          data-variant={variant}
          className={cx(
            "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium",
            config.pillClasses,
          )}
        >
          {config.label}
        </div>
      </div>
    </Card>
  );
}
