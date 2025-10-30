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

  const getRecoveryLabel = (value: number) => {
    if (value <= 2) return "Very Poor";
    if (value <= 4) return "Poor";
    if (value <= 6) return "Fair";
    if (value <= 8) return "Good";
    return "Excellent";
  };

  const getStressLabel = (value: number) => {
    if (value <= 2) return "Very Low";
    if (value <= 4) return "Low";
    if (value <= 6) return "Moderate";
    if (value <= 8) return "High";
    return "Very High";
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header with WHOOP status message */}
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-bold text-[var(--color-text)]">
              Workout Intelligence
            </h2>

            {!hasWhoopIntegration && (
              <div className="rounded-lg border border-[var(--color-warning)] bg-[color-mix(in_oklab,_var(--color-warning)_10%,_var(--color-bg-surface))] p-3">
                <p className="text-secondary text-sm">
                  💡 You don't have WHOOP connected, so we can't access your
                  recovery metrics. Let us know how you're feeling today and
                  we'll provide personalized workout recommendations.
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
              <div className="rounded-lg border border-[var(--color-danger)] bg-[color-mix(in_oklab,_var(--color-danger)_10%,_var(--color-bg-surface))] p-3">
                <p className="text-secondary text-sm">
                  ⚠️ Your WHOOP connection appears to be disconnected. Please
                  reconnect to get the most accurate recommendations, or provide
                  your current wellness status below.
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
                        <TanStackFormLabel>Energy Level</TanStackFormLabel>
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
                          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)]"
                        />
                      </TanStackFormControl>
                      <div className="text-muted flex justify-between text-xs">
                        <span>Very Low</span>
                        <span>Excellent</span>
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
                        <TanStackFormLabel>Sleep Quality</TanStackFormLabel>
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
                          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)]"
                        />
                      </TanStackFormControl>
                      <div className="text-muted flex justify-between text-xs">
                        <span>Very Poor</span>
                        <span>Excellent</span>
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
                        <TanStackFormLabel>Recovery Feeling</TanStackFormLabel>
                        <span className="text-muted text-sm">
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
                          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)]"
                        />
                      </TanStackFormControl>
                      <div className="text-muted flex justify-between text-xs">
                        <span>Very Poor</span>
                        <span>Excellent</span>
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
                        <TanStackFormLabel>Stress Level</TanStackFormLabel>
                        <span className="text-muted text-sm">
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
                          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)]"
                        />
                      </TanStackFormControl>
                      <div className="text-muted flex justify-between text-xs">
                        <span>Very Low</span>
                        <span>Very High</span>
                      </div>
                    </TanStackFormItem>
                  </TanStackFormField>
                );
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={form.state.isSubmitting}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  onClick={() => form.handleSubmit()}
                  className="btn-primary flex-1"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting
                    ? "Getting Intelligence..."
                    : "Get Workout Intelligence"}
                </Button>
              )}
            />
          </div>

          {/* Disclaimer */}
          <div className="text-muted border-t border-[var(--color-border)] pt-2 text-center text-xs">
            💡 This assessment helps us provide personalized workout
            recommendations. Not medical advice - always listen to your body.
          </div>
        </div>
      </Card>
    </div>
  );
}
