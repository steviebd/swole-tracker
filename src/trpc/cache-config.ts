import { type QueryClient } from "@tanstack/react-query";

/**
 * Cache configuration constants for different data types
 */
export const CACHE_TIMES = {
  // Long-lived data (templates, preferences) - rarely change
  STATIC: {
    staleTime: 60 * 60 * 1000, // 60 minutes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  },
  // Medium-lived data (workout history) - changes occasionally
  MEDIUM: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  // Short-lived data (current workout, jokes) - changes frequently
  DYNAMIC: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
} as const;

/**
 * Configure query-specific cache settings
 */
export function configureQueryCache(queryClient: QueryClient) {
  // Templates - static data, cache aggressively
  queryClient.setQueryDefaults(["templates"], {
    staleTime: CACHE_TIMES.STATIC.staleTime,
    gcTime: CACHE_TIMES.STATIC.gcTime,
    refetchOnWindowFocus: false, // Don't refetch templates on focus
    refetchInterval: 30 * 60 * 1000, // Background refresh every 30 min
  });

  // Preferences - static data, cache aggressively
  queryClient.setQueryDefaults(["preferences"], {
    staleTime: CACHE_TIMES.STATIC.staleTime,
    gcTime: CACHE_TIMES.STATIC.gcTime,
    refetchOnWindowFocus: false,
    refetchInterval: 30 * 60 * 1000,
  });

  // Workouts - medium cache for history, shorter for recent
  queryClient.setQueryDefaults(["workouts", "getRecent"], {
    staleTime: CACHE_TIMES.MEDIUM.staleTime,
    gcTime: CACHE_TIMES.MEDIUM.gcTime,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // Background refresh every 5 min
  });

  queryClient.setQueryDefaults(["workouts", "getById"], {
    staleTime: CACHE_TIMES.MEDIUM.staleTime,
    gcTime: CACHE_TIMES.MEDIUM.gcTime,
    refetchOnWindowFocus: false,
  });

  queryClient.setQueryDefaults(["workouts", "getLastExerciseData"], {
    staleTime: CACHE_TIMES.MEDIUM.staleTime,
    gcTime: CACHE_TIMES.MEDIUM.gcTime,
    refetchOnWindowFocus: true,
  });

  // Jokes - dynamic data, shorter cache
  queryClient.setQueryDefaults(["jokes"], {
    staleTime: CACHE_TIMES.DYNAMIC.staleTime,
    gcTime: CACHE_TIMES.DYNAMIC.gcTime,
    refetchOnWindowFocus: true,
  });

  // WHOOP Integration - more conservative retry and cache settings
  queryClient.setQueryDefaults(["whoop", "getIntegrationStatus"], {
    staleTime: CACHE_TIMES.MEDIUM.staleTime,
    gcTime: CACHE_TIMES.MEDIUM.gcTime,
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

  // WHOOP Workouts - historical data, cache longer
  queryClient.setQueryDefaults(["whoop", "getWorkouts"], {
    staleTime: CACHE_TIMES.STATIC.staleTime, // 60 minutes for historical workouts
    gcTime: CACHE_TIMES.STATIC.gcTime, // 2 hours
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

  // WHOOP Current/Live Data - shorter cache for real-time data  
  const whoopLiveQueries = ["getLatestRecoveryData"];
  whoopLiveQueries.forEach(queryType => {
    queryClient.setQueryDefaults(["whoop", queryType], {
      staleTime: CACHE_TIMES.MEDIUM.staleTime, // 10 minutes for current data
      gcTime: CACHE_TIMES.MEDIUM.gcTime,
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
  
  // WHOOP Historical Data - longer cache for data that doesn't change often
  const whoopHistoricalQueries = [
    "getRecovery", 
    "getCycles",
    "getSleep",
    "getProfile",
    "getBodyMeasurements"
  ];
  whoopHistoricalQueries.forEach(queryType => {
    queryClient.setQueryDefaults(["whoop", queryType], {
      staleTime: CACHE_TIMES.STATIC.staleTime, // 60 minutes for historical data
      gcTime: CACHE_TIMES.STATIC.gcTime, // 2 hours
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
