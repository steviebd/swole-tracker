"use client";

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  getWellnessPresets,
  validateManualWellnessData,
} from "~/lib/subjective-wellness-mapper";
import type { ManualWellnessData } from "~/lib/subjective-wellness-mapper";
import { trackWellnessModalInteraction } from "~/lib/analytics/health-advice";

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
  const [energyLevel, setEnergyLevel] = useState(5);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [modalOpenTime] = useState(Date.now());
  const [initialValues] = useState({ energy: 5, sleep: 5 });

  const presets = getWellnessPresets();

  if (!isOpen) return null;

  const handlePresetSelect = (preset: typeof presets.greatDay) => {
    setEnergyLevel(preset.energyLevel);
    setSleepQuality(preset.sleepQuality);
    setValidationError(null);

    // Track preset usage
    trackWellnessModalInteraction({
      sessionId: sessionId?.toString() || "unknown",
      action: "preset_selected",
      presetUsed: preset.label.toLowerCase().replace(/\s+/g, "_"),
    });
  };

  const handleSubmit = () => {
    setValidationError(null);

    const wellnessData: ManualWellnessData = {
      energyLevel,
      sleepQuality,
      deviceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes: notes.trim() || undefined,
    };

    // Validate the data
    if (!validateManualWellnessData(wellnessData)) {
      setValidationError(
        "Please ensure all values are between 1-10 and notes are under 500 characters",
      );
      return;
    }

    // Track submission
    trackWellnessModalInteraction({
      sessionId: sessionId?.toString() || "unknown",
      action: "submitted",
      timeSpent: Date.now() - modalOpenTime,
      initialValues,
      finalValues: { energy: energyLevel, sleep: sleepQuality },
    });

    onSubmit(wellnessData);
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
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Quick Wellness Check
            </h2>
            <p className="text-muted text-sm">
              Just 2 quick inputs for personalized workout recommendations
            </p>

            {!hasWhoopIntegration && (
              <div
                className="rounded-lg p-3 text-left"
                style={{
                  backgroundColor:
                    "color-mix(in oklab, var(--color-warning) 10%, var(--color-bg-surface))",
                  borderColor: "var(--color-warning)",
                }}
              >
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
              <div
                className="rounded-lg p-3 text-left"
                style={{
                  backgroundColor:
                    "color-mix(in oklab, var(--color-danger) 10%, var(--color-bg-surface))",
                  borderColor: "var(--color-danger)",
                }}
              >
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
              <div
                className="rounded-lg p-3 text-left"
                style={{
                  backgroundColor:
                    "color-mix(in oklab, var(--color-success) 10%, var(--color-bg-surface))",
                  borderColor: "var(--color-success)",
                }}
              >
                <p className="text-secondary text-sm">
                  ✅ WHOOP connected! Your input will enhance the WHOOP data for
                  even better recommendations.
                </p>
              </div>
            )}
          </div>

          {/* Quick Presets for Mobile UX */}
          <div className="space-y-3">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--color-text)" }}
            >
              Quick Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(presets).map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetSelect(preset)}
                  className="hover:bg-opacity-80 rounded-lg border p-3 text-center text-xs transition-colors"
                  style={{
                    borderColor: "var(--color-border)",
                    backgroundColor:
                      "color-mix(in oklab, var(--color-primary) 5%, var(--color-bg-surface))",
                  }}
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text)" }}
                >
                  How energetic do you feel?
                </label>
                <span className="text-muted text-sm">
                  {getEnergyLabel(energyLevel)} ({energyLevel}/10)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={energyLevel}
                onChange={(e) => {
                  setEnergyLevel(Number(e.target.value));
                  setValidationError(null);
                }}
                className="slider-primary h-3 w-full cursor-pointer appearance-none rounded-lg"
                style={{ backgroundColor: "var(--color-border)" }}
              />
              <div className="text-muted flex justify-between text-xs">
                <span>Drained</span>
                <span>Peak Energy</span>
              </div>
            </div>

            {/* Sleep Quality */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text)" }}
                >
                  How well did you sleep?
                </label>
                <span className="text-muted text-sm">
                  {getSleepLabel(sleepQuality)} ({sleepQuality}/10)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={sleepQuality}
                onChange={(e) => {
                  setSleepQuality(Number(e.target.value));
                  setValidationError(null);
                }}
                className="slider-primary h-3 w-full cursor-pointer appearance-none rounded-lg"
                style={{ backgroundColor: "var(--color-border)" }}
              />
              <div className="text-muted flex justify-between text-xs">
                <span>Terrible</span>
                <span>Perfect</span>
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-3">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setNotes(e.target.value);
                    setValidationError(null);
                  }
                }}
                placeholder="Any other factors affecting your wellness today? (e.g., stress, illness, excitement)"
                className="w-full resize-none rounded-lg border p-3 text-sm"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-bg-surface)",
                  color: "var(--color-text)",
                }}
                rows={3}
                maxLength={500}
              />
              <div className="text-muted text-right text-xs">
                {notes.length}/500 characters
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {(validationError || submitError) && (
            <div
              className="rounded-lg p-3"
              style={{
                backgroundColor:
                  "color-mix(in oklab, var(--color-danger) 10%, var(--color-bg-surface))",
                borderColor: "var(--color-danger)",
              }}
            >
              <p className="text-danger text-sm">
                {validationError || submitError}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="btn-primary flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Getting Recommendations..."
                : "Get Workout Intelligence"}
            </Button>
          </div>

          {/* Mobile-Optimized Disclaimer */}
          <div
            className="text-muted border-t pt-2 text-center text-xs"
            style={{ borderColor: "var(--color-border)" }}
          >
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
