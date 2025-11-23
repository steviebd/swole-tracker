"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { FocusTrap, useReturnFocus } from "./focus-trap";
import { api } from "~/trpc/react";
import { trackWellnessSettingsChange } from "~/lib/analytics/health-advice";
import { useTheme } from "~/providers/ThemeProvider";

type RightSwipeAction = "collapse_expand" | "none";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { restoreFocus } = useReturnFocus();
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const { theme, resolvedTheme, setTheme } = useTheme();

  // All the original settings states
  const [notifications, setNotifications] = useState(true);
  const [workoutReminders, setWorkoutReminders] = useState(false);
  const [dataExport, setDataExport] = useState(false);
  const [manualWellnessEnabled, setManualWellnessEnabled] = useState(false);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);

  // New states from Preferences modal
  const [predictiveEnabled, setPredictiveEnabled] = useState<boolean>(false);
  const [rightSwipeAction, setRightSwipeAction] =
    useState<RightSwipeAction>("collapse_expand");
  const [defaultWeightUnit, setDefaultWeightUnit] = useState<"kg" | "lbs">(
    "kg",
  );
  const [saving, setSaving] = useState(false);

  // Load user preferences
  const utils = api.useUtils();
  const { data: preferences, isLoading } = api.preferences.get.useQuery(
    undefined,
    {
      enabled: open,
    },
  );

  const updateMutation = api.preferences.update.useMutation({
    onSuccess: async () => {
      await utils.preferences.get.invalidate();
      setSaving(false);
      setIsUpdatingPreferences(false);
      // Close modal after successful save
      onClose();
    },
    onError: (error) => {
      console.error("Failed to save preferences", error);
      alert("Failed to save preferences. Please try again.");
      setSaving(false);
      setIsUpdatingPreferences(false);
    },
  });

  // Sync local state with preferences
  useEffect(() => {
    if (!isLoading && preferences) {
      setManualWellnessEnabled(preferences?.enable_manual_wellness ?? false);

      // Sync the preferences from the old modal
      const predictive =
        "predictive_defaults_enabled" in preferences
          ? Boolean(preferences.predictive_defaults_enabled ?? false)
          : false;
      setPredictiveEnabled(predictive);

      const rightSwipe =
        "right_swipe_action" in preferences
          ? (preferences.right_swipe_action ?? "collapse_expand")
          : "collapse_expand";
      setRightSwipeAction(rightSwipe as RightSwipeAction);

      const weightUnit =
        "defaultWeightUnit" in preferences
          ? (preferences.defaultWeightUnit ?? "kg")
          : "kg";
      setDefaultWeightUnit(weightUnit as "kg" | "lbs");
    }
  }, [isLoading, preferences]);

  const saveDisabled = useMemo(() => {
    if (saving || isUpdatingPreferences) return true;
    if (!preferences) return false;

    const pe =
      "predictive_defaults_enabled" in preferences
        ? Boolean(preferences.predictive_defaults_enabled ?? false)
        : false;
    const rs =
      "right_swipe_action" in preferences
        ? ((preferences.right_swipe_action ??
            "collapse_expand") as RightSwipeAction)
        : ("collapse_expand" as RightSwipeAction);
    const wu =
      "defaultWeightUnit" in preferences
        ? (preferences.defaultWeightUnit ?? "kg")
        : "kg";
    const mw = preferences?.enable_manual_wellness ?? false;

    return (
      pe === predictiveEnabled &&
      rs === rightSwipeAction &&
      wu === defaultWeightUnit &&
      mw === manualWellnessEnabled
    );
  }, [
    preferences,
    predictiveEnabled,
    rightSwipeAction,
    defaultWeightUnit,
    manualWellnessEnabled,
    saving,
    isUpdatingPreferences,
  ]);

  if (!open) return null;

  const handleExportData = () => {
    setDataExport(true);
    // Simulate export process
    setTimeout(() => {
      setDataExport(false);
      alert("Export feature coming soon!");
    }, 2000);
  };

  const handleManualWellnessToggle = async () => {
    if (isUpdatingPreferences) return;

    const previousValue = manualWellnessEnabled;
    const newValue = !manualWellnessEnabled;
    setManualWellnessEnabled(newValue);
    setIsUpdatingPreferences(true);

    try {
      await updateMutation.mutateAsync({
        enable_manual_wellness: newValue,
      });

      // Track analytics for wellness settings change
      trackWellnessSettingsChange({
        userId: "current_user", // In real implementation, get from auth context
        enabled: newValue,
        previouslyEnabled: previousValue,
        source: "settings_modal",
      });
    } catch {
      // Revert on error
      setManualWellnessEnabled(previousValue);
    }
  };

  const handleSave = () => {
    // If save is disabled (no changes), just close the modal
    if (saveDisabled && !saving && !isUpdatingPreferences) {
      onClose();
      return;
    }

    // If currently saving, don't start another save operation
    if (saving || isUpdatingPreferences) {
      return;
    }

    setSaving(true);
    const payload: {
      predictive_defaults_enabled?: boolean;
      right_swipe_action?: RightSwipeAction;
      defaultWeightUnit?: "kg" | "lbs";
      enable_manual_wellness?: boolean;
    } = {
      predictive_defaults_enabled: predictiveEnabled,
      right_swipe_action: rightSwipeAction,
      defaultWeightUnit: defaultWeightUnit,
      enable_manual_wellness: manualWellnessEnabled,
    };
    updateMutation.mutate(payload);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-[50000] flex min-h-screen items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4"
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
          className="mx-2 max-h-[95vh] w-full max-w-sm overflow-y-auto rounded-lg border shadow-2xl sm:mx-0 sm:max-h-[90vh] sm:max-w-md md:max-w-lg"
          style={{
            background: "var(--gradient-card, var(--color-bg-surface))",
            borderColor: "var(--color-border)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="border-b px-4 py-3 sm:px-6 sm:py-4"
            style={{ borderColor: "var(--color-border)" }}
          >
            <h2
              id="settings-title"
              className="text-lg font-bold"
              style={{ color: "var(--color-text)" }}
            >
              App Settings
            </h2>
          </div>

          {/* Content */}
          <div className="space-y-4 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-5">
            {/* Predictive defaults toggle */}
            <section>
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="font-medium"
                    style={{ color: "var(--color-text)" }}
                  >
                    Predictive defaults
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Prefill new sets with your most recent values for the
                    exercise.
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={predictiveEnabled ? "true" : "false"}
                  onClick={() => setPredictiveEnabled((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPredictiveEnabled((v) => !v);
                    }
                  }}
                  className="inline-flex h-11 w-16 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
                  style={
                    {
                      backgroundColor: predictiveEnabled
                        ? "var(--color-primary)"
                        : "var(--color-border)",
                      "--tw-ring-color": "var(--color-primary)",
                      "--tw-ring-offset-color": "var(--color-bg-surface)",
                    } as React.CSSProperties
                  }
                >
                  <span
                    className={`bg-background inline-block h-6 w-6 transform rounded-full transition-transform ${
                      predictiveEnabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                  <span className="sr-only">Toggle predictive defaults</span>
                </button>
              </div>
            </section>

            {/* Theme selector */}
            <section role="radiogroup" aria-labelledby="theme-label">
              <div
                id="theme-label"
                className="mb-1 font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Theme
              </div>
              <div
                className="mb-2 text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                Choose your preferred color theme for the app.
              </div>
              <div id="theme-description" className="sr-only">
                Select your preferred theme: System follows your device
                settings, Light uses a bright appearance, Dark uses a dark
                appearance
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { value: "system", label: "System" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ].map((themeOption) => (
                  <button
                    key={themeOption.value}
                    onClick={() => setTheme(themeOption.value as any)}
                    className="relative z-10 cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors"
                    style={
                      theme === themeOption.value
                        ? {
                            backgroundColor: "var(--color-primary)",
                            borderColor: "var(--color-primary)",
                            color: "var(--btn-primary-fg)",
                          }
                        : {
                            backgroundColor: "var(--color-bg-surface)",
                            borderColor: "var(--color-border)",
                            color: "var(--color-text)",
                          }
                    }
                    role="radio"
                    aria-checked={
                      theme === themeOption.value ? "true" : "false"
                    }
                    aria-describedby="theme-description"
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
            <section role="radiogroup" aria-labelledby="weight-unit-label">
              <div
                id="weight-unit-label"
                className="mb-1 font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Default Weight Unit
              </div>
              <div
                id="weight-unit-description"
                className="mb-2 text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                Choose your preferred weight unit for displaying exercises.
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { value: "kg" as const, label: "Kilograms (kg)" },
                  { value: "lbs" as const, label: "Pounds (lbs)" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDefaultWeightUnit(value)}
                    className="relative z-10 cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors"
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
                    role="radio"
                    aria-checked={
                      defaultWeightUnit === value ? "true" : "false"
                    }
                    aria-describedby="weight-unit-description"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* Right swipe action selector */}
            <section role="radiogroup" aria-labelledby="swipe-action-label">
              <div
                id="swipe-action-label"
                className="mb-1 font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Right-swipe action
              </div>
              <div
                id="swipe-action-description"
                className="mb-2 text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                Choose what happens when you right-swipe an exercise card.
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(["collapse_expand", "none"] as RightSwipeAction[]).map(
                  (opt) => (
                    <button
                      key={opt}
                      onClick={() => setRightSwipeAction(opt)}
                      className="relative z-10 cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors"
                      style={
                        rightSwipeAction === opt
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
                      role="radio"
                      aria-checked={rightSwipeAction === opt ? "true" : "false"}
                      aria-describedby="swipe-action-description"
                    >
                      {opt === "collapse_expand" ? "Collapse/Expand" : "None"}
                    </button>
                  ),
                )}
              </div>
            </section>

            {/* Connect Whoop */}
            <section>
              <div
                className="mb-1 font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Connect Whoop
              </div>
              <div
                id="whoop-description"
                className="mb-2 text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                Connect your Whoop device to sync recovery and strain data.
              </div>
              <a
                href="/connect-whoop"
                className="inline-block rounded-lg border px-4 py-2 font-medium transition-colors duration-300"
                aria-describedby="whoop-description"
                style={{
                  backgroundColor: "var(--color-bg-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text)",
                }}
              >
                Connect Whoop
              </a>
            </section>

            {/* Notifications */}
            <section aria-labelledby="notifications-label">
              <div className="flex items-center justify-between">
                <div>
                  <div
                    id="notifications-label"
                    className="font-medium"
                    style={{ color: "var(--color-text)" }}
                  >
                    Push Notifications
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Receive notifications about your workouts
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={notifications ? "true" : "false"}
                  onClick={() => setNotifications((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setNotifications((v) => !v);
                    }
                  }}
                  className="inline-flex h-11 w-16 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
                  style={
                    {
                      backgroundColor: notifications
                        ? "var(--color-primary)"
                        : "var(--color-text-muted)",
                      "--tw-ring-color": "var(--color-primary)",
                      "--tw-ring-offset-color": "var(--color-bg-surface)",
                    } as React.CSSProperties
                  }
                >
                  <span
                    className={`bg-background inline-block h-6 w-6 transform rounded-full transition-transform ${
                      notifications ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                  <span className="sr-only">Toggle notifications</span>
                </button>
              </div>
            </section>

            {/* Workout Reminders */}
            <section aria-labelledby="reminders-label">
              <div className="flex items-center justify-between">
                <div>
                  <div
                    id="reminders-label"
                    className="font-medium"
                    style={{ color: "var(--color-text)" }}
                  >
                    Workout Reminders
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Get reminded when it's time to work out
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={workoutReminders ? "true" : "false"}
                  onClick={() => setWorkoutReminders((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setWorkoutReminders((v) => !v);
                    }
                  }}
                  className="inline-flex h-11 w-16 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
                  style={
                    {
                      backgroundColor: workoutReminders
                        ? "var(--color-primary)"
                        : "var(--color-text-muted)",
                      "--tw-ring-color": "var(--color-primary)",
                      "--tw-ring-offset-color": "var(--color-bg-surface)",
                    } as React.CSSProperties
                  }
                >
                  <span
                    className={`bg-background inline-block h-6 w-6 transform rounded-full transition-transform ${
                      workoutReminders ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                  <span className="sr-only">Toggle workout reminders</span>
                </button>
              </div>
            </section>

            {/* Manual Wellness */}
            <section aria-labelledby="wellness-label">
              <div className="flex items-center justify-between">
                <div>
                  <div
                    id="wellness-label"
                    className="font-medium"
                    style={{ color: "var(--color-text)" }}
                  >
                    Manual Wellness Input
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Enable quick wellness checks for personalized workout
                    recommendations
                  </div>
                  {manualWellnessEnabled && (
                    <div
                      className="mt-1 text-xs"
                      style={{ color: "var(--color-success)" }}
                    >
                      ✓ Enhanced workout intelligence with 2-input wellness
                      system
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  aria-pressed={manualWellnessEnabled ? "true" : "false"}
                  onClick={handleManualWellnessToggle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleManualWellnessToggle();
                    }
                  }}
                  disabled={isUpdatingPreferences}
                  className="inline-flex h-11 w-16 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                  style={
                    {
                      backgroundColor: manualWellnessEnabled
                        ? "var(--color-primary)"
                        : "var(--color-text-muted)",
                      "--tw-ring-color": "var(--color-primary)",
                      "--tw-ring-offset-color": "var(--color-bg-surface)",
                    } as React.CSSProperties
                  }
                >
                  <span
                    className={`bg-background inline-block h-6 w-6 transform rounded-full transition-transform ${
                      manualWellnessEnabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                  <span className="sr-only">Toggle manual wellness input</span>
                </button>
              </div>
              {manualWellnessEnabled && (
                <div
                  className="mt-3 rounded-lg p-3 text-sm"
                  style={{
                    backgroundColor:
                      "color-mix(in oklab, var(--color-primary) 5%, var(--color-bg-surface))",
                    borderColor: "var(--color-primary)",
                  }}
                >
                  <div
                    className="mb-1 font-medium"
                    style={{ color: "var(--color-text)" }}
                  >
                    🎯 Enhanced Workout Intelligence
                  </div>
                  <div style={{ color: "var(--color-text-muted)" }}>
                    • 30-second wellness check before workouts
                    <br />
                    • Personalized recommendations based on energy & sleep
                    <br />• Works alongside WHOOP integration for best results
                  </div>
                </div>
              )}
            </section>

            {/* Data Export */}
            <section>
              <div
                className="mb-1 font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Data Export
              </div>
              <div
                className="mb-3 text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                Export your workout data as CSV or JSON
              </div>
              <button
                onClick={handleExportData}
                disabled={dataExport}
                className="flex min-h-[44px] w-full items-center justify-center rounded-lg border px-4 py-3 font-medium transition-colors duration-300 disabled:opacity-50 sm:w-auto sm:py-2"
                style={{
                  backgroundColor: "var(--color-bg-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text)",
                }}
              >
                {dataExport ? "Exporting..." : "Export Data"}
              </button>
            </section>

            {/* Account */}
            <section>
              <div
                className="mb-1 font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Account
              </div>
              <div
                className="mb-3 text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                Manage your account settings and data
              </div>
              <div className="space-y-2">
                <button
                  className="block w-full rounded-lg border px-4 py-2 text-left font-medium transition-colors duration-300"
                  style={{
                    backgroundColor: "var(--color-bg-surface)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                >
                  Change Password
                </button>
                <button
                  className="block w-full rounded-lg border px-4 py-2 text-left font-medium transition-colors duration-300"
                  style={{
                    borderColor: "var(--color-danger)",
                    color: "var(--color-danger)",
                    backgroundColor: "transparent",
                  }}
                >
                  Delete Account
                </button>
              </div>
            </section>

            {/* App Info */}
            <section
              className="border-t pt-4 transition-colors duration-300"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div
                className="text-center text-sm transition-colors duration-300"
                style={{ color: "var(--color-text-muted)" }}
              >
                Swole Tracker v1.0.0
                <br />
                Built with Next.js & tRPC
              </div>
            </section>
          </div>

          {/* Footer */}
          <div
            className="flex flex-col justify-end gap-2 border-t px-4 py-3 transition-colors duration-300 sm:flex-row sm:px-6 sm:py-4"
            style={{ borderColor: "var(--color-border)" }}
          >
            <button
              ref={firstFocusRef}
              onClick={() => {
                restoreFocus();
                onClose();
              }}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border px-4 py-3 font-medium transition-colors duration-300 sm:flex-none sm:py-2"
              style={{
                backgroundColor: "var(--color-bg-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
              disabled={saving || isUpdatingPreferences}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg px-4 py-3 font-medium transition-colors duration-300 disabled:opacity-50 sm:flex-none sm:py-2"
              style={{
                backgroundColor: "var(--color-primary)",
                borderColor: "var(--color-primary)",
                color: "white",
              }}
              disabled={saving || isUpdatingPreferences}
              aria-busy={saving || isUpdatingPreferences ? "true" : "false"}
            >
              {saving || isUpdatingPreferences ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
