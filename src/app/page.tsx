"use client";

import { useAuth } from "~/providers/AuthProvider";
import { SignInButtons } from "~/app/_components/sign-in-buttons";
import { PreferencesStatusBar } from "~/app/_components/PreferencesStatusBar";
import { DashboardContent } from "~/app/_components/DashboardContent";

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="relative mx-auto max-w-4xl text-center flex items-center justify-center min-h-[60vh] px-3 sm:px-4">
        <div className="glass-surface card p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl w-full min-w-0">
          <div className="space-y-4">
            <div className="h-12 skeleton rounded-lg"></div>
            <div className="h-4 skeleton"></div>
            <div className="h-4 skeleton"></div>
            <div className="h-10 skeleton"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative mx-auto max-w-4xl text-center flex items-center justify-center min-h-[60vh] px-3 sm:px-4">
        <div className="glass-surface card p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl w-full min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            💪 <span className="text-purple-400">Swole</span> Tracker
          </h1>
          <p className="text-secondary mx-auto mt-3 sm:mt-4 max-w-2xl text-sm sm:text-base md:text-lg">
            Simple, mobile-first workout tracking. Log your workouts, track
            your progress, and get stronger.
          </p>
          <div className="mt-4 sm:mt-6 md:mt-8">
            <SignInButtons />
          </div>
        </div>
      </div>
    );
  }

  // Template-inspired layout with clean design
  return (
    <div className="min-h-screen bg-background">
      {/* Preferences status bar */}
      <PreferencesStatusBar />
      
      {/* Main content with template design layout */}
      <DashboardContent />
    </div>
  );
}
