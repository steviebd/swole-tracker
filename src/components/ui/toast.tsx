"use client";

import React, { useEffect } from "react";
import { useReducedMotion } from "framer-motion";

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
  const prefersReducedMotion = useReducedMotion();

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

  const toneTokens: Record<ToastType, { background: string; border: string; icon: string }> = {
    success: {
      background:
        "linear-gradient(135deg, color-mix(in oklab, var(--md-ref-palette-tertiary-40) 75%, black 20%) 0%, color-mix(in oklab, var(--md-ref-palette-tertiary-30) 55%, black 10%) 100%)",
      border: "rgba(54, 211, 153, 0.4)",
      icon: "✅",
    },
    error: {
      background:
        "linear-gradient(135deg, color-mix(in oklab, var(--md-ref-palette-error-40) 75%, black 20%) 0%, color-mix(in oklab, var(--md-ref-palette-error-30) 55%, black 10%) 100%)",
      border: "rgba(248, 113, 113, 0.45)",
      icon: "❌",
    },
    warning: {
      background:
        "linear-gradient(135deg, color-mix(in oklab, var(--md-ref-palette-primary-40) 70%, black 15%) 0%, color-mix(in oklab, var(--md-ref-palette-primary-30) 55%, black 10%) 100%)",
      border: "rgba(250, 204, 21, 0.5)",
      icon: "⚠️",
    },
    info: {
      background:
        "linear-gradient(135deg, color-mix(in oklab, var(--md-ref-palette-secondary-40) 70%, black 15%) 0%, color-mix(in oklab, var(--md-ref-palette-secondary-30) 55%, black 10%) 100%)",
      border: "rgba(125, 211, 252, 0.45)",
      icon: "ℹ️",
    },
  };

  const tone = toneTokens[type] ?? toneTokens.info;

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 z-50 flex min-w-[280px] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 text-white shadow-xl backdrop-blur-lg",
        prefersReducedMotion
          ? ""
          : "animate-in fade-in-0 slide-in-from-top-2 duration-300",
        className,
      )}
      role="alert"
      aria-live="polite"
      style={{
        background: tone.background,
        borderColor: tone.border,
      }}
    >
      {/* Icon */}
      <span className="text-lg" aria-hidden="true">
        {tone.icon}
      </span>

      {/* Message */}
      <div className="flex-1 text-sm font-medium text-white/90">
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
            className="ml-1 text-white/70 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-1 rounded"
            aria-label="Close notification"
          >
            <span className="text-lg leading-none" aria-hidden="true">×</span>
          </button>
        )}
      </div>
    </div>
  );
}
