"use client";

import { api } from "~/trpc/react";
import { Card } from "~/app/_components/ui/Card";
import { TrendingUp, Clock, Flame, Calendar } from "lucide-react";
import { calculateStreak, getStreakBadge, formatAchievementBadge, type Achievement } from "~/lib/achievements";

interface StatsCard {
  id: string;
  title: string;
  value: string | number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  badge?: Achievement | null;
}

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

    // Calculate streak from workout dates
    const streakInfo = calculateStreak(workoutDates?.map(date => new Date(date)) || []);
    const streakBadge = getStreakBadge(streakInfo);

    // Weekly goal progress (target 3 workouts per week)
    const weeklyGoal = {
      current: workoutsThisWeek,
      target: 3,
    };

    return {
      workoutsThisWeek,
      avgDuration,
      weeklyGoal,
      streakInfo,
      streakBadge,
    };
  };

  const stats = calculateStats();

  // Card definitions with icons and styling
  const cards: StatsCard[] = [
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
      value: stats.streakInfo.current,
      unit: ` day${stats.streakInfo.current === 1 ? '' : 's'}`,
      icon: Flame,
      gradient: "gradient-stats-orange",
      badge: stats.streakBadge,
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="space-y-4">
              <div className="skeleton h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-8 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const IconComponent = card.icon;
        
        // Map gradient classes to specific gradient styles
        const getIconGradient = (gradient: string) => {
          switch (gradient) {
            case "gradient-stats-orange":
              return "bg-gradient-to-br from-orange-500 to-red-500";
            case "gradient-stats-red":
              return "bg-gradient-to-br from-red-500 to-pink-500";
            case "gradient-stats-amber":
              return "bg-gradient-to-br from-amber-500 to-orange-500";
            default:
              return "bg-gradient-to-br from-blue-500 to-purple-500";
          }
        };

        return (
          <div
            key={card.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* Icon with gradient background */}
            <div className={`w-10 h-10 rounded-lg ${getIconGradient(card.gradient)} flex items-center justify-center mb-4`}>
              <IconComponent className="h-5 w-5 text-white" />
            </div>

            {/* Stats content */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">
                  {card.title}
                </p>
                {card.badge && (
                  <span className={`${formatAchievementBadge(card.badge).className} text-xs px-1.5 py-0.5`}>
                    {formatAchievementBadge(card.badge).icon}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {card.value}
                {card.unit && (
                  <span className="ml-1 text-lg font-normal text-gray-500">
                    {card.unit}
                  </span>
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
