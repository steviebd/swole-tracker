import * as React from "react";
import { cn } from "~/lib/utils";

export interface LoadingStateProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Message announced to assistive tech while content loads */
  label: string;
  /** Optional additional context for screen readers */
  description?: string;
}

export const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ label, description, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative", className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
        {...props}
      >
        <span className="sr-only">{label}</span>
        {description ? <span className="sr-only">{description}</span> : null}
        {children}
      </div>
    );
  },
);
LoadingState.displayName = "LoadingState";

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Visible headline describing the empty state */
  title: string;
  /** Supporting copy explaining the next action */
  description?: string;
  /** Optional decorative icon or emoji */
  icon?: React.ReactNode;
  /** Optional call-to-action buttons or links */
  actions?: React.ReactNode;
  /** Custom announcement for assistive tech */
  srLabel?: string;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    { title, description, icon, actions, srLabel, className, children, ...props },
    ref,
  ) => {
    const announcement = srLabel ?? `${title}${description ? `. ${description}` : ""}`;

    return (
      <div
        ref={ref}
        className={cn(
          "glass-surface relative overflow-hidden rounded-xl p-8 text-center sm:p-10",
          className,
        )}
        role="status"
        aria-live="polite"
        {...props}
      >
        <span className="sr-only">{announcement}</span>
        <div className="relative z-10 space-y-5">
          {icon ? (
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl"
              aria-hidden="true"
            >
              {icon}
            </div>
          ) : null}
          <div className="space-y-2">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {title}
            </h3>
            {description ? (
              <p className="text-sm text-muted-foreground mx-auto max-w-sm">
                {description}
              </p>
            ) : null}
          </div>
          {children}
          {actions ? <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
        </div>
      </div>
    );
  },
);
EmptyState.displayName = "EmptyState";
