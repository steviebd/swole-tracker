"use client";

import { Card } from "~/components/ui/card";

interface ReadinessIndicatorProps {
  rho: number; // 0-1
  flags: string[];
  overloadMultiplier: number; // 0.9-1.1
}

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

const progressWidthClasses: Record<number, string> = {
  0: "w-[0%]",
  5: "w-[5%]",
  10: "w-[10%]",
  15: "w-[15%]",
  20: "w-[20%]",
  25: "w-[25%]",
  30: "w-[30%]",
  35: "w-[35%]",
  40: "w-[40%]",
  45: "w-[45%]",
  50: "w-[50%]",
  55: "w-[55%]",
  60: "w-[60%]",
  65: "w-[65%]",
  70: "w-[70%]",
  75: "w-[75%]",
  80: "w-[80%]",
  85: "w-[85%]",
  90: "w-[90%]",
  95: "w-[95%]",
  100: "w-[100%]",
};

export function ReadinessIndicator({
  rho,
  flags,
  overloadMultiplier,
}: ReadinessIndicatorProps) {
  // Calculate readiness level and color
  const readinessPercent = Math.round(rho * 100);
  const readinessLevel =
    rho >= 0.8
      ? "high"
      : rho >= 0.6
        ? "medium"
        : rho >= 0.35
          ? "low"
          : "very-low";

  const colors = (() => {
    switch (readinessLevel) {
      case "high":
        return {
          text: "text-[var(--md-sys-color-on-tertiary-container)]",
          bg: "bg-[color-mix(in_srgb,var(--md-sys-color-tertiary-container)_10%,_transparent_90%)]",
          border:
            "border-[color-mix(in_srgb,var(--md-sys-color-tertiary-container)_30%,_transparent_70%)]",
          progressBg: "bg-[var(--md-sys-color-tertiary)]",
        };
      case "medium":
        return {
          text: "text-[var(--md-sys-color-on-surface)]",
          bg: "bg-[color-mix(in_srgb,var(--md-sys-color-surface-variant)_50%,var(--md-sys-color-surface)_50%)]",
          border: "border-[var(--md-sys-color-outline)]",
          progressBg: "bg-[var(--md-sys-color-on-surface-variant)]",
        };
      case "low":
        return {
          text: "text-[var(--md-sys-color-on-secondary-container)]",
          bg: "bg-[color-mix(in_srgb,var(--md-sys-color-secondary-container)_10%,_transparent_90%)]",
          border:
            "border-[color-mix(in_srgb,var(--md-sys-color-secondary-container)_30%,_transparent_70%)]",
          progressBg: "bg-[var(--md-sys-color-secondary)]",
        };
      case "very-low":
      default:
        return {
          text: "text-[var(--md-sys-color-on-error-container)]",
          bg: "bg-[color-mix(in_srgb,var(--md-sys-color-error-container)_10%,_transparent_90%)]",
          border:
            "border-[color-mix(in_srgb,var(--md-sys-color-error-container)_30%,_transparent_70%)]",
          progressBg: "bg-[var(--md-sys-color-error)]",
        };
    }
  })();

  const progressStep = Math.min(
    100,
    Math.max(0, Math.round(readinessPercent / 5) * 5),
  );
  const progressWidthClass = progressWidthClasses[progressStep];
  const overloadClass =
    overloadMultiplier > 1
      ? "text-[var(--md-sys-color-primary)]"
      : overloadMultiplier < 1
        ? "text-[var(--md-sys-color-secondary)]"
        : "text-[var(--md-sys-color-on-surface-variant)]";

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--md-sys-color-on-surface)]">
          Readiness Score
        </h3>
        <span className={cx("text-2xl font-bold", colors.text)}>
          {readinessPercent}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 w-full rounded-full bg-[color-mix(in_oklab,var(--md-sys-color-surface-variant)_50%,var(--md-sys-color-outline)_50%)]">
        <div
          className={cx(
            "h-3 rounded-full transition-all duration-300",
            colors.progressBg,
            progressWidthClass,
          )}
        />
      </div>

      {/* Overload multiplier */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--md-sys-color-on-surface-variant)]">
          Load Adjustment:
        </span>
        <span className={cx("font-semibold", overloadClass)}>
          {overloadMultiplier > 1 ? "+" : ""}
          {Math.round((overloadMultiplier - 1) * 100)}%
        </span>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[var(--md-sys-color-on-surface-variant)]">
            Status Flags:
          </h4>
          <div className="flex flex-wrap gap-1">
            {flags.map((flag, index) => {
              const flagColors =
                flag.includes("good") || flag.includes("high")
                  ? {
                      text: "text-[var(--md-sys-color-on-tertiary-container)]",
                      bg: "bg-[color-mix(in_srgb,var(--md-sys-color-tertiary-container)_10%,_transparent_90%)]",
                      border:
                        "border-[color-mix(in_srgb,var(--md-sys-color-tertiary-container)_30%,_transparent_70%)]",
                    }
                  : flag.includes("low") ||
                      flag.includes("poor") ||
                      flag.includes("missing")
                    ? {
                        text: "text-[var(--md-sys-color-on-secondary-container)]",
                        bg: "bg-[color-mix(in_srgb,var(--md-sys-color-secondary-container)_10%,_transparent_90%)]",
                        border:
                          "border-[color-mix(in_srgb,var(--md-sys-color-secondary-container)_30%,_transparent_70%)]",
                      }
                    : {
                        text: "text-[var(--md-sys-color-on-surface-variant)]",
                        bg: "bg-[color-mix(in_srgb,var(--md-sys-color-surface-variant)_50%,var(--md-sys-color-surface)_50%)]",
                        border: "border-[var(--md-sys-color-outline)]",
                      };
              return (
                <span
                  key={index}
                  className={cx(
                    "rounded-full border px-2 py-1 text-xs",
                    flagColors.text,
                    flagColors.bg,
                    flagColors.border,
                  )}
                >
                  {flag.replace("_", " ")}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
