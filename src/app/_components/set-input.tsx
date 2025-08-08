"use client";

import { analytics } from "~/lib/analytics";

export interface SetData {
  id: string;
  weight?: number;
  reps?: number;
  sets: number;
  unit: "kg" | "lbs";
  rpe?: number;   // 6–10
  rest?: number;  // seconds
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
  // Optional: parent can pass a pointer down handler to start drag for reordering sets
  onPointerDownForSet?: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
}

import { useEffect, useRef, useState } from "react";
import { NumericPadOverlay } from "./ui/NumericPadOverlay";

export function SetInput({
  set,
  setIndex,
  exerciseIndex,
  exerciseName,
  templateExerciseId,
  onUpdate,
  onToggleUnit,
  onDelete,
  readOnly = false,
  showDelete = true,
  onPointerDownForSet,
}: SetInputProps) {
  const [padOpenFor, setPadOpenFor] = useState<null | "weight" | "reps" | "rest">(null);
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

  const closePadAndRefocus = () => {
    const field = padOpenFor;
    setPadOpenFor(null);
    // Return focus to the originating input
    setTimeout(() => {
      if (field === "weight") weightInputRef.current?.focus();
      if (field === "reps") repsInputRef.current?.focus();
      if (field === "rest") restInputRef.current?.focus();
    }, 0);
  };
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
    <div className="flex items-center gap-3 rounded-lg p-3 select-none glass-surface glass-hairline text-gray-900 dark:text-white">
      {/* Set Number */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-xs font-medium text-white">
        {setIndex + 1}
      </div>

      {/* Input Grid */}
      <div className="flex flex-1 flex-wrap gap-3">
        {/* Weight */}
        <div className="min-w-[120px] flex-1">
          <label className="mb-1 block text-xs text-secondary">Weight</label>
          <div className="flex items-center gap-1">
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
                  e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
                } catch {}
              }}
              onClick={() => !readOnly && setPadOpenFor("weight")}
              placeholder="0"
              disabled={readOnly}
              className={`input flex-1 bg-transparent ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
            />
            <button
              type="button"
              onClick={() => !readOnly && onToggleUnit(exerciseIndex, setIndex)}
              disabled={readOnly}
              className={`px-2 text-xs btn-secondary ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
              title="Toggle unit"
            >
              {set.unit}
            </button>
          </div>
        </div>

        {/* Reps */}
        <div className="min-w-[100px] flex-1">
          <label className="mb-1 block text-xs text-secondary">Reps</label>
          <input
            ref={repsInputRef}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={set.reps ?? ""}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : undefined;
              handleRepsChange(value);
            }}
            onFocus={(e) => {
              e.target.select();
              try {
                e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
              } catch {}
            }}
            onClick={() => !readOnly && setPadOpenFor("reps")}
            placeholder="0"
            disabled={readOnly}
            className={`input w-full bg-transparent ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
          />
        </div>

        {/* Sets */}
        <div className="min-w-[100px] flex-1">
          <label className="mb-1 block text-xs text-secondary">Sets</label>
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
                e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
              } catch {}
            }}
            placeholder="1"
            min="1"
            disabled={readOnly}
            className={`input w-full bg-transparent ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
          />
        </div>
        {/* RPE segmented [6-10] */}
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs text-secondary">RPE</label>
          <div className="flex items-center gap-1">
            {[6,7,8,9,10].map((r) => {
              const active = set.rpe === r;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={readOnly}
                  onClick={() => !readOnly && handleRpeChange(r)}
                  className={`
                    px-2 py-1 rounded-md text-xs 
                    ${active ? "btn-primary" : "btn-secondary"}
                    ${readOnly ? "opacity-60 cursor-not-allowed" : ""}
                  `}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rest with quick chips */}
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs text-secondary">Rest (s)</label>
          <div className="flex items-center gap-1">
            <input
              ref={restInputRef}
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={set.rest ?? ""}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : undefined;
                handleRestChange(value);
              }}
              onFocus={(e) => {
                e.target.select();
                try {
                  e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
                } catch {}
              }}
              onClick={() => !readOnly && setPadOpenFor("rest")}
              placeholder="60"
              disabled={readOnly}
              className={`input w-full bg-transparent ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
            />
            {[30,60,90].map((sec) => (
              <button
                key={sec}
                type="button"
                disabled={readOnly}
                onClick={() => !readOnly && handleRestChange(sec)}
                className={`px-2 py-1 rounded-md text-xs btn-secondary ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right-edge drag handle (sets) */}
      {!readOnly && (
        <button
          type="button"
          aria-label="Drag set to reorder"
          data-drag-handle="true"
          className="ml-1 mr-1 px-1 py-2 touch-none cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          // Prefer starting drag from explicit handle to avoid conflicts with inputs
          onPointerDown={onPointerDownForSet}
          onMouseDown={onPointerDownForSet as any}
          onTouchStart={onPointerDownForSet as any}
          style={{ touchAction: 'none' }}
          title="Drag to reorder"
        >
          <span className="inline-flex flex-col gap-0.5">
            <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
            <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
            <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
            <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
            <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
            <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
          </span>
        </button>
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
          className="flex h-8 w-8 items-center justify-center rounded-full btn-destructive"
          title="Delete set"
        >
          ×
        </button>
      )}
      {/* Numeric Pad Overlay */}
      {!readOnly && (
        <NumericPadOverlay
          open={padOpenFor !== null}
          onClose={closePadAndRefocus}
          value={
            padOpenFor === "weight"
              ? (set.weight ?? "").toString()
              : padOpenFor === "reps"
              ? (set.reps ?? "").toString()
              : padOpenFor === "rest"
              ? (set.rest ?? "").toString()
              : ""
          }
          onChange={(next) => {
            const parsed = next === "" ? undefined : Number(next);
            if (padOpenFor === "weight") handleWeightChange(Number.isNaN(parsed!) ? undefined : parsed);
            if (padOpenFor === "reps") handleRepsChange(Number.isNaN(parsed!) ? undefined : parsed);
            if (padOpenFor === "rest") handleRestChange(Number.isNaN(parsed!) ? undefined : parsed);
          }}
          label={
            padOpenFor === "weight" ? "Weight" : padOpenFor === "reps" ? "Reps" : padOpenFor === "rest" ? "Rest (s)" : "Enter value"
          }
          unit={
            padOpenFor === "weight" ? set.unit : padOpenFor === "reps" ? "reps" : padOpenFor === "rest" ? "s" : undefined
          }
          shortcuts={
            padOpenFor === "weight" ? (set.unit === "kg" ? [2.5, 5, 10] : [5, 10, 20]) : padOpenFor === "rest" ? [30, 60, 90] : []
          }
          lastUsed={padOpenFor === "weight" ? lastUsedWeight.current : null}
          allowDecimal={padOpenFor === "weight"}
          allowNegative={false}
          onApply={closePadAndRefocus}
        />
      )}
    </div>
  );
}
