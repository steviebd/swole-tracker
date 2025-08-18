"use client";

import { useState } from "react";
import { useAuth } from "~/providers/AuthProvider";
import { useTheme } from "~/providers/ThemeProvider";
import { PreferencesModal } from "./PreferencesModal";
import { ProgressionModal } from "./ProgressionModal";
import { SettingsModal } from "./SettingsModal";

// Theme icons
const SunIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

export function HomePageHeader() {
  const { user, signOut } = useAuth();
  const { resolvedTheme, toggle: toggleTheme } = useTheme();
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

  // Render app branding with logo and title
  const AppBranding = () => (
    <div className="min-w-0 flex-1 flex items-center gap-3">
      {/* Gradient logo background */}
      <div className="gradient-primary w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
        <span className="text-white font-black text-lg sm:text-xl drop-shadow-sm">💪</span>
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl md:text-2xl font-serif font-black truncate gradient-text-primary">
          Swole Tracker
        </h1>
      </div>
    </div>
  );

  // Action buttons component
  const HeaderActions = () => (
    <>
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

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="btn-ghost p-1.5 sm:p-2 text-sm font-medium rounded-lg"
          aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme. Current theme: ${resolvedTheme}`}
          aria-pressed={resolvedTheme === "dark"}
          title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
        >
          <span className="sr-only">
            {resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          </span>
          {resolvedTheme === "dark" ? (
            <SunIcon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          ) : (
            <MoonIcon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          )}
        </button>
      </div>
      
      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="btn-ghost p-1 sm:p-2 rounded-full"
          aria-label="User menu"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base shadow-lg">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </button>
        
        {userMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-background rounded-md shadow-lg border border-border z-50">
            <div className="py-1">
              <div className="px-4 py-2 text-sm text-foreground border-b border-border">
                {user.email}
              </div>
              <button
                onClick={() => {
                  signOut();
                  setUserMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Custom header layout for home page with app branding */}
      <header className="glass-header sticky top-0 z-40"
        style={{ borderBottomColor: "var(--color-border)" }}>
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left side - App branding */}
            <AppBranding />
            
            {/* Right side - Controls */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
              <HeaderActions />
            </div>
          </div>
          
          {/* Subtitle */}
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Welcome back, {displayName}
          </p>
        </div>
      </header>
      
      {/* Modals */}
      <PreferencesModal open={preferencesOpen} onClose={() => setPreferencesOpen(false)} />
      <ProgressionModal open={progressionOpen} onClose={() => setProgressionOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}