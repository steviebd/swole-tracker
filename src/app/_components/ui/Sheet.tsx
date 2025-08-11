"use client";

import React, { useEffect, useRef } from "react";

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/* Token-driven sheet/overlay with backdrop blur and focus management */
export function Sheet({
  isOpen,
  onClose,
  title,
  footer,
  children,
  className,
}: SheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      className="modal-backdrop fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={contentRef}
        className={cx(
          "card max-h-[90vh] w-full overflow-auto rounded-t-xl sm:max-w-lg sm:rounded-xl",
          "animate-[scaleIn_var(--motion-duration-base)_var(--motion-ease)]",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || true) && (
          <div className="glass-header flex items-center justify-between rounded-t-xl border-b border-[color:var(--color-border)] p-4">
            <div className="font-semibold">{title}</div>
            <button
              className="btn-ghost px-2 py-1"
              aria-label="Close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        )}

        <div className="p-4">{children}</div>

        {footer && (
          <div className="glass-footer rounded-b-xl border-t border-[color:var(--color-border)] p-3">
            {footer}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
