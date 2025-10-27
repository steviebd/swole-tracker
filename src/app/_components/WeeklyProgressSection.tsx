"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { Card } from "~/components/ui/card";

export function WeeklyProgressSection() {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month">(
    "week",
  );

  // Get real data from ProgressDashboard API
  const { data: consistencyData, isLoading: consistencyLoading } =
    api.progress.getConsistencyStats.useQuery({
      timeRange: selectedPeriod,
    });

  const { data: volumeData, isLoading: volumeLoading } =
    api.progress.getVolumeProgression.useQuery({
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
      percentage: Math.min(100, (totalWorkouts / targetWorkouts) * 100),
    };

    // Calculate total volume from volume data
    const totalVolume =
      volumeData?.data?.reduce(
        (sum, session) => sum + session.totalVolume,
        0,
      ) || 0;
    const targetVolume = selectedPeriod === "week" ? 15000 : 60000; // 15k per week, 60k per month
    const volumeGoal = {
      current: `${(totalVolume / 1000).toFixed(1)}k`,
      target: `${(targetVolume / 1000).toFixed(0)}k`,
      percentage: Math.min(100, (totalVolume / targetVolume) * 100),
    };

    const consistency = {
      current: consistencyData?.consistencyScore || 0,
      target: 100,
      percentage: consistencyData?.consistencyScore || 0,
    };

    return { workoutGoal, volumeGoal, consistency };
  };

  const progress = calculateProgress();

  return (
    <Card surface="card" variant="default" padding="md" className="mb-6">
      {/* Header with title and toggle */}
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-foreground text-xl font-semibold">
          {selectedPeriod === "week" ? "Weekly" : "Monthly"} Progress
        </h3>

        {/* Period toggle button */}
        <button
          onClick={() =>
            setSelectedPeriod(selectedPeriod === "week" ? "month" : "week")
          }
          className="text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {selectedPeriod === "week" ? "Month" : "Week"}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {/* Progress bar skeleton */}
          <div className="bg-muted h-20 rounded-lg"></div>

          {/* Goal cards skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="bg-muted h-24 rounded-lg"></div>
            <div className="bg-muted h-24 rounded-lg"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main progress bar - empty for now to match template */}
          <div className="bg-muted border-border h-20 rounded-lg border"></div>

          {/* Goal cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Volume Goal */}
            <Card
              surface="surface"
              variant="default"
              padding="sm"
              className="border-border border"
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-foreground font-medium">Volume Goal</h4>
                <span className="text-foreground text-lg font-bold">
                  {progress.volumeGoal.current}/{progress.volumeGoal.target}
                </span>
              </div>
              <div className="bg-muted mb-2 h-2 w-full rounded-full">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, progress.volumeGoal.percentage)}%`,
                  }}
                ></div>
              </div>
              <p className="text-muted-foreground text-sm">
                {(
                  parseFloat(progress.volumeGoal.target.replace("k", "")) *
                    1000 -
                  parseFloat(progress.volumeGoal.current.replace("k", "")) *
                    1000
                ).toFixed(0)}
                kg remaining
              </p>
            </Card>

            {/* Consistency */}
            <Card
              surface="surface"
              variant="default"
              padding="sm"
              className="border-border border"
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-foreground font-medium">Consistency</h4>
                <span className="text-foreground text-lg font-bold">
                  {progress.consistency.current.toFixed(0)}%/100%
                </span>
              </div>
              <div className="bg-muted mb-2 h-2 w-full rounded-full">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, progress.consistency.percentage)}%`,
                  }}
                ></div>
              </div>
              <p className="text-muted-foreground text-sm">
                Let's improve consistency together
              </p>
            </Card>
          </div>

          {/* View Full Progress Button */}
          <div className="pt-4">
            <Link
              href="/progress"
              className="text-muted-foreground bg-muted hover:bg-muted/80 border-border flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors"
            >
              View Full Progress Dashboard
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
