"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { Card, CardHeader, CardContent, CardFooter } from "~/app/_components/ui/Card";
import { getBestGoalAchievement, formatAchievementBadge } from "~/lib/achievements";
// Removed unused VisualStyle import - now using gradients instead

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

/**
 * Get gradient class based on progress percentage
 */
function getProgressGradient(percentage: number): string {
  if (percentage >= 100) return 'gradient-stats-orange';
  if (percentage >= 75) return 'gradient-stats-orange';
  if (percentage >= 50) return 'gradient-stats-amber';
  return 'gradient-stats-red';
}

/**
 * Get achievement badge for goals that are met or exceeded
 * Now uses the centralized achievement system
 */
function getAchievementBadge(percentage: number): React.JSX.Element | null {
  const achievement = getBestGoalAchievement(percentage);
  if (!achievement) return null;
  
  const badge = formatAchievementBadge(achievement);
  const pulseClass = achievement.id === 'perfect-week' ? 'animate-badge-pulse' : '';
  
  return (
    <span className={`${badge.className} ${pulseClass} animate-badge-shine`}>
      {badge.text} {badge.icon}
    </span>
  );
}

/**
 * Get motivational message based on progress percentage
 */
function getMotivationalMessage(percentage: number, current: number, target: number, type: 'workout' | 'volume' | 'consistency'): string {
  if (percentage >= 100) {
    return type === 'workout' ? 'Goal achieved! 🎉' : 
           type === 'volume' ? 'Volume target smashed! 💪' : 
           'Outstanding consistency!';
  }
  
  if (percentage >= 75) {
    return type === 'workout' ? 'Almost there, keep going!' : 
           type === 'volume' ? 'Great volume progress!' : 
           'Excellent consistency!';
  }
  
  if (percentage >= 50) {
    return type === 'workout' ? 'Halfway there, you\'ve got this!' : 
           type === 'volume' ? 'Good volume momentum!' : 
           'Good consistency, keep it up!';
  }
  
  const remaining = target - current;
  return type === 'workout' ? `${remaining} more workout${remaining === 1 ? '' : 's'} to reach your goal` : 
         type === 'volume' ? `${(remaining / 1000).toFixed(1)}k kg remaining` : 
         'Let\'s improve consistency together';
}

interface ProgressMetricProps {
  title: string;
  current: string | number;
  target: string | number;
  percentage: number;
  type: 'workout' | 'volume' | 'consistency';
  href: string;
  isPrimary?: boolean;
}

function ProgressMetric({ title, current, target, percentage, type, href, isPrimary = false }: ProgressMetricProps) {
  const gradientClass = getProgressGradient(percentage);
  const achievementBadge = getAchievementBadge(percentage);
  const motivationalMessage = getMotivationalMessage(percentage, typeof current === 'string' ? parseFloat(current.replace(/[^\d.]/g, '')) : current, typeof target === 'string' ? parseFloat(target.replace(/[^\d.]/g, '')) : target, type);
  
  return (
    <Link href={href} className="block">
      <Card 
        surface={isPrimary ? "elevated" : "card"} 
        variant="interactive"
        padding="lg"
        className="h-full animate-smooth-scale"
      >
        <CardHeader className="pb-component-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-text-primary font-medium text-base">{title}</h3>
              {achievementBadge}
            </div>
            <span className="text-text-primary font-bold text-lg">
              {current}/{target}
            </span>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-component-sm">
            <div className="w-full h-3 rounded-token-card overflow-hidden bg-bg-surface">
              <div 
                className={cx(
                  "h-full rounded-token-card animate-progress-fill",
                  gradientClass
                )}
                style={{ width: `${Math.min(100, percentage)}%` }}
                aria-label={`Progress: ${percentage.toFixed(1)}% towards ${title.toLowerCase()} goal`}
              />
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              {motivationalMessage}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function WeeklyProgressSection() {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month">("week");
  
  // Get real data from ProgressDashboard API
  const { data: consistencyData, isLoading: consistencyLoading } = api.progress.getConsistencyStats.useQuery({
    timeRange: selectedPeriod,
  });
  
  const { data: volumeData, isLoading: volumeLoading } = api.progress.getVolumeProgression.useQuery({
    timeRange: selectedPeriod,
  });

  const isLoading = consistencyLoading || volumeLoading;

  // Calculate progress data from real API data
  const calculateProgress = () => {
    const targetWorkouts = selectedPeriod === "week" ? 3 : 12;
    const totalWorkouts = consistencyData?.totalWorkouts || 0;
    const workoutGoal = {
      current: totalWorkouts,
      target: targetWorkouts,
      percentage: Math.min(100, (totalWorkouts / targetWorkouts) * 100)
    };

    // Calculate total volume from volume data
    const totalVolume = volumeData?.reduce((sum, session) => sum + session.totalVolume, 0) || 0;
    const targetVolume = selectedPeriod === "week" ? 15000 : 60000; // 15k per week, 60k per month
    const volumeGoal = {
      current: `${(totalVolume / 1000).toFixed(1)}k`,
      target: `${(targetVolume / 1000).toFixed(0)}k`,
      percentage: Math.min(100, (totalVolume / targetVolume) * 100)
    };

    const consistency = {
      current: consistencyData?.consistencyScore || 0,
      target: 100,
      percentage: consistencyData?.consistencyScore || 0
    };

    return { workoutGoal, volumeGoal, consistency };
  };

  const progress = calculateProgress();
  const periods = ["week", "month"] as const;

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border mb-6">
      {/* Header with title and toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-foreground">
          Weekly Progress
        </h3>
        
        {/* Month toggle button */}
        <button
          onClick={() => setSelectedPeriod(selectedPeriod === "week" ? "month" : "week")}
          className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
        >
          Month
        </button>
      </div>
      
      {isLoading ? (
        <div className="space-y-6">
          {/* Progress bar skeleton */}
          <div className="bg-muted rounded-lg h-20"></div>
          
          {/* Goal cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg h-24"></div>
            <div className="bg-muted rounded-lg h-24"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main progress bar - empty for now to match template */}
          <div className="bg-muted rounded-lg h-20 border border-border"></div>
          
          {/* Goal cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Volume Goal */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground">Volume Goal</h4>
                <span className="text-lg font-bold text-foreground">
                  {progress.volumeGoal.current}/{progress.volumeGoal.target}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, progress.volumeGoal.percentage)}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground">
                {(parseFloat(progress.volumeGoal.target.replace('k', '')) * 1000 - 
                  parseFloat(progress.volumeGoal.current.replace('k', '')) * 1000).toFixed(0)}kg remaining
              </p>
            </div>

            {/* Consistency */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground">Consistency</h4>
                <span className="text-lg font-bold text-foreground">
                  {progress.consistency.current.toFixed(0)}%/100%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, progress.consistency.percentage)}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground">
                Let's improve consistency together
              </p>
            </div>
          </div>

          {/* View Full Progress Button */}
          <div className="pt-4">
            <Link 
              href="/progress"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 text-sm font-medium text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors border border-border"
            >
              View Full Progress Dashboard
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}