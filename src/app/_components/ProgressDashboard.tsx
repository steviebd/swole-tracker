"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { StrengthProgressSection } from "./StrengthProgressSection";
import { VolumeTrackingSection } from "./VolumeTrackingSection";
import { ConsistencySection } from "./ConsistencySection";
import { PersonalRecordsSection } from "./PersonalRecordsSection";
import { RecentAchievements } from "./RecentAchievements";
import { formatSafeDate } from "~/lib/utils";
import { WhoopIntegrationSection } from "./WhoopIntegrationSection";
import { WellnessHistorySection } from "./WellnessHistorySection";

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

  const { data: exerciseList, isLoading: exerciseListLoading } =
    api.progress.getExerciseList.useQuery({
      limit: 100,
      offset: 0,
    });

  const cardClass = `bg-card border border-border rounded-lg shadow-sm transition-all duration-300 card-interactive hover:-translate-y-1 hover:shadow-xl`;

  return (
    <div className="bg-horizon min-h-screen">
      {/* Header with Navigation */}
      <div className="glass-header sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/"
                className="text-muted-foreground hover:text-primary inline-flex items-center text-sm font-medium transition-colors"
              >
                <svg
                  className="mr-1 h-4 w-4 sm:mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
              <span className="text-border hidden sm:inline">/</span>
              <h1 className="gradient-text-primary font-serif text-lg font-black sm:text-xl">
                <span className="hidden sm:inline">Progress Dashboard</span>
                <span className="sm:hidden">Progress</span>
              </h1>
            </div>

            {/* Time Range Selector */}
            <div className="card-interactive flex space-x-1 self-start rounded-lg p-1 sm:self-center">
              {(["week", "month", "year"] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition-all sm:px-3 ${
                    timeRange === range
                      ? "gradient-primary text-white shadow-md"
                      : "btn-ghost hover:bg-primary/10"
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:mb-8 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {/* Total Volume */}
          <div className={cardClass + " p-6"}>
            <h3 className="text-muted-foreground mb-2 text-sm font-medium">
              Total Volume
            </h3>
            {volumeLoading ? (
              <div className="bg-border h-8 w-20 animate-pulse rounded"></div>
            ) : (
              <p className="text-foreground font-serif text-2xl font-black">
                {(
                  volumeData?.reduce((sum, day) => sum + day.totalVolume, 0) ||
                  0
                ).toLocaleString()}{" "}
                kg
              </p>
            )}
          </div>

          {/* Total Workouts */}
          <div className={cardClass + " p-6"}>
            <h3 className="text-muted-foreground mb-2 text-sm font-medium">
              Workouts
            </h3>
            {consistencyLoading ? (
              <div className="bg-border h-8 w-12 animate-pulse rounded"></div>
            ) : (
              <p className="text-foreground font-serif text-2xl font-black">
                {consistencyData?.totalWorkouts || 0}
              </p>
            )}
          </div>

          {/* Workout Frequency */}
          <div className={cardClass + " p-6"}>
            <h3 className="text-muted-foreground mb-2 text-sm font-medium">
              Weekly Frequency
            </h3>
            {consistencyLoading ? (
              <div className="bg-border h-8 w-16 animate-pulse rounded"></div>
            ) : (
              <p className="text-foreground font-serif text-2xl font-black">
                {consistencyData?.frequency || 0}x
              </p>
            )}
          </div>

          {/* Current Streak */}
          <div className={cardClass + " p-6"}>
            <h3 className="text-muted-foreground mb-2 text-sm font-medium">
              Current Streak
            </h3>
            {consistencyLoading ? (
              <div className="bg-border h-8 w-12 animate-pulse rounded"></div>
            ) : (
              <p className="text-foreground font-serif text-2xl font-black">
                {consistencyData?.currentStreak || 0} days
              </p>
            )}
          </div>
        </div>

        {/* Recent Achievements Section */}
        <div className="mb-8">
          <RecentAchievements />
        </div>

        {/* Exercise List */}
        <div className={cardClass + " mb-8 p-6"}>
          <h2 className="gradient-text-accent mb-4 font-serif text-xl font-black">
            Your Exercises
          </h2>
          {exerciseListLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-border h-12 animate-pulse rounded"
                ></div>
              ))}
            </div>
          ) : exerciseList && exerciseList.exercises.length > 0 ? (
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {exerciseList.exercises.map((exercise, index) => (
                <div
                  key={index}
                  className="bg-muted hover:bg-primary/5 flex items-center justify-between rounded-lg p-3 transition-colors"
                >
                  <div>
                    <p className="text-foreground font-medium">
                      {exercise.exerciseName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Last used:{" "}
                      {formatSafeDate(exercise.lastUsed)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-sm font-medium">
                      {exercise.totalSets} sets
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center">
              No exercises found. Complete some workouts to see your progress!
            </p>
          )}
        </div>

        {/* Personal Records Section */}
        <div className="mt-8">
          <PersonalRecordsSection />
        </div>

        {/* Strength Progression Section */}
        <div className="mt-8">
          <StrengthProgressSection />
        </div>

        {/* Volume Tracking Section */}
        <div id="volume" className="mt-8">
          <VolumeTrackingSection />
        </div>

        {/* Consistency Section */}
        <div id="consistency" className="mt-8">
          <ConsistencySection />
        </div>

        {/* Wellness History Section */}
        <div className="mt-8">
          <WellnessHistorySection timeRange={timeRange} />
        </div>

        {/* WHOOP Integration Section */}
        <div className="mt-8">
          <WhoopIntegrationSection />
        </div>
      </div>
    </div>
  );
}
