"use client";

import React, { useEffect } from "react";

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  open: boolean;
  type?: ToastType;
  message: React.ReactNode;
  onClose?: () => void;
  /** If provided, shows a persistent Undo chip that stays until next user action. */
  onUndo?: () => void;
  className?: string;
}

/**
 * Token-driven toast/inline notice.
 * If onUndo is provided, the Undo chip is persistent until the next user action.
 */
export function Toast({ open, type = "info", message, onClose, onUndo, className }: ToastProps) {
  useEffect(() => {
    // No auto-dismiss when Undo is present (persistent until next action)
  }, [open, onUndo]);

  if (!open) return null;

  const base =
    "rounded-lg p-3 text-sm flex items-center justify-between border";
  const tone =
    type === "success"
      ? "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-100"
      : type === "error"
      ? "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100"
      : type === "warning"
      ? "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-100"
      : "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-100";

  return (
    <div className={cx(base, tone, className)}>
      <div className="pr-3">{message}</div>
      <div className="flex items-center gap-2">
        {onUndo ? (
          <button
            onClick={onUndo}
            className="rounded border px-3 py-1 text-xs font-medium hover:opacity-90 border-[color:var(--color-border)]"
          >
            Undo
          </button>
        ) : null}
        {onClose ? (
          <button
            aria-label="Dismiss"
            onClick={onClose}
            className="ml-1 text-lg font-bold opacity-70 hover:opacity-100"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
