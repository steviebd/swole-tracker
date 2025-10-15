import { Suspense, lazy } from "react";
import { StatsCards } from "~/app/_components/StatsCards";
import { ReadinessHighlight } from "~/app/_components/readiness-highlight";
import { DashboardClient } from "./_components/DashboardClient";

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
  // Template-inspired dashboard layout with progressive loading
  return (
    <DashboardClient>
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
    </DashboardClient>
  );
}
