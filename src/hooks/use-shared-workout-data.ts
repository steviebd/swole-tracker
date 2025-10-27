"use client";

import { useMemo } from "react";
import { api, type RouterOutputs } from "~/trpc/react";

type StrengthPulse = RouterOutputs["progress"]["getStrengthPulse"];

/**
 * Progressive data loading hook - loads critical data first, then secondary data
 * Reduces initial page load time by prioritizing essential information
 */
export function useSharedWorkoutData() {
  // Priority 1: Critical data for immediate display
  const {
    data: thisWeekWorkouts,
    isLoading: thisWeekLoading,
    error: thisWeekError,
  } = api.progress.getWorkoutDates.useQuery(
    { timeRange: "week" },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnMount: false, // Don't refetch if data exists
    },
  );

  // Priority 2: Load volume data only after we have basic workout data
  const { data: thisWeekVolume, isLoading: thisWeekVolumeLoading } =
    api.progress.getVolumeProgression.useQuery(
      { timeRange: "week" },
      {
        enabled: !!thisWeekWorkouts, // Only load after first query completes
        staleTime: 10 * 60 * 1000, // Longer stale time for secondary data
        gcTime: 20 * 60 * 1000,
        refetchOnMount: false,
      },
    );

  // Priority 3: Load consistency data after volume data
  const { data: consistencyData, isLoading: consistencyLoading } =
    api.progress.getConsistencyStats.useQuery(
      { timeRange: "week" },
      {
        enabled: !!thisWeekWorkouts, // Only load after basic data
        staleTime: 10 * 60 * 1000,
        gcTime: 20 * 60 * 1000,
        refetchOnMount: false,
      },
    );

  const { data: strengthPulseData, isLoading: strengthPulseLoading } =
    api.progress.getStrengthPulse.useQuery(
      { timeRange: "week" },
      {
        enabled: !!thisWeekWorkouts,
        staleTime: 10 * 60 * 1000,
        gcTime: 20 * 60 * 1000,
        refetchOnMount: false,
      },
    );

  // Priority 4: Monthly data for streaks - lowest priority
  const { data: monthWorkouts, isLoading: monthLoading } =
    api.progress.getWorkoutDates.useQuery(
      { timeRange: "month" },
      {
        enabled: !!thisWeekWorkouts, // Only load after critical data
        staleTime: 15 * 60 * 1000, // Longer cache for historical data
        gcTime: 30 * 60 * 1000,
        refetchOnMount: false,
      },
    );

  // Last week data for comparisons
  const lastWeekStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 14);
    return date;
  }, []);

  const lastWeekEnd = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  }, []);

  // Priority 5: Comparison data - load last for trends
  const { data: lastWeekVolume, isLoading: lastWeekVolumeLoading } =
    api.progress.getVolumeProgression.useQuery(
      {
        timeRange: "week",
        startDate: lastWeekStart,
        endDate: lastWeekEnd,
      },
      {
        enabled: !!thisWeekWorkouts && !!thisWeekVolume,
        staleTime: 30 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        refetchOnMount: false,
      },
    );

  const { data: lastWeekWorkouts, isLoading: lastWeekLoading } =
    api.progress.getWorkoutDates.useQuery(
      {
        timeRange: "week",
        startDate: lastWeekStart,
        endDate: lastWeekEnd,
      },
      {
        enabled: !!thisWeekWorkouts && !!thisWeekVolume, // Load after primary data
        staleTime: 30 * 60 * 1000, // Very long cache for comparison data
        gcTime: 60 * 60 * 1000, // 1 hour
        refetchOnMount: false,
      },
    );

  // Progressive loading states
  const isCriticalLoading = thisWeekLoading;
  const isSecondaryLoading =
    thisWeekVolumeLoading ||
    consistencyLoading ||
    strengthPulseLoading ||
    lastWeekVolumeLoading;
  const isExtendedLoading = monthLoading || lastWeekLoading;
  const isLoading = isCriticalLoading; // Only critical data blocks rendering
  const error = thisWeekError?.message || null;

  return {
    // Current week data (always available first)
    thisWeekWorkouts: thisWeekWorkouts || [],
    thisWeekVolume: thisWeekVolume?.data || [],
    consistencyData: consistencyData,
    strengthPulse: (strengthPulseData ?? null) as StrengthPulse | null,
    lastWeekVolume: lastWeekVolume?.data || [],

    // Comparison data (loads progressively)
    lastWeekWorkouts: lastWeekWorkouts || [],

    // Extended period for streaks (loads last)
    monthWorkouts: monthWorkouts || [],

    // Progressive loading states
    isLoading, // Only critical data blocks rendering
    isCriticalLoading,
    isSecondaryLoading,
    isExtendedLoading,

    // Data availability flags
    hasCriticalData: !!thisWeekWorkouts,
    hasSecondaryData: !!thisWeekVolume || !!consistencyData,
    hasExtendedData: !!monthWorkouts || !!lastWeekWorkouts,

    error,
  };
}
