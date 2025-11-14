"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";

import { api } from "~/trpc/react";
import { analytics } from "~/lib/analytics";
import { cn } from "~/lib/utils";
import ClientPreferencesTrigger from "~/app/preferences-trigger";
import {
  buildWorkoutSummary,
  isWorkoutWithinHours,
  type RecentWorkout,
} from "~/lib/workout-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { WorkoutCard } from "~/components/ui/workout-card";
import { Skeleton } from "~/components/ui/skeleton";

const DEFAULT_LIMIT = {
  card: 3,
  dashboard: 5,
} as const;

const STRENGTH_CHECKLIST_STORAGE_KEY = "dashboard.strengthChecklist.v1";

export type RecentWorkoutsVariant = "card" | "dashboard";

export interface RecentWorkoutsProps {
  className?: string;
  limit?: number;
  variant?: RecentWorkoutsVariant;
}

interface BaseViewProps {
  className?: string;
  error: unknown;
  forwardedRef: React.ForwardedRef<HTMLDivElement>;
  isLoading: boolean;
  limit: number;
  onRepeat: (workout: RecentWorkout) => Promise<void> | void;
  repeatingWorkoutId: number | null;
  repeatPending: boolean;
  workouts: RecentWorkout[] | undefined;
}

interface DashboardViewProps extends BaseViewProps {
  onStartNewWorkout: () => void;
  onViewDetails: (workoutId: number | string) => void;
}

const toIsoString = (value: Date | string | null | undefined): string => {
  if (!value) {
    // Use a consistent value for SSR to avoid hydration mismatches
    return typeof window !== "undefined"
      ? new Date().toISOString()
      : new Date(0).toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    // Use a consistent value for SSR to avoid hydration mismatches
    return typeof window !== "undefined"
      ? new Date().toISOString()
      : new Date(0).toISOString();
  }

  return parsed.toISOString();
};

const resolveTemplateName = (
  workout: RecentWorkout,
  fallback: string,
): string => {
  const template = (workout as { template?: unknown }).template;
  if (
    template &&
    typeof template === "object" &&
    !Array.isArray(template) &&
    typeof (template as { name?: unknown }).name === "string"
  ) {
    const name = (template as { name: string }).name.trim();
    if (name.length > 0) {
      return name;
    }
  }

  return fallback;
};

const RecentWorkouts = React.forwardRef<HTMLDivElement, RecentWorkoutsProps>(
  ({ className, limit, variant = "card" }, ref) => {
    const router = useRouter();
    const resolvedLimit = limit ?? DEFAULT_LIMIT[variant];

    const {
      data: recentWorkouts,
      isLoading,
      error,
    } = api.workouts.getRecent.useQuery({ limit: resolvedLimit });

    const handleRepeatWorkout = React.useCallback(
      (workout: RecentWorkout) => {
        if (!workout?.templateId) {
          console.error("Cannot repeat workout without templateId", workout);
          return;
        }

        analytics.featureUsed("repeat_workout", {
          templateId: workout.templateId,
          workoutId: workout.id,
        });

        router.push(`/workout/start?templateId=${workout.templateId}`);
      },
      [router],
    );

    const handleViewDetails = React.useCallback(
      (workoutId: number | string) => {
        router.push(`/workouts/${workoutId}`);
      },
      [router],
    );

    const handleStartNewWorkout = React.useCallback(() => {
      router.push("/workout/start");
    }, [router]);

    if (variant === "dashboard") {
      return (
        <>
          <DashboardRecentWorkoutsView
            className={className}
            error={error}
            forwardedRef={ref}
            isLoading={isLoading}
            limit={resolvedLimit}
            onRepeat={handleRepeatWorkout}
            onStartNewWorkout={handleStartNewWorkout}
            onViewDetails={handleViewDetails}
            repeatPending={false}
            repeatingWorkoutId={null}
            workouts={recentWorkouts}
          />
        </>
      );
    }

    return (
      <>
        <CardRecentWorkoutsView
          className={className}
          error={error}
          forwardedRef={ref}
          isLoading={isLoading}
          limit={resolvedLimit}
          onRepeat={handleRepeatWorkout}
          repeatPending={false}
          repeatingWorkoutId={null}
          workouts={recentWorkouts}
        />
      </>
    );
  },
);

RecentWorkouts.displayName = "RecentWorkouts";

export { RecentWorkouts };

const dashboardPanelClass =
  "glass-card glass-hairline flex h-full flex-col border border-white/8 bg-card/85 shadow-xl";

