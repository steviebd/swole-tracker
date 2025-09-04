"use client";

import React, { useEffect } from "react";
import { cn } from "~/lib/utils";

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
export function Toast({
  open,
  type = "info",
  message,
  onClose,
  onUndo,
  className,
}: ToastProps) {
  // Auto-dismiss behavior
  useEffect(() => {
    if (!open || !onClose) return;
    
    // Don't auto-dismiss if there's an undo action
    if (onUndo) return;
    
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // 4 second auto-dismiss

    return () => clearTimeout(timer);
  }, [open, onClose, onUndo]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  // Determine styles based on type
  const typeStyles = {
    success: "bg-emerald-50 text-emerald-900 border-emerald-200",
    error: "bg-red-50 text-red-900 border-red-200", 
    warning: "bg-yellow-50 text-yellow-900 border-yellow-200",
    info: "bg-blue-50 text-blue-900 border-blue-200",
  };

  const iconMap = {
    success: "✅",
    error: "❌",
    warning: "⚠️", 
    info: "ℹ️",
  };

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 z-50 flex min-w-[300px] max-w-md -translate-x-1/2 items-center gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm",
        "animate-in fade-in-0 slide-in-from-top-2 duration-300",
        typeStyles[type],
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <span className="text-lg" aria-hidden="true">
        {iconMap[type]}
      </span>

      {/* Message */}
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {onUndo && (
          <button
            onClick={() => {
              onUndo();
              if (onClose) onClose();
            }}
            className="text-xs font-semibold underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-1 rounded"
            aria-label="Undo action"
          >
            Undo
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="ml-1 text-current/60 hover:text-current focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-1 rounded"
            aria-label="Close notification"
          >
            <span className="text-lg leading-none" aria-hidden="true">×</span>
          </button>
        )}
      </div>
    </div>
  );
}