"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle,
  Activity,
  Zap,
  Moon,
  Heart,
  TrendingDown,
} from "lucide-react";
import { cn } from "~/lib/utils";

interface RecoveryPlannerCardProps {
  workoutDate: Date;
  plannedWorkout: Record<string, any>;
  templateId?: number;
  onRecommendationAccept?: (recommendation: any) => void;
  onRecommendationModify?: (recommendation: any) => void;
  onRecommendationIgnore?: () => void;
}

type RecommendationType =
  | "train_as_planned"
  | "reduce_intensity"
  | "reduce_volume"
  | "active_recovery"
  | "rest_day";

const recommendationConfig = {
  train_as_planned: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    title: "Train as Planned",
    description: "Your recovery indicators support training as planned",
  },
  reduce_intensity: {
    icon: TrendingDown,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    title: "Reduce Intensity",
    description: "Consider reducing weight/intensity for this session",
  },
  reduce_volume: {
    icon: Activity,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    title: "Reduce Volume",
    description: "Consider reducing sets/reps for this session",
  },
  active_recovery: {
    icon: Zap,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    title: "Active Recovery",
    description: "Light activity recommended to promote recovery",
  },
  rest_day: {
    icon: Moon,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    title: "Rest Day",
    description: "Full rest recommended for optimal recovery",
  },
};

export function RecoveryPlannerCard({
  workoutDate,
  plannedWorkout,
  templateId,
  onRecommendationAccept,
  onRecommendationModify,
  onRecommendationIgnore,
}: RecoveryPlannerCardProps) {
  const [userAction, setUserAction] = useState<
    "accepted" | "modified" | "ignored" | null
  >(null);

  const { data: preferences } = api.recoveryPlanner.getPreferences.useQuery();
  const { data: whoopData } = api.whoop.getReadinessAggregation.useQuery();

  const {
    data: recommendation,
    isLoading,
    error,
  } = api.recoveryPlanner.generateRecommendation.useQuery({
    templateId,
    workoutDate,
    plannedWorkout,
    recoveryData: {
      recoveryScore: whoopData?.recoveryScore ?? null,
      sleepPerformance: whoopData?.sleepPerformance ?? null,
      hrvStatus: whoopData?.hrvStatus ?? null,
      rhrStatus: whoopData?.rhrStatus ?? null,
      readinessScore: whoopData?.readinessScore ?? null,
    },
    userPreferences: {
      enableRecoveryPlanner: preferences?.enableRecoveryPlanner ?? false,
      recoveryPlannerStrategy:
        (preferences?.recoveryPlannerStrategy as any) ?? "moderate",
      recoveryPlannerSensitivity: preferences?.recoveryPlannerSensitivity ?? 5,
      autoAdjustIntensity: preferences?.autoAdjustIntensity ?? false,
      recoveryPlannerPreferences: preferences?.recoveryPlannerPreferences ?? {},
    },
  });

  const recordUserAction = api.recoveryPlanner.recordUserAction.useMutation();

  if (!preferences?.enableRecoveryPlanner) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <span className="text-muted-foreground text-sm">
              Analyzing recovery data...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !recommendation) {
    return (
      <Card className="w-full border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-600" />
            <div>
              <h4 className="font-medium text-orange-900">
                Recovery Data Unavailable
              </h4>
              <p className="mt-1 text-sm text-orange-700">
                Unable to fetch recovery data. Please check your WHOOP
                connection or try again later.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config =
    recommendationConfig[recommendation.recommendation as RecommendationType];
  const Icon = config.icon;

  const handleAccept = async () => {
    setUserAction("accepted");
    await recordUserAction.mutateAsync({
      userAction: "accepted",
      recommendation: recommendation.recommendation,
      intensityAdjustment: recommendation.intensityAdjustment,
      volumeAdjustment: recommendation.volumeAdjustment,
      reasoning: recommendation.reasoning,
      confidence: recommendation.confidence,
    });
    onRecommendationAccept?.(recommendation);
  };

  const handleModify = async () => {
    setUserAction("modified");
    await recordUserAction.mutateAsync({
      userAction: "modified",
      recommendation: recommendation.recommendation,
      intensityAdjustment: recommendation.intensityAdjustment,
      volumeAdjustment: recommendation.volumeAdjustment,
      reasoning: recommendation.reasoning,
      confidence: recommendation.confidence,
    });
    onRecommendationModify?.(recommendation);
  };

  const handleIgnore = async () => {
    setUserAction("ignored");
    await recordUserAction.mutateAsync({
      userAction: "ignored",
      recommendation: recommendation.recommendation,
      intensityAdjustment: recommendation.intensityAdjustment,
      volumeAdjustment: recommendation.volumeAdjustment,
      reasoning: recommendation.reasoning,
      confidence: recommendation.confidence,
    });
    onRecommendationIgnore?.();
  };

  return (
    <Card className={cn("w-full", config.borderColor, config.bgColor)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-base">
          <Icon className={cn("h-5 w-5", config.color)} />
          <span className={config.color}>{config.title}</span>
          <Badge variant="outline" className="ml-auto">
            {Math.round(recommendation.confidence * 100)}% confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">{config.description}</p>

        {/* Recovery Data Summary */}
        <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
          {whoopData?.recoveryScore !== null && (
            <div className="flex flex-col items-center rounded bg-white/50 p-2">
              <Heart className="mb-1 h-3 w-3 text-pink-600" />
              <span className="font-medium">Recovery</span>
              <span className="text-lg font-bold">
                {whoopData?.recoveryScore}%
              </span>
            </div>
          )}
          {whoopData?.sleepPerformance !== null && (
            <div className="flex flex-col items-center rounded bg-white/50 p-2">
              <Moon className="mb-1 h-3 w-3 text-blue-600" />
              <span className="font-medium">Sleep</span>
              <span className="text-lg font-bold">
                {whoopData?.sleepPerformance}%
              </span>
            </div>
          )}
          {whoopData?.hrvStatus && (
            <div className="flex flex-col items-center rounded bg-white/50 p-2">
              <Activity className="mb-1 h-3 w-3 text-green-600" />
              <span className="font-medium">HRV</span>
              <span className="text-xs capitalize">{whoopData?.hrvStatus}</span>
            </div>
          )}
          {whoopData?.readinessScore !== null && (
            <div className="flex flex-col items-center rounded bg-white/50 p-2">
              <Zap className="mb-1 h-3 w-3 text-yellow-600" />
              <span className="font-medium">Readiness</span>
              <span className="text-lg font-bold">
                {Math.round((whoopData?.readinessScore ?? 0) * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Adjustments */}
        {(recommendation.intensityAdjustment !== 1.0 ||
          recommendation.volumeAdjustment !== 1.0) && (
          <div className="space-y-1 rounded bg-white/50 p-3">
            <h4 className="text-sm font-medium">Suggested Adjustments:</h4>
            {recommendation.intensityAdjustment !== 1.0 && (
              <p className="text-muted-foreground text-xs">
                Intensity:{" "}
                {Math.round(recommendation.intensityAdjustment * 100)}% (
                {recommendation.intensityAdjustment < 1 ? "-" : "+"}
                {Math.abs(
                  Math.round((1 - recommendation.intensityAdjustment) * 100),
                )}
                %)
              </p>
            )}
            {recommendation.volumeAdjustment !== 1.0 && (
              <p className="text-muted-foreground text-xs">
                Volume: {Math.round(recommendation.volumeAdjustment * 100)}% (
                {recommendation.volumeAdjustment < 1 ? "-" : "+"}
                {Math.abs(
                  Math.round((1 - recommendation.volumeAdjustment) * 100),
                )}
                %)
              </p>
            )}
          </div>
        )}

        {/* Reasoning */}
        <div className="rounded bg-white/50 p-3">
          <h4 className="mb-1 text-sm font-medium">Why this recommendation?</h4>
          <p className="text-muted-foreground text-xs">
            {recommendation.reasoning}
          </p>
        </div>

        {/* Actions */}
        {userAction ? (
          <div className="rounded border border-green-200 bg-green-100 p-3">
            <p className="text-sm text-green-800">
              ✓ Recommendation {userAction}. Your choice has been recorded.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleAccept}
              size="sm"
              className="flex-1"
              variant={
                recommendation.recommendation === "train_as_planned"
                  ? "default"
                  : "outline"
              }
            >
              Accept Recommendation
            </Button>
            <Button
              onClick={handleModify}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              Modify & Continue
            </Button>
            <Button
              onClick={handleIgnore}
              size="sm"
              variant="ghost"
              className="flex-1"
            >
              Train as Planned
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
