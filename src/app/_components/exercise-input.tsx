"use client";

import { useState } from "react";

interface ExerciseInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Simplified exercise input component for template creation.
 *
 * This component only handles basic exercise name input during step 2.
 * Exercise linking is now handled separately in step 3 via ExerciseLinkingReview.
 */
export function ExerciseInput({
  value,
  onChange,
  placeholder = "Enter exercise name...",
  className,
  style,
}: ExerciseInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        style={{
          ...style,
          borderColor: isFocused ? "var(--color-primary)" : style?.borderColor,
          outline: "none",
          transition: "border-color 0.2s ease",
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      {/* Helper text to indicate linking happens later */}
      {value && (
        <div
          className="mt-1 text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          Exercise linking will be available in the next step
        </div>
      )}
    </div>
  );
}
