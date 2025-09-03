"use client";

import { useSharedWorkoutData } from "~/hooks/use-shared-workout-data";
import { Card } from "~/components/ui/card";
import { TrendingUp, Clock, Flame, Calendar } from "lucide-react";
import { calculateStreak, getStreakBadge, formatAchievementBadge, type Achievement } from "~/lib/achievements";
import { motion } from "framer-motion";
import { cn } from "~/lib/utils";

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
  // Use shared workout data to avoid duplicate API calls
  const {
    thisWeekWorkouts: workoutDates,
    thisWeekVolume: volumeData,
    monthWorkouts,
    isLoading,
  } = useSharedWorkoutData();

  // Calculate stats from real data
  const calculateStats = () => {
    const workoutsThisWeek = workoutDates.length || 0;

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
    const streakInfo = calculateStreak(monthWorkouts.map(date => new Date(date)) || []);
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
    const skeletonCards = [
      { title: "Loading your progress...", gradient: "gradient-stats-orange", pulse: "animate-pulse" },
      { title: "Getting workout data...", gradient: "gradient-stats-red", pulse: "animate-pulse [animation-delay:0.2s]" },
      { title: "Calculating streaks...", gradient: "gradient-stats-orange", pulse: "animate-pulse [animation-delay:0.4s]" },
      { title: "Preparing your stats...", gradient: "gradient-stats-amber", pulse: "animate-pulse [animation-delay:0.6s]" }
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {skeletonCards.map((skeleton, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
          >
            <Card 
              surface="card" 
              variant="default" 
              padding="lg" 
              className={cn(
                "glass-surface relative overflow-hidden border-0",
                "bg-card/70",
                "backdrop-blur-xl backdrop-saturate-150",
                skeleton.pulse
              )}
            >
              {/* Energetic gradient overlay for loading personality */}
              <div className={cn(
                "absolute inset-0 opacity-5",
                skeleton.gradient
              )} />
              
              <div className="space-y-4 relative">
                {/* Animated icon placeholder with shimmer */}
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center",
                  "bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-red-500/20",
                  "animate-shimmer bg-[length:400%_400%]"
                )}>
                  <div className="h-6 w-6 bg-gradient-to-br from-orange-500 to-amber-500 rounded opacity-40" />
                </div>
                
                <div className="space-y-2">
                  {/* Motivational loading text */}
                  <div className="text-xs text-muted-foreground font-medium animate-fade-in">
                    {skeleton.title}
                  </div>
                  {/* Animated number placeholder */}
                  <div className="h-8 w-16 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 rounded animate-shimmer bg-[length:400%_400%]" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((card) => {
        const IconComponent = card.icon;
        

        // Enhanced icon gradients using OKLCH color space for better visual consistency
        const getIconGradient = (gradient: string) => {
          switch (gradient) {
            case "gradient-stats-orange":
              return "bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 shadow-orange-500/20";
            case "gradient-stats-red":
              return "bg-gradient-to-br from-red-500 via-pink-500 to-rose-500 shadow-red-500/20";
            case "gradient-stats-amber":
              return "bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 shadow-amber-500/20";
            default:
              return "bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 shadow-blue-500/20";
          }
        };

        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: cards.indexOf(card) * 0.05 }}
            whileHover={{ 
              y: -2,
              transition: { duration: 0.2, ease: "easeOut" }
            }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              surface="card"
              variant="default"
              padding="lg"
              interactive={true}
              className={cn(
                "glass-surface relative overflow-hidden border-0",
                "bg-card/80 hover:bg-card/90",
                "backdrop-blur-xl backdrop-saturate-150",
                "shadow-lg hover:shadow-xl",
                "transition-all duration-200 ease-out",
                "hover:scale-[1.02] hover:shadow-2xl",
                "group cursor-pointer"
              )}
              aria-label={`${card.title}: ${card.value}${card.unit}`}
              role="button"
              tabIndex={0}
            >
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-foreground/2 to-foreground/5 pointer-events-none" />
              
              {/* Icon with enhanced gradient background and proper spacing */}
              <div className={cn(
                "relative w-12 h-12 rounded-xl flex items-center justify-center mb-6 mt-2 shadow-md",
                "transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3",
                getIconGradient(card.gradient)
              )}>
                <IconComponent className="h-6 w-6 text-white drop-shadow-sm" />
              </div>

              {/* Stats content with enhanced typography */}
              <div className="relative space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground/80 group-hover:text-muted-foreground transition-colors">
                    {card.title}
                  </p>
                  {card.badge && (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className={cn(
                        formatAchievementBadge(card.badge).className,
                        "text-xs px-2 py-1 rounded-full shadow-sm backdrop-blur-sm"
                      )}
                    >
                      {formatAchievementBadge(card.badge).icon}
                    </motion.span>
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground font-display leading-none group-hover:text-primary transition-colors">
                  {card.value}
                  {card.unit && (
                    <span className="ml-1 text-lg font-normal text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                      {card.unit}
                    </span>
                  )}
                </p>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
