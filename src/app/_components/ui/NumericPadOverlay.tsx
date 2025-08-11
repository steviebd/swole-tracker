"use client";

import React, { useEffect, useMemo } from "react";
import { Sheet } from "./Sheet";
import { Button } from "./Button";

export interface NumericPadOverlayProps {
  open: boolean;
  onClose: () => void;
  value: string; // current string value
  onChange: (next: string) => void;
  label?: string; // e.g., "Weight", "Reps", "Rest (s)"
  unit?: string; // e.g., "kg", "lbs", "reps", "s"
  shortcuts?: number[]; // e.g., [2.5,5,10] for weight; [30,60,90] for rest
  lastUsed?: number | null; // show last used quick button if provided
  allowDecimal?: boolean; // weight true, reps false, rest false
  allowNegative?: boolean; // generally false
  onApply?: () => void; // optional apply handler
}

export function NumericPadOverlay({
  open,
  onClose,
  value,
  onChange,
  label,
  unit,
  shortcuts = [],
  lastUsed,
  allowDecimal = true,
  allowNegative: _allowNegative = false,
  onApply,
}: NumericPadOverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Basic keyboard support
      if (/^[0-9]$/.test(e.key)) {
        onChange(value + e.key);
        return;
      }
      if (e.key === "." && allowDecimal && !value.includes(".")) {
        onChange(value + ".");
        return;
      }
      if (e.key === "Backspace") {
        onChange(value.slice(0, -1));
        return;
      }
      if (e.key === "Enter") {
        if (onApply) {
          onApply();
        } else {
          onClose();
        }
        return;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, value, onChange, onClose, onApply, allowDecimal]);

  const display = useMemo(() => {
    return value || "0";
  }, [value]);

  // Replace-entry model: the first numeric key after opening replaces any existing value.
  const hasStartedRef = React.useRef(false);

  useEffect(() => {
    if (!open) {
      hasStartedRef.current = false;
    }
  }, [open]);

  const press = (k: string) => {
    // Normalize key and ensure only supported inputs proceed
    const isDigit = /^[0-9]$/.test(k);
    const isBack = k === "back";
    const isClear = k === "clear";
    const isDot = k === ".";
    if (!isDigit && !isBack && !isClear && !isDot) {
      return;
    }

    if (isBack) {
      onChange(value.slice(0, -1));
      return;
    }

    if (isClear) {
      onChange("");
      hasStartedRef.current = false;
      return;
    }

    if (isDot) {
      if (!allowDecimal) return;
      if (!hasStartedRef.current || value === "" || value === "0") {
        hasStartedRef.current = true;
        onChange("0.");
        return;
      }
      if (!value.includes(".")) {
        onChange(value + ".");
      }
      return;
    }

    // Digit branch
    if (isDigit) {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        onChange(k);
      } else {
        onChange(value + k);
      }
      return;
    }
  };

  return (
    <Sheet
      isOpen={open}
      onClose={onClose}
      title={label ?? "Enter value"}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <div className="text-muted text-sm">
            {unit ? <span className="opacity-80">{unit}</span> : null}
          </div>
          <Button variant="primary" onClick={onApply ?? onClose}>
            Apply
          </Button>
        </div>
      }
      className="w-full"
    >
      {/* Current display */}
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-secondary text-xs">{label}</div>
        <div className="text-2xl font-semibold">
          {display}
          {unit ? (
            <span className="ml-1 text-sm opacity-70">{unit}</span>
          ) : null}
        </div>
      </div>

      {/* Shortcuts */}
      <div className="mb-4 flex flex-wrap gap-2">
        {shortcuts.map((s) => (
          <button
            key={s}
            className="rounded-md border border-[color:var(--color-border)] px-3 py-1.5 text-sm hover:opacity-90"
            onClick={() => {
              hasStartedRef.current = true;
              onChange(String(s));
            }}
          >
            +{s}
            {unit ? <span className="ml-0.5 opacity-70">{unit}</span> : null}
          </button>
        ))}
        {lastUsed != null && (
          <button
            className="rounded-md border border-[color:var(--color-border)] px-3 py-1.5 text-sm hover:opacity-90"
            onClick={() => {
              hasStartedRef.current = true;
              onChange(String(lastUsed));
            }}
            title="Use last used value"
          >
            Last: {lastUsed}
            {unit ? <span className="ml-0.5 opacity-70">{unit}</span> : null}
          </button>
        )}
      </div>

      {/* Pad grid */}
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            className="btn-secondary py-4"
            onClick={() => press(d)}
          >
            {d}
          </button>
        ))}
        <button
          className="btn-secondary py-4"
          onClick={() => press(".")}
          disabled={!allowDecimal}
          aria-label="Decimal point"
        >
          .
        </button>
        <button className="btn-secondary py-4" onClick={() => press("0")}>
          0
        </button>
        <button
          className="btn-secondary py-4"
          onClick={() => press("back")}
          aria-label="Backspace"
        >
          ⌫
        </button>
      </div>

      {/* Actions row */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button className="btn-secondary py-3" onClick={() => press("clear")}>
          Clear
        </button>
        {/* Placeholder replacing +/- per request */}
        <div className="py-3" aria-hidden="true"></div>
        <button className="btn-primary py-3" onClick={onApply ?? onClose}>
          Apply
        </button>
      </div>
    </Sheet>
  );
}
