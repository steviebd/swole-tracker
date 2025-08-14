"use client";

import { useState, useRef, useEffect } from "react";
import { FocusTrap, useReturnFocus } from "./focus-trap";
import { api } from "~/trpc/react";
import { trackWellnessSettingsChange } from '~/lib/analytics/health-advice';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { restoreFocus } = useReturnFocus();
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const [notifications, setNotifications] = useState(true);
  const [workoutReminders, setWorkoutReminders] = useState(false);
  const [dataExport, setDataExport] = useState(false);
  const [manualWellnessEnabled, setManualWellnessEnabled] = useState(false);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);

  // Load user preferences and user data for analytics
  const { data: preferences, refetch: refetchPreferences } = api.preferences.get.useQuery();
  const { data: _userData } = api.preferences.get.useQuery(); // This would need user ID for analytics
  
  const updatePreferences = api.preferences.update.useMutation({
    onSuccess: () => {
      refetchPreferences();
      setIsUpdatingPreferences(false);
    },
    onError: (error) => {
      console.error('Failed to update preferences:', error);
      setIsUpdatingPreferences(false);
    },
  });

  // Sync local state with preferences
  useEffect(() => {
    if (preferences) {
      setManualWellnessEnabled(preferences.enable_manual_wellness ?? false);
    }
  }, [preferences]);

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
      await updatePreferences.mutateAsync({
        enable_manual_wellness: newValue,
      });
      
      // Track analytics for wellness settings change
      trackWellnessSettingsChange({
        userId: 'current_user', // In real implementation, get from auth context
        enabled: newValue,
        previouslyEnabled: previousValue,
        source: 'settings_modal'
      });
      
    } catch (_error) {
      // Revert on error
      setManualWellnessEnabled(previousValue);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-[50000] flex min-h-screen items-center justify-center p-4"
      style={{ 
        backgroundColor: 'color-mix(in srgb, var(--color-bg-app) 80%, transparent)',
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
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto glass-surface shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="glass-hairline border-b px-6 py-4">
            <h2 id="settings-title" className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              App Settings
            </h2>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-6">
            {/* Notifications */}
            <section>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium" style={{ color: 'var(--color-text)' }}>Push Notifications</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Receive notifications about your workouts
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={notifications ? "true" : "false"}
                  onClick={() => setNotifications(v => !v)}
                  className="inline-flex h-8 w-14 items-center rounded-full transition-colors"
                  style={{
                    backgroundColor: notifications 
                      ? "var(--color-primary)" 
                      : "var(--color-text-muted)"
                  }}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      notifications ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                  <span className="sr-only">Toggle notifications</span>
                </button>
              </div>
            </section>

            {/* Workout Reminders */}
            <section>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium" style={{ color: 'var(--color-text)' }}>Workout Reminders</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Get reminded when it's time to work out
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={workoutReminders ? "true" : "false"}
                  onClick={() => setWorkoutReminders(v => !v)}
                  className="inline-flex h-8 w-14 items-center rounded-full transition-colors"
                  style={{
                    backgroundColor: workoutReminders 
                      ? "var(--color-primary)" 
                      : "var(--color-text-muted)"
                  }}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      workoutReminders ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                  <span className="sr-only">Toggle workout reminders</span>
                </button>
              </div>
            </section>

            {/* Manual Wellness */}
            <section>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium" style={{ color: 'var(--color-text)' }}>Manual Wellness Input</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Enable quick wellness checks for personalized workout recommendations
                  </div>
                  {manualWellnessEnabled && (
                    <div className="text-xs mt-1" style={{ color: 'var(--color-success)' }}>
                      ✓ Enhanced workout intelligence with 2-input wellness system
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  aria-pressed={manualWellnessEnabled ? "true" : "false"}
                  onClick={handleManualWellnessToggle}
                  disabled={isUpdatingPreferences}
                  className="inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: manualWellnessEnabled 
                      ? "var(--color-primary)" 
                      : "var(--color-text-muted)"
                  }}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      manualWellnessEnabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                  <span className="sr-only">Toggle manual wellness input</span>
                </button>
              </div>
              {manualWellnessEnabled && (
                <div className="mt-3 p-3 rounded-lg text-sm" style={{ 
                  backgroundColor: 'color-mix(in oklab, var(--color-primary) 5%, var(--color-bg-surface))',
                  borderColor: 'var(--color-primary)'
                }}>
                  <div className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    🎯 Enhanced Workout Intelligence
                  </div>
                  <div style={{ color: 'var(--color-text-muted)' }}>
                    • 30-second wellness check before workouts<br/>
                    • Personalized recommendations based on energy & sleep<br/>
                    • Works alongside WHOOP integration for best results
                  </div>
                </div>
              )}
            </section>

            {/* Data Export */}
            <section>
              <div className="mb-1 font-medium" style={{ color: 'var(--color-text)' }}>Data Export</div>
              <div className="mb-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Export your workout data as CSV or JSON
              </div>
              <button
                onClick={handleExportData}
                disabled={dataExport}
                className="px-4 py-2 rounded-lg border font-medium transition-colors duration-300 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-bg-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                {dataExport ? "Exporting..." : "Export Data"}
              </button>
            </section>

            {/* Account */}
            <section>
              <div className="mb-1 font-medium" style={{ color: 'var(--color-text)' }}>Account</div>
              <div className="mb-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Manage your account settings and data
              </div>
              <div className="space-y-2">
                <button
                  className="block w-full text-left px-4 py-2 rounded-lg border font-medium transition-colors duration-300"
                  style={{
                    backgroundColor: 'var(--color-bg-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  Change Password
                </button>
                <button
                  className="block w-full text-left px-4 py-2 rounded-lg border font-medium transition-colors duration-300"
                  style={{
                    borderColor: 'var(--color-danger)',
                    color: 'var(--color-danger)',
                    backgroundColor: 'transparent',
                  }}
                >
                  Delete Account
                </button>
              </div>
            </section>

            {/* App Info */}
            <section className="pt-4 border-t transition-colors duration-300" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-center text-sm transition-colors duration-300" style={{ color: 'var(--color-text-muted)' }}>
                Swole Tracker v1.0.0<br />
                Built with Next.js & tRPC
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t px-6 py-4 transition-colors duration-300" style={{ borderColor: 'var(--color-border)' }}>
            <button
              ref={firstFocusRef}
              onClick={() => {
                restoreFocus();
                onClose();
              }}
              className="px-4 py-2 rounded-lg border font-medium transition-colors duration-300"
              style={{
                backgroundColor: 'var(--color-bg-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
