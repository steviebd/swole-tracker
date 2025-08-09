"use client";

import { useRef } from "react";
import { FocusTrap, useReturnFocus } from "./focus-trap";

interface ProgressionScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  progressionType: "weight" | "reps";
  increment: string; // e.g., "+2.5kg" or "+1 rep"
  onApplyToAll: () => void;
  onApplyToHighest: () => void;
}

export function ProgressionScopeModal({
  isOpen,
  onClose,
  increment,
  onApplyToAll,
  onApplyToHighest,
}: ProgressionScopeModalProps) {
  // Always call hooks unconditionally at the top of the component
  const { restoreFocus } = useReturnFocus();
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="progression-scope-title"
      onClick={() => {
        restoreFocus();
        onClose();
      }}
    >
      <FocusTrap
        onEscape={() => {
          restoreFocus();
          onClose();
        }}
        initialFocusRef={firstFocusRef as React.RefObject<HTMLElement>}
        preventScroll
      >
        <div
          className="card glass-surface mx-4 w-full max-w-md p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            id="progression-scope-title"
            className="mb-4 text-xl font-semibold"
          >
            Apply Progression
          </h3>

          <p className="text-secondary mb-6">
            You chose to add{" "}
            <span className="font-medium text-green-700 dark:text-green-400">
              {increment}
            </span>
            .
            <br />
            How would you like to apply this progression?
          </p>

          <div className="space-y-3">
            <button
              onClick={onApplyToAll}
              className="btn-success w-full rounded-lg p-3 text-left transition-colors"
            >
              <div className="font-medium">Apply to ALL sets</div>
              <div className="text-sm opacity-90">
                Every set gets {increment}
              </div>
            </button>

            <button
              onClick={onApplyToHighest}
              className="btn-primary w-full rounded-lg p-3 text-left transition-colors"
            >
              <div className="font-medium">Apply to HIGHEST set only</div>
              <div className="text-sm opacity-90">
                Only the heaviest set gets {increment}
              </div>
            </button>
          </div>

          <button
            ref={firstFocusRef}
            onClick={() => {
              restoreFocus();
              onClose();
            }}
            className="btn-secondary mt-4 w-full rounded-lg px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </FocusTrap>
    </div>
  );
}
