"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Calendar, Clock, Loader2, Plus } from "lucide-react";

import { api } from "~/trpc/react";
import { analytics } from "~/lib/analytics";
import { cn } from "~/lib/utils";
import {
  buildWorkoutSummary,
  formatDurationLabel,
  formatRelativeWorkoutDate,
  isWorkoutWithinHours,
  type RecentWorkout,
} from "~/lib/workout-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { WorkoutCard } from "~/components/ui/workout-card";

const DEFAULT_LIMIT = {
  card: 3,
  dashboard: 5,
} as const;

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
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
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
    const utils = api.useUtils();
    const resolvedLimit = limit ?? DEFAULT_LIMIT[variant];

    const {
      data: recentWorkouts,
      isLoading,
      error,
    } = api.workouts.getRecent.useQuery({ limit: resolvedLimit });

    const repeatWorkoutMutation = api.workouts.start.useMutation();
    const [activeRepeatId, setActiveRepeatId] = React.useState<number | null>(
      null,
    );

    const handleRepeatWorkout = React.useCallback(
      async (workout: RecentWorkout) => {
        if (!workout?.templateId) {
          console.error("Cannot repeat workout without templateId", workout);
          return;
        }

        if (repeatWorkoutMutation.isPending) {
          return;
        }

        setActiveRepeatId(workout.id);

        try {
          const result = await repeatWorkoutMutation.mutateAsync({
            templateId: workout.templateId,
            workoutDate: new Date(),
          });

          analytics.workoutStarted(
            workout.templateId.toString(),
            resolveTemplateName(workout, "Repeated Workout"),
          );

          analytics.featureUsed("repeat_workout", {
            templateId: workout.templateId,
            workoutId: workout.id,
          });

          void utils.workouts.getRecent.invalidate();
          router.push(`/workout/session/${result.sessionId}`);
        } catch (err) {
          console.error("Failed to repeat workout", err);
          alert("Couldn't start that workout. Please try again.");
        } finally {
          setActiveRepeatId(null);
        }
      },
      [repeatWorkoutMutation, router, utils],
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
        <DashboardRecentWorkoutsView
          className={className}
          error={error}
          forwardedRef={ref}
          isLoading={isLoading}
          limit={resolvedLimit}
          onRepeat={handleRepeatWorkout}
          onStartNewWorkout={handleStartNewWorkout}
          onViewDetails={handleViewDetails}
          repeatPending={repeatWorkoutMutation.isPending}
          repeatingWorkoutId={activeRepeatId}
          workouts={recentWorkouts}
        />
      );
    }

    return (
      <CardRecentWorkoutsView
        className={className}
        error={error}
        forwardedRef={ref}
        isLoading={isLoading}
        limit={resolvedLimit}
        onRepeat={handleRepeatWorkout}
        repeatPending={repeatWorkoutMutation.isPending}
        repeatingWorkoutId={activeRepeatId}
        workouts={recentWorkouts}
      />
    );
  },
);

RecentWorkouts.displayName = "RecentWorkouts";

export { RecentWorkouts };

