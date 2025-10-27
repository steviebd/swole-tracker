const HEART_RATE_ZONES = [
  {
    key: "zone_zero_milli",
    label: "Zone 0",
    description: "Idle / warm-up",
    color: "var(--color-chart-1)",
  },
  {
    key: "zone_one_milli",
    label: "Zone 1",
    description: "50-60% (Recovery)",
    color: "var(--color-chart-2)",
  },
  {
    key: "zone_two_milli",
    label: "Zone 2",
    description: "60-70% (Base)",
    color: "var(--color-chart-3)",
  },
  {
    key: "zone_three_milli",
    label: "Zone 3",
    description: "70-80% (Aerobic)",
    color: "var(--color-chart-4)",
  },
  {
    key: "zone_four_milli",
    label: "Zone 4",
    description: "80-90% (Threshold)",
    color: "var(--color-chart-5)",
  },
  {
    key: "zone_five_milli",
    label: "Zone 5",
    description: "90-100% (Max)",
    color: "var(--color-chart-6, var(--color-chart-1))",
  },
] as const;

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const formatPercentage = (value: number | null): string => {
  if (value === null) {
    return "--";
  }
  return `${Math.round(value)}%`;
};

const formatMinutes = (minutes: number | null): string => {
  if (minutes === null) {
    return "--";
  }

  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const remaining = whole % 60;
  return hours > 0 ? `${hours}h ${remaining}m` : `${remaining}m`;
};

const formatWhoopTimestamp = (date: Date | string | null): string => {
  if (!date) {
    return "--";
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(dateObj);
};

const getRecoveryDescriptor = (score: number | null) => {
  if (score === null) {
    return {
      emoji: "⚪️",
      color: "var(--color-muted)",
      message: "No recovery data yet",
    };
  }

  if (score >= 67) {
    return {
      emoji: "🟢",
      color: "var(--color-success)",
      message: "You're primed for a hard session",
    } as const;
  }

  if (score >= 34) {
    return {
      emoji: "🟡",
      color: "var(--color-warning)",
      message: "Dial intensity to a manageable level",
    } as const;
  }

  return {
    emoji: "🔴",
    color: "var(--color-danger)",
    message: "Prioritise recovery work today",
  } as const;
};

const getStrainEmoji = (strain: number | null): string => {
  if (strain === null) {
    return "😌";
  }

  if (strain >= 18) return "🔥";
  if (strain >= 14) return "⚡";
  if (strain >= 10) return "💪";
  return "🙂";
};

const getTrainingRecommendation = (score: number | null): string => {
  if (score === null) {
    return "We need fresh recovery data to tailor training intensity. Run a WHOOP sync to update.";
  }

  if (score >= 67) {
    return "Recovery is in the green. Plan heavy strength or high-intensity work while you’re fresh.";
  }

  if (score >= 34) {
    return "Recovery is moderate. Keep today's work controlled and focus on quality movement.";
  }

  return "Recovery is in the red. Prioritise mobility, zone-2 cardio, or complete rest.";
};

const getHrvInsight = (
  current: number | null,
  baseline: number | null,
): string => {
  if (current === null || baseline === null) {
    return "HRV trend is unavailable. A fresh sync will surface readiness signals.";
  }

  if (baseline === 0) {
    return "Baseline HRV hasn’t been established yet. Keep syncing to calibrate.";
  }

  const delta = ((current - baseline) / baseline) * 100;

  if (delta >= 5) {
    return `HRV is ${delta.toFixed(1)}% above baseline — your nervous system is handling the load well.`;
  }

  if (delta <= -5) {
    return `HRV is ${Math.abs(delta).toFixed(1)}% below baseline — back off volume to recover fully.`;
  }

  return "HRV is tracking near baseline. Stay consistent with sleep and hydration to keep it stable.";
};

const getRhrInsight = (
  current: number | null,
  baseline: number | null,
): string => {
  if (current === null || baseline === null) {
    return "Resting heart rate baseline not available yet.";
  }

  const delta = current - baseline;

  if (delta <= -2) {
    return `Resting HR is ${Math.abs(delta).toFixed(1)} bpm below baseline — excellent recovery trend.`;
  }

  if (delta >= 3) {
    return `Resting HR is ${delta.toFixed(1)} bpm above baseline — watch fatigue and consider an easier day.`;
  }

  return "Resting HR is holding steady, which supports your current training load.";
};

type ZoneBreakdown = {
  label: string;
  description: string;
  color: string;
  percentage: number;
};

const buildZoneBreakdown = (zoneDuration: unknown): ZoneBreakdown[] => {
  if (!zoneDuration || typeof zoneDuration !== "object") {
    return [];
  }

  const entries = HEART_RATE_ZONES.map((zone) => {
    const rawValue = (zoneDuration as Record<string, unknown>)[zone.key];
    const milliseconds = toNumber(rawValue) ?? 0;
    return {
      ...zone,
      milliseconds,
    };
  });

  const total = entries.reduce((sum, entry) => sum + entry.milliseconds, 0);

  if (total === 0) {
    return [];
  }

  return entries.map((entry) => ({
    label: entry.label,
    description: entry.description,
    color: entry.color,
    percentage: Math.round((entry.milliseconds / total) * 100),
  }));
};

const getWorkoutStrain = (workout: unknown): number | null => {
  if (!workout || typeof workout !== "object") {
    return null;
  }

  const score = (workout as { score?: unknown }).score;
  if (!score || typeof score !== "object") {
    return null;
  }

  const strain = (score as Record<string, unknown>).strain;
  return toNumber(strain);
};

const getWorkoutAverageHeartRate = (workout: unknown): number | null => {
  if (!workout || typeof workout !== "object") {
    return null;
  }

  const score = (workout as { score?: unknown }).score;
  if (score && typeof score === "object") {
    const avg = (score as Record<string, unknown>).average_heart_rate;
    const parsed = toNumber(avg);
    if (parsed !== null) {
      return parsed;
    }
  }

  const during = (workout as { during?: unknown }).during;
  if (during && typeof during === "object") {
    const avg = (during as Record<string, unknown>).average_heart_rate;
    return toNumber(avg);
  }

  return null;
};

const getWorkoutDurationMinutes = (
  workout: { start?: Date | string; end?: Date | string } | undefined,
): number | null => {
  if (!workout?.start || !workout?.end) {
    return null;
  }

  const start =
    typeof workout.start === "string" ? new Date(workout.start) : workout.start;
  const end =
    typeof workout.end === "string" ? new Date(workout.end) : workout.end;
  const diffMilliseconds = end.getTime() - start.getTime();
  return diffMilliseconds > 0 ? diffMilliseconds / 60000 : null;
};

export {
  HEART_RATE_ZONES,
  buildZoneBreakdown,
  formatMinutes,
  formatPercentage,
  formatWhoopTimestamp,
  getHrvInsight,
  getRecoveryDescriptor,
  getRhrInsight,
  getStrainEmoji,
  getTrainingRecommendation,
  getWorkoutAverageHeartRate,
  getWorkoutDurationMinutes,
  getWorkoutStrain,
  toNumber,
};
export type { ZoneBreakdown };
