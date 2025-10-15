import { type QueryClient } from "@tanstack/react-query";

/**
 * Cache configuration constants for different data types
 * Updated to align with persistent caching strategy for improved performance
 */
export const CACHE_TIMES = {
  // Long-lived data (templates, preferences) - rarely change
  STATIC: {
    staleTime: 14 * 24 * 60 * 60 * 1000, // 14 days for templates as per TODO requirements
    gcTime: 30 * 24 * 60 * 60 * 1000, // 30 days - keep much longer for offline access
  },
  // WHOOP data - historical data that doesn't change
  WHOOP_HISTORICAL: {
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days for WHOOP data as per TODO requirements
    gcTime: 14 * 24 * 60 * 60 * 1000, // 14 days
  },
  // WHOOP current/live data - more recent but still cacheable
  WHOOP_CURRENT: {
    staleTime: 60 * 60 * 1000, // 1 hour for current WHOOP data
    gcTime: 6 * 60 * 60 * 1000, // 6 hours
  },
  // Medium-lived data (workout history) - show cached while refetching
  MEDIUM: {
    staleTime: 0, // Show cached data immediately while refetching in background
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep longer for offline access
  },
  // Dynamic data (current workout, jokes) - show cached while refetching
  DYNAMIC: {
    staleTime: 0, // Show cached data immediately while refetching in background
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  },
} as const;

/**
 * Configure query-specific cache settings
 */
