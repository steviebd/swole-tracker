"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButtons } from "~/app/_components/sign-in-buttons";
import { PreferencesStatusBar } from "~/app/_components/PreferencesStatusBar";
import { DashboardContent } from "~/app/_components/DashboardContent";

// Loading component
function LoadingScreen() {
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

// Sign-in prompt for unauthenticated users
function SignInPrompt() {
  return (
    <div className="relative mx-auto max-w-4xl text-center flex items-center justify-center min-h-[60vh] px-3 sm:px-4">
      <div className="glass-surface card p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl w-full min-w-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-extrabold tracking-tight leading-tight">
          💪 <span className="text-primary">Swole</span> Tracker
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

// Main authenticated dashboard
function AuthenticatedDashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Preferences status bar */}
      <PreferencesStatusBar />
      
      {/* Main content with template design layout */}
      <DashboardContent />
    </div>
  );
}

export default function Home() {
  return (
    <>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Unauthenticated>
        <SignInPrompt />
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedDashboard />
      </Authenticated>
    </>
  );
}
