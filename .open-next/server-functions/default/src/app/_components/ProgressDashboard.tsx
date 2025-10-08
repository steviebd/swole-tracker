"use client";

import { useMemo, useState } from "react";

import { PageShell } from "~/components/layout/page-shell";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { ConsistencySection } from "./ConsistencySection";
import { ExerciseProgressionCard } from "./ExerciseProgressionCard";
import { PersonalRecordsSection } from "./PersonalRecordsSection";
import { RecentAchievements } from "./RecentAchievements";
import { StrengthProgressSection } from "./StrengthProgressSection";
import { WellnessHistorySection } from "./WellnessHistorySection";
import { WhoopIntegrationSection } from "./WhoopIntegrationSection";

type TimeRange = "week" | "month" | "year";

export function ProgressDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  
  // Fetch progress data using our new API endpoints
  const { data: volumeData, isLoading: volumeLoading } = api.progress.getVolumeProgression.useQuery({
    timeRange,
  });
  
  const { data: consistencyData, isLoading: consistencyLoading } = api.progress.getConsistencyStats.useQuery({
    timeRange,
  });
  
  const { data: exerciseList, isLoading: exerciseListLoading } = api.progress.getExerciseList.useQuery();


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
  const frequencyDelta =
    (consistencyData?.frequency ?? 0) - targetFrequency;

  const quickLinks = [
    { href: "#achievements", label: "Achievements" },
    { href: "#personal-records", label: "PRs" },
    { href: "#consistency", label: "Consistency" },
    { href: "#wellness", label: "Wellness" },
    { href: "#whoop", label: "Whoop" },
  ];

  const timeRangeSelector = (
    <div className="flex items-center gap-2 rounded-full bg-muted/40 p-1">
      {(["week", "month", "year"] as TimeRange[]).map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => setTimeRange(range)}
          aria-pressed={timeRange === range}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
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
              "rounded-full border border-border/50 text-xs uppercase tracking-wide text-muted-foreground hover:border-primary/40 hover:text-primary",
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
          <h3 className="text-sm font-medium mb-2 text-[var(--color-card-heading)]">Total Volume</h3>
          {volumeLoading ? (
            <div className="animate-pulse h-8 w-20 rounded bg-border"></div>
          ) : (
            <>
              <p className="text-2xl font-serif font-black text-foreground">
                {totalVolume.toLocaleString()} kg
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {volumeTrend >= 0
                  ? `+${Math.round(volumeTrend)} kg vs. start of ${timeRange}`
                  : `${Math.round(volumeTrend)} kg vs. start of ${timeRange}`}
              </p>
            </>
          )}
        </div>

        {/* Total Workouts */}
        <div className={cardClass + " p-6"}>
          <h3 className="text-sm font-medium mb-2 text-[var(--color-card-heading)]">Workouts</h3>
            {consistencyLoading ? (
              <div className="animate-pulse h-8 w-12 rounded bg-border"></div>
            ) : (
            <>
              <p className="text-2xl font-serif font-black text-foreground">
                {consistencyData?.totalWorkouts ?? 0}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {`${timeRange === "week" ? "This week" : `Last ${timeRange}`} you logged ${
                  consistencyData?.totalWorkouts ?? 0
                } sessions.`}
              </p>
            </>
          )}
        </div>

        {/* Workout Frequency */}
        <div className={cardClass + " p-6"}>
          <h3 className="text-sm font-medium mb-2 text-[var(--color-card-heading)]">Weekly Frequency</h3>
          {consistencyLoading ? (
            <div className="animate-pulse h-8 w-16 rounded bg-border"></div>
          ) : (
            <>
              <p className="text-2xl font-serif font-black text-foreground">
                {consistencyData?.frequency ?? 0}x
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {`${frequencyDelta >= 0 ? "+" : ""}${frequencyDelta.toFixed(1)} vs. target of ${targetFrequency}/week`}
              </p>
            </>
          )}
        </div>

        {/* Current Streak */}
        <div className={cardClass + " p-6"}>
          <h3 className="text-sm font-medium mb-2 text-[var(--color-card-heading)]">Current Streak</h3>
          {consistencyLoading ? (
            <div className="animate-pulse h-8 w-12 rounded bg-border"></div>
          ) : (
            <>
              <p className="text-2xl font-serif font-black text-foreground">
                {consistencyData?.currentStreak ?? 0} days
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Longest streak: {consistencyData?.longestStreak ?? 0} days
              </p>
            </>
          )}
        </div>
      </div>

      {/* Recent Achievements Section */}
      <section id="achievements" className="space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent achievements</h2>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Last {timeRange}
          </Badge>
        </header>
        <RecentAchievements />
      </section>

      {/* Exercise List */}
      <section className={cardClass + " p-6"}>
          <h2 className="text-xl font-serif font-black mb-4 gradient-text-accent">Your Exercises</h2>
          {exerciseListLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 rounded bg-border"></div>
              ))}
            </div>
          ) : exerciseList && exerciseList.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {exerciseList.map((exercise, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-primary/5 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">{exercise.exerciseName}</p>
                    <p className="text-sm text-muted-foreground">
                      Last used: {new Date(exercise.lastUsed).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">
                      {exercise.totalSets} sets
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No exercises found. Complete some workouts to see your progress!
            </p>
          )}
      </section>

      {/* Personal Records Section */}
      <section id="personal-records">
        <PersonalRecordsSection />
      </section>

      {/* Strength Progression Section */}
      <section id="volume">
        <StrengthProgressSection />
      </section>

      {/* Exercise Progression Section */}
      <section>
        <ExerciseProgressionCard />
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
