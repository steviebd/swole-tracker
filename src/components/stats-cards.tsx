import { TrendingUp, Target, Flame, Calendar } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useDashboardData, useStreak } from "~/lib/queries/progress";

const WEEKLY_GOAL_TARGET = 3;

function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M kg`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K kg`;
  }
  return `${Math.round(volume)} kg`;
}

function formatDuration(volume: number): string {
  if (volume === 0) {
    return "0 min";
  }
  const estimatedMinutes = Math.max(Math.round(volume / 500), 1);
  return `${estimatedMinutes} min`;
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card
          key={index}
          className="relative overflow-hidden border-0 shadow-lg"
        >
          <CardContent className="relative space-y-4 p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function StatsCards() {
  const { data: dashboardData, isLoading: isDashboardLoading } =
    useDashboardData("week");
  const { data: streak, isLoading: isStreakLoading } = useStreak();

  if (isDashboardLoading || isStreakLoading) {
    return <LoadingSkeleton />;
  }

  const workoutCount = dashboardData?.workoutCount ?? 0;
  const totalVolume = dashboardData?.totalVolume ?? 0;
  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;

  const goalProgress = Math.min((workoutCount / WEEKLY_GOAL_TARGET) * 100, 100);
  const goalStatus =
    goalProgress >= 100
      ? workoutCount > WEEKLY_GOAL_TARGET
        ? "Exceeded goal!"
        : "Goal achieved!"
      : goalProgress >= 67
        ? "Great progress!"
        : goalProgress >= 33
          ? "Good start"
          : "Keep going";

  const stats = [
    {
      title: "This Week",
      value: `${workoutCount} Workout${workoutCount === 1 ? "" : "s"}`,
      change: `${formatVolume(totalVolume)} total`,
      icon: TrendingUp,
      gradient: "from-chart-1 to-chart-3",
    },
    {
      title: "Avg Duration",
      value: formatDuration(totalVolume),
      change: "Estimated from volume",
      icon: Target,
      gradient: "from-chart-2 to-chart-1",
    },
    {
      title: "Current Streak",
      value: `${currentStreak} day${currentStreak === 1 ? "" : "s"}`,
      change:
        currentStreak >= longestStreak && currentStreak > 0
          ? "Personal best!"
          : `Best: ${longestStreak} days`,
      icon: Flame,
      gradient: "from-chart-3 to-chart-4",
    },
    {
      title: "Weekly Goal",
      value: `${workoutCount}/${WEEKLY_GOAL_TARGET}`,
      change: goalStatus,
      icon: Calendar,
      gradient: "from-chart-4 to-chart-2",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className="relative overflow-hidden border-0 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`}
            />
            <CardContent className="relative p-6">
              <div className="mb-4 flex items-center justify-between">
                <div
                  className={`rounded-xl bg-gradient-to-br p-3 ${stat.gradient}`}
                >
                  <Icon className="text-primary-foreground h-6 w-6" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">
                  {stat.title}
                </p>
                <p className="text-foreground font-serif text-3xl font-black">
                  {stat.value}
                </p>
                <p className="text-muted-foreground text-sm">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
