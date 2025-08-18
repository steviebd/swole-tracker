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
}

export function ExerciseHeader({
  name,
  isExpanded,
  previousBest,
  onToggleExpansion,
  onSwipeToBottom: _onSwipeToBottom,
  exerciseIndex,
}: ExerciseHeaderProps) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex min-w-0 flex-col">
        <div className="truncate text-base font-semibold" style={{ color: 'var(--color-text)' }}>{name}</div>
        {previousBest && (
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
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
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs transition-colors"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-surface)',
            color: 'var(--color-text)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-border)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-surface)';
          }}
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
