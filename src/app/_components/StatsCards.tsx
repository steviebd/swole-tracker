"use client";

import { api } from "~/trpc/react";
import { Card } from "~/app/_components/ui/Card";
import { TrendingUp, Clock, Flame, Calendar } from "lucide-react";

export function StatsCards() {
  // Get real data from ProgressDashboard API
  const { isLoading: consistencyLoading } =
    api.progress.getConsistencyStats.useQuery({
      timeRange: "week",
    });

  const { data: volumeData, isLoading: volumeLoading } =
    api.progress.getVolumeProgression.useQuery({
      timeRange: "week",
    });

  const { data: workoutDates, isLoading: workoutDatesLoading } =
    api.progress.getWorkoutDates.useQuery({
      timeRange: "week",
    });

  const isLoading = consistencyLoading || volumeLoading || workoutDatesLoading;

  // Calculate stats from real data
  const calculateStats = () => {
    const workoutsThisWeek = workoutDates?.length || 0;

    // Calculate average duration from volume data (estimate based on exercises and sets)
    let avgDuration = "0 min";
    if (volumeData && volumeData.length > 0) {
      const avgSets =
        volumeData.reduce((sum, session) => sum + session.totalSets, 0) /
        volumeData.length;
      // Estimate 3-4 minutes per set including rest
      const estimatedMinutes = Math.round(avgSets * 3.5);
      avgDuration = `${estimatedMinutes} min`;
    }

    // Weekly goal progress (target 3 workouts per week)
    const weeklyGoal = {
      current: workoutsThisWeek,
      target: 3,
    };

    return {
      workoutsThisWeek,
      avgDuration,
      weeklyGoal,
    };
  };

  const stats = calculateStats();

  // Card definitions with icons and styling
  const cards = [
    {
      id: "workouts",
      title: "This Week",
      value: stats.workoutsThisWeek,
      unit: "Workouts",
      icon: TrendingUp,
      gradient: "gradient-stats-orange",
    },
    {
      id: "duration",
      title: "Avg Duration",
      value: stats.avgDuration,
      unit: "",
      icon: Clock,
      gradient: "gradient-stats-red",
    },
    {
      id: "streak",
      title: "Current Streak",
      value: "Coming Soon",
      unit: "",
      icon: Flame,
      gradient: "gradient-stats-orange",
    },
    {
      id: "goal",
      title: "Weekly Goal",
      value: stats.weeklyGoal.current,
      unit: `/${stats.weeklyGoal.target}`,
      icon: Calendar,
      gradient: "gradient-stats-amber",
    },
  ];

  if (isLoading) {
    return (
      <div className="gap-gap-md grid grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} surface="card" padding="md">
            <div className="space-y-gap-md">
              <div className="flex items-center justify-between">
                <div className="skeleton h-8 w-8 rounded-lg" />
              </div>
              <div className="space-y-gap-xs">
                <div className="skeleton h-4 w-16" />
                <div className="skeleton h-6 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="gap-gap-md grid grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <Card
            key={card.id}
            surface="card"
            padding="md"
            interactive
            className="group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            {/* Gradient background overlay */}
            <div className={`absolute inset-0 ${card.gradient} opacity-90`} />

            {/* Card content */}
            <div className="space-y-gap-md relative z-10">
              {/* Icon and title row */}
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm">
                  <IconComponent className="h-4 w-4" />
                </div>
              </div>

              {/* Stats content */}
              <div className="space-y-gap-xs">
                <p className="text-sm font-medium text-white/90">
                  {card.title}
                </p>
                <p className="font-serif text-2xl font-bold text-white">
                  {card.value}
                  {card.unit && (
                    <span className="ml-1 font-sans text-lg font-normal text-white/80">
                      {card.unit}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
