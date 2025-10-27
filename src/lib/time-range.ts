export type ProgressTimeRange = "week" | "month" | "year";

const TIME_RANGE_LABELS: Record<ProgressTimeRange, { long: string; short: string }> =
  {
    week: { long: "This week", short: "Week" },
    month: { long: "This month", short: "Month" },
    year: { long: "This year", short: "Year" },
  };

const WEEKS_PER_RANGE: Record<ProgressTimeRange, number> = {
  week: 1,
  month: 4, // 4-week rolling block keeps Cloudflare D1 param counts low
  year: 52,
};

const DAYS_PER_RANGE: Record<ProgressTimeRange, number> = {
  week: 7,
  month: 30,
  year: 365,
};

export function formatTimeRangeLabel(
  range: ProgressTimeRange,
  opts?: { variant?: "short" | "long" },
) {
  const key = opts?.variant === "short" ? "short" : "long";
  return TIME_RANGE_LABELS[range]?.[key] ?? TIME_RANGE_LABELS.month[key];
}

export function getWeeksForRange(range: ProgressTimeRange) {
  return WEEKS_PER_RANGE[range] ?? WEEKS_PER_RANGE.month;
}

export function getDaysForRange(range: ProgressTimeRange) {
  return DAYS_PER_RANGE[range] ?? DAYS_PER_RANGE.month;
}
