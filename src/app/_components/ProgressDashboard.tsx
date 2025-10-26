"use client";

import { useMemo, useState } from "react";

import { PageShell } from "~/components/layout/page-shell";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { ConsistencySection } from "./ConsistencySection";
import { PersonalRecordsSection } from "./PersonalRecordsSection";
import { RecentAchievements } from "./RecentAchievements";
import { StrengthProgressSection } from "./StrengthProgressSection";
import { WellnessHistorySection } from "./WellnessHistorySection";
import { WhoopIntegrationSection } from "./WhoopIntegrationSection";

type TimeRange = "week" | "month" | "year";

export function ProgressDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");

  // Fetch progress data using our new API endpoints
  const { data: volumeData, isLoading: volumeLoading } =
    api.progress.getVolumeProgression.useQuery({
      timeRange,
    });

  const { data: consistencyData, isLoading: consistencyLoading } =
    api.progress.getConsistencyStats.useQuery({
      timeRange,
    });

  const cardClass = `bg-card/90 border border-border rounded-lg shadow-sm transition-all duration-300 card-interactive hover:-translate-y-1 hover:shadow-xl`;

  const totalVolume = useMemo(() => {
    if (!volumeData) return 0;
    return volumeData.reduce((sum, day) => sum + (day.totalVolume ?? 0), 0);
  }, [volumeData]);

  const volumeTrend = useMemo(() => {
    if (!volumeData || volumeData.length < 2) return 0;
    const first = volumeData[0]?.totalVolume ?? 0;
    const last = volumeData[volumeData.length - 1]?.totalVolume ?? 0;
    return last - first;
  }, [volumeData]);

  const targetFrequency = 3;
  const frequencyDelta = (consistencyData?.frequency ?? 0) - targetFrequency;

  const quickLinks = [
    { href: "#achievements", label: "Achievements" },
    { href: "#personal-records", label: "PRs" },
    { href: "#consistency", label: "Consistency" },
    { href: "#wellness", label: "Wellness" },
    { href: "#whoop", label: "Whoop" },
  ];

  const timeRangeSelector = (
    <div className="bg-muted/40 flex items-center gap-2 rounded-full p-1">
      {(["week", "month", "year"] as TimeRange[]).map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => setTimeRange(range)}
          aria-pressed={timeRange === range}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors",
            timeRange === range
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-primary/10",
          )}
        >
          {range}
        </button>
      ))}
    </div>
  );

  return (
    <PageShell
      title="Progress Dashboard"
      description="Readiness, PRs, and habits that keep your training on track."
      backHref="/"
      backLabel="Dashboard"
      actions={timeRangeSelector}
      contentClassName="space-y-10"
    >
      <nav className="flex flex-wrap gap-2" aria-label="Progress sections">
        {quickLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary rounded-full border text-xs tracking-wide uppercase",
            )}
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Volume */}
        <div className={cardClass + " p-6"}>
          <h3 className="mb-2 text-sm font-medium text-[var(--color-card-heading)]">
            Total Volume
          </h3>
          {volumeLoading ? (
            <div className="bg-border h-8 w-20 animate-pulse rounded"></div>
          ) : (
            <>
              <p className="text-foreground font-serif text-2xl font-black">
                {totalVolume.toLocaleString()} kg
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                {volumeTrend >= 0
                  ? `+${Math.round(volumeTrend)} kg vs. start of ${timeRange}`
                  : `${Math.round(volumeTrend)} kg vs. start of ${timeRange}`}
              </p>
            </>
          )}
        </div>

        {/* Total Workouts */}
        <div className={cardClass + " p-6"}>
          <h3 className="mb-2 text-sm font-medium text-[var(--color-card-heading)]">
            Workouts
          </h3>
          {consistencyLoading ? (
            <div className="bg-border h-8 w-12 animate-pulse rounded"></div>
          ) : (
            <>
              <p className="text-foreground font-serif text-2xl font-black">
                {consistencyData?.totalWorkouts ?? 0}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                {`${timeRange === "week" ? "This week" : `Last ${timeRange}`} you logged ${
                  consistencyData?.totalWorkouts ?? 0
                } sessions.`}
              </p>
            </>
          )}
        </div>

        {/* Workout Frequency */}
        <div className={cardClass + " p-6"}>
          <h3 className="mb-2 text-sm font-medium text-[var(--color-card-heading)]">
            Weekly Frequency
          </h3>
          {consistencyLoading ? (
            <div className="bg-border h-8 w-16 animate-pulse rounded"></div>
          ) : (
            <>
              <p className="text-foreground font-serif text-2xl font-black">
                {consistencyData?.frequency ?? 0}x
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                {`${frequencyDelta >= 0 ? "+" : ""}${frequencyDelta.toFixed(1)} vs. target of ${targetFrequency}/week`}
              </p>
            </>
          )}
        </div>

        {/* Current Streak */}
        <div className={cardClass + " p-6"}>
          <h3 className="mb-2 text-sm font-medium text-[var(--color-card-heading)]">
            Current Streak
          </h3>
          {consistencyLoading ? (
            <div className="bg-border h-8 w-12 animate-pulse rounded"></div>
          ) : (
            <>
              <p className="text-foreground font-serif text-2xl font-black">
                {consistencyData?.currentStreak ?? 0} days
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                Longest streak: {consistencyData?.longestStreak ?? 0} days
              </p>
            </>
          )}
        </div>
      </div>

      {/* Recent Achievements Section */}
      <section id="achievements" className="space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold">
            Recent achievements
          </h2>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Last {timeRange}
          </Badge>
        </header>
        <RecentAchievements />
      </section>

      {/* Personal Records Section */}
      <section id="personal-records">
        <PersonalRecordsSection />
      </section>

      {/* Strength Progression Section */}
      <section id="volume">
        <StrengthProgressSection />
      </section>

      {/* Consistency Section */}
      <section id="consistency">
        <ConsistencySection />
      </section>

      {/* Wellness History Section */}
      <section id="wellness">
        <WellnessHistorySection timeRange={timeRange} />
      </section>

      {/* WHOOP Integration Section */}
      <section id="whoop">
        <WhoopIntegrationSection />
      </section>
    </PageShell>
  );
}
