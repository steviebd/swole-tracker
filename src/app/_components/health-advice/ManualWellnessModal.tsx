"use client";

import React from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  getWellnessPresets,
  validateManualWellnessData,
} from "~/lib/subjective-wellness-mapper";
import type { ManualWellnessData } from "~/lib/subjective-wellness-mapper";
import { trackWellnessModalInteraction } from "~/lib/analytics/health-advice";
import {
  formAnalytics,
  createFormOptions,
} from "~/lib/forms/tanstack-form-config";
import { manualWellnessDataSchema } from "~/server/api/schemas/wellness";
import {
  TanStackFormField,
  TanStackFormItem,
  TanStackFormLabel,
  TanStackFormControl,
  TanStackFormMessage,
} from "~/components/ui/tanstack-form";

interface ManualWellnessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ManualWellnessData) => void;
  hasWhoopIntegration: boolean;
  isWhoopConnected: boolean;
  onConnectWhoop?: () => void;
  isSubmitting?: boolean;
  submitError?: string;
  sessionId?: number;
}

export function ManualWellnessModal({
  isOpen,
  onClose,
  onSubmit,
  hasWhoopIntegration,
  isWhoopConnected,
  onConnectWhoop,
  isSubmitting = false,
  submitError,
  sessionId,
}: ManualWellnessModalProps) {
  const presets = getWellnessPresets();
  const modalOpenTime = Date.now();
  const initialValues = { energy: 5, sleep: 5 };

  const form = useForm({
    defaultValues: {
      energyLevel: 5,
      sleepQuality: 5,
      notes: "",
      deviceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    } as ManualWellnessData,
    validators: {
      onBlur: manualWellnessDataSchema,
    },
    onSubmit: async ({ value }) => {
      // Track submission
      trackWellnessModalInteraction({
        sessionId: sessionId?.toString() || "unknown",
        action: "submitted",
        timeSpent: Date.now() - modalOpenTime,
        initialValues,
        finalValues: { energy: value.energyLevel, sleep: value.sleepQuality },
      });

      onSubmit(value);
    },
  });

  if (!isOpen) return null;

  const handlePresetSelect = (preset: typeof presets.greatDay) => {
    form.setFieldValue("energyLevel", preset.energyLevel);
    form.setFieldValue("sleepQuality", preset.sleepQuality);

    // Track preset usage
    trackWellnessModalInteraction({
      sessionId: sessionId?.toString() || "unknown",
      action: "preset_selected",
      presetUsed: preset.label.toLowerCase().replace(/\s+/g, "_"),
    });
  };

  const getEnergyLabel = (value: number) => {
    if (value <= 2) return "Very Low";
    if (value <= 4) return "Low";
    if (value <= 6) return "Moderate";
    if (value <= 8) return "Good";
    return "Excellent";
  };

  const getSleepLabel = (value: number) => {
    if (value <= 2) return "Very Poor";
    if (value <= 4) return "Poor";
    if (value <= 6) return "Fair";
    if (value <= 8) return "Good";
    return "Excellent";
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header with improved messaging for simplified system */}
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-bold text-[var(--color-text)]">
              Quick Wellness Check
            </h2>
            <p className="text-muted text-sm">
              Just 2 quick inputs for personalized workout recommendations
            </p>

            {!hasWhoopIntegration && (
              <div className="rounded-lg border border-[var(--color-warning)] bg-[color-mix(in_oklab,_var(--color-warning)_10%,_var(--color-bg-surface))] p-3 text-left">
                <p className="text-secondary text-sm">
                  💡 Quick 30-second wellness check to get personalized workout
                  recommendations
                </p>
                {onConnectWhoop && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onConnectWhoop}
                    className="mt-2 w-full"
                  >
                    Connect WHOOP for Better Insights
                  </Button>
                )}
              </div>
            )}

            {hasWhoopIntegration && !isWhoopConnected && (
              <div className="rounded-lg border border-[var(--color-danger)] bg-[color-mix(in_oklab,_var(--color-danger)_10%,_var(--color-bg-surface))] p-3 text-left">
                <p className="text-secondary text-sm">
                  ⚠️ WHOOP disconnected. Quick wellness check will be used for
                  recommendations.
                </p>
                {onConnectWhoop && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onConnectWhoop}
                    className="mt-2 w-full"
                  >
                    Reconnect WHOOP
                  </Button>
                )}
              </div>
            )}

            {hasWhoopIntegration && isWhoopConnected && (
              <div className="rounded-lg border border-[var(--color-success)] bg-[color-mix(in_oklab,_var(--color-success)_10%,_var(--color-bg-surface))] p-3 text-left">
                <p className="text-secondary text-sm">
                  ✅ WHOOP connected! Your input will enhance the WHOOP data for
                  even better recommendations.
                </p>
              </div>
            )}
          </div>

          {/* Quick Presets for Mobile UX */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Quick Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(presets).map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetSelect(preset)}
                  className="hover:bg-opacity-80 rounded-lg border border-[var(--color-border)] bg-[color-mix(in_oklab,_var(--color-primary)_5%,_var(--color-bg-surface))] p-3 text-center text-xs transition-colors"
                >
                  <div className="mb-1 text-lg">
                    {preset.label.split(" ")[0]}
                  </div>
                  <div className="text-[10px] font-medium">
                    {preset.label.split(" ").slice(1).join(" ")}
                  </div>
                  <div className="text-muted mt-1 text-[10px]">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Simplified Wellness Input Form (2 inputs only) */}
          <div className="space-y-6">
            {/* Energy Level */}
            <form.Field
              name="energyLevel"
              children={(field) => {
                const error = field.state.meta.errors?.[0];
                const errorMessage =
                  typeof error === "string" ? error : (error as any)?.message;
                return (
                  <TanStackFormField name={field.name} error={errorMessage}>
                    <TanStackFormItem>
                      <div className="flex items-center justify-between">
                        <TanStackFormLabel>
                          How energetic do you feel?
                        </TanStackFormLabel>
                        <span className="text-muted text-sm">
                          {getEnergyLabel(field.state.value)} (
                          {field.state.value}/10)
                        </span>
                      </div>
                      <TanStackFormControl>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(Number(e.target.value))
                          }
                          className="slider-primary h-3 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)]"
                        />
                      </TanStackFormControl>
                      <div className="text-muted flex justify-between text-xs">
                        <span>Drained</span>
                        <span>Peak Energy</span>
                      </div>
                      <TanStackFormMessage />
                    </TanStackFormItem>
                  </TanStackFormField>
                );
              }}
            />

            {/* Sleep Quality */}
            <form.Field
              name="sleepQuality"
              children={(field) => {
                const error = field.state.meta.errors?.[0];
                const errorMessage =
                  typeof error === "string" ? error : (error as any)?.message;
                return (
                  <TanStackFormField name={field.name} error={errorMessage}>
                    <TanStackFormItem>
                      <div className="flex items-center justify-between">
                        <TanStackFormLabel>
                          How well did you sleep?
                        </TanStackFormLabel>
                        <span className="text-muted text-sm">
                          {getSleepLabel(field.state.value)} (
                          {field.state.value}/10)
                        </span>
                      </div>
                      <TanStackFormControl>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(Number(e.target.value))
                          }
                          className="slider-primary h-3 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)]"
                        />
                      </TanStackFormControl>
                      <div className="text-muted flex justify-between text-xs">
                        <span>Terrible</span>
                        <span>Perfect</span>
                      </div>
                      <TanStackFormMessage />
                    </TanStackFormItem>
                  </TanStackFormField>
                );
              }}
            />

            {/* Optional Notes */}
            <form.Field
              name="notes"
              children={(field) => {
                const error = field.state.meta.errors?.[0];
                const errorMessage =
                  typeof error === "string" ? error : (error as any)?.message;
                return (
                  <TanStackFormField name={field.name} error={errorMessage}>
                    <TanStackFormItem>
                      <TanStackFormLabel>
                        Additional Notes (Optional)
                      </TanStackFormLabel>
                      <TanStackFormControl>
                        <textarea
                          value={field.state.value || ""}
                          onChange={(e) => {
                            if (e.target.value.length <= 500) {
                              field.handleChange(e.target.value);
                            }
                          }}
                          placeholder="Any other factors affecting your wellness today? (e.g., stress, illness, excitement)"
                          className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 text-sm text-[var(--color-text)]"
                          rows={3}
                          maxLength={500}
                        />
                      </TanStackFormControl>
                      <div className="text-muted text-right text-xs">
                        {(field.state.value || "").length}/500 characters
                      </div>
                      <TanStackFormMessage />
                    </TanStackFormItem>
                  </TanStackFormField>
                );
              }}
            />
          </div>

          {/* Error Messages */}
          {submitError && (
            <div className="rounded-lg border border-[var(--color-danger)] bg-[color-mix(in_oklab,_var(--color-danger)_10%,_var(--color-bg-surface))] p-3">
              <p className="text-danger text-sm">{submitError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting || form.state.isSubmitting}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmittingForm]) => (
                <Button
                  onClick={() => form.handleSubmit()}
                  className="btn-primary flex-1"
                  disabled={!canSubmit || isSubmittingForm || isSubmitting}
                >
                  {isSubmittingForm || isSubmitting
                    ? "Getting Recommendations..."
                    : "Get Workout Intelligence"}
                </Button>
              )}
            />
          </div>

          {/* Mobile-Optimized Disclaimer */}
          <div className="text-muted border-t border-[var(--color-border)] pt-2 text-center text-xs">
            <div className="space-y-1">
              <div>
                💡 Quick wellness check for personalized recommendations
              </div>
              <div>Not medical advice - always listen to your body</div>
              {sessionId && (
                <div className="text-[10px] opacity-75">
                  Session #{sessionId}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Custom CSS for mobile-optimized sliders (to be added to globals.css)
export const sliderStyles = `
/* Mobile-optimized slider styles */
.slider-primary::-webkit-slider-thumb {
  appearance: none;
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  border: 2px solid var(--color-bg-surface);
  box-shadow: 0 2px 4px var(--shadow-md);
}

.slider-primary::-moz-range-thumb {
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  border: 2px solid var(--color-bg-surface);
  box-shadow: 0 2px 4px var(--shadow-md);
}

/* Larger touch targets for mobile */
@media (max-width: 768px) {
  .slider-primary::-webkit-slider-thumb {
    height: 28px;
    width: 28px;
  }
  
  .slider-primary::-moz-range-thumb {
    height: 28px;
    width: 28px;
  }
}
`;
