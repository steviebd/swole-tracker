"use client";

import React from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { subjectiveWellnessSchema } from "~/server/api/schemas/health-advice";
import {
  TanStackFormField,
  TanStackFormItem,
  TanStackFormLabel,
  TanStackFormControl,
} from "~/components/ui/tanstack-form";
import {
  formAnalytics,
  createFormOptions,
} from "~/lib/forms/tanstack-form-config";

interface SubjectiveWellnessData {
  energyLevel: number; // 1-10
  sleepQuality: number; // 1-10
  recoveryFeeling: number; // 1-10
  stressLevel: number; // 1-10 (inverted for calculations)
}

interface SubjectiveWellnessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubjectiveWellnessData) => void;
  hasWhoopIntegration: boolean;
  isWhoopConnected: boolean;
  onConnectWhoop?: () => void;
}

export function SubjectiveWellnessModal({
  isOpen,
  onClose,
  onSubmit,
  hasWhoopIntegration,
  isWhoopConnected,
  onConnectWhoop,
}: SubjectiveWellnessModalProps) {
  const form = useForm({
    defaultValues: {
      energyLevel: 5,
      sleepQuality: 5,
      recoveryFeeling: 5,
      stressLevel: 5,
    } as SubjectiveWellnessData,
    validators: {
      onBlur: subjectiveWellnessSchema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value);
    },
  });

  if (!isOpen) return null;

  const getEnergyLabel = (value: number) => {
    if (value <= 2) return "Drained";
    if (value <= 4) return "Low Energy";
    if (value <= 6) return "Moderate";
    if (value <= 8) return "Energetic";
    return "Peak Energy";
  };

  const getSleepLabel = (value: number) => {
    if (value <= 2) return "Terrible";
    if (value <= 4) return "Poor Rest";
    if (value <= 6) return "Fair Sleep";
    if (value <= 8) return "Well Rested";
    return "Perfect Rest";
  };

  const getRecoveryLabel = (value: number) => {
    if (value <= 2) return "Very Fatigued";
    if (value <= 4) return "Tired";
    if (value <= 6) return "Recovering";
    if (value <= 8) return "Recovered";
    return "Fully Recovered";
  };

  const getStressLabel = (value: number) => {
    if (value <= 2) return "Calm";
    if (value <= 4) return "Mild Stress";
    if (value <= 6) return "Moderate Stress";
    if (value <= 8) return "High Stress";
    return "Very Stressed";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="bg-surfaceContainerHigh/95 border-outlineVariant/20 shadow-elevation-3 max-h-[90vh] w-full max-w-md overflow-y-auto backdrop-blur-md">
        <div className="space-y-6 p-6">
          {/* Header with WHOOP status message */}
          <div className="space-y-3 text-center">
            <h2 className="text-onSurface font-display text-2xl leading-tight font-black">
              🏋️ Workout Intelligence
            </h2>
            <p className="text-onSurfaceVariant text-body-sm">
              Let's personalize your training experience
            </p>

            {!hasWhoopIntegration && (
              <div className="border-tertiaryContainer bg-tertiaryContainer/30 rounded-xl border p-4 backdrop-blur-sm">
                <p className="text-onTertiaryContainer text-body-sm leading-relaxed">
                  💡 Let's create your personalized workout experience! Share
                  how you're feeling today and we'll craft recommendations that
                  help you perform at your best.
                </p>
                {onConnectWhoop && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onConnectWhoop}
                    className="bg-tertiary/10 hover:bg-tertiary/20 text-onTertiary border-tertiary/20 mt-3 w-full"
                  >
                    Connect WHOOP for Enhanced Insights
                  </Button>
                )}
              </div>
            )}

            {hasWhoopIntegration && !isWhoopConnected && (
              <div className="border-errorContainer bg-errorContainer/30 rounded-xl border p-4 backdrop-blur-sm">
                <p className="text-onErrorContainer text-body-sm leading-relaxed">
                  ⚠️ Your WHOOP connection needs attention. Reconnect for the
                  most accurate insights, or share your current state below for
                  personalized recommendations.
                </p>
                {onConnectWhoop && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onConnectWhoop}
                    className="bg-error/10 hover:bg-error/20 text-onError border-error/20 mt-3 w-full"
                  >
                    Reconnect WHOOP
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Wellness Input Form */}
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
                        <TanStackFormLabel className="text-onSurface font-medium">
                          How energetic do you feel?
                        </TanStackFormLabel>
                        <span className="text-onSurfaceVariant text-ui-sm bg-surfaceVariant/20 rounded-full px-2 py-1 font-medium">
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
                          className="bg-outlineVariant slider-primary focus:ring-primary h-3 w-full cursor-pointer appearance-none rounded-full focus:ring-2 focus:ring-offset-2 focus:outline-none"
                        />
                      </TanStackFormControl>
                      <div className="text-onSurfaceVariant text-ui-xs mt-2 flex justify-between">
                        <span>Drained</span>
                        <span>Peak Energy</span>
                      </div>
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
                        <TanStackFormLabel className="text-onSurface font-medium">
                          How well did you sleep?
                        </TanStackFormLabel>
                        <span className="text-onSurfaceVariant text-ui-sm bg-surfaceVariant/20 rounded-full px-2 py-1 font-medium">
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
                          className="bg-outlineVariant slider-primary focus:ring-primary h-3 w-full cursor-pointer appearance-none rounded-full focus:ring-2 focus:ring-offset-2 focus:outline-none"
                        />
                      </TanStackFormControl>
                      <div className="text-onSurfaceVariant text-ui-xs mt-2 flex justify-between">
                        <span>Terrible</span>
                        <span>Perfect Rest</span>
                      </div>
                    </TanStackFormItem>
                  </TanStackFormField>
                );
              }}
            />

            {/* Recovery Feeling */}
            <form.Field
              name="recoveryFeeling"
              children={(field) => {
                const error = field.state.meta.errors?.[0];
                const errorMessage =
                  typeof error === "string" ? error : (error as any)?.message;
                return (
                  <TanStackFormField name={field.name} error={errorMessage}>
                    <TanStackFormItem>
                      <div className="flex items-center justify-between">
                        <TanStackFormLabel className="text-onSurface font-medium">
                          How recovered do you feel?
                        </TanStackFormLabel>
                        <span className="text-onSurfaceVariant text-ui-sm bg-surfaceVariant/20 rounded-full px-2 py-1 font-medium">
                          {getRecoveryLabel(field.state.value)} (
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
                          className="bg-outlineVariant slider-primary focus:ring-primary h-3 w-full cursor-pointer appearance-none rounded-full focus:ring-2 focus:ring-offset-2 focus:outline-none"
                        />
                      </TanStackFormControl>
                      <div className="text-onSurfaceVariant text-ui-xs mt-2 flex justify-between">
                        <span>Very Fatigued</span>
                        <span>Fully Recovered</span>
                      </div>
                    </TanStackFormItem>
                  </TanStackFormField>
                );
              }}
            />

            {/* Stress Level */}
            <form.Field
              name="stressLevel"
              children={(field) => {
                const error = field.state.meta.errors?.[0];
                const errorMessage =
                  typeof error === "string" ? error : (error as any)?.message;
                return (
                  <TanStackFormField name={field.name} error={errorMessage}>
                    <TanStackFormItem>
                      <div className="flex items-center justify-between">
                        <TanStackFormLabel className="text-onSurface font-medium">
                          How stressed do you feel?
                        </TanStackFormLabel>
                        <span className="text-onSurfaceVariant text-ui-sm bg-surfaceVariant/20 rounded-full px-2 py-1 font-medium">
                          {getStressLabel(field.state.value)} (
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
                          className="bg-outlineVariant slider-primary focus:ring-primary h-3 w-full cursor-pointer appearance-none rounded-full focus:ring-2 focus:ring-offset-2 focus:outline-none"
                        />
                      </TanStackFormControl>
                      <div className="text-onSurfaceVariant text-ui-xs mt-2 flex justify-between">
                        <span>Calm</span>
                        <span>Very Stressed</span>
                      </div>
                    </TanStackFormItem>
                  </TanStackFormField>
                );
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-2">
            <Button
              variant="secondary"
              onClick={onClose}
              className="bg-surfaceVariant hover:bg-surfaceVariant/80 text-onSurfaceVariant border-outlineVariant/50 text-ui-md h-12 flex-1 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              disabled={form.state.isSubmitting}
            >
              Maybe Later
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  onClick={() => form.handleSubmit()}
                  className="bg-primary hover:bg-primary/90 text-onPrimary border-primary/20 text-ui-md h-12 flex-1 font-bold shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting
                    ? "✨ Crafting Your Plan..."
                    : "🚀 Get My Intelligence"}
                </Button>
              )}
            />
          </div>

          {/* Motivational Disclaimer */}
          <div className="text-onSurfaceVariant border-outlineVariant/30 text-ui-sm bg-surfaceVariant/10 rounded-lg border-t p-3 pt-4 text-center leading-relaxed backdrop-blur-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">💪</span>
                <span className="font-medium">Your body knows best</span>
              </div>
              <div>
                This helps us create workouts that match your energy and
                recovery. Always listen to your body and consult professionals
                for medical concerns.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
