"use client";

import { useState } from "react";
import { useAuth } from "~/providers/AuthProvider";
import { PreferencesModal } from "./PreferencesModal";
import { ProgressionModal } from "./ProgressionModal";
import { SettingsModal } from "./SettingsModal";

export function HomePageHeader() {
  const { user, signOut } = useAuth();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (!user) return null;

  // Extract display name from user metadata or email
  const displayName = user.user_metadata?.first_name || 
                     user.user_metadata?.display_name || 
                     user.email?.split('@')[0] ||
                     'User';

  return (
    <header className="glass-header sticky top-0 z-40"
      style={{ borderBottomColor: "var(--color-border)" }}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left side - App branding */}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate" style={{ color: "var(--color-text)" }}>
              Swole Tracker
            </h1>
            <p className="text-sm sm:text-base truncate" style={{ color: "var(--color-text-secondary)" }}>
              Welcome back, {displayName}
            </p>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">            
            {/* Action Buttons - Hide some on mobile */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Progression Button - Hidden on mobile */}
              <button
                onClick={() => setProgressionOpen(true)}
                className="btn-ghost p-1.5 sm:p-2 text-sm font-medium rounded-lg hidden sm:flex"
                aria-label="View Progression"
                title="Progression"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>

              {/* Settings Button - Hidden on mobile */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="btn-ghost p-1.5 sm:p-2 text-sm font-medium rounded-lg hidden sm:flex"
                aria-label="Open Settings"
                title="Settings"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </button>

              {/* Preferences Button */}
              <button
                onClick={() => setPreferencesOpen(true)}
                className="btn-ghost p-1.5 sm:p-2 text-sm font-medium rounded-lg"
                aria-label="Open Preferences"
                title="Preferences"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="btn-ghost p-1 sm:p-2 rounded-full"
                aria-label="User menu"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                      {user.email}
                    </div>
                    <button
                      onClick={() => {
                        signOut();
                        setUserMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <PreferencesModal open={preferencesOpen} onClose={() => setPreferencesOpen(false)} />
      <ProgressionModal open={progressionOpen} onClose={() => setProgressionOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}