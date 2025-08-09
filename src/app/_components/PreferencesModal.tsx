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
  const [estimatedOneRmFactor, setEstimatedOneRmFactor] = useState<string>(""); // text to allow blank => default
  const [saving, setSaving] = useState(false);

  const updateMutation = api.preferences.update.useMutation({
    onSuccess: async () => {
      await utils.preferences.get.invalidate();
      onClose();
    },
    onError: (error) => {
      console.error("Failed to save preferences", error);
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

      // Only set estimatedOneRmFactor if present
      const factor =
        "estimated_one_rm_factor" in prefs
          ? prefs.estimated_one_rm_factor
          : undefined;
      setEstimatedOneRmFactor(typeof factor === "number" ? String(factor) : "");
    }
  }, [isLoading, prefs]);

  const saveDisabled = useMemo(() => {
    if (!prefs) return false; // allow initial save
    const pe =
      "predictive_defaults_enabled" in prefs
        ? Boolean(prefs.predictive_defaults_enabled ?? false)
        : false;
    const rs =
      "right_swipe_action" in prefs
        ? ((prefs.right_swipe_action ?? "collapse_expand") as RightSwipeAction)
        : ("collapse_expand" as RightSwipeAction);
    const pf =
      "estimated_one_rm_factor" in prefs
        ? prefs.estimated_one_rm_factor
        : undefined;
    const uiPf =
      estimatedOneRmFactor.trim() === ""
        ? undefined
        : Number(estimatedOneRmFactor);
    return (
      pe === predictiveEnabled &&
      rs === rightSwipeAction &&
      (pf ?? undefined) === (uiPf ?? undefined)
    );
  }, [prefs, predictiveEnabled, rightSwipeAction, estimatedOneRmFactor]);

  const handleSave = () => {
    setSaving(true);
    const payload: {
      predictive_defaults_enabled?: boolean;
      right_swipe_action?: RightSwipeAction;
      estimated_one_rm_factor?: number;
    } = {
      predictive_defaults_enabled: predictiveEnabled,
      right_swipe_action: rightSwipeAction,
    };
    // Only send factor if the input is not blank and within bounds; otherwise omit to keep default
    const trimmed = estimatedOneRmFactor.trim();
    if (trimmed !== "") {
      const n = Number(trimmed);
      if (!Number.isNaN(n)) {
        payload.estimated_one_rm_factor = Math.min(0.05, Math.max(0.02, n));
      }
    }
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
      style={{ 
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        zIndex: 50000,
        backgroundColor: theme !== "system" || (theme === "system" && resolvedTheme === "dark") ? '#000000' : '#111827',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
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
          className={`rounded-xl border shadow-2xl transition-colors duration-300 ${
            theme !== "system" || (theme === "system" && resolvedTheme === "dark")
              ? "bg-gray-900 border-gray-800" 
              : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800"
          }`}
          style={{
            width: '100%',
            maxWidth: '28rem',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`border-b px-6 py-4 transition-colors duration-300 ${
            theme !== "system" || (theme === "system" && resolvedTheme === "dark")
              ? "border-gray-800" 
              : "border-gray-200 dark:border-gray-800"
          }`}>
            <h2 id="preferences-title" className={`text-lg font-bold transition-colors duration-300 ${
              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                ? "text-white" 
                : "text-gray-900 dark:text-white"
            }`}>
              Preferences
            </h2>
          </div>

          <div className="space-y-6 px-6 py-5">
            {/* Predictive defaults toggle */}
            <section>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-medium transition-colors duration-300 ${
                    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                      ? "text-white" 
                      : "text-gray-900 dark:text-white"
                  }`}>Predictive defaults</div>
                  <div className={`text-sm transition-colors duration-300 ${
                    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                      ? "text-gray-400" 
                      : "text-gray-600 dark:text-gray-400"
                  }`}>
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
                      ? (theme !== "system" || (theme === "system" && resolvedTheme === "dark") 
                          ? "var(--color-primary)" 
                          : "#9333EA")
                      : "#6B7280"
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
              <div className={`mb-1 font-medium transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-white" 
                  : "text-gray-900 dark:text-white"
              }`}>Theme</div>
              <div className={`mb-2 text-sm transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-gray-400" 
                  : "text-gray-600 dark:text-gray-400"
              }`}>
                Choose your preferred color theme for the app.
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "system", label: "System" },
                  { value: "dark", label: "Dark" },
                  { value: "CalmDark", label: "Calm Dark" },
                  { value: "BoldDark", label: "Bold Dark" },
                  { value: "PlayfulDark", label: "Playful Dark" },
                ].map((themeOption) => (
                  <button
                    key={themeOption.value}
                    onClick={() => setTheme(themeOption.value as any)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-300 ${
                      theme === themeOption.value
                        ? "text-white"
                        : theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                          ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                          : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                    style={theme === themeOption.value ? {
                      backgroundColor: theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                        ? "var(--color-primary)"
                        : "#9333EA",
                      borderColor: theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                        ? "var(--color-primary)"
                        : "#9333EA"
                    } : {}}
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

            {/* Estimated 1RM factor */}
            <section>
              <div className={`mb-1 font-medium transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-white" 
                  : "text-gray-900 dark:text-white"
              }`}>Estimated 1RM factor</div>
              <div className={`mb-2 text-sm transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-gray-400" 
                  : "text-gray-600 dark:text-gray-400"
              }`}>
                Used in 1RM estimation formula: weight × (1 + reps × factor).
                Leave blank to use default 0.0333 (1/30).
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.0001"
                  min={0.02}
                  max={0.05}
                  inputMode="decimal"
                  aria-label="Estimated 1RM factor"
                  className={`w-32 rounded-md border px-3 py-2 transition-colors duration-300 ${
                    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" 
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  }`}
                  placeholder="0.0333"
                  value={estimatedOneRmFactor}
                  onChange={(e) => setEstimatedOneRmFactor(e.target.value)}
                />
                <div className={`text-xs transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-gray-400" 
                    : "text-gray-600 dark:text-gray-400"
                }`}>Default: 0.0333</div>
              </div>
            </section>

            {/* Right swipe action selector */}
            <section>
              <div className={`mb-1 font-medium transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-white" 
                  : "text-gray-900 dark:text-white"
              }`}>Right-swipe action</div>
              <div className={`mb-2 text-sm transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-gray-400" 
                  : "text-gray-600 dark:text-gray-400"
              }`}>
                Choose what happens when you right-swipe an exercise card.
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["collapse_expand", "none"] as RightSwipeAction[]).map(
                  (opt) => (
                    <button
                      key={opt}
                      onClick={() => setRightSwipeAction(opt)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-300 ${
                        rightSwipeAction === opt
                          ? theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                            ? "bg-blue-500 border-blue-500 text-white"
                            : "bg-purple-600 border-purple-600 text-white"
                          : theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                            ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                            : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
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
              <div className={`mb-1 font-medium transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-white" 
                  : "text-gray-900 dark:text-white"
              }`}>Connect Whoop</div>
              <div className={`mb-2 text-sm transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-gray-400" 
                  : "text-gray-600 dark:text-gray-400"
              }`}>
                Connect your Whoop device to sync recovery and strain data.
              </div>
              <a
                href="/connect-whoop"
                className={`inline-block px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                Connect Whoop
              </a>
            </section>

            {/* Asymmetric swipe thresholds placeholder */}
            <section className={`rounded-md border border-dashed p-3 transition-colors duration-300 ${
              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                ? "border-gray-700" 
                : "border-gray-300 dark:border-gray-700"
            }`}>
              <div className={`font-medium transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-white" 
                  : "text-gray-900 dark:text-white"
              }`}>Asymmetric swipe thresholds</div>
              <div className={`text-sm transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-gray-400" 
                  : "text-gray-600 dark:text-gray-400"
              }`}>
                Coming soon: configure different swipe distances for left/right
                actions.
              </div>
            </section>
          </div>

          <div className={`flex justify-end gap-2 border-t px-6 py-4 transition-colors duration-300 ${
            theme !== "system" || (theme === "system" && resolvedTheme === "dark")
              ? "border-gray-800" 
              : "border-gray-200 dark:border-gray-800"
          }`}>
            <button
              ref={firstFocusRef}
              onClick={() => {
                restoreFocus();
                onClose();
              }}
              className={`px-4 py-2 rounded-lg border font-medium transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                  : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              className="px-4 py-2 rounded-lg font-medium transition-colors duration-300 disabled:opacity-50 text-white"
              style={{
                backgroundColor: theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "var(--color-primary)"
                  : "#9333EA"
              }}
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
