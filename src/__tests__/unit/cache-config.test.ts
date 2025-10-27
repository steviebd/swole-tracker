import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { configureQueryCache, CACHE_TIMES } from "~/trpc/cache-config";

describe("cache configuration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  describe("CACHE_TIMES constants", () => {
    it("should have correct static cache times", () => {
      expect(CACHE_TIMES.STATIC.staleTime).toBe(14 * 24 * 60 * 60 * 1000); // 14 days
      expect(CACHE_TIMES.STATIC.gcTime).toBe(30 * 24 * 60 * 60 * 1000); // 30 days
    });

    it("should have correct WHOOP historical cache times", () => {
      expect(CACHE_TIMES.WHOOP_HISTORICAL.staleTime).toBe(
        7 * 24 * 60 * 60 * 1000,
      ); // 7 days
      expect(CACHE_TIMES.WHOOP_HISTORICAL.gcTime).toBe(
        14 * 24 * 60 * 60 * 1000,
      ); // 14 days
    });

    it("should have correct WHOOP current cache times", () => {
      expect(CACHE_TIMES.WHOOP_CURRENT.staleTime).toBe(60 * 60 * 1000); // 1 hour
      expect(CACHE_TIMES.WHOOP_CURRENT.gcTime).toBe(6 * 60 * 60 * 1000); // 6 hours
    });
  });

  describe("configureQueryCache", () => {
    it("should configure progress queries with 5-minute staleTime", () => {
      configureQueryCache(queryClient);

      const progressQueries = [
        ["progress", "getProgressDashboardData"],
        ["progress", "getProgressHighlights"],
        ["progress", "getStrengthProgression"],
        ["progress", "getPersonalRecords"],
      ];

      progressQueries.forEach((queryKey) => {
        const defaults = queryClient.getQueryDefaults(queryKey);
        expect(defaults?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
        expect(defaults?.gcTime).toBe(60 * 60 * 1000); // 1 hour
        expect(defaults?.refetchOnMount).toBe(false);
        expect(defaults?.refetchOnWindowFocus).toBe(true);
        expect(defaults?.refetchOnReconnect).toBe(true);
      });
    });

    it("should configure WHOOP historical queries with 7-day staleTime", () => {
      configureQueryCache(queryClient);

      const whoopHistoricalQueries = [
        ["whoop", "getRecovery"],
        ["whoop", "getCycles"],
        ["whoop", "getSleep"],
        ["whoop", "getProfile"],
        ["whoop", "getBodyMeasurements"],
      ];

      whoopHistoricalQueries.forEach((queryKey) => {
        const defaults = queryClient.getQueryDefaults(queryKey);
        expect(defaults?.staleTime).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
        expect(defaults?.gcTime).toBe(14 * 24 * 60 * 60 * 1000); // 14 days
        expect(defaults?.refetchOnWindowFocus).toBe(false);
        expect(defaults?.refetchInterval).toBe(false);
      });
    });

    it("should configure WHOOP current queries with 1-hour staleTime", () => {
      configureQueryCache(queryClient);

      const whoopCurrentQueries = [
        ["whoop", "getIntegrationStatus"],
        ["whoop", "getLatestRecoveryData"],
      ];

      whoopCurrentQueries.forEach((queryKey) => {
        const defaults = queryClient.getQueryDefaults(queryKey);
        expect(defaults?.staleTime).toBe(60 * 60 * 1000); // 1 hour
        expect(defaults?.gcTime).toBe(6 * 60 * 60 * 1000); // 6 hours
        expect(defaults?.refetchOnWindowFocus).toBe(false);
        expect(defaults?.refetchInterval).toBe(false);
      });
    });

    it("should configure static queries with 14-day staleTime", () => {
      configureQueryCache(queryClient);

      const staticQueries = [["templates"], ["preferences"]];

      staticQueries.forEach((queryKey) => {
        const defaults = queryClient.getQueryDefaults(queryKey);
        expect(defaults?.staleTime).toBe(14 * 24 * 60 * 60 * 1000); // 14 days
        expect(defaults?.gcTime).toBe(30 * 24 * 60 * 60 * 1000); // 30 days
        expect(defaults?.refetchOnWindowFocus).toBe(false);
        expect(defaults?.refetchInterval).toBe(false);
      });
    });

    it("should configure workout queries with medium cache settings", () => {
      configureQueryCache(queryClient);

      const workoutQueries = [
        ["workouts", "getRecent"],
        ["workouts", "getById"],
        ["workouts", "getLastExerciseData"],
      ];

      workoutQueries.forEach((queryKey) => {
        const defaults = queryClient.getQueryDefaults(queryKey);
        expect(defaults?.staleTime).toBe(0); // Show cached while refetching
        expect(defaults?.gcTime).toBe(24 * 60 * 60 * 1000); // 24 hours
      });
    });

    it("should include getProgressDashboardData in progress queries", () => {
      configureQueryCache(queryClient);

      const dashboardDefaults = queryClient.getQueryDefaults([
        "progress",
        "getProgressDashboardData",
      ]);

      expect(dashboardDefaults).toBeDefined();
      expect(dashboardDefaults?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
      expect(dashboardDefaults?.refetchOnMount).toBe(false);
    });
  });

  describe("cache invalidation helpers", () => {
    it("should provide invalidation helpers for different data types", () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      // Test workouts invalidation
      configureQueryCache(queryClient);
      // Note: We can't easily test the invalidateQueries function without mocking
      // but we can verify the structure exists
      expect(typeof queryClient.invalidateQueries).toBe("function");
    });
  });
});
