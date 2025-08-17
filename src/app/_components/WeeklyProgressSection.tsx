"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { Card, CardHeader, CardContent, CardFooter } from "~/app/_components/ui/Card";
import { type VisualStyle } from "~/lib/design-tokens";

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

/**
 * Get visual style based on progress percentage
 */
function getProgressStatus(percentage: number): VisualStyle {
  if (percentage >= 100) return 'success';
  if (percentage >= 75) return 'info';
  if (percentage >= 50) return 'warning';
  return 'danger';
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
  const visualStyle = getProgressStatus(percentage);
  const motivationalMessage = getMotivationalMessage(percentage, typeof current === 'string' ? parseFloat(current.replace(/[^\d.]/g, '')) : current, typeof target === 'string' ? parseFloat(target.replace(/[^\d.]/g, '')) : target, type);
  
  return (
    <Link href={href} className="block">
      <Card 
        surface={isPrimary ? "elevated" : "card"} 
        variant="interactive"
        padding="lg"
        visualStyle={visualStyle}
        className="h-full"
      >
        <CardHeader className="pb-component-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-text-primary font-medium text-base">{title}</h3>
            <span className="text-text-primary font-bold text-lg">
              {current}/{target}
            </span>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-component-sm">
            <progress 
              className={cx(
                "w-full h-3 rounded-token-card overflow-hidden",
                "[&::-webkit-progress-bar]:bg-bg-surface [&::-webkit-progress-bar]:rounded-token-card",
                "[&::-webkit-progress-value]:rounded-token-card [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-500",
                visualStyle === 'success' && "[&::-webkit-progress-value]:bg-success",
                visualStyle === 'info' && "[&::-webkit-progress-value]:bg-info",
                visualStyle === 'warning' && "[&::-webkit-progress-value]:bg-warning",
                visualStyle === 'danger' && "[&::-webkit-progress-value]:bg-danger",
                "[&::-moz-progress-bar]:rounded-token-card [&::-moz-progress-bar]:transition-all [&::-moz-progress-bar]:duration-500",
                visualStyle === 'success' && "[&::-moz-progress-bar]:bg-success",
                visualStyle === 'info' && "[&::-moz-progress-bar]:bg-info",
                visualStyle === 'warning' && "[&::-moz-progress-bar]:bg-warning",
                visualStyle === 'danger' && "[&::-moz-progress-bar]:bg-danger"
              )}
              value={percentage} 
              max={100}
              aria-label={`Progress: ${percentage.toFixed(1)}% towards ${title.toLowerCase()} goal`}
            />
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
    <Card surface="card" variant="default" padding="none">
      <CardHeader className="p-component-lg pb-component-md">
        <div className="flex items-center justify-between gap-component-md">
          <h3 className="text-text-primary font-semibold text-xl">
            {selectedPeriod === "week" ? "Weekly" : "Monthly"} Progress
          </h3>
          
          {/* Touch-friendly period toggle */}
          <Card surface="surface" variant="outline" padding="xs">
            <div className="flex gap-1" role="radiogroup" aria-label="Select time period">
              {periods.map(period => (
                <button
                  key={period}
                  className={cx(
                    'flex-1 py-2 px-4 rounded-token-card text-sm font-medium',
                    'min-h-[44px] min-w-[72px] transition-all duration-base',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    selectedPeriod === period
                      ? 'bg-primary text-background shadow-token-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/50'
                  )}
                  onClick={() => setSelectedPeriod(period)}
                  role="radio"
                  aria-checked={selectedPeriod === period}
                  aria-label={`View ${period} progress`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </CardHeader>
      
      <CardContent className="p-component-lg pt-0">
        {isLoading ? (
          <div className="space-y-component-md">
            {/* Primary goal skeleton */}
            <Card surface="elevated" variant="outline" padding="lg">
              <div className="space-y-component-sm">
                <div className="flex justify-between">
                  <div className="h-6 w-24 skeleton" />
                  <div className="h-6 w-16 skeleton" />
                </div>
                <div className="h-3 w-full skeleton" />
                <div className="h-4 w-40 skeleton" />
              </div>
            </Card>
            
            {/* Secondary metrics skeleton */}
            <div className="grid gap-component-sm sm:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <Card key={i} surface="card" variant="outline" padding="lg">
                  <div className="space-y-component-sm">
                    <div className="flex justify-between">
                      <div className="h-5 w-20 skeleton" />
                      <div className="h-5 w-12 skeleton" />
                    </div>
                    <div className="h-3 w-full skeleton" />
                    <div className="h-4 w-32 skeleton" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-component-md">
            {/* Primary goal - Workout Goal gets priority */}
            <ProgressMetric
              title="Workout Goal"
              current={progress.workoutGoal.current}
              target={progress.workoutGoal.target}
              percentage={progress.workoutGoal.percentage}
              type="workout"
              href="/progress#consistency"
              isPrimary={true}
            />
            
            {/* Secondary metrics */}
            <div className="grid gap-component-sm sm:grid-cols-2">
              <ProgressMetric
                title="Volume Goal"
                current={progress.volumeGoal.current}
                target={progress.volumeGoal.target}
                percentage={progress.volumeGoal.percentage}
                type="volume"
                href="/progress#volume"
              />
              
              <ProgressMetric
                title="Consistency"
                current={`${progress.consistency.current.toFixed(0)}%`}
                target="100%"
                percentage={progress.consistency.percentage}
                type="consistency"
                href="/progress#consistency"
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-component-lg pt-component-md">
        <Link 
          href="/progress"
          className={cx(
            "flex items-center justify-center gap-component-xs w-full",
            "py-component-sm px-component-md rounded-token-card",
            "bg-bg-surface hover:bg-bg-surface/80 border border-border-default",
            "text-text-primary font-medium text-sm transition-all duration-base",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "min-h-[44px]"
          )}
          aria-label="Navigate to full progress dashboard"
        >
          View Full Progress Dashboard
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </CardFooter>
    </Card>
  );
}