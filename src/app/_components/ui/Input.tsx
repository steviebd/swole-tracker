"use client";

import React from "react";

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  invalid?: boolean;
  hint?: string;
  rightAdornment?: React.ReactNode /* e.g., unit toggle */;
  leftAdornment?: React.ReactNode /* e.g., icon */;
  block?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      invalid,
      hint,
      className,
      rightAdornment,
      leftAdornment,
      block = true,
      type = "text",
      ...props
    },
    ref,
  ) {
    const id = React.useId();
    const describedBy = hint ? `${id}-hint` : undefined;
    return (
      <div className={cx(block ? "w-full" : "", "space-y-1")}>
        {label ? (
          <label htmlFor={id} className="text-secondary block text-xs">
            {label}
          </label>
        ) : null}
        <div
          className={cx(
            "flex items-center gap-1 rounded-md border",
            "bg-transparent",
            "px-2 py-1.5",
            "border-[color:var(--color-border)]",
            "focus-within:border-[color:var(--color-primary)] focus-within:[box-shadow:var(--shadow-focus)]",
          )}
        >
          {leftAdornment ? (
            <div className="shrink-0">{leftAdornment}</div>
          ) : null}
          <input
            ref={ref}
            id={id}
            type={type}
            aria-invalid={invalid ? "true" : "false"}
            aria-describedby={describedBy}
            data-invalid={invalid ? "true" : undefined}
            className={cx(
              "input !border-0 !bg-transparent !px-0 !py-0 focus:ring-0 focus:outline-none",
              "flex-1",
              className,
            )}
            {...props}
          />
          {rightAdornment ? (
            <div className="shrink-0">{rightAdornment}</div>
          ) : null}
        </div>
        {hint ? (
          <div
            id={describedBy}
            className={cx(
              "text-xs",
              invalid ? "text-[var(--color-danger)]" : "text-secondary",
            )}
          >
            {hint}
          </div>
        ) : null}
      </div>
    );
  },
);