const DashboardRecentWorkoutsView = ({
  className,
  error,
  forwardedRef,
  isLoading,
  limit,
  onStartNewWorkout,
  onRepeat,
  onViewDetails,
  repeatPending,
  repeatingWorkoutId,
  workouts,
}: DashboardViewProps) => {
  if (error) {
    return (
      <div ref={forwardedRef} className={cn("space-y-4", className)}>
        <h2 className="text-foreground mb-4 text-xl font-semibold">
          Recent Workouts
        </h2>
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center">
          <p>Unable to load recent workouts</p>
          <p className="mt-2 text-sm">Please try again later.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        ref={forwardedRef}
        className={cn("space-y-4 sm:space-y-6", className)}
      >
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-foreground mb-4 text-xl font-bold sm:mb-6 sm:text-2xl"
        >
          Recent Workouts
        </motion.h2>
        <div className="space-y-3 sm:space-y-4">
          {[...Array(3)].map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="animate-pulse"
            >
              <div className="glass-surface bg-muted h-[180px] rounded-xl sm:h-[200px]" />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (!workouts?.length) {
    return (
      <div
        ref={forwardedRef}
        className={cn("space-y-4 sm:space-y-6", className)}
      >
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-foreground mb-4 text-xl font-bold sm:mb-6 sm:text-2xl"
        >
          Recent Workouts
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="glass-surface relative overflow-hidden rounded-xl p-8 text-center sm:p-12"
        >
          <div
            className="absolute inset-0 opacity-5"
            style={{ background: "var(--gradient-universal-action-primary)" }}
            aria-hidden="true"
          />
          <div className="relative z-10">
            <motion.div
              className="mb-6 text-5xl sm:text-6xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.2,
              }}
            >
              💪
            </motion.div>
            <h3 className="font-display text-foreground mb-2 text-lg font-bold sm:text-xl">
              No workouts yet
            </h3>
            <p className="text-muted-foreground mx-auto mb-6 max-w-sm text-sm">
              Start your first workout to see it appear here and begin tracking
              your fitness journey.
            </p>
            <motion.button
              onClick={onStartNewWorkout}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-6 py-3 text-white",
                "font-medium transition-all duration-200 hover:scale-105 active:scale-95",
                "focus:ring-primary focus:ring-2 focus:ring-offset-2 focus:outline-none",
                "shadow-lg hover:shadow-xl",
              )}
              style={{ background: "var(--gradient-universal-action-primary)" }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="h-5 w-5" />
              Start Your First Workout
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={forwardedRef} className={cn("space-y-4 sm:space-y-6", className)}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h2 className="font-display text-foreground text-xl font-bold sm:text-2xl">
          Recent Workouts
        </h2>
        {workouts.length >= limit && (
          <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/workouts"
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2",
                "text-primary text-sm font-medium transition-all duration-200",
                "hover:bg-primary/5 hover:text-primary/80",
                "focus:ring-primary/20 focus:ring-2 focus:outline-none",
              )}
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        )}
      </motion.div>

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
                  workoutName={resolveTemplateName(workout, "Unnamed Workout")}
                  date={isoDate}
                  metrics={summary.metrics}
                  isRecent={isRecent}
                  onRepeat={handleRepeat}
                  onViewDetails={() => onViewDetails(workout.id)}
                />
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    </div>
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
            const relativeDate = formatRelativeWorkoutDate(workoutDate);
            const durationLabel = formatDurationLabel(
              summary.durationMinutes,
              summary.estimatedDurationMinutes,
            );
            const statsParts = [
              `${summary.exerciseCount} exercise${
                summary.exerciseCount === 1 ? "" : "s"
              }`,
              `${summary.totalSets} set${summary.totalSets === 1 ? "" : "s"}`,
            ];
            const volumeMetric = summary.metrics.find(
              (metric) => metric.label === "Volume",
            );
            if (volumeMetric) {
              statsParts.push(volumeMetric.value);
            }

            const isRepeating =
              repeatPending && repeatingWorkoutId === workout.id;

            const handleRepeat = () => {
              if (isRepeating) return;
              void onRepeat(workout);
            };

            return (
              <div
                key={workout.id}
                className="bg-muted/30 hover:bg-muted/50 flex items-center justify-between rounded-xl p-4 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h4 className="text-foreground font-semibold">
                      {resolveTemplateName(workout, "Workout")}
                    </h4>
                    <Badge
                      variant="secondary"
                      className="from-chart-1 to-chart-3 text-primary-foreground bg-gradient-to-r"
                    >
                      completed
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {relativeDate}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {durationLabel}
                    </div>
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {statsParts.join(" • ")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/workout/session/${workout.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRepeat}
                    disabled={isRepeating}
                  >
                    {isRepeating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Repeating
                      </>
                    ) : (
                      "Repeat"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
