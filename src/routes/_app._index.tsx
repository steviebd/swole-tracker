import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import { StatsCards } from "~/components/stats-cards";

const QuickActions = lazy(() =>
  import("~/components/quick-actions").then((m) => ({
    default: m.QuickActions,
  })),
);
const WeeklyProgress = lazy(() =>
  import("~/components/weekly-progress").then((m) => ({
    default: m.WeeklyProgress,
  })),
);
const RecentWorkouts = lazy(() =>
  import("~/components/recent-workouts").then((m) => ({
    default: m.RecentWorkouts,
  })),
);

export const Route = createFileRoute("/_app/_index")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="bg-app-gradient min-h-screen">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-10 pb-16">
        <section className="flex flex-col gap-6">
          <Suspense
            fallback={
              <div className="bg-muted/50 h-16 animate-pulse rounded-lg" />
            }
          >
            <QuickActions />
          </Suspense>
          <StatsCards />
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          <Suspense
            fallback={
              <div className="bg-muted/50 h-64 animate-pulse rounded-lg" />
            }
          >
            <WeeklyProgress />
          </Suspense>
          <Suspense
            fallback={
              <div className="bg-muted/50 h-64 animate-pulse rounded-lg" />
            }
          >
            <RecentWorkouts />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
