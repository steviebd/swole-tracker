"use client";

import React from "react";
import { analytics } from "~/lib/analytics";

export interface SetData {
  id: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  sets: number;
  unit: "kg" | "lbs";
  rpe?: number; // 6–10
  rest?: number; // seconds
  notes?: string;
  distance?: number;
  time?: number;
  setType?: "warmup" | "working" | "backoff" | "drop"; // Set classification
}

interface SetInputProps {
  set: SetData;
  setIndex: number;
  exerciseIndex: number;
  exerciseName: string;
  templateExerciseId?: number;
  onUpdate: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetData,
    value: string | number | undefined,
  ) => void;
  onToggleUnit: (exerciseIndex: number, setIndex: number) => void;
  onDelete: (exerciseIndex: number, setIndex: number) => void;
  readOnly?: boolean;
  showDelete?: boolean;
  // Arrow button handlers for reordering sets
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  // User's preferred weight unit
  preferredUnit?: "kg" | "lbs";
}

import { useEffect, useRef } from "react";

export function SetInput({
  set,
  setIndex,
  exerciseIndex,
  exerciseName,
  templateExerciseId,
  onUpdate,
  onToggleUnit: _onToggleUnit,
  onDelete,
  readOnly = false,
  showDelete = true,
  onMoveUp,
  onMoveDown,
  preferredUnit = "kg",
}: SetInputProps) {
  const weightInputRef = useRef<HTMLInputElement>(null);
  const repsInputRef = useRef<HTMLInputElement>(null);
  const restInputRef = useRef<HTMLInputElement>(null);
  const lastUsedWeight = useRef<number | null>(null);

  useEffect(() => {
    // remember last used weight for shortcuts
    if (typeof set.weight === "number" && !Number.isNaN(set.weight)) {
      lastUsedWeight.current = set.weight;
    }
  }, [set.weight]);

  const handleWeightChange = (value: number | undefined) => {
    onUpdate(exerciseIndex, setIndex, "weight", value);
    if (value && set.sets) {
      analytics.exerciseLogged(
        templateExerciseId?.toString() ?? "custom",
        exerciseName,
        set.sets,
        value,
      );
    }
  };

  const handleRepsChange = (value: number | undefined) => {
    onUpdate(exerciseIndex, setIndex, "reps", value);
  };

  const handleSetsChange = (value: number | undefined) => {
    onUpdate(exerciseIndex, setIndex, "sets", value ?? 1);
  };

  const handleRpeChange = (value: number) => {
    onUpdate(exerciseIndex, setIndex, "rpe", value);
  };

  const handleRestChange = (value: number | undefined) => {
    onUpdate(exerciseIndex, setIndex, "rest", value);
  };

  return (
    <div
      className="glass-card glass-hairline text-foreground card-interactive relative flex items-center gap-3 rounded-lg p-3 select-none"
      onKeyDown={(e) => {
        if (readOnly) return;
        if (e.key === "ArrowUp" && e.ctrlKey && onMoveUp) {
          e.preventDefault();
          onMoveUp();
        } else if (e.key === "ArrowDown" && e.ctrlKey && onMoveDown) {
          e.preventDefault();
          onMoveDown();
        }
      }}
      tabIndex={0}
      role="group"
      aria-label={`Set ${set.setNumber} of ${exerciseName}`}
    >
      {/* Drag Handle */}
      {!readOnly && (
        <div className="absolute top-1/2 left-1 -translate-y-1/2">
          <div className="flex flex-col gap-0.5">
            <div className="bg-muted-foreground/30 h-1 w-4 rounded-full"></div>
            <div className="bg-muted-foreground/30 h-1 w-4 rounded-full"></div>
            <div className="bg-muted-foreground/30 h-1 w-4 rounded-full"></div>
          </div>
        </div>
      )}

      {/* Set Number */}
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium"
        style={{
          backgroundColor: "var(--color-primary)",
          color: "var(--btn-primary-fg)",
        }}
      >
        {set.setNumber}
      </div>

      {/* Input Grid */}
      <div className="flex flex-1 flex-wrap gap-3">
        {/* Weight */}
        <div className="min-w-[120px] flex-1">
          <label
            className="mb-1 block text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Weight
          </label>
          <div className="relative flex items-center">
            <input
              ref={weightInputRef}
              type="number"
              step="0.5"
              inputMode="decimal"
              pattern="[0-9]*"
              value={set.weight ?? ""}
              onChange={(e) => {
                const value = e.target.value
                  ? parseFloat(e.target.value)
                  : undefined;
                handleWeightChange(value);
              }}
              onFocus={(e) => {
                // select content and make sure the field is visible above the keyboard
                e.target.select();
                try {
                  e.currentTarget.scrollIntoView({
                    block: "center",
                    behavior: "smooth",
                  });
                } catch {}
              }}
              placeholder="0"
              disabled={readOnly}
              className={`input-primary w-full pr-12 ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
            />
            <span
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs select-none"
              style={{ color: "var(--color-text-muted)" }}
            >
              {preferredUnit}
            </span>
          </div>
        </div>

        {/* Reps */}
        <div className="min-w-[100px] flex-1">
          <label
            className="mb-1 block text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Reps
          </label>
          <input
            ref={repsInputRef}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={set.reps ?? ""}
            onChange={(e) => {
              const value = e.target.value
                ? parseInt(e.target.value)
                : undefined;
              handleRepsChange(value);
            }}
            onFocus={(e) => {
              e.target.select();
              try {
                e.currentTarget.scrollIntoView({
                  block: "center",
                  behavior: "smooth",
                });
              } catch {}
            }}
            placeholder="0"
            disabled={readOnly}
            className={`input-primary w-full ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
          />
        </div>

        {/* Sets */}
        <div className="min-w-[100px] flex-1">
          <label
            className="mb-1 block text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Sets
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={set.sets}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : 1;
              handleSetsChange(value);
            }}
            onFocus={(e) => {
              e.target.select();
              try {
                e.currentTarget.scrollIntoView({
                  block: "center",
                  behavior: "smooth",
                });
              } catch {}
            }}
            placeholder="1"
            min="1"
            disabled={readOnly}
            className={`input-primary w-full ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
          />
        </div>
        {/* RPE segmented [6-10] */}
        <div className="min-w-[160px]">
          <label
            className="mb-1 block text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            RPE
          </label>
          <div className="flex items-center gap-1">
            {[6, 7, 8, 9, 10].map((r) => {
              const active = set.rpe === r;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={readOnly}
                  onClick={() => !readOnly && handleRpeChange(r)}
                  className={`rounded-md px-2 py-1 text-xs ${active ? "btn-primary" : "btn-secondary"} ${readOnly ? "cursor-not-allowed opacity-60" : ""} `}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rest with quick chips */}
        <div className="min-w-[160px] flex-1">
          <label
            className="mb-1 block text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Rest (s)
          </label>
          <div className="flex items-center gap-1">
            <input
              ref={restInputRef}
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={set.rest ?? ""}
              onChange={(e) => {
                const value = e.target.value
                  ? parseInt(e.target.value)
                  : undefined;
                handleRestChange(value);
              }}
              onFocus={(e) => {
                e.target.select();
                try {
                  e.currentTarget.scrollIntoView({
                    block: "center",
                    behavior: "smooth",
                  });
                } catch {}
              }}
              placeholder="60"
              disabled={readOnly}
              className={`input-primary w-full ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
            />
            {[30, 60, 90].map((sec) => (
              <button
                key={sec}
                type="button"
                disabled={readOnly}
                onClick={() => !readOnly && handleRestChange(sec)}
                className={`btn-secondary rounded-md px-2 py-1 text-xs ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Up/Down arrow buttons for reordering sets */}
      {!readOnly && (onMoveUp || onMoveDown) && (
        <div className="mr-1 ml-1 flex flex-col gap-1">
          {/* Move Up Button */}
          {onMoveUp && (
            <button
              type="button"
              onClick={() => {
                console.log("[SetInput] Move Up button clicked", {
                  exerciseIndex,
                  setIndex,
                });
                onMoveUp();
              }}
              className="px-1 py-1 transition-colors"
              style={{ color: "var(--color-text-secondary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--color-text)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--color-text-secondary)")
              }
              title="Move set up"
              aria-label="Move set up"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7 14l5-5 5 5z" />
              </svg>
            </button>
          )}

          {/* Move Down Button */}
          {onMoveDown && (
            <button
              type="button"
              onClick={() => {
                console.log("[SetInput] Move Down button clicked", {
                  exerciseIndex,
                  setIndex,
                });
                onMoveDown();
              }}
              className="px-1 py-1 transition-colors"
              style={{ color: "var(--color-text-secondary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--color-text)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--color-text-secondary)")
              }
              title="Move set down"
              aria-label="Move set down"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Delete Button */}
      {!readOnly && showDelete && (
        <button
          onClick={(e) => {
            // Stop drag/swipe from hijacking the delete tap
            e.stopPropagation();
            onDelete(exerciseIndex, setIndex);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="btn-destructive flex h-8 w-8 items-center justify-center rounded-full"
          title="Delete set"
        >
          ×
        </button>
      )}
    </div>
  );
}
