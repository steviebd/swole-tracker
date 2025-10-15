"use client";

import { useState } from "react";
import { useAuth } from "~/providers/AuthProvider";
import { useTheme } from "~/providers/ThemeProvider";
import { GlassHeader } from "~/components/ui/glass-header";
import { ProgressionModal } from "./ProgressionModal";
import { SettingsModal } from "./SettingsModal";
import { HomePageContent } from "./HomePageContent";
import { QuickActionCards } from "./QuickActionCards";
import { HomePageFooter } from "./HomePageFooter";
import { DashboardContainer } from "~/components/dashboard/dashboard-container";

export function DashboardContent() {
  const { user, signOut } = useAuth();
  const { toggle: toggleTheme, resolvedTheme } = useTheme();
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (!user) return null;

  // Extract display name from user metadata or email
  const displayName = user.user_metadata?.first_name || 
                     user.user_metadata?.display_name || 
                     user.email?.split('@')[0] ||
                     'User';

  // Header actions matching template design
  const headerActions = (
    <div className="flex items-center gap-3">
      {/* Chart/Analytics Button */}
      <button
        onClick={() => setProgressionOpen(true)}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="View Analytics"
        title="Analytics"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>

      {/* Settings Button */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Settings"
        title="Settings"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {resolvedTheme === 'dark' ? (
            // Sun icon for dark mode (clicking will switch to light)
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          ) : (
            // Moon icon for light mode (clicking will switch to dark)
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          )}
        </svg>
      </button>
      
      {/* User Avatar */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm hover:shadow-md transition-shadow"
          aria-label="User menu"
        >
          {displayName.charAt(0).toUpperCase()}
        </button>
        
        {userMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border z-50">
            <div className="py-1">
              <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
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

  // Template-inspired layout with enhanced GlassHeader and gradient backgrounds
  return (
    <>
      {/* Glass Header with template design */}
      <GlassHeader
        title="🔥 Swole Tracker"
        subtitle={`Welcome back, ${displayName}`}
        actions={headerActions}
      />

      {/* Single-column content area with template-inspired mobile-first design */}
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        <HomePageContent>
          {/* Phase 4 Enhanced Dashboard Implementation */}
          <DashboardContainer>
            {/* Quick Actions - Start Workout, Templates, etc. */}
            <QuickActionCards />
          </DashboardContainer>

          {/* Bottom content with better spacing */}
          <div className="space-y-6 sm:space-y-8">
            {/* Homepage Footer */}
            <HomePageFooter />
          </div>
        </HomePageContent>
      </div>
      
      {/* Modals */}
      <ProgressionModal open={progressionOpen} onClose={() => setProgressionOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}