"use client";

import React, { useEffect, useMemo } from "react";
import { LegacySheet } from "./sheet";
import { Button } from "./button";

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
  allowNegative = false,
  onApply,
}: NumericPadOverlayProps) {
  // Standardize the input - remove non-numeric characters
  const normalizedValue = useMemo(() => {
    if (!value) return "";
    const cleaned = value.replace(/[^0-9.-]/g, "");
    return cleaned;
  }, [value]);

  // Parse the numeric value safely (for future use)
  const _numericValue = useMemo(() => {
    const parsed = parseFloat(normalizedValue);
    return isNaN(parsed) ? 0 : parsed;
  }, [normalizedValue]);

  // Handle number pad button presses
  const handleDigit = (digit: string) => {
    if (digit === ".") {
      if (!allowDecimal || normalizedValue.includes(".")) return;
    }
    
    const newValue = normalizedValue + digit;
    onChange(newValue);
  };

  const handleClear = () => onChange("");
  
  const handleBackspace = () => {
    const newValue = normalizedValue.slice(0, -1);
    onChange(newValue);
  };

  const handleShortcut = (shortcut: number) => {
    onChange(shortcut.toString());
  };

  const handleLastUsed = () => {
    if (lastUsed !== null && lastUsed !== undefined) {
      onChange(lastUsed.toString());
    }
  };

  const handleSign = () => {
    if (!allowNegative) return;
    const newValue = normalizedValue.startsWith("-") 
      ? normalizedValue.slice(1)
      : "-" + normalizedValue;
    onChange(newValue);
  };

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    
    const internalHandleDigit = (digit: string) => {
      if (digit === ".") {
        if (!allowDecimal || normalizedValue.includes(".")) return;
      }
      
      const newValue = normalizedValue + digit;
      onChange(newValue);
    };

    const internalHandleClear = () => onChange("");
    
    const internalHandleBackspace = () => {
      const newValue = normalizedValue.slice(0, -1);
      onChange(newValue);
    };
    
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && onApply) {
        onApply();
        onClose();
      } else if (/^[0-9]$/.test(e.key)) {
        internalHandleDigit(e.key);
      } else if (e.key === "." && allowDecimal) {
        internalHandleDigit(".");
      } else if (e.key === "Backspace") {
        internalHandleBackspace();
      } else if (e.key === "Delete") {
        internalHandleClear();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [open, onClose, onApply, normalizedValue, allowDecimal, onChange]);

  const displayValue = normalizedValue || "0";
  const displayWithUnit = unit ? `${displayValue} ${unit}` : displayValue;

  return (
    <LegacySheet
      isOpen={open}
      onClose={onClose}
      title={label || "Enter Value"}
      className="sm:max-w-sm"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (onApply) onApply();
              onClose();
            }}
            className="flex-1"
          >
            Apply
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Display */}
        <div className="text-center">
          <div className="text-3xl font-mono font-semibold tabular-nums">
            {displayWithUnit}
          </div>
        </div>

        {/* Quick Shortcuts */}
        {(shortcuts.length > 0 || lastUsed !== null) && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Quick Select</div>
            <div className="flex flex-wrap gap-2">
              {lastUsed !== null && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLastUsed}
                  className="text-xs"
                >
                  Last: {lastUsed} {unit}
                </Button>
              )}
              {shortcuts.map((shortcut) => (
                <Button
                  key={shortcut}
                  variant="outline"
                  size="sm"
                  onClick={() => handleShortcut(shortcut)}
                  className="text-xs"
                >
                  {shortcut} {unit}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3">
          {/* Row 1 */}
          <Button variant="outline" onClick={() => handleDigit("1")}>1</Button>
          <Button variant="outline" onClick={() => handleDigit("2")}>2</Button>
          <Button variant="outline" onClick={() => handleDigit("3")}>3</Button>
          
          {/* Row 2 */}
          <Button variant="outline" onClick={() => handleDigit("4")}>4</Button>
          <Button variant="outline" onClick={() => handleDigit("5")}>5</Button>
          <Button variant="outline" onClick={() => handleDigit("6")}>6</Button>
          
          {/* Row 3 */}
          <Button variant="outline" onClick={() => handleDigit("7")}>7</Button>
          <Button variant="outline" onClick={() => handleDigit("8")}>8</Button>
          <Button variant="outline" onClick={() => handleDigit("9")}>9</Button>
          
          {/* Row 4 */}
          {allowNegative ? (
            <Button variant="outline" onClick={handleSign}>+/-</Button>
          ) : (
            <div></div>
          )}
          <Button variant="outline" onClick={() => handleDigit("0")}>0</Button>
          {allowDecimal ? (
            <Button variant="outline" onClick={() => handleDigit(".")}>.</Button>
          ) : (
            <div></div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBackspace} className="flex-1">
            ⌫
          </Button>
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear
          </Button>
        </div>
      </div>
    </LegacySheet>
  );
}