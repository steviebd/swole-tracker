"use client";

import React from "react";
import Link from "next/link";
import { Check, TrendingUp, Trophy, Target, Calendar } from "lucide-react";
import { cn } from "~/lib/utils";

export interface PlateauMilestoneToastData {
  type: "plateau_detected" | "milestone_achieved";
  exerciseName?: string;
  stalledWeight?: number;
  stalledReps?: number;
  milestoneType?: string;
  achievedValue?: number;
  targetValue?: number;
  achievedDate?: string;
}

interface PlateauMilestoneToastProps {
  data: PlateauMilestoneToastData;
  onDismiss: () => void;
}

export function PlateauMilestoneToast({
  data,
  onDismiss,
}: PlateauMilestoneToastProps) {
  const isPlateau = data.type === "plateau_detected";
  const isMilestone = data.type === "milestone_achieved";

  const exerciseName = data.exerciseName || "Unknown exercise";
  const stalledWeight = data.stalledWeight || 0;
  const stalledReps = data.stalledReps || 0;
  const achievedValue = data.achievedValue || 0;
  const targetValue = data.targetValue || 0;

  const handleLinkClick = (e: React.MouseEvent) => {
    // Allow the link to navigate normally, but also dismiss the toast
    setTimeout(onDismiss, 100);
  };

  return (
    <div className="flex w-full items-start gap-3 rounded-lg border border-white/20 bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white shadow-lg">
      {/* Icon */}
      <div className="flex shrink-0 items-center justify-center">
        {isPlateau ? (
          <div className="rounded-full bg-yellow-400/20 p-2">
            <TrendingUp className="h-5 w-5 text-yellow-300" />
          </div>
        ) : (
          <div className="rounded-full bg-green-400/20 p-2">
            <Trophy className="h-5 w-5 text-green-300" />
          </div>
        )}
      </div>

      {/* Message */}
      <div className="flex-1 space-y-1">
        <div className="text-sm font-semibold text-white">
          {isPlateau ? "Plateau Detected" : "Milestone Achieved!"}
        </div>
        <div className="text-sm font-medium text-white/90">
          {isPlateau
            ? `${exerciseName} stalled at ${stalledWeight}kg × ${stalledReps}`
            : `${exerciseName}: ${achievedValue}kg (target: ${targetValue}kg)`}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        {isPlateau && (
          <Link
            href="/progress"
            className="rounded text-xs font-semibold text-white underline hover:no-underline focus:ring-2 focus:ring-current focus:ring-offset-1 focus:outline-none"
            onClick={handleLinkClick}
          >
            View Progress
          </Link>
        )}

        {isMilestone && (
          <Link
            href="/progress/achievements"
            className="rounded text-xs font-semibold text-white underline hover:no-underline focus:ring-2 focus:ring-current focus:ring-offset-1 focus:outline-none"
            onClick={handleLinkClick}
          >
            View All
          </Link>
        )}

        <button
          onClick={onDismiss}
          className="ml-1 rounded text-white/70 transition hover:text-white focus:ring-2 focus:ring-white/70 focus:ring-offset-1 focus:outline-none"
          aria-label="Close notification"
        >
          <span className="text-lg leading-none" aria-hidden="true">
            ×
          </span>
        </button>
      </div>
    </div>
  );
}
