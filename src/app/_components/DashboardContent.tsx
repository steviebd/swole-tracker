"use client";

import { useState } from "react";
import { useAuth } from "~/providers/AuthProvider";
import { GlassHeader } from "./ui/GlassHeader";
import { PreferencesModal } from "./PreferencesModal";
import { ProgressionModal } from "./ProgressionModal";
import { SettingsModal } from "./SettingsModal";
import { HomePageContent } from "./HomePageContent";
import { StatsCards } from "./StatsCards";
import { QuickActionCards } from "./QuickActionCards";
import { WeeklyProgressSection } from "./WeeklyProgressSection";
import { RecentWorkoutsSection } from "./RecentWorkoutsSection";
import { HomePageFooter } from "./HomePageFooter";
import { JokeOfTheDay } from "./joke-of-the-day";

export function DashboardContent() {
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

  // Header actions for mobile-inspired layout
  const headerActions = (
    <div className="flex items-center gap-2">
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
    </div>
  );

  // Mobile-inspired layout with GlassHeader
  return (
    <>
      {/* Glass Header with mobile pattern */}
      <GlassHeader
        title="💪 Swole Tracker"
        subtitle={`Welcome back, ${displayName}`}
        actions={headerActions}
      />

      {/* Single-column content area with mobile-first design */}
      <HomePageContent>
        {/* Quick Stats - 3 cards showing this week's metrics */}
        <StatsCards />

        {/* Quick Actions - Start Workout, Joke of Day, Manage Templates */}
        <QuickActionCards />

        {/* Weekly Progress - Progress bars for goals */}
        <WeeklyProgressSection />

        {/* Recent Workouts - List of recent workout sessions */}
        <RecentWorkoutsSection />

        {/* Joke of the Day - Moved to bottom */}
        <JokeOfTheDay />

        {/* Homepage Footer */}
        <HomePageFooter />
      </HomePageContent>
      
      {/* Modals */}
      <PreferencesModal open={preferencesOpen} onClose={() => setPreferencesOpen(false)} />
      <ProgressionModal open={progressionOpen} onClose={() => setProgressionOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}