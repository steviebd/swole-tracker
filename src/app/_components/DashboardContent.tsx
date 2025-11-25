"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
  const displayName =
    user.user_metadata?.first_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "User";

  // Header actions matching template design
  const headerActions = (
    <div className="flex items-center gap-3">
      {/* Chart/Analytics Button */}
      <button
        onClick={() => setProgressionOpen(true)}
        className="text-muted-foreground hover:text-foreground p-2 transition-colors"
        aria-label="View Analytics"
        title="Analytics"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </button>

      {/* Settings Button */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="text-muted-foreground hover:text-foreground p-2 transition-colors"
        aria-label="Settings"
        title="Settings"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="text-muted-foreground hover:text-foreground p-2 transition-colors"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {resolvedTheme === "dark" ? (
            // Sun icon for dark mode (clicking will switch to light)
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          ) : (
            // Moon icon for light mode (clicking will switch to dark)
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          )}
        </svg>
      </button>

      {/* User Avatar */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md"
          aria-label="User menu"
        >
          {displayName.charAt(0).toUpperCase()}
        </button>

        {userMenuOpen && (
          <div className="bg-card border-border absolute right-0 z-50 mt-2 w-48 rounded-lg border shadow-lg">
            <div className="py-1">
              <div className="text-muted-foreground border-border border-b px-4 py-2 text-sm">
                {user.email}
              </div>
              <button
                onClick={() => {
                  signOut();
                  setUserMenuOpen(false);
                }}
                className="text-foreground hover:bg-muted block w-full px-4 py-2 text-left text-sm"
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
      <motion.div
        className="from-background via-background/95 to-primary/5 min-h-screen bg-gradient-to-br"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: "easeOut" },
          },
        }}
      >
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
      </motion.div>

      {/* Modals */}
      <ProgressionModal
        open={progressionOpen}
        onClose={() => setProgressionOpen(false)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
