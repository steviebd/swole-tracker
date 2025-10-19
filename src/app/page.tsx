import { Suspense, lazy } from "react";
import { StatsCards } from "~/app/_components/StatsCards";
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
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:gap-10 sm:px-6 lg:gap-12 lg:px-8">
          <section className="flex flex-col gap-6 sm:gap-7 lg:gap-8">
            <Suspense
              fallback={
                <div className="bg-muted/50 h-16 animate-pulse rounded-lg"></div>
              }
            >
              <QuickActions />
            </Suspense>
            <StatsCards />
          </section>
          <section className="grid gap-6 sm:gap-7 lg:grid-cols-2">
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
          </section>
        </main>
      </div>
    </DashboardClient>
  );
}
