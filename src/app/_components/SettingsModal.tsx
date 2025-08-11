"use client";

import { useState, useRef } from "react";
import { useTheme } from "~/providers/ThemeProvider";
import { FocusTrap, useReturnFocus } from "./focus-trap";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { theme, resolvedTheme } = useTheme();
  const { restoreFocus } = useReturnFocus();
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const [notifications, setNotifications] = useState(true);
  const [workoutReminders, setWorkoutReminders] = useState(false);
  const [dataExport, setDataExport] = useState(false);

  if (!open) return null;

  const handleExportData = () => {
    setDataExport(true);
    // Simulate export process
    setTimeout(() => {
      setDataExport(false);
      alert("Export feature coming soon!");
    }, 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-[50000] flex min-h-screen items-center justify-center p-4"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
                      ? (theme !== "system" || (theme === "system" && resolvedTheme === "dark") 
                          ? "var(--color-primary)" 
                          : "#3B82F6")
                      : "#6B7280"
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
                  <div className={`font-medium transition-colors duration-300 ${
                    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                      ? "text-white" 
                      : "text-gray-900 dark:text-white"
                  }`}>Workout Reminders</div>
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
                      ? (theme !== "system" || (theme === "system" && resolvedTheme === "dark") 
                          ? "var(--color-primary)" 
                          : "#3B82F6")
                      : "#6B7280"
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

            {/* Data Export */}
            <section>
              <div className={`mb-1 font-medium transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-white" 
                  : "text-gray-900 dark:text-white"
              }`}>Data Export</div>
              <div className={`mb-3 text-sm transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-gray-400" 
                  : "text-gray-600 dark:text-gray-400"
              }`}>
                Export your workout data as CSV or JSON
              </div>
              <button
                onClick={handleExportData}
                disabled={dataExport}
                className={`px-4 py-2 rounded-lg border font-medium transition-colors duration-300 disabled:opacity-50 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {dataExport ? "Exporting..." : "Export Data"}
              </button>
            </section>

            {/* Account */}
            <section>
              <div className={`mb-1 font-medium transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-white" 
                  : "text-gray-900 dark:text-white"
              }`}>Account</div>
              <div className={`mb-3 text-sm transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-gray-400" 
                  : "text-gray-600 dark:text-gray-400"
              }`}>
                Manage your account settings and data
              </div>
              <div className="space-y-2">
                <button
                  className={`block w-full text-left px-4 py-2 rounded-lg border font-medium transition-colors duration-300 ${
                    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                      ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                      : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  Change Password
                </button>
                <button
                  className="block w-full text-left px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 font-medium transition-colors duration-300"
                >
                  Delete Account
                </button>
              </div>
            </section>

            {/* App Info */}
            <section className={`pt-4 border-t transition-colors duration-300 ${
              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                ? "border-gray-800" 
                : "border-gray-200 dark:border-gray-800"
            }`}>
              <div className={`text-center text-sm transition-colors duration-300 ${
                theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                  ? "text-gray-400" 
                  : "text-gray-600 dark:text-gray-400"
              }`}>
                Swole Tracker v1.0.0<br />
                Built with Next.js & tRPC
              </div>
            </section>
          </div>

          {/* Footer */}
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
            >
              Close
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
