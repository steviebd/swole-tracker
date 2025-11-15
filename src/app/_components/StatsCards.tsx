"use client";

import { memo, useMemo, useCallback } from "react";
import { BarChart3, Target, Flame, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useSharedWorkoutData } from "~/hooks/use-shared-workout-data";
import { useCacheInvalidation } from "~/hooks/use-cache-invalidation";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { analytics } from "~/lib/analytics";
import {
  calculateStreak,
  getStreakBadge,
  formatAchievementBadge,
  type Achievement,
} from "~/lib/achievements";

const weightCompactFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const kgFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

type StrengthCardId = "volume" | "oneRm" | "streak" | "goal";

const STRENGTH_BACKGROUNDS: Record<StrengthCardId, string> = {
  volume:
    "linear-gradient(135deg, var(--md-ref-palette-primary-40) 0%, color-mix(in oklab, var(--md-ref-palette-secondary-40) 80%, black 10%) 100%)",
  oneRm:
    "linear-gradient(135deg, var(--md-ref-palette-secondary-30) 0%, color-mix(in oklab, var(--md-ref-palette-tertiary-40) 70%, black 5%) 100%)",
  streak:
    "linear-gradient(135deg, var(--md-ref-palette-tertiary-40) 0%, color-mix(in oklab, var(--md-ref-palette-primary-40) 85%, black 5%) 100%)",
  goal: "linear-gradient(135deg, color-mix(in oklab, var(--md-ref-palette-neutral-30) 80%, black 10%) 0%, color-mix(in oklab, var(--md-ref-palette-primary-50) 65%, black 20%) 100%)",
};

const changeToneClass = {
  positive: "text-emerald-200",
  negative: "text-rose-200",
  neutral: "text-white/80",
} as const;

interface StrengthStatCard {
  id: StrengthCardId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  background: string;
  value: string;
  change?: {
    label: string;
    tone: keyof typeof changeToneClass;
  };
  footers?: string[];
  badge?: Achievement | null;
  progress?: number;
  progressLabel?: string;
  accessibilityLabel?: string;
}

function formatWeeklyVolume(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 kg";
  }
  return `${weightCompactFormatter.format(value)} kg`;
}

function formatKgValue(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "-- kg";
  }
  return `${kgFormatter.format(value)} kg`;
}

function formatCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }
  return integerFormatter.format(Math.round(value));
}

function buildPercentChange(
  percent: number | null,
  fallback?: string,
): StrengthStatCard["change"] | undefined {
  if (percent == null || !Number.isFinite(percent)) {
    if (fallback) {
      return { label: fallback, tone: "neutral" };
    }
    return undefined;
  }

  if (Math.abs(percent) < 0.1) {
    return { label: "On par with last week", tone: "neutral" };
  }

  const tone = percent > 0 ? "positive" : "negative";
  const sign = percent > 0 ? "+" : "-";
  return {
    label: `${sign}${percentFormatter.format(Math.abs(percent))}% vs last week`,
    tone,
  };
}

function buildKgChange(
  delta: number,
  previous: number,
): StrengthStatCard["change"] | undefined {
  if (!Number.isFinite(delta)) {
    return undefined;
  }

  if (previous <= 0) {
    if (delta > 0) {
      return { label: "First heavy single logged", tone: "neutral" };
    }
    return undefined;
  }

  if (Math.abs(delta) < 0.5) {
    return { label: "Holding steady vs last week", tone: "neutral" };
  }

  const tone = delta > 0 ? "positive" : "negative";
  const sign = delta > 0 ? "+" : "-";
  return {
    label: `${sign}${kgFormatter.format(Math.abs(delta))} kg vs last week`,
    tone,
  };
}

function formatRelativeTime(date: Date | null): string | null {
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }
  return formatDistanceToNow(date, { addSuffix: true });
}

