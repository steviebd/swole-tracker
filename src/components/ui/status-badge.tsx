"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { getStatusClasses, getReadinessStatus } from "~/lib/theme-helpers";

export type StatusType = "success" | "warning" | "error";

export interface StatusBadgeProps {
  status: StatusType;
  children: React.ReactNode;
  className?: string;
}

/**
 * Status Badge component for consistent status indicators across themes
 *
 * Uses Material 3 semantic tokens for proper theme integration:
 * - Success: bg-status-success text-onTertiary
 * - Warning: bg-status-warning text-onSecondary
 * - Error: bg-status-danger text-onError
 */
export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, children, className, ...props }, ref) => {
    const classes = getStatusClasses(status);

    return (
      <span
        ref={ref}
        className={cn(
          "rounded-full px-2 py-1 text-xs font-medium",
          classes.bg,
          classes.text,
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

StatusBadge.displayName = "StatusBadge";

/**
 * Re-export readiness status helper from theme-helpers for convenience
 */
export { getReadinessStatus };

/**
 * Helper function to get readiness class string for direct use
 *
 * @param readiness - Readiness value between 0 and 1
 * @returns CSS class string for styling
 */
export function getReadinessClass(readiness: number): string {
  const status = getReadinessStatus(readiness);
  const classes = getStatusClasses(status);
  return `${classes.bg} ${classes.text}`;
}