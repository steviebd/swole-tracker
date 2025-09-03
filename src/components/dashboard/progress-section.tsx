"use client";

import * as React from "react";
import { TrendingUp, Target, CheckCircle2 } from "lucide-react";
import { ProgressCard } from "~/components/ui/progress-card";
import { GoalProgress } from "~/components/charts/goal-progress";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

/**
 * Progress tracking section with goals and achievements
 *
 * Features:
 * - Weekly/Monthly toggle functionality
 * - Goal setting and tracking (workout count, volume, consistency)
 * - Progress bars with gradient fills and over-achievement indicators
 * - Achievement celebrations (Exceeded, Perfect, Great consistency states)
 * - Chart integration using progress-chart components from Phase 2
 */

export interface ProgressSectionProps {
  /** Additional CSS classes */
  className?: string;
}

type TimeRange = "week" | "month";

interface Goal {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  current: number;
  target: number;
  unit: string;
  description: string;
  type: "workouts" | "consistency" | "volume";
}

const ProgressSection = React.forwardRef<HTMLDivElement, ProgressSectionProps>(
  ({ className }, ref) => {
    const [timeRange, setTimeRange] = React.useState<TimeRange>("week");

    // Fetch data based on selected time range
    const { isLoading: consistencyLoading } =
      api.progress.getConsistencyStats.useQuery({
        timeRange,
      });

    const { data: volumeData, isLoading: volumeLoading } =
      api.progress.getVolumeProgression.useQuery({
        timeRange,
      });

    const { data: workoutDates, isLoading: workoutDatesLoading } =
      api.progress.getWorkoutDates.useQuery({
        timeRange,
      });

    const isLoading =
      consistencyLoading || volumeLoading || workoutDatesLoading;

    // Calculate goals based on time range
    const goals = React.useMemo((): Goal[] => {
      const workoutCount = workoutDates?.length || 0;
      const totalVolume =
        volumeData?.reduce(
          (sum, session) => sum + (session.totalVolume || 0),
          0,
        ) || 0;

      // Calculate consistency as percentage of days with workouts
      const workoutDays = new Set(
        workoutDates?.map((date) => new Date(date).toDateString()),
      ).size;

      if (timeRange === "week") {
        return [
          {
            id: "workouts-weekly",
            label: "Weekly Workouts",
            icon: TrendingUp,
            current: workoutCount,
            target: 3,
            unit: "workouts",
            description: "Stay consistent with 3+ workouts per week",
            type: "workouts",
          },
          {
            id: "consistency-weekly",
            label: "Workout Days",
            icon: CheckCircle2,
            current: workoutDays,
            target: 3,
            unit: "days",
            description: "Workout on at least 3 different days",
            type: "consistency",
          },
          {
            id: "volume-weekly",
            label: "Weekly Volume",
            icon: Target,
            current: Math.round(totalVolume),
            target: 10000,
            unit: "lbs",
            description: "Build strength with consistent volume",
            type: "volume",
          },
        ];
      } else {
        return [
          {
            id: "workouts-monthly",
            label: "Monthly Workouts",
            icon: TrendingUp,
            current: workoutCount,
            target: 12,
            unit: "workouts",
            description: "Aim for 12+ workouts this month",
            type: "workouts",
          },
          {
            id: "consistency-monthly",
            label: "Active Days",
            icon: CheckCircle2,
            current: workoutDays,
            target: 12,
            unit: "days",
            description: "Stay active 12+ days this month",
            type: "consistency",
          },
          {
            id: "volume-monthly",
            label: "Monthly Volume",
            icon: Target,
            current: Math.round(totalVolume),
            target: 40000,
            unit: "lbs",
            description: "Progressive overload target",
            type: "volume",
          },
        ];
      }
    }, [timeRange, workoutDates, volumeData]);

    const getAchievementStatus = (current: number, target: number) => {
      const percentage = (current / target) * 100;

      if (percentage >= 120) {
        return {
          status: "exceeded",
          message: "🏆 Exceeded!",
          color: "from-yellow-500 to-amber-500",
        };
      } else if (percentage >= 100) {
        return {
          status: "perfect",
          message: "🎯 Perfect!",
          color: "from-green-500 to-emerald-500",
        };
      } else if (percentage >= 75) {
        return {
          status: "great",
          message: "💪 Great!",
          color: "from-blue-500 to-cyan-500",
        };
      } else if (percentage >= 50) {
        return {
          status: "good",
          message: "👍 Good",
          color: "from-orange-500 to-red-500",
        };
      } else {
        return {
          status: "needs-work",
          message: "Keep going!",
          color: "from-gray-400 to-gray-500",
        };
      }
    };

    if (isLoading) {
      return (
        <div ref={ref} className={cn("space-y-6", className)}>
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-xl font-semibold">
              Progress Tracking
            </h2>
            <div className="animate-pulse">
              <div className="bg-muted h-10 w-32 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-[140px] rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("space-y-6", className)}>
        {/* Header with time range toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-xl font-semibold">
            Progress Tracking
          </h2>

          <div className="bg-muted flex items-center rounded-lg p-1">
            <button
              onClick={() => setTimeRange("week")}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-all",
                timeRange === "week"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange("month")}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-all",
                timeRange === "month"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Month
            </button>
          </div>
        </div>

        {/* Goals grid using ProgressCard components */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {goals.map((goal) => {
            return (
              <ProgressCard
                key={goal.id}
                title={goal.label}
                value={goal.current}
                goal={goal.target}
                unit={goal.unit}
              />
            );
          })}
        </div>

        {/* Chart section - using GoalProgress component */}
        <div className="mt-6">
          <div className="bg-card border-border rounded-lg border p-6">
            <h3 className="text-foreground mb-4 text-lg font-medium">
              {timeRange === "week"
                ? "This Week's Progress"
                : "This Month's Progress"}
            </h3>

            <div className="space-y-4">
              {goals.map((goal) => {
                const achievement = getAchievementStatus(
                  goal.current,
                  goal.target,
                );
                const theme =
                  achievement.status === "perfect" ||
                  achievement.status === "exceeded"
                    ? "success"
                    : achievement.status === "great"
                      ? "primary"
                      : "warning";

                return (
                  <GoalProgress
                    key={goal.id}
                    title={goal.label}
                    current={goal.current}
                    target={goal.target}
                    unit={goal.unit}
                    theme={theme}
                    variant="linear"
                  />
                );
              })}
            </div>

            {/* Summary stats */}
            <div className="text-muted-foreground mt-4 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500" />
                <span>On Track</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500" />
                <span>Exceeded</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-gray-400 to-gray-500" />
                <span>Needs Work</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ProgressSection.displayName = "ProgressSection";

export { ProgressSection };
