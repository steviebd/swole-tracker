"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { FocusTrap, useReturnFocus } from "./focus-trap";

type RightSwipeAction = "collapse_expand" | "none";

interface PreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

export function PreferencesModal({ open, onClose }: PreferencesModalProps) {
  const utils = api.useUtils();
  const { data: prefs, isLoading } = api.preferences.get.useQuery(undefined, {
    enabled: open,
  });

  const updateMutation = api.preferences.update.useMutation({
    onSuccess: async () => {
      await utils.preferences.get.invalidate();
    },
  });

  const [predictiveEnabled, setPredictiveEnabled] = useState<boolean>(false);
  const [rightSwipeAction, setRightSwipeAction] = useState<RightSwipeAction>("collapse_expand");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && prefs) {
      // Server returns shape with safe defaults
      setPredictiveEnabled(Boolean((prefs as any).predictive_defaults_enabled ?? false));
      setRightSwipeAction(((prefs as any).right_swipe_action ?? "collapse_expand") as RightSwipeAction);
    }
  }, [isLoading, prefs]);

  const saveDisabled = useMemo(() => {
    if (!prefs) return false; // allow initial save
    const pe = Boolean((prefs as any).predictive_defaults_enabled ?? false);
    const rs = ((prefs as any).right_swipe_action ?? "collapse_expand") as RightSwipeAction;
    return pe === predictiveEnabled && rs === rightSwipeAction;
  }, [prefs, predictiveEnabled, rightSwipeAction]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateMutation.mutateAsync({
        predictive_defaults_enabled: predictiveEnabled,
        right_swipe_action: rightSwipeAction,
      } as any);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // Focus management
  const { restoreFocus } = useReturnFocus();
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preferences-title"
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
          className="w-full sm:max-w-md sm:rounded-xl sm:shadow-2xl sm:bg-[var(--card)] sm:border sm:border-[var(--border)] bg-[var(--card)] border-t border-[var(--border)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--border)]">
            <h2 id="preferences-title" className="text-lg font-bold">
              Preferences
            </h2>
          </div>

        <div className="px-4 py-3 sm:px-6 sm:py-5 space-y-6">
          {/* Predictive defaults toggle */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Predictive defaults</div>
                <div className="text-sm text-muted">
                  Prefill new sets with your most recent values for the exercise.
                </div>
              </div>
              <button
                type="button"
                aria-pressed={predictiveEnabled ? "true" : "false"}
                onClick={() => setPredictiveEnabled((v) => !v)}
                className={`inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  predictiveEnabled ? "bg-purple-600" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    predictiveEnabled ? "translate-x-7" : "translate-x-1"
                  }`}
                />
                <span className="sr-only">Toggle predictive defaults</span>
              </button>
            </div>
          </section>

          {/* Right swipe action selector */}
          <section>
            <div className="font-medium mb-1">Right-swipe action</div>
            <div className="text-sm text-muted mb-2">
              Choose what happens when you right-swipe an exercise card.
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["collapse_expand", "none"] as RightSwipeAction[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setRightSwipeAction(opt)}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    rightSwipeAction === opt
                      ? "btn-primary"
                      : "btn-secondary"
                  }`}
                  aria-pressed={rightSwipeAction === opt ? "true" : "false"}
                >
                  {opt === "collapse_expand" ? "Collapse/Expand" : "None"}
                </button>
              ))}
            </div>
          </section>

          {/* Asymmetric swipe thresholds placeholder */}
          <section className="rounded-md border border-dashed border-[var(--border)] p-3">
            <div className="font-medium">Asymmetric swipe thresholds</div>
            <div className="text-sm text-muted">
              Coming soon: configure different swipe distances for left/right actions.
            </div>
          </section>
        </div>

          <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-[var(--border)] flex gap-2 justify-end">
            <button
              ref={firstFocusRef}
              onClick={() => {
                restoreFocus();
                onClose();
              }}
              className="btn-secondary px-4 py-2"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              className="btn-primary px-4 py-2 disabled:opacity-50"
              disabled={saving || saveDisabled}
              aria-busy={saving ? "true" : "false"}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
