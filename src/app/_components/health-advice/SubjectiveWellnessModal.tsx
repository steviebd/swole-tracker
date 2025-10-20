'use client';

import React, { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';

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
  const [energyLevel, setEnergyLevel] = useState(5);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [recoveryFeeling, setRecoveryFeeling] = useState(5);
  const [stressLevel, setStressLevel] = useState(5);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({
      energyLevel,
      sleepQuality,
      recoveryFeeling,
      stressLevel,
    });
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

  const getRecoveryLabel = (value: number) => {
    if (value <= 2) return 'Very Poor';
    if (value <= 4) return 'Poor';
    if (value <= 6) return 'Fair';
    if (value <= 8) return 'Good';
    return 'Excellent';
  };

  const getStressLabel = (value: number) => {
    if (value <= 2) return 'Very Low';
    if (value <= 4) return 'Low';
    if (value <= 6) return 'Moderate';
    if (value <= 8) return 'High';
    return 'Very High';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header with WHOOP status message */}
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-bold text-[var(--color-text)]">
              Workout Intelligence
            </h2>
            
            {!hasWhoopIntegration && (
              <div className="rounded-lg border border-[var(--color-warning)] bg-[color-mix(in_oklab,_var(--color-warning)_10%,_var(--color-bg-surface))] p-3">
                <p className="text-sm text-secondary">
                  💡 You don't have WHOOP connected, so we can't access your recovery metrics. 
                  Let us know how you're feeling today and we'll provide personalized workout recommendations.
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
                <p className="text-sm text-secondary">
                  ⚠️ Your WHOOP connection appears to be disconnected. Please reconnect to get the most accurate recommendations, or provide your current wellness status below.
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
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Energy Level
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
                onChange={(e) => setEnergyLevel(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)]"
              />
              <div className="flex justify-between text-xs text-muted">
                <span>Very Low</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Sleep Quality */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Sleep Quality
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
                onChange={(e) => setSleepQuality(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)]"
              />
              <div className="flex justify-between text-xs text-muted">
                <span>Very Poor</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Recovery Feeling */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Recovery Feeling
                </label>
                <span className="text-sm text-muted">
                  {getRecoveryLabel(recoveryFeeling)} ({recoveryFeeling}/10)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={recoveryFeeling}
                onChange={(e) => setRecoveryFeeling(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)]"
              />
              <div className="flex justify-between text-xs text-muted">
                <span>Very Poor</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Stress Level */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Stress Level
                </label>
                <span className="text-sm text-muted">
                  {getStressLabel(stressLevel)} ({stressLevel}/10)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={stressLevel}
                onChange={(e) => setStressLevel(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-border)]"
              />
              <div className="flex justify-between text-xs text-muted">
                <span>Very Low</span>
                <span>Very High</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 btn-primary"
            >
              Get Workout Intelligence
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="border-t border-[var(--color-border)] pt-2 text-center text-xs text-muted">
            💡 This assessment helps us provide personalized workout recommendations. 
            Not medical advice - always listen to your body.
          </div>
        </div>
      </Card>
    </div>
  );
}
