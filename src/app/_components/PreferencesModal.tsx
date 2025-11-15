"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "~/trpc/react";
import { FocusTrap, useReturnFocus } from "./focus-trap";
import { useTheme } from "~/providers/ThemeProvider";
import { Button } from "~/components/ui/button";
import { GlassSurface } from "~/components/ui/glass-surface";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { cn } from "~/lib/utils";
import { ThemeSelector } from "~/components/ThemeSelector";

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

  // Remove unused theme destructuring since ThemeSelector handles it
  useTheme(); // Keep for context dependency
  const prefersReducedMotion = useReducedMotion();

  const [predictiveEnabled, setPredictiveEnabled] = useState<boolean>(false);
  const [rightSwipeAction, setRightSwipeAction] =
    useState<RightSwipeAction>("collapse_expand");
  const [defaultWeightUnit, setDefaultWeightUnit] = useState<"kg" | "lbs">(
    "kg",
  );
  const [leftSwipeThreshold, setLeftSwipeThreshold] = useState<string>("120");
  const [rightSwipeThreshold, setRightSwipeThreshold] = useState<string>("120");
  const [enableManualWellness, setEnableManualWellness] =
    useState<boolean>(false);
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
        "defaultWeightUnit" in prefs ? (prefs.defaultWeightUnit ?? "kg") : "kg";
      setDefaultWeightUnit(weightUnit as "kg" | "lbs");

      const leftThreshold =
        "leftSwipeThreshold" in prefs
          ? String(prefs.leftSwipeThreshold ?? 120)
          : "120";
      setLeftSwipeThreshold(leftThreshold);

      const rightThreshold =
        "rightSwipeThreshold" in prefs
          ? String(prefs.rightSwipeThreshold ?? 120)
          : "120";
      setRightSwipeThreshold(rightThreshold);

      const manualWellness =
        "enable_manual_wellness" in prefs
          ? Boolean(prefs.enable_manual_wellness ?? false)
          : false;
      setEnableManualWellness(manualWellness);
    }
  }, [isLoading, prefs]);

  const saveDisabled = useMemo(() => {
    // Always disable if we're currently saving
    if (saving) return true;

    // Save button is always enabled (except when saving)
    return false;
  }, [saving]);

  const handleSave = () => {
    // Always close the modal when save is clicked (even if no changes)
    if (!saving) {
      onClose();
      return;
    }

    setSaving(true);
    const payload: {
      predictive_defaults_enabled?: boolean;
      right_swipe_action?: RightSwipeAction;
      defaultWeightUnit?: "kg" | "lbs";
      leftSwipeThreshold?: number;
      rightSwipeThreshold?: number;
      enable_manual_wellness?: boolean;
    } = {
      predictive_defaults_enabled: predictiveEnabled,
      right_swipe_action: rightSwipeAction,
      defaultWeightUnit: defaultWeightUnit,
      leftSwipeThreshold: parseInt(leftSwipeThreshold, 10),
      rightSwipeThreshold: parseInt(rightSwipeThreshold, 10),
      enable_manual_wellness: enableManualWellness,
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
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="preferences-title"
        aria-describedby="preferences-description"
        className={cn(
          "fixed inset-0 z-[50000] flex min-h-screen items-center justify-center",
          "bg-background/95 backdrop-blur-md backdrop-saturate-150",
          "p-4 md:p-6",
        )}
        onClick={() => {
          restoreFocus();
          onClose();
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.2,
          ease: "easeOut",
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
          <motion.div
            className="max-h-[90vh] w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.3,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <GlassSurface
              className={cn(
                "glass-hero rounded-xl border shadow-2xl",
                "bg-card/95 backdrop-blur-xl backdrop-saturate-150",
                "border-border/50 overflow-hidden",
              )}
              as="div"
            >
              <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/30 max-h-[90vh] overflow-y-auto">
                <div className="border-border/50 from-card/50 to-card/80 border-b bg-gradient-to-r px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                      <div className="bg-primary/60 h-4 w-4 rounded-sm" />
                    </div>
                    <div>
                      <h2
                        id="preferences-title"
                        className="text-foreground text-xl leading-none font-bold"
                      >
                        Preferences
                      </h2>
                      <p
                        id="preferences-description"
                        className="text-muted-foreground mt-1 text-sm"
                      >
                        Customise your workout tracking experience
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8 px-6 py-6">
                  {/* Predictive defaults toggle */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="text-foreground leading-none font-medium">
                          Predictive defaults
                        </div>
                        <div className="text-muted-foreground text-sm leading-relaxed">
                          Prefill new sets with your most recent values for each
                          exercise
                        </div>
                      </div>
                      <motion.button
                        type="button"
                        role="switch"
                        aria-checked={predictiveEnabled}
                        aria-describedby="predictive-description"
                        onClick={() => setPredictiveEnabled((v) => !v)}
                        className={cn(
                          "relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-200",
                          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                          "touch-target hover:shadow-md",
                          predictiveEnabled ? "bg-primary" : "bg-muted",
                        )}
                        whileTap={{ scale: prefersReducedMotion ? 1 : 0.95 }}
                      >
                        <motion.span
                          className="bg-background inline-block h-6 w-6 transform rounded-full shadow-sm"
                          animate={{
                            x: predictiveEnabled ? 28 : 4,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                            ...(prefersReducedMotion && { duration: 0 }),
                          }}
                        />
                        <span className="sr-only">
                          {predictiveEnabled ? "Disable" : "Enable"} predictive
                          defaults
                        </span>
                      </motion.button>
                    </div>
                    <div id="predictive-description" className="sr-only">
                      When enabled, new exercise sets will be pre-filled with
                      your most recent weight, reps, and other values for that
                      exercise
                    </div>
                  </section>

                  {/* Theme selector */}
                  <ThemeSelector variant="grid" showDescription={true} />

                  {/* Weight Unit Preference */}
                  <section
                    className="space-y-3"
                    role="radiogroup"
                    aria-labelledby="weight-unit-label"
                  >
                    <div className="space-y-1">
                      <div
                        id="weight-unit-label"
                        className="text-foreground leading-none font-medium"
                      >
                        Default Weight Unit
                      </div>
                      <div className="text-muted-foreground text-sm leading-relaxed">
                        Choose your preferred unit for displaying exercise
                        weights
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          value: "kg" as const,
                          label: "Kilograms",
                          short: "kg",
                          icon: "⚖️",
                        },
                        {
                          value: "lbs" as const,
                          label: "Pounds",
                          short: "lbs",
                          icon: "🏋️",
                        },
                      ].map(({ value, label, short, icon }) => (
                        <Button
                          key={value}
                          variant={
                            defaultWeightUnit === value ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setDefaultWeightUnit(value)}
                          className={cn(
                            "flex h-auto flex-col gap-1 py-3 text-sm transition-all",
                            "hover:shadow-md active:scale-95",
                          )}
                          role="radio"
                          aria-checked={defaultWeightUnit === value}
                          haptic
                        >
                          <span className="text-lg leading-none">{icon}</span>
                          <span className="leading-none font-medium">
                            {label}
                          </span>
                          <span className="text-xs leading-none opacity-70">
                            ({short})
                          </span>
                        </Button>
                      ))}
                    </div>
                  </section>

                  {/* Right swipe action selector */}
                  <section
                    className="space-y-3"
                    role="radiogroup"
                    aria-labelledby="swipe-action-label"
                  >
                    <div className="space-y-1">
                      <div
                        id="swipe-action-label"
                        className="text-foreground leading-none font-medium"
                      >
                        Right-swipe Action
                      </div>
                      <div className="text-muted-foreground text-sm leading-relaxed">
                        Choose what happens when you right-swipe an exercise
                        card
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(
                        [
                          {
                            value: "collapse_expand",
                            label: "Collapse/Expand",
                            icon: "📋",
                            description: "Toggle exercise details",
                          },
                          {
                            value: "none",
                            label: "None",
                            icon: "🚫",
                            description: "No action",
                          },
                        ] as Array<{
                          value: RightSwipeAction;
                          label: string;
                          icon: string;
                          description: string;
                        }>
                      ).map(({ value, label, icon, description }) => (
                        <Button
                          key={value}
                          variant={
                            rightSwipeAction === value ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setRightSwipeAction(value)}
                          className={cn(
                            "flex h-auto flex-col gap-1 py-3 text-sm transition-all",
                            "hover:shadow-md active:scale-95",
                          )}
                          role="radio"
                          aria-checked={rightSwipeAction === value}
                          haptic
                        >
                          <span className="text-lg leading-none">{icon}</span>
                          <span className="leading-none font-medium">
                            {label}
                          </span>
                          <span className="text-center text-xs leading-none opacity-70">
                            {description}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </section>

                  {/* Asymmetric swipe thresholds */}
                  <section className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-foreground leading-none font-medium">
                        Swipe Sensitivity
                      </div>
                      <div className="text-muted-foreground text-sm leading-relaxed">
                        Configure swipe distance thresholds for triggering
                        actions
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label
                          htmlFor="left-swipe-threshold"
                          className="text-foreground block text-sm leading-none font-medium"
                        >
                          Left swipe (px)
                        </label>
                        <input
                          id="left-swipe-threshold"
                          type="number"
                          min="50"
                          max="300"
                          step="10"
                          value={leftSwipeThreshold}
                          onChange={(e) =>
                            setLeftSwipeThreshold(e.target.value)
                          }
                          className={cn(
                            "w-full rounded-md border px-3 py-2.5 transition-all",
                            "bg-input text-foreground border-border",
                            "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                            "hover:border-border/80 focus-visible:border-ring",
                            "touch-target",
                          )}
                          aria-describedby="swipe-threshold-help"
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="right-swipe-threshold"
                          className="text-foreground block text-sm leading-none font-medium"
                        >
                          Right swipe (px)
                        </label>
                        <input
                          id="right-swipe-threshold"
                          type="number"
                          min="50"
                          max="300"
                          step="10"
                          value={rightSwipeThreshold}
                          onChange={(e) =>
                            setRightSwipeThreshold(e.target.value)
                          }
                          className={cn(
                            "w-full rounded-md border px-3 py-2.5 transition-all",
                            "bg-input text-foreground border-border",
                            "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                            "hover:border-border/80 focus-visible:border-ring",
                            "touch-target",
                          )}
                          aria-describedby="swipe-threshold-help"
                        />
                      </div>
                    </div>
                    <div
                      id="swipe-threshold-help"
                      className="text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 text-xs leading-relaxed"
                    >
                      💡 Default: 120px. Higher values require longer swipes to
                      trigger actions.
                    </div>
                  </section>

                  {/* Connect Whoop */}
                  <section className="space-y-3">
                    <div className="space-y-1">
                      <div className="text-foreground flex items-center gap-2 leading-none font-medium">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-xs font-bold text-white">
                          W
                        </span>
                        WHOOP Integration
                      </div>
                      <div className="text-muted-foreground text-sm leading-relaxed">
                        Connect your WHOOP device to sync recovery and strain
                        data
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full justify-start transition-all hover:shadow-md"
                      haptic
                    >
                      <a
                        href="/connect-whoop"
                        className="flex items-center gap-2"
                      >
                        <span className="text-lg">🔗</span>
                        Connect WHOOP
                      </a>
                    </Button>
                  </section>

                  {/* Manual Wellness toggle */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="text-foreground flex items-center gap-2 leading-none font-medium">
                          <span className="text-lg">📝</span>
                          Manual Wellness Tracking
                        </div>
                        <div className="text-muted-foreground text-sm leading-relaxed">
                          Enable manual logging of energy levels and sleep
                          quality
                        </div>
                      </div>
                      <motion.button
                        type="button"
                        role="switch"
                        aria-checked={enableManualWellness}
                        aria-describedby="manual-wellness-description"
                        onClick={() => setEnableManualWellness((v) => !v)}
                        className={cn(
                          "relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-200",
                          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                          "touch-target hover:shadow-md",
                          enableManualWellness ? "bg-primary" : "bg-muted",
                        )}
                        whileTap={{ scale: prefersReducedMotion ? 1 : 0.95 }}
                      >
                        <motion.span
                          className="bg-background inline-block h-6 w-6 transform rounded-full shadow-sm"
                          animate={{
                            x: enableManualWellness ? 28 : 4,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                            ...(prefersReducedMotion && { duration: 0 }),
                          }}
                        />
                        <span className="sr-only">
                          {enableManualWellness ? "Disable" : "Enable"} manual
                          wellness tracking
                        </span>
                      </motion.button>
                    </div>
                    <div id="manual-wellness-description" className="sr-only">
                      When enabled, you can manually log your energy levels and
                      sleep quality in the progress dashboard
                    </div>
                  </section>
                </div>

                <div className="border-border/50 from-card/30 to-card/50 flex flex-col justify-end gap-3 border-t bg-gradient-to-r px-6 py-5 sm:flex-row">
                  <Button
                    ref={firstFocusRef}
                    variant="outline"
                    size="default"
                    onClick={() => {
                      restoreFocus();
                      onClose();
                    }}
                    disabled={saving}
                    className="transition-all hover:shadow-md sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="default"
                    onClick={() => void handleSave()}
                    disabled={saving || saveDisabled}
                    aria-busy={saving ? "true" : "false"}
                    className="transition-all hover:shadow-md sm:w-auto"
                    haptic
                  >
                    {saving ? (
                      <>
                        <motion.div
                          className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                        Saving…
                      </>
                    ) : (
                      <>Save Preferences</>
                    )}
                  </Button>
                </div>
              </div>
            </GlassSurface>
          </motion.div>
        </FocusTrap>
      </motion.div>
    </AnimatePresence>
  );
}
