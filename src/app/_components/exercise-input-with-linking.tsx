"use client";

import { Input } from "~/components/ui/input";
import { forwardRef } from "react";

interface ExerciseInputWithLinkingProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const ExerciseInputWithLinking = forwardRef<HTMLInputElement, ExerciseInputWithLinkingProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange?.(newValue);
    };

    return (
      <Input
        ref={ref}
        value={value ?? ""}
        onChange={handleChange}
        className={className}
        {...props}
      />
    );
  }
);

ExerciseInputWithLinking.displayName = "ExerciseInputWithLinking";