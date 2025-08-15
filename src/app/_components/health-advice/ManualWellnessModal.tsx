'use client';

import React, { useState } from 'react';
import { Button } from '~/app/_components/ui/Button';
import { Card } from '~/app/_components/ui/Card';
import { 
  getManualWellnessLabels, 
  getWellnessPresets,
  validateManualWellnessData 
} from '~/lib/subjective-wellness-mapper';
import type { ManualWellnessData } from '~/lib/subjective-wellness-mapper';
import { trackWellnessModalInteraction } from '~/lib/analytics/health-advice';

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
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [modalOpenTime] = useState(Date.now());
  const [initialValues] = useState({ energy: 5, sleep: 5 });

  const labels = getManualWellnessLabels();
  const presets = getWellnessPresets();

  if (!isOpen) return null;

  const handlePresetSelect = (preset: typeof presets.greatDay) => {
    setEnergyLevel(preset.energyLevel);
    setSleepQuality(preset.sleepQuality);
    setValidationError(null);
    
    // Track preset usage
    trackWellnessModalInteraction({
      sessionId: sessionId?.toString() || 'unknown',
      action: 'preset_selected',
      presetUsed: preset.label.toLowerCase().replace(/\s+/g, '_')
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
      setValidationError('Please ensure all values are between 1-10 and notes are under 500 characters');
      return;
    }

    // Track submission
    trackWellnessModalInteraction({
      sessionId: sessionId?.toString() || 'unknown',
      action: 'submitted',
      timeSpent: Date.now() - modalOpenTime,
      initialValues,
      finalValues: { energy: energyLevel, sleep: sleepQuality }
    });
    
    onSubmit(wellnessData);
  };

  const getEnergyLabel = (value: number) => {
    if (value <= 2) return 'Very Low';
    if (value <= 4) return 'Low';
    if (value <= 6) return 'Moderate';
    if (value <= 8) return 'Good';
    return 'Excellent';
  };

  const getSleepLabel = (value: number) => {
    if (value <= 2) return 'Very Poor';
    if (value <= 4) return 'Poor';
    if (value <= 6) return 'Fair';
    if (value <= 8) return 'Good';
    return 'Excellent';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header with improved messaging for simplified system */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              Quick Wellness Check
            </h2>
            <p className="text-sm text-muted">
              Just 2 quick inputs for personalized workout recommendations
            </p>
            
            {!hasWhoopIntegration && (
              <div className="p-3 rounded-lg text-left" style={{ backgroundColor: 'color-mix(in oklab, var(--color-warning) 10%, var(--color-bg-surface))', borderColor: 'var(--color-warning)' }}>
                <p className="text-sm text-secondary">
                  💡 Quick 30-second wellness check to get personalized workout recommendations
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
              <div className="p-3 rounded-lg text-left" style={{ backgroundColor: 'color-mix(in oklab, var(--color-danger) 10%, var(--color-bg-surface))', borderColor: 'var(--color-danger)' }}>
                <p className="text-sm text-secondary">
                  ⚠️ WHOOP disconnected. Quick wellness check will be used for recommendations.
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
              <div className="p-3 rounded-lg text-left" style={{ backgroundColor: 'color-mix(in oklab, var(--color-success) 10%, var(--color-bg-surface))', borderColor: 'var(--color-success)' }}>
                <p className="text-sm text-secondary">
                  ✅ WHOOP connected! Your input will enhance the WHOOP data for even better recommendations.
                </p>
              </div>
            )}
          </div>

          {/* Quick Presets for Mobile UX */}
          <div className="space-y-3">
            <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              Quick Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(presets).map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetSelect(preset)}
                  className="p-3 text-center border rounded-lg hover:bg-opacity-80 transition-colors text-xs"
                  style={{ 
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'color-mix(in oklab, var(--color-primary) 5%, var(--color-bg-surface))'
                  }}
                >
                  <div className="text-lg mb-1">{preset.label.split(' ')[0]}</div>
                  <div className="font-medium text-[10px]">{preset.label.split(' ').slice(1).join(' ')}</div>
                  <div className="text-[10px] text-muted mt-1">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Simplified Wellness Input Form (2 inputs only) */}
          <div className="space-y-6">
            {/* Energy Level */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  How energetic do you feel?
                </label>
                <span className="text-sm text-muted">
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
                className="w-full h-3 rounded-lg appearance-none cursor-pointer slider-primary"
                style={{ backgroundColor: 'var(--color-border)' }}
              />
              <div className="flex justify-between text-xs text-muted">
                <span>Drained</span>
                <span>Peak Energy</span>
              </div>
            </div>

            {/* Sleep Quality */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  How well did you sleep?
                </label>
                <span className="text-sm text-muted">
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
                className="w-full h-3 rounded-lg appearance-none cursor-pointer slider-primary"
                style={{ backgroundColor: 'var(--color-border)' }}
              />
              <div className="flex justify-between text-xs text-muted">
                <span>Terrible</span>
                <span>Perfect</span>
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-3">
              <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
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
                className="w-full p-3 border rounded-lg resize-none text-sm"
                style={{ 
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-surface)',
                  color: 'var(--color-text)'
                }}
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-muted text-right">
                {notes.length}/500 characters
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {(validationError || submitError) && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'color-mix(in oklab, var(--color-danger) 10%, var(--color-bg-surface))', borderColor: 'var(--color-danger)' }}>
              <p className="text-sm text-danger">
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
              className="flex-1 btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Getting Recommendations...' : 'Get Workout Intelligence'}
            </Button>
          </div>

          {/* Mobile-Optimized Disclaimer */}
          <div className="text-xs text-muted text-center pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="space-y-1">
              <div>💡 Quick wellness check for personalized recommendations</div>
              <div>Not medical advice - always listen to your body</div>
              {sessionId && (
                <div className="text-[10px] opacity-75">Session #{sessionId}</div>
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