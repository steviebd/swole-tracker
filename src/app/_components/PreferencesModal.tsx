"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { FocusTrap, useReturnFocus } from "./focus-trap";
import { useTheme } from "~/providers/ThemeProvider";

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

  const { theme, resolvedTheme, setTheme } = useTheme();

  const [predictiveEnabled, setPredictiveEnabled] = useState<boolean>(false);
  const [rightSwipeAction, setRightSwipeAction] =
    useState<RightSwipeAction>("collapse_expand");
  const [defaultWeightUnit, setDefaultWeightUnit] = useState<"kg" | "lbs">("kg");
  const [saving, setSaving] = useState(false);

  const updateMutation = api.preferences.update.useMutation({
    onSuccess: async () => {
      await utils.preferences.get.invalidate();
      onClose();
    },
    onError: (error) => {
      console.error("Failed to save preferences", error);
      alert("Failed to save preferences. Please try again.");
    },
    onSettled: () => {
      setSaving(false);
    },
  });

  useEffect(() => {
    if (!isLoading && prefs) {
      // Server returns shape with safe defaults; guard for union variants
      const predictive =
        "predictive_defaults_enabled" in prefs
          ? Boolean(prefs.predictive_defaults_enabled ?? false)
          : false;
      setPredictiveEnabled(predictive);

      const rightSwipe =
        "right_swipe_action" in prefs
          ? (prefs.right_swipe_action ?? "collapse_expand")
          : "collapse_expand";
      setRightSwipeAction(rightSwipe as RightSwipeAction);

      const weightUnit = 
        "defaultWeightUnit" in prefs
          ? (prefs.defaultWeightUnit ?? "kg")
          : "kg";
      setDefaultWeightUnit(weightUnit as "kg" | "lbs");

    }
  }, [isLoading, prefs]);

  const saveDisabled = useMemo(() => {
    // Always disable if we're currently saving
    if (saving) return true;
    
    // If no prefs loaded yet, allow initial save
    if (!prefs) return false;
    
    const pe =
      "predictive_defaults_enabled" in prefs
        ? Boolean(prefs.predictive_defaults_enabled ?? false)
        : false;
    const rs =
      "right_swipe_action" in prefs
        ? ((prefs.right_swipe_action ?? "collapse_expand") as RightSwipeAction)
        : ("collapse_expand" as RightSwipeAction);
    const wu =
      "defaultWeightUnit" in prefs
        ? (prefs.defaultWeightUnit ?? "kg")
        : "kg";
    
    // Only disable if nothing has changed
    return (
      pe === predictiveEnabled &&
      rs === rightSwipeAction &&
      wu === defaultWeightUnit
    );
  }, [prefs, predictiveEnabled, rightSwipeAction, defaultWeightUnit, saving]);

  const handleSave = () => {
    // If no changes, just close the modal
    if (saveDisabled && !saving) {
      onClose();
      return;
    }

    setSaving(true);
    const payload: {
      predictive_defaults_enabled?: boolean;
      right_swipe_action?: RightSwipeAction;
      defaultWeightUnit?: "kg" | "lbs";
    } = {
      predictive_defaults_enabled: predictiveEnabled,
      right_swipe_action: rightSwipeAction,
      defaultWeightUnit: defaultWeightUnit,
    };
    updateMutation.mutate(payload);
  };

  // Always call hooks in the same order; avoid returning early before hooks.
  // We render null at the end when not open.
  const { restoreFocus } = useReturnFocus();
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  const isClosed = !open;

  if (isClosed) {
    // When closed, render a stable, minimal subtree (no early return before hooks).
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preferences-title"
      className="fixed inset-0 z-[50000] flex min-h-screen items-center justify-center p-4"
      style={{ 
        backgroundColor: 'color-mix(in oklab, black 80%, transparent)',
      }}
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
          className="w-full max-w-md max-h-[90vh] overflow-y-auto glass-surface shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="glass-hairline border-b px-6 py-4">
            <h2 id="preferences-title" className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              Preferences
            </h2>
          </div>

          <div className="space-y-6 px-6 py-5">
            {/* Predictive defaults toggle */}
            <section>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium" style={{ color: 'var(--color-text)' }}>Predictive defaults</div>
                  <div className="text-sm text-muted">
                    Prefill new sets with your most recent values for the
                    exercise.
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={predictiveEnabled ? "true" : "false"}
                  onClick={() => setPredictiveEnabled((v) => !v)}
                  className="inline-flex h-8 w-14 items-center rounded-full transition-colors"
                  style={{
                    backgroundColor: predictiveEnabled 
                      ? "var(--color-primary)"
                      : "var(--color-border)"
                  }}
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

            {/* Theme selector */}
            <section>
              <div className="mb-1 font-medium" style={{ color: 'var(--color-text)' }}>Theme</div>
              <div className="mb-2 text-sm text-muted">
                Choose your preferred color theme for the app.
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "system", label: "System" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ].map((themeOption) => (
                  <button
                    key={themeOption.value}
                    onClick={() => setTheme(themeOption.value as any)}
                    className={theme === themeOption.value ? "btn-primary" : "btn-secondary"}
                    aria-pressed={
                      theme === themeOption.value ? "true" : "false"
                    }
                  >
                    {themeOption.label}
                    {theme === themeOption.value &&
                      themeOption.value === "system" && (
                        <span className="ml-1 text-xs opacity-70">
                          ({resolvedTheme})
                        </span>
                      )}
                  </button>
                ))}
              </div>
            </section>

            {/* Weight Unit Preference */}
            <section>
              <div className="mb-1 font-medium" style={{ color: 'var(--color-text)' }}>Default Weight Unit</div>
              <div className="mb-2 text-sm text-muted">
                Choose your preferred weight unit for displaying exercises.
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "kg" as const, label: "Kilograms (kg)" },
                  { value: "lbs" as const, label: "Pounds (lbs)" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDefaultWeightUnit(value)}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      defaultWeightUnit === value
                        ? "bg-purple-600 text-white border-purple-600"
                        : "glass-surface glass-hairline text-gray-300"
                    }`}
                    style={
                      defaultWeightUnit === value
                        ? {
                            backgroundColor: "var(--color-primary)",
                            borderColor: "var(--color-primary)",
                            color: "white",
                          }
                        : {
                            backgroundColor: "var(--color-bg-surface)",
                            borderColor: "var(--color-border)",
                            color: "var(--color-text)",
                          }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* Right swipe action selector */}
            <section>
              <div className="mb-1 font-medium" style={{ color: 'var(--color-text)' }}>Right-swipe action</div>
              <div className="mb-2 text-sm text-muted">
                Choose what happens when you right-swipe an exercise card.
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["collapse_expand", "none"] as RightSwipeAction[]).map(
                  (opt) => (
                    <button
                      key={opt}
                      onClick={() => setRightSwipeAction(opt)}
                      className={rightSwipeAction === opt ? "btn-primary" : "btn-secondary"}
                      aria-pressed={rightSwipeAction === opt ? "true" : "false"}
                    >
                      {opt === "collapse_expand" ? "Collapse/Expand" : "None"}
                    </button>
                  ),
                )}
              </div>
            </section>

            {/* Connect Whoop */}
            <section>
              <div className="mb-1 font-medium" style={{ color: 'var(--color-text)' }}>Connect Whoop</div>
              <div className="mb-2 text-sm text-muted">
                Connect your Whoop device to sync recovery and strain data.
              </div>
              <a
                href="/connect-whoop"
                className="btn-secondary"
              >
                Connect Whoop
              </a>
            </section>

          </div>

          <div className="flex justify-end gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
            <button
              ref={firstFocusRef}
              onClick={() => {
                restoreFocus();
                onClose();
              }}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              className="btn-primary disabled:opacity-50"
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
