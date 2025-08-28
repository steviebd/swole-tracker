"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";

/**
 * Shared hook for fetching workout data efficiently
 * Centralizes all workout date queries to reduce API calls
 */
export function useSharedWorkoutData() {
  const { data: thisWeekWorkouts, isLoading: thisWeekLoading, error: thisWeekError } =
    api.progress.getWorkoutDates.useQuery(
      { timeRange: "week" },
      {
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
      }
    );

  const { data: thisWeekVolume, isLoading: thisWeekVolumeLoading } =
    api.progress.getVolumeProgression.useQuery(
      { timeRange: "week" },
      {
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
      }
    );

  const { data: consistencyData, isLoading: consistencyLoading } =
    api.progress.getConsistencyStats.useQuery(
      { timeRange: "week" },
      {
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
      }
    );

  const { data: monthWorkouts, isLoading: monthLoading } =
    api.progress.getWorkoutDates.useQuery(
      { timeRange: "month" },
      {
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
      }
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

  const { data: lastWeekWorkouts, isLoading: lastWeekLoading } =
    api.progress.getWorkoutDates.useQuery(
      {
        timeRange: "week",
        startDate: lastWeekStart,
        endDate: lastWeekEnd,
      },
      {
        staleTime: 15 * 60 * 1000, // 15 minutes for historical data
        cacheTime: 30 * 60 * 1000, // 30 minutes
      }
    );

  const isLoading = thisWeekLoading || thisWeekVolumeLoading || consistencyLoading || monthLoading || lastWeekLoading;
  const error = thisWeekError?.message || null;

  return {
    // Current week data
    thisWeekWorkouts: thisWeekWorkouts || [],
    thisWeekVolume: thisWeekVolume || [],
    consistencyData: consistencyData,
    
    // Comparison data
    lastWeekWorkouts: lastWeekWorkouts || [],
    
    // Extended period for streaks
    monthWorkouts: monthWorkouts || [],
    
    // Loading and error states
    isLoading,
    error,
  };
}