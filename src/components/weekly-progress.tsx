"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { LoadingState } from "~/components/ui/async-state";
import { Skeleton } from "~/components/ui/skeleton";

export function WeeklyProgress() {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month">(
    "week",
  );

  // Get real data from tRPC API
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
  const calculateGoals = () => {
    const targetWorkouts = selectedPeriod === "week" ? 3 : 12;
    const totalWorkouts = consistencyData?.totalWorkouts || 0;
    const workoutProgress = Math.min(
      100,
      (totalWorkouts / targetWorkouts) * 100,
    );
    const workoutStatus =
      totalWorkouts > targetWorkouts
        ? "exceeded"
        : totalWorkouts === targetWorkouts
          ? "perfect"
          : "in_progress";

    // Calculate total volume from volume data
    const totalVolume =
      volumeData?.data?.reduce(
        (sum: number, session) => sum + session.totalVolume,
        0,
      ) || 0;
    const targetVolume = selectedPeriod === "week" ? 15000 : 60000; // 15k per week, 60k per month
    const volumeProgress = Math.min(100, (totalVolume / targetVolume) * 100);
    const volumeStatus =
      totalVolume > targetVolume
        ? "exceeded"
        : totalVolume === targetVolume
          ? "perfect"
          : "in_progress";

    const consistencyScore = consistencyData?.consistencyScore || 0;
    const consistencyStatus =
      consistencyScore === 100
        ? "perfect"
        : consistencyScore >= 80
          ? "exceeded"
          : "in_progress";

    return [
      {
        label: "Workout Goal",
        current: totalWorkouts,
        target: targetWorkouts,
        unit: " sessions",
        progress: workoutProgress,
        status: workoutStatus,
      },
      {
        label: "Volume Goal",
        current: (totalVolume / 1000).toFixed(1),
        target: (targetVolume / 1000).toFixed(0),
        unit: "k kg",
        progress: volumeProgress,
        status: volumeStatus,
      },
      {
        label: "Consistency",
        current: Math.round(consistencyScore),
        target: 100,
        unit: "%",
        progress: consistencyScore,
        status: consistencyStatus,
      },
    ];
  };

  const goals = calculateGoals();

  if (isLoading) {
    return (
      <Card className="glass-card glass-hairline bg-card/85 flex h-full flex-col border border-white/8 shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-foreground text-xl font-bold sm:text-2xl">
            Weekly Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <LoadingState
            label="Loading weekly progress"
            description="Crunching your workout volume and consistency"
            className="space-y-6"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton
                  announce={false}
                  variant="text"
                  className="h-6 w-32"
                />
                <Skeleton announce={false} className="h-8 w-48" />
                <Skeleton announce={false} className="h-3 w-full" />
              </div>
            ))}
          </LoadingState>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card glass-hairline bg-card/85 flex h-full flex-col border border-white/8 shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-foreground text-xl font-bold sm:text-2xl">
            {selectedPeriod === "week" ? "Weekly" : "Monthly"} Progress
          </CardTitle>
          <div className="flex gap-2">
            <Badge
              variant={selectedPeriod === "week" ? "secondary" : "outline"}
              className={
                selectedPeriod === "week"
                  ? "bg-muted text-muted-foreground"
                  : "cursor-pointer"
              }
              onClick={() => setSelectedPeriod("week")}
            >
              Week
            </Badge>
            <Badge
              variant={selectedPeriod === "month" ? "secondary" : "outline"}
              className={
                selectedPeriod === "month"
                  ? "bg-muted text-muted-foreground"
                  : "cursor-pointer"
              }
              onClick={() => setSelectedPeriod("month")}
            >
              Month
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-6">
        {goals.map((goal, index) => (
          <div key={index} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-foreground font-semibold">{goal.label}</p>
                <p className="text-foreground font-serif text-2xl font-black">
                  {goal.current}
                  {goal.unit} / {goal.target}
                  {goal.unit}
                </p>
              </div>
              <Badge
                className={`${
                  goal.status === "exceeded"
                    ? "from-chart-1 to-chart-3 text-primary-foreground bg-gradient-to-r"
                    : goal.status === "perfect"
                      ? "from-chart-3 to-chart-4 text-primary-foreground bg-gradient-to-r"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {goal.status === "exceeded"
                  ? "Exceeded!"
                  : goal.status === "perfect"
                    ? "Perfect!"
                    : "In Progress"}
              </Badge>
            </div>
            <Progress value={goal.progress} className="h-3" />
            <p className="text-muted-foreground text-sm">
              {goal.status === "exceeded"
                ? `${parseFloat(goal.current.toString()) - parseFloat(goal.target.toString())}${goal.unit} over target`
                : goal.status === "perfect"
                  ? "Great consistency!"
                  : `${parseFloat(goal.target.toString()) - parseFloat(goal.current.toString())}${goal.unit} remaining`}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
