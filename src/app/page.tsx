"use client";

import { useAuth } from "~/providers/AuthProvider";
import { SignInButtons } from "~/app/_components/sign-in-buttons";
import { PreferencesStatusBar } from "~/app/_components/PreferencesStatusBar";
import { HomePageHeader } from "~/app/_components/HomePageHeader";
import { DashboardContent } from "~/app/_components/DashboardContent";

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="relative mx-auto max-w-4xl text-center flex items-center justify-center min-h-[60vh] px-3 sm:px-4">
        <div className="glass-surface card p-4 sm:p-6 md:p-8 lg:p-10 rounded-xl w-full">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded-lg mb-4 dark:bg-gray-700"></div>
            <div className="h-4 bg-gray-200 rounded mb-2 dark:bg-gray-700"></div>
            <div className="h-4 bg-gray-200 rounded mb-4 dark:bg-gray-700"></div>
            <div className="h-10 bg-gray-200 rounded dark:bg-gray-700"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative mx-auto max-w-4xl text-center flex items-center justify-center min-h-[60vh] px-3 sm:px-4">
        <div className="glass-surface card p-4 sm:p-6 md:p-8 lg:p-10 rounded-xl w-full">
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

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40">
        <PreferencesStatusBar />
        <HomePageHeader />
      </div>
      <div className="pt-24 sm:pt-28 md:pt-32">
        <DashboardContent />
      </div>
    </>
  );
}
