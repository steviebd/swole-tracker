import * as React from "react"
import { cn } from "~/lib/utils"

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  invalid?: boolean;
  hint?: string;
  rightAdornment?: React.ReactNode /* e.g., unit toggle */;
  leftAdornment?: React.ReactNode /* e.g., icon */;
  block?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    invalid,
    hint,
    className,
    rightAdornment,
    leftAdornment,
    block = true,
    type = "text",
    ...props
  }, ref) => {
    const id = React.useId();
    const describedBy = hint ? `${id}-hint` : undefined;
    
    return (
      <div className={cn(block ? "w-full" : "", "space-y-1")}>
        {label ? (
          <label htmlFor={id} className="text-secondary block text-xs">
            {label}
          </label>
        ) : null}
        <div
          className={cn(
            "flex items-center gap-1",
            "input-primary",
            "transition-all",
            invalid && "border-destructive focus-within:border-destructive"
          )}
          style={{
            borderRadius: 'var(--component-input-borderRadius)',
            padding: `var(--component-input-padding-y) var(--component-input-padding-x)`,
            fontSize: 'var(--component-input-fontSize)',
            transitionDuration: 'var(--motion-duration-base)',
          }}
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
            className={cn(
              "border-0 bg-transparent px-0 py-0 focus:ring-0 focus:outline-none",
              "flex-1 placeholder:text-muted-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50",
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
            className={cn(
              "text-xs",
              invalid ? "text-destructive text-danger" : "text-muted-foreground text-secondary",
            )}
          >
            {hint}
          </div>
        ) : null}
      </div>
    );
  }
)
Input.displayName = "Input"

export { Input }