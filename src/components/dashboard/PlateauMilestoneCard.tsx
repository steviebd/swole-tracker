"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { buttonVariants } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

interface PlateauMilestoneCardProps {
  className?: string;
}

export function PlateauMilestoneCard({ className }: PlateauMilestoneCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const { data: dashboardData, isLoading } =
    api.plateauMilestone.getDashboardData.useQuery(undefined, {
      refetchOnWindowFocus: false,
    });

  if (isLoading) {
    return <PlateauMilestoneSkeleton className={className || ""} />;
  }

  if (!dashboardData) {
    return null;
  }

  const { activePlateaus, upcomingMilestones, prForecasts, summary } =
    dashboardData;
  const hasContent =
    activePlateaus.length > 0 ||
    upcomingMilestones.length > 0 ||
    prForecasts.length > 0;

  if (!hasContent) {
    return (
      <div
        className={cn(
          "glass-surface border-border/60 space-y-4 rounded-2xl border p-6 shadow-sm",
          className,
        )}
      >
        <div className="text-center">
          <div className="mb-3 text-4xl">🎯</div>
          <h3 className="text-foreground mb-2 text-lg font-semibold">
            Key Lift Tracking
          </h3>
          <p className="text-muted-foreground text-sm">
            Mark exercises as key lifts to track plateaus, milestones, and PR
            forecasts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "glass-surface border-border/60 space-y-4 rounded-2xl border p-6 shadow-sm",
          className,
        )}
      >
        <header className="flex items-center justify-between">
          <div>
            <h3 className="text-foreground text-lg font-semibold">
              Training Insights
            </h3>
            <p className="text-muted-foreground text-sm">
              {summary.totalKeyLifts} key lifts tracked
            </p>
          </div>
          <div className="flex gap-2">
            {summary.activePlateauCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {summary.activePlateauCount} plateau
                {summary.activePlateauCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {summary.upcomingMilestoneCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {summary.upcomingMilestoneCount} milestone
                {summary.upcomingMilestoneCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </header>

        <div className="space-y-3">
          {/* Active Plateaus */}
          {activePlateaus.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-foreground flex items-center gap-2 text-sm font-medium">
                <span className="text-amber-500">⚠️</span>
                Active Plateaus
              </h4>
              {activePlateaus.slice(0, 2).map((plateau) => (
                <PlateauItem key={plateau.id} plateau={plateau} />
              ))}
              {activePlateaus.length > 2 && (
                <p className="text-muted-foreground text-xs">
                  +{activePlateaus.length - 2} more plateau
                  {activePlateaus.length - 2 !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* Upcoming Milestones */}
          {upcomingMilestones.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-foreground flex items-center gap-2 text-sm font-medium">
                <span className="text-emerald-500">🎯</span>
                Upcoming Milestones
              </h4>
              {upcomingMilestones.slice(0, 2).map((milestone) => (
                <MilestoneItem
                  key={milestone.milestone.id}
                  milestone={milestone}
                />
              ))}
              {upcomingMilestones.length > 2 && (
                <p className="text-muted-foreground text-xs">
                  +{upcomingMilestones.length - 2} more milestone
                  {upcomingMilestones.length - 2 !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* PR Forecasts */}
          {prForecasts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-foreground flex items-center gap-2 text-sm font-medium">
                <span className="text-blue-500">📈</span>
                PR Forecasts
              </h4>
              {prForecasts.slice(0, 2).map((forecast) => (
                <ForecastItem
                  key={forecast.masterExerciseId}
                  forecast={forecast}
                />
              ))}
              {prForecasts.length > 2 && (
                <p className="text-muted-foreground text-xs">
                  +{prForecasts.length - 2} more forecast
                  {prForecasts.length - 2 !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}
        </div>

        {(activePlateaus.length > 2 ||
          upcomingMilestones.length > 2 ||
          prForecasts.length > 2) && (
          <div className="border-border/40 border-t pt-2">
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground hover:text-foreground w-full",
              )}
            >
              View All Insights
            </button>
          </div>
        )}
      </div>

      <DetailsModal
        open={showDetails}
        onOpenChange={setShowDetails}
        dashboardData={dashboardData}
      />
    </>
  );
}

function PlateauItem({
  plateau,
}: {
  plateau: import("~/server/api/types/plateau-milestone").PlateauAlert;
}) {
  const severityColor =
    plateau.severity === "high"
      ? "text-rose-600"
      : plateau.severity === "medium"
        ? "text-amber-600"
        : "text-yellow-600";

  return (
    <div className="rounded-lg border border-amber-200/50 bg-amber-50/50 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground text-sm font-medium">
            {plateau.exerciseName || "Unknown Exercise"}
          </p>
          <p className="text-muted-foreground text-xs">
            Stalled at {plateau.stalledWeight}kg × {plateau.stalledReps}
          </p>
        </div>
        <Badge variant="outline" className={cn("text-xs", severityColor)}>
          {plateau.severity}
        </Badge>
      </div>
    </div>
  );
}

function MilestoneItem({
  milestone,
}: {
  milestone: import("~/server/api/types/plateau-milestone").MilestoneProgress;
}) {
  const progressColor =
    milestone.progressPercent >= 90
      ? "text-emerald-600"
      : milestone.progressPercent >= 70
        ? "text-blue-600"
        : "text-gray-600";

  return (
    <div className="rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground text-sm font-medium">
            {milestone.milestone.type === "bodyweight_multiplier"
              ? `${milestone.milestone.targetMultiplier}× Bodyweight`
              : `${milestone.milestone.targetValue}kg`}
          </p>
          <p className="text-muted-foreground text-xs">
            {milestone.progressPercent.toFixed(1)}% complete
          </p>
        </div>
        <div className={cn("text-sm font-medium", progressColor)}>
          {Math.round(milestone.currentValue)}kg
        </div>
      </div>
    </div>
  );
}

function ForecastItem({
  forecast,
}: {
  forecast: import("~/server/api/types/plateau-milestone").ForecastData;
}) {
  const confidenceColor =
    forecast.confidencePercent >= 80
      ? "text-emerald-600"
      : forecast.confidencePercent >= 60
        ? "text-blue-600"
        : "text-gray-600";

  return (
    <div className="rounded-lg border border-blue-200/50 bg-blue-50/50 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground text-sm font-medium">
            {forecast.exerciseName || "Unknown Exercise"}
          </p>
          <p className="text-muted-foreground text-xs">
            Current: {forecast.currentWeight}kg → Forecast:{" "}
            {forecast.forecastedWeight}kg
          </p>
        </div>
        <div className={cn("text-xs font-medium", confidenceColor)}>
          {forecast.confidencePercent}% confidence
        </div>
      </div>
    </div>
  );
}

function DetailsModal({
  open,
  onOpenChange,
  dashboardData,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  dashboardData: any;
}) {
  const { activePlateaus, upcomingMilestones, prForecasts, summary } =
    dashboardData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Training Insights Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <p className="text-foreground text-2xl font-bold">
                {summary.totalKeyLifts}
              </p>
              <p className="text-muted-foreground text-xs">Key Lifts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-rose-600">
                {summary.activePlateauCount}
              </p>
              <p className="text-muted-foreground text-xs">Active Plateaus</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {summary.upcomingMilestoneCount}
              </p>
              <p className="text-muted-foreground text-xs">
                Upcoming Milestones
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {summary.averageConfidence.toFixed(0)}%
              </p>
              <p className="text-muted-foreground text-xs">Avg Confidence</p>
            </div>
          </div>

          {/* All Plateaus */}
          {activePlateaus.length > 0 && (
            <div>
              <h4 className="text-foreground mb-3 flex items-center gap-2 text-lg font-semibold">
                <span className="text-amber-500">⚠️</span>
                Active Plateaus ({activePlateaus.length})
              </h4>
              <div className="space-y-2">
                {activePlateaus.map((plateau: any) => (
                  <PlateauItem key={plateau.id} plateau={plateau} />
                ))}
              </div>
            </div>
          )}

          {/* All Milestones */}
          {upcomingMilestones.length > 0 && (
            <div>
              <h4 className="text-foreground mb-3 flex items-center gap-2 text-lg font-semibold">
                <span className="text-emerald-500">🎯</span>
                Upcoming Milestones ({upcomingMilestones.length})
              </h4>
              <div className="space-y-2">
                {upcomingMilestones.map((milestone: any) => (
                  <MilestoneItem
                    key={milestone.milestone.id}
                    milestone={milestone}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Forecasts */}
          {prForecasts.length > 0 && (
            <div>
              <h4 className="text-foreground mb-3 flex items-center gap-2 text-lg font-semibold">
                <span className="text-blue-500">📈</span>
                PR Forecasts ({prForecasts.length})
              </h4>
              <div className="space-y-2">
                {prForecasts.map((forecast: any) => (
                  <ForecastItem
                    key={forecast.masterExerciseId}
                    forecast={forecast}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlateauMilestoneSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "glass-surface border-border/60 space-y-4 rounded-2xl border p-6 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