export function configureQueryCache(queryClient: QueryClient) {
  // Templates - static data, cache aggressively (14 days)
  queryClient.setQueryDefaults(["templates"], {
    staleTime: CACHE_TIMES.STATIC.staleTime,
    gcTime: CACHE_TIMES.STATIC.gcTime,
    refetchOnWindowFocus: false, // Don't refetch templates on focus for performance
    refetchOnMount: true, // Ensure stale templates refetch when visiting the page again
    refetchOnReconnect: true,
    refetchInterval: false, // Disable automatic polling - rely on manual invalidation
  });

  // Preferences - static data, cache aggressively (14 days)
  queryClient.setQueryDefaults(["preferences"], {
    staleTime: CACHE_TIMES.STATIC.staleTime,
    gcTime: CACHE_TIMES.STATIC.gcTime,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Workouts - show cached data immediately while refetching in background
  queryClient.setQueryDefaults(["workouts", "getRecent"], {
    staleTime: CACHE_TIMES.MEDIUM.staleTime, // 0 - show cached while refetching
    gcTime: CACHE_TIMES.MEDIUM.gcTime,
    refetchOnWindowFocus: true,
    refetchInterval: false, // Disable polling - refetch on focus/mount is sufficient
  });

  queryClient.setQueryDefaults(["workouts", "getById"], {
    staleTime: CACHE_TIMES.MEDIUM.staleTime, // 0 - show cached while refetching
    gcTime: CACHE_TIMES.MEDIUM.gcTime,
    refetchOnWindowFocus: false, // Don't refetch on focus for individual workouts
  });

  queryClient.setQueryDefaults(["workouts", "getLastExerciseData"], {
    staleTime: CACHE_TIMES.MEDIUM.staleTime, // 0 - show cached while refetching
    gcTime: CACHE_TIMES.MEDIUM.gcTime,
    refetchOnWindowFocus: true, // Useful for exercise tracking
  });

  // Progress data - cache strategically for dashboard performance
  queryClient.setQueryDefaults(["progress", "getWorkoutDates"], {
    staleTime: 5 * 60 * 1000, // 5 minutes for workout dates
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false, // Don't refetch on focus for better UX
    refetchOnMount: false, // Use cached data if available
  });

  queryClient.setQueryDefaults(["progress", "getVolumeProgression"], {
    staleTime: 10 * 60 * 1000, // 10 minutes for volume data
    gcTime: 120 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  queryClient.setQueryDefaults(["progress", "getConsistencyStats"], {
    staleTime: 15 * 60 * 1000, // 15 minutes for consistency stats
    gcTime: 180 * 60 * 1000, // 3 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Jokes - dynamic data, show cached while refetching
  queryClient.setQueryDefaults(["jokes"], {
    staleTime: CACHE_TIMES.DYNAMIC.staleTime, // 0 - show cached while refetching
    gcTime: CACHE_TIMES.DYNAMIC.gcTime,
    refetchOnWindowFocus: true,
  });

  // WHOOP Integration Status - current data with moderate caching
  queryClient.setQueryDefaults(["whoop", "getIntegrationStatus"], {
    staleTime: CACHE_TIMES.WHOOP_CURRENT.staleTime, // 1 hour for status
    gcTime: CACHE_TIMES.WHOOP_CURRENT.gcTime,
    refetchOnWindowFocus: false, // Don't refetch on focus to prevent loops
    refetchInterval: false, // Disable automatic polling
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error && typeof error === "object" && "data" in error) {
        const errorData = error.data as any;
        if (errorData?.code === "UNAUTHORIZED" || errorData?.code === "NOT_FOUND") {
          return false;
        }
      }
      return failureCount < 2; // Max 2 retries for WHOOP queries
    },
    retryDelay: 5000, // 5 second delay between retries
  });

  // WHOOP Workouts - historical data, cache for 7 days
  queryClient.setQueryDefaults(["whoop", "getWorkouts"], {
    staleTime: CACHE_TIMES.WHOOP_HISTORICAL.staleTime, // 7 days for historical workouts
    gcTime: CACHE_TIMES.WHOOP_HISTORICAL.gcTime, // 14 days
    refetchOnWindowFocus: false, // Don't refetch on focus to prevent loops
    refetchInterval: false, // Disable automatic polling
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error && typeof error === "object" && "data" in error) {
        const errorData = error.data as any;
        if (errorData?.code === "UNAUTHORIZED" || errorData?.code === "NOT_FOUND") {
          return false;
        }
      }
      return failureCount < 2; // Max 2 retries for WHOOP queries
    },
    retryDelay: 5000, // 5 second delay between retries
  });

  // WHOOP Current/Live Data - moderate cache for real-time data  
  const whoopLiveQueries = ["getLatestRecoveryData"];
  whoopLiveQueries.forEach(queryType => {
    queryClient.setQueryDefaults(["whoop", queryType], {
      staleTime: CACHE_TIMES.WHOOP_CURRENT.staleTime, // 1 hour for current data
      gcTime: CACHE_TIMES.WHOOP_CURRENT.gcTime,
      refetchOnWindowFocus: false,
      refetchInterval: false,
      retry: (failureCount, error) => {
        if (error && typeof error === "object" && "data" in error) {
          const errorData = error.data as any;
          if (errorData?.code === "UNAUTHORIZED" || errorData?.code === "NOT_FOUND") {
            return false;
          }
        }
        return failureCount < 2;
      },
      retryDelay: 5000,
    });
  });
  
  // WHOOP Historical Data - cache for 7 days for data that doesn't change often
  const whoopHistoricalQueries = [
    "getRecovery", 
    "getCycles",
    "getSleep",
    "getProfile",
    "getBodyMeasurements"
  ];
  whoopHistoricalQueries.forEach(queryType => {
    queryClient.setQueryDefaults(["whoop", queryType], {
      staleTime: CACHE_TIMES.WHOOP_HISTORICAL.staleTime, // 7 days for historical data
      gcTime: CACHE_TIMES.WHOOP_HISTORICAL.gcTime, // 14 days
      refetchOnWindowFocus: false,
      refetchInterval: false,
      retry: (failureCount, error) => {
        if (error && typeof error === "object" && "data" in error) {
          const errorData = error.data as any;
          if (errorData?.code === "UNAUTHORIZED" || errorData?.code === "NOT_FOUND") {
            return false;
          }
        }
        return failureCount < 2;
      },
      retryDelay: 5000,
    });
  });
}

/**
 * Cache invalidation helpers for mutations
 */
export const invalidateQueries = {
  // Invalidate all workout-related queries
  workouts: (queryClient: QueryClient) => {
    void queryClient.invalidateQueries({ queryKey: ["workouts"] });
  },

  // Invalidate templates
  templates: (queryClient: QueryClient) => {
    void queryClient.invalidateQueries({ queryKey: ["templates"] });
  },

  // Invalidate preferences
  preferences: (queryClient: QueryClient) => {
    void queryClient.invalidateQueries({ queryKey: ["preferences"] });
  },

  // Invalidate jokes
  jokes: (queryClient: QueryClient) => {
    void queryClient.invalidateQueries({ queryKey: ["jokes"] });
  },

  // Invalidate WHOOP queries
  whoop: (queryClient: QueryClient) => {
    void queryClient.invalidateQueries({ queryKey: ["whoop"] });
  },

  // Invalidate all queries (for major data changes)
  all: (queryClient: QueryClient) => {
    void queryClient.invalidateQueries();
  },
} as const;
