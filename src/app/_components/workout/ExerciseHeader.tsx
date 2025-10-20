"use client";

import React from "react";

interface PreviousBest {
  weight?: number;
  reps?: number;
  sets?: number;
  unit: "kg" | "lbs";
}

interface ExerciseHeaderProps {
  name: string;
  isExpanded: boolean;
  isSwiped: boolean;
  readOnly: boolean;
  previousBest?: PreviousBest;
  onToggleExpansion: (exerciseIndex: number) => void;
  onSwipeToBottom?: (exerciseIndex: number) => void;
  exerciseIndex: number;
  unit?: "kg" | "lbs";
  onBulkUnitChange?: (exerciseIndex: number, unit: "kg" | "lbs") => void;
}

export function ExerciseHeader({
  name,
  isExpanded,
  previousBest,
  onToggleExpansion,
  onSwipeToBottom: _onSwipeToBottom,
  exerciseIndex,
  unit,
  onBulkUnitChange,
}: ExerciseHeaderProps) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex min-w-0 flex-col">
        <div className="truncate text-base font-semibold text-[var(--color-text)]">
          {name}
        </div>
        {previousBest && (
          <div className="text-xs text-[var(--color-text-muted)]">
            Prev best:{" "}
            {previousBest.weight !== undefined
              ? `${previousBest.weight}${previousBest.unit}`
              : "-"}
            {previousBest.reps !== undefined ? ` × ${previousBest.reps}` : ""}
            {previousBest.sets !== undefined
              ? ` (${previousBest.sets} set${previousBest.sets > 1 ? "s" : ""})`
              : ""}
          </div>
        )}
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-2">
        {/* Unit Controls */}
        {onBulkUnitChange && unit && (
          <div className="flex rounded border border-[var(--color-border)]">
            <button
              type="button"
              className={`px-2 py-1 text-xs transition-colors ${
                unit === "kg"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-text"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onBulkUnitChange(exerciseIndex, "kg");
              }}
              aria-label="Switch to kilograms"
            >
              kg
            </button>
            <button
              type="button"
              className={`px-2 py-1 text-xs transition-colors ${
                unit === "lbs"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-text"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onBulkUnitChange(exerciseIndex, "lbs");
              }}
              aria-label="Switch to pounds"
            >
              lbs
            </button>
          </div>
        )}

        <button
          type="button"
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2 py-1 text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)]"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpansion(exerciseIndex);
          }}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse exercise" : "Expand exercise"}
        >
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      </div>
    </div>
  );
}

export default ExerciseHeader;