const DashboardRecentWorkoutsView = ({
  className,
  error,
  forwardedRef,
  isLoading,
  limit,
  onStartNewWorkout: _onStartNewWorkout,
  onRepeat,
  onViewDetails,
  repeatPending,
  repeatingWorkoutId,
  workouts,
}: DashboardViewProps) => {
  const router = useRouter();
  const [checklistState, setChecklistState] = React.useState<
    Record<string, boolean>
  >({});

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(
        STRENGTH_CHECKLIST_STORAGE_KEY,
      );
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        setChecklistState(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const toggleChecklistStep = React.useCallback((id: string) => {
    setChecklistState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(
          STRENGTH_CHECKLIST_STORAGE_KEY,
          JSON.stringify(next),
        );
      } catch {
        // ignore write errors
      }
      return next;
    });
  }, []);
  if (error) {
    return (
      <Card ref={forwardedRef} className={cn(dashboardPanelClass, className)}>
        <CardHeader>
          <CardTitle className="font-display text-foreground text-xl font-bold sm:text-2xl">
            Recent Workouts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center">
          <div className="text-muted-foreground w-full rounded-xl border border-dashed border-white/10 p-6 text-center text-sm">
            <p>Unable to load recent workouts.</p>
            <p className="mt-2 text-xs sm:text-sm">Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card ref={forwardedRef} className={cn(dashboardPanelClass, className)}>
        <CardHeader className="pb-0">
          <CardTitle className="font-display text-foreground text-xl font-bold sm:text-2xl">
            Recent Workouts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-3 pt-4 sm:space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              announce={false}
              variant="card"
              className="h-[160px] w-full sm:h-[180px]"
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!workouts?.length) {
    const checklistSteps = [
      {
        id: "create-template",
        title: "Create a strength template",
        description:
          "Build your go-to heavy day blueprint with the lifts you rely on.",
        action: (
          <Button asChild variant="secondary" size="sm" className="text-xs">
            <Link href="/templates/new">Create template</Link>
          </Button>
        ),
      },
      {
        id: "log-session",
        title: "Log your first session",
        description:
          "Run through a heavy day and capture your top sets to unlock insights.",
        action: (
          <Button asChild size="sm" className="text-xs">
            <Link href="/workout/start">Start session</Link>
          </Button>
        ),
      },
      {
        id: "set-weekly-goal",
        title: "Set your weekly strength goal",
        description:
          "Tell us how many heavy sessions you’re targeting so we can pace progression.",
        action: <ClientPreferencesTrigger inline label="Open preferences" />,
      },
    ] as const;

    const completedCount = checklistSteps.filter(
      (step) => checklistState[step.id],
    ).length;
    const allComplete = completedCount === checklistSteps.length;

    return (
      <Card ref={forwardedRef} className={cn(dashboardPanelClass, className)}>
        <CardHeader>
          <CardTitle className="font-display text-foreground text-xl font-bold sm:text-2xl">
            Dial in your strength setup
          </CardTitle>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Complete these three steps to unlock personalised readiness insights
            and faster logging.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-muted-foreground flex items-center justify-between text-xs font-semibold tracking-wide uppercase">
            <span>
              {completedCount} of {checklistSteps.length} complete
            </span>
            {allComplete && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-200">
                🎉 Ready to lift
              </span>
            )}
          </div>

          <ul className="space-y-3">
            {checklistSteps.map((step) => {
              const completed = Boolean(checklistState[step.id]);
              const inputId = `strength-check-${step.id}`;
              return (
                <li
                  key={step.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-sm backdrop-blur"
                >
                  <div className="flex flex-col gap-3">
                    <label
                      htmlFor={inputId}
                      className="flex cursor-pointer items-start gap-3 text-left"
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={completed}
                        onChange={() => {
                          toggleChecklistStep(step.id);
                        }}
                        className="sr-only"
                      />
                      <span className="mt-1 flex items-center justify-center">
                        {completed ? (
                          <CheckCircle2
                            className="h-5 w-5 text-emerald-400"
                            aria-hidden
                          />
                        ) : (
                          <Circle
                            className="h-5 w-5 text-white/60"
                            aria-hidden
                          />
                        )}
                      </span>
                      <span>
                        <span className="text-content-primary text-sm font-semibold">
                          {step.title}
                        </span>
                        <span className="text-content-secondary mt-1 block text-xs">
                          {step.description}
                        </span>
                      </span>
                    </label>
                    <div className="text-content-secondary flex flex-wrap items-center gap-2 text-xs">
                      {step.action}
                      {completed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-200">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-3 text-sm text-white/85 shadow-sm backdrop-blur">
            <p className="font-semibold">Need inspiration?</p>
            <p className="mt-1 text-xs text-white/80">
              Pair heavy compound openers with tempo accessories and mobility
              finishers. Once you log a session, your recent workouts will
              appear here automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card ref={forwardedRef} className={cn(dashboardPanelClass, className)}>
      <CardHeader className="gap-3 pb-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-display text-foreground text-xl font-bold sm:text-2xl">
            Recent Workouts
          </CardTitle>
          {workouts.length >= limit && (
            <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/workouts"
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5",
                  "text-primary text-xs font-semibold tracking-wide uppercase",
                  "hover:border-primary/30 hover:text-primary/80 transition-colors duration-200",
                  "focus-visible:ring-primary/30 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                )}
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          )}
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Jump back into your latest sessions or repeat a template instantly.
        </p>
      </CardHeader>
      <CardContent className="flex-1 pt-4">
        <AnimatePresence mode="popLayout">
          <div className="space-y-3 sm:space-y-4">
            {workouts.map((workout, index) => {
              const summary = buildWorkoutSummary(workout);
              const displayDate = workout.workoutDate ?? workout.createdAt;
              const isoDate = toIsoString(displayDate);
              const isRecent = isWorkoutWithinHours(
                workout.createdAt ?? workout.workoutDate,
              );
              const isRepeating =
                repeatPending && repeatingWorkoutId === workout.id;

              const handleRepeat = () => {
                if (isRepeating) return;
                void onRepeat(workout);
              };

              return (
                <motion.div
                  key={workout.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.05,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  <WorkoutCard
                    workoutName={resolveTemplateName(
                      workout,
                      "Unnamed Workout",
                    )}
                    date={isoDate}
                    metrics={summary.metrics}
                    isRecent={isRecent}
                    onRepeat={handleRepeat}
                    onDebrief={() => {
                      console.log(
                        "Dashboard Debrief button clicked for workout:",
                        workout.id,
                      );
                      router.push(`/workouts/${workout.id}`);
                    }}
                    onViewDetails={() => onViewDetails(workout.id)}
                  />
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

const CardRecentWorkoutsView = ({
  className,
  error,
  forwardedRef,
  isLoading,
  onRepeat,
  repeatPending,
  repeatingWorkoutId,
  workouts,
}: BaseViewProps) => {
  console.log(
    "CardRecentWorkoutsView: Using custom card implementation without Debrief button",
  );
  if (isLoading) {
    return (
      <div ref={forwardedRef} className={cn(className)}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="font-serif text-2xl font-black">
              Recent Workouts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="bg-muted/30 rounded-xl p-4">
                <div className="space-y-2">
                  <div className="skeleton skeleton-text h-6 w-32" />
                  <div className="skeleton skeleton-text h-4 w-48" />
                  <div className="skeleton skeleton-text h-4 w-56" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !workouts?.length) {
    return (
      <div ref={forwardedRef} className={cn(className)}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-2xl font-black">
                Recent Workouts
              </CardTitle>
              <Link href="/workouts">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No recent workouts found.</p>
            <Link href="/templates">
              <Button className="mt-4" variant="outline">
                Start Your First Workout
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={forwardedRef} className={cn(className)}>
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-2xl font-black">
              Recent Workouts
            </CardTitle>
            <Link href="/workouts">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {workouts.map((workout) => {
            const summary = buildWorkoutSummary(workout);
            const workoutDate = workout.workoutDate ?? workout.createdAt;
            const isoDate = toIsoString(workoutDate);
            const isRecent = isWorkoutWithinHours(
              workout.createdAt ?? workout.workoutDate,
            );
            const isRepeating =
              repeatPending && repeatingWorkoutId === workout.id;

            const handleRepeat = () => {
              if (isRepeating) return;
              void onRepeat(workout);
            };

            const handleViewDetails = () => {
              // Navigate to workout details page
              window.location.href = `/workouts/${workout.id}`;
            };

            const handleDebrief = () => {
              console.log(
                "Card Debrief button clicked for workout:",
                workout.id,
              );
              // Navigate to debrief page
              window.location.href = `/workouts/${workout.id}`;
            };

            return (
              <WorkoutCard
                key={workout.id}
                workoutName={resolveTemplateName(workout, "Unnamed Workout")}
                date={isoDate}
                metrics={summary.metrics}
                isRecent={isRecent}
                onRepeat={handleRepeat}
                onDebrief={handleDebrief}
                onViewDetails={handleViewDetails}
              />
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
