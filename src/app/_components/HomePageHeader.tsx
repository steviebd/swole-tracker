"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "~/providers/ThemeProvider";
import { PreferencesModal } from "./PreferencesModal";
import { ProgressionModal } from "./ProgressionModal";
import { SettingsModal } from "./SettingsModal";
import { ConnectWhoopButton } from "./ConnectWhoopButton";
import { ThemeToggleDropdown } from "./ThemeToggleDropdown";

export function HomePageHeader() {
  const { user } = useUser();
  const { theme, resolvedTheme } = useTheme();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!user) return null;

  return (
    <header className={`border-b sticky top-0 z-40 backdrop-blur-md transition-colors duration-300 ${
      theme !== "system" || (theme === "system" && resolvedTheme === "dark")
        ? "bg-gray-900/95 border-gray-800" 
        : "bg-white/95 border-gray-200 dark:bg-gray-950/95 dark:border-gray-800"
    }`}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - App branding */}
          <div>
            <h1 className={`text-2xl font-bold transition-colors duration-300 ${
              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                ? "text-white" 
                : "text-gray-900 dark:text-white"
            }`}>
              Swole Tracker
            </h1>
            <p className={`text-base transition-colors duration-300 ${
              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                ? "text-gray-400" 
                : "text-gray-600 dark:text-gray-400"
            }`}>
              Welcome back, {user.firstName ?? user.username}
            </p>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-4">
            <ConnectWhoopButton />
            <ThemeToggleDropdown />
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Progression Button */}
              <button
                onClick={() => setProgressionOpen(true)}
                className={`p-2 text-sm font-medium rounded-lg transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-gray-300 hover:text-white hover:bg-gray-800" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
                }`}
                aria-label="View Progression"
                title="Progression"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setSettingsOpen(true)}
                className={`p-2 text-sm font-medium rounded-lg transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-gray-300 hover:text-white hover:bg-gray-800" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
                }`}
                aria-label="Open Settings"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </button>

              {/* Preferences Button */}
              <button
                onClick={() => setPreferencesOpen(true)}
                className={`p-2 text-sm font-medium rounded-lg transition-colors duration-300 ${
                  theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-gray-300 hover:text-white hover:bg-gray-800" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
                }`}
                aria-label="Open Preferences"
                title="Preferences"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            
            <UserButton />
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <PreferencesModal open={preferencesOpen} onClose={() => setPreferencesOpen(false)} />
      <ProgressionModal open={progressionOpen} onClose={() => setProgressionOpen(false)} exerciseName="Bench Press" />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}