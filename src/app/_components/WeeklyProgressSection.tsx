"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { Card } from "~/components/ui/card";

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

  return (
    <Card surface="card" variant="default" padding="md" className="mb-6">
      {/* Header with title and toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-foreground">
          {selectedPeriod === "week" ? "Weekly" : "Monthly"} Progress
        </h3>
        
        {/* Period toggle button */}
        <button
          onClick={() => setSelectedPeriod(selectedPeriod === "week" ? "month" : "week")}
          className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
        >
          {selectedPeriod === "week" ? "Month" : "Week"}
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
            <Card surface="surface" variant="default" padding="sm" className="border border-border">
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
            </Card>

            {/* Consistency */}
            <Card surface="surface" variant="default" padding="sm" className="border border-border">
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
            </Card>
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
    </Card>
  );
}