export const StatsCards = memo(function StatsCards() {
  const {
    thisWeekWorkouts,
    thisWeekVolume,
    monthWorkouts,
    lastWeekVolume,
    strengthPulse,
    isLoading,
    isSecondaryLoading,
  } = useSharedWorkoutData();

  const { invalidateProgressRealtime } = useCacheInvalidation();

  const stats = useMemo(() => {
    const workoutsThisWeek = thisWeekWorkouts.length ?? 0;
    const totalVolume = thisWeekVolume.reduce(
      (sum, session) => sum + session.totalVolume,
      0,
    );
    const totalSets = thisWeekVolume.reduce(
      (sum, session) => sum + session.totalSets,
      0,
    );
    const totalReps = thisWeekVolume.reduce(
      (sum, session) => sum + session.totalReps,
      0,
    );
    const previousVolume = lastWeekVolume.reduce(
      (sum, session) => sum + session.totalVolume,
      0,
    );
    const volumePercent =
      previousVolume > 0
        ? ((totalVolume - previousVolume) / previousVolume) * 100
        : null;

    const streakInfo = calculateStreak(
      (monthWorkouts ?? []).map((date) => new Date(date)),
    );
    const streakBadge = getStreakBadge(streakInfo);

    const weeklyGoalTarget = 4;
    const goalProgress =
      weeklyGoalTarget > 0
        ? Math.min((workoutsThisWeek / weeklyGoalTarget) * 100, 200)
        : 0;

    return {
      workoutsThisWeek,
      totalVolume,
      totalSets,
      totalReps,
      previousVolume,
      volumePercent,
      streakInfo,
      streakBadge,
      weeklyGoalTarget,
      goalProgress,
    };
  }, [thisWeekWorkouts, thisWeekVolume, lastWeekVolume, monthWorkouts]);

  const strengthSummary = useMemo(() => {
    if (!strengthPulse) {
      return {
        currentOneRm: 0,
        delta: 0,
        previousOneRm: 0,
        heavySetCount: 0,
        topLift: null as null | {
          exerciseName: string;
          weight: number;
          reps: number;
        },
        lastLiftedAt: null as Date | null,
      };
    }

    return {
      currentOneRm: strengthPulse.currentOneRm ?? 0,
      delta: strengthPulse.delta ?? 0,
      previousOneRm: strengthPulse.previousOneRm ?? 0,
      heavySetCount: strengthPulse.heavySetCount ?? 0,
      topLift: strengthPulse.topLift
        ? {
            exerciseName: strengthPulse.topLift.exerciseName,
            weight: strengthPulse.topLift.weight,
            reps: strengthPulse.topLift.reps,
          }
        : null,
      lastLiftedAt: strengthPulse.lastLiftedAt
        ? new Date(strengthPulse.lastLiftedAt)
        : null,
    };
  }, [strengthPulse]);

  const cards = useMemo<StrengthStatCard[]>(() => {
    const volumeFooters =
      stats.totalSets > 0
        ? [
            `${formatCount(stats.totalSets)} sets • ${formatCount(stats.totalReps)} reps`,
            `${formatCount(stats.workoutsThisWeek)} strength sessions logged`,
          ]
        : ["Log your first heavy session to see volume insights"];

    const heavySetsLabel =
      strengthSummary.heavySetCount > 0
        ? `${formatCount(strengthSummary.heavySetCount)} heavy sets >=85%`
        : "Push heavy sets >=85% to update your 1RM";

    const topLiftLabel =
      strengthSummary.topLift && strengthSummary.topLift.weight > 0
        ? `${strengthSummary.topLift.exerciseName} • ${kgFormatter.format(
            strengthSummary.topLift.weight,
          )} kg x ${formatCount(strengthSummary.topLift.reps)}`
        : "Log a top set to surface your max lift";

    const lastHeavyLabel = formatRelativeTime(strengthSummary.lastLiftedAt);

    const strengthFooters = [
      heavySetsLabel,
      topLiftLabel,
      lastHeavyLabel ? `Last heavy set ${lastHeavyLabel}` : null,
    ].filter((line): line is string => Boolean(line));

    const lastWorkoutRelative = formatRelativeTime(
      stats.streakInfo.lastWorkoutDate
        ? new Date(stats.streakInfo.lastWorkoutDate)
        : null,
    );

    const streakFooters = [
      `Longest streak ${formatCount(stats.streakInfo.longest)} days`,
      lastWorkoutRelative
        ? `Last workout ${lastWorkoutRelative}`
        : "No recent workouts logged",
    ];

    const goalRemaining = Math.max(
      stats.weeklyGoalTarget - stats.workoutsThisWeek,
      0,
    );
    const goalFooters = [
      `${formatCount(stats.workoutsThisWeek)} sessions this week`,
      goalRemaining > 0
        ? `${goalRemaining} sessions to hit target`
        : "Target met — maintain heavy volume",
    ];

    const goalProgressLabel =
      stats.goalProgress >= 100
        ? "Target exceeded"
        : `${Math.round(Math.min(stats.goalProgress, 100))}% complete`;

    // Build cards array with explicit typing
    const result: StrengthStatCard[] = [];

    // Volume card
    const volumeCard: StrengthStatCard = {
      id: "volume",
      title: "Weekly Volume Lifted",
      icon: BarChart3,
      background: STRENGTH_BACKGROUNDS.volume,
      value: formatWeeklyVolume(stats.totalVolume),
      footers: volumeFooters,
      accessibilityLabel: `Weekly volume lifted ${formatWeeklyVolume(stats.totalVolume)}`,
    };

    const volumeChange = buildPercentChange(
      stats.volumePercent,
      stats.totalVolume > 0
        ? "Baseline week — keep building volume"
        : undefined,
    );
    if (volumeChange !== undefined) {
      volumeCard.change = volumeChange;
    }
    result.push(volumeCard);

    // One RM card
    const oneRmCard: StrengthStatCard = {
      id: "oneRm",
      title: "Top Estimated 1RM",
      icon: Target,
      background: STRENGTH_BACKGROUNDS.oneRm,
      value: formatKgValue(strengthSummary.currentOneRm),
      footers: strengthFooters,
      accessibilityLabel: `Top estimated one rep max ${formatKgValue(
        strengthSummary.currentOneRm,
      )}`,
    };

    const oneRmChange = buildKgChange(
      strengthSummary.delta,
      strengthSummary.previousOneRm,
    );
    if (oneRmChange !== undefined) {
      oneRmCard.change = oneRmChange;
    }
    result.push(oneRmCard);

    // Streak card
    const streakCard: StrengthStatCard = {
      id: "streak",
      title: "Current Streak",
      icon: Flame,
      background: STRENGTH_BACKGROUNDS.streak,
      value: `${formatCount(stats.streakInfo.current)} days`,
      footers: streakFooters,
      accessibilityLabel: `Current streak ${formatCount(
        stats.streakInfo.current,
      )} days`,
    };

    if (stats.streakInfo.current > 0) {
      streakCard.change = {
        label: "Stay locked in — streak active",
        tone: "positive",
      };
    } else {
      streakCard.change = {
        label: "Kickstart a new streak this week",
        tone: "neutral",
      };
    }

    if (stats.streakBadge !== undefined) {
      streakCard.badge = stats.streakBadge;
    }
    result.push(streakCard);

    // Goal card
    const goalCard: StrengthStatCard = {
      id: "goal",
      title: "Weekly Goal",
      icon: Flag,
      background: STRENGTH_BACKGROUNDS.goal,
      value: `${formatCount(stats.workoutsThisWeek)}/${formatCount(
        stats.weeklyGoalTarget,
      )}`,
      footers: goalFooters,
      progress: Math.min(stats.goalProgress, 130),
      progressLabel: goalProgressLabel,
      accessibilityLabel: `Weekly goal progress ${formatCount(
        stats.workoutsThisWeek,
      )} of ${formatCount(stats.weeklyGoalTarget)} sessions`,
    };

    if (goalRemaining > 0) {
      goalCard.change = {
        label: `${goalRemaining} sessions remaining`,
        tone: "neutral",
      };
    } else {
      goalCard.change = {
        label: "Goal smashed — great work",
        tone: "positive",
      };
    }
    result.push(goalCard);

    return result;
  }, [stats, strengthSummary]);

  const handleCardPress = useCallback(
    (cardId: string) => {
      analytics.event("dashboard_stat_card_tap", {
        cardId,
        persona: "strength",
      });

      // Trigger real-time refresh when user interacts with cards
      invalidateProgressRealtime();
    },
    [invalidateProgressRealtime],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="border-border/40 bg-surface-secondary/60 h-[200px] animate-pulse rounded-2xl border"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const BadgeIcon = card.badge
          ? formatAchievementBadge(card.badge)
          : null;
        const isUpdating = isSecondaryLoading && !isLoading;

        return (
          <div key={card.id} className="h-full">
            <Card
              surface="card"
              variant="glass"
              padding="lg"
              interactive
              className={cn(
                "relative flex h-full min-h-[200px] flex-col overflow-hidden text-white shadow-xl transition-all duration-300",
                "focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/20",
                isUpdating && "animate-pulse opacity-90",
              )}
              style={{ background: card.background }}
              onClick={() => handleCardPress(card.id)}
              onActivate={() => handleCardPress(card.id)}
              aria-label={
                card.accessibilityLabel ?? `${card.title} ${card.value}`
              }
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/10 via-black/0 to-black/50" />
              <div className="relative flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-xl bg-white/12 p-2 shadow-sm backdrop-blur-sm">
                    <card.icon className="h-6 w-6" aria-hidden />
                  </div>
                  {BadgeIcon && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
                      {BadgeIcon.icon && (
                        <span aria-hidden>{BadgeIcon.icon}</span>
                      )}
                      {BadgeIcon.text}
                    </span>
                  )}
                </div>

                <div className="mt-6 space-y-3">
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-white/70 uppercase">
                      {card.title}
                    </p>
                    <p className="mt-2 text-3xl leading-tight font-semibold">
                      {card.value}
                    </p>
                  </div>
                  {card.change && (
                    <p
                      className={cn(
                        "text-sm font-medium",
                        changeToneClass[card.change.tone],
                      )}
                    >
                      {card.change.label}
                    </p>
                  )}
                </div>

                {card.progress !== undefined && (
                  <div className="mt-5 space-y-2">
                    <div className="h-2 w-full rounded-full bg-white/20">
                      <div
                        className="h-2 rounded-full bg-white"
                        style={{
                          width: `${Math.min(card.progress, 120)}%`,
                        }}
                      />
                    </div>
                    {card.progressLabel && (
                      <p className="text-xs font-semibold text-white/80">
                        {card.progressLabel}
                      </p>
                    )}
                  </div>
                )}

                {card.footers?.length ? (
                  <div className="mt-6 space-y-2 text-sm text-white/80">
                    {card.footers.map((footer, footerIndex) => (
                      <p
                        key={`${card.id}-footer-${footerIndex}`}
                        className="flex items-center gap-2 leading-tight"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-white/40"
                          aria-hidden
                        />
                        <span>{footer}</span>
                      </p>
                    ))}
                    {isUpdating && (
                      <p className="flex items-center gap-2 text-xs text-white/60">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/40" />
                        <span>Updating...</span>
                      </p>
                    )}
                  </div>
                ) : isUpdating ? (
                  <div className="mt-6 text-xs text-white/60">
                    <p className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/40" />
                      <span>Updating...</span>
                    </p>
                  </div>
                ) : null}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
});
