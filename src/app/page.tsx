"use client";

import { Suspense, lazy, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "~/providers/AuthProvider";

// Dynamic imports for heavy components
import { StatsCards } from "~/app/_components/StatsCards";
import { ReadinessHighlight } from "~/app/_components/readiness-highlight";
const QuickActions = lazy(() =>
  import("~/components/quick-actions").then((module) => ({
    default: module.QuickActions,
  })),
);
const WeeklyProgress = lazy(() =>
  import("~/components/weekly-progress").then((module) => ({
    default: module.WeeklyProgress,
  })),
);
const RecentWorkouts = lazy(() =>
  import("~/components/recent-workouts").then((module) => ({
    default: module.RecentWorkouts,
  })),
);

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/sign-in");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="relative mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4 text-center sm:px-6">
        <div className="glass-hero py-grid-6 w-full min-w-0 rounded-2xl px-6 shadow-2xl sm:px-8 md:px-12 lg:px-16">
          <div className="space-y-8">
            <div className="skeleton skeleton-title mx-auto w-3/4"></div>
            <div className="space-y-3">
              <div className="skeleton skeleton-text w-full"></div>
              <div className="skeleton skeleton-text mx-auto w-5/6"></div>
              <div className="skeleton skeleton-text mx-auto w-4/6"></div>
            </div>
            <div className="skeleton skeleton-button mx-auto w-48"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Template-inspired dashboard layout with progressive loading
  return (
    <div className="bg-app-gradient min-h-screen">
      <main className="container mx-auto space-y-10 px-6 py-8 sm:px-8">
        <Suspense
          fallback={
            <div className="bg-muted/50 h-16 animate-pulse rounded-lg"></div>
          }
        >
          <QuickActions />
        </Suspense>
        <ReadinessHighlight />
        <StatsCards />
        <div className="grid gap-8 lg:grid-cols-2">
          <Suspense
            fallback={
              <div className="bg-muted/50 h-64 animate-pulse rounded-lg"></div>
            }
          >
            <WeeklyProgress />
          </Suspense>
          <Suspense
            fallback={
              <div className="bg-muted/50 h-64 animate-pulse rounded-lg"></div>
            }
          >
            <RecentWorkouts />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
