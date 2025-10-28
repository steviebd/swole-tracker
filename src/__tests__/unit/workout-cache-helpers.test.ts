import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import {
  warmProgressCaches,
  invalidateWorkoutDependentCaches,
} from "~/lib/workout-cache-helpers";

// Mock the api utils
const mockUtils = {
  progress: {
    getExerciseList: {
      fetch: vi.fn(),
    },
    getProgressDashboardData: {
      prefetch: vi.fn(),
      invalidate: vi.fn(),
    },
    getProgressHighlights: {
      prefetch: vi.fn(),
      invalidate: vi.fn(),
    },
    getExerciseStrengthProgression: {
      prefetch: vi.fn(),
      invalidate: vi.fn(),
    },
    getExerciseVolumeProgression: {
      prefetch: vi.fn(),
      invalidate: vi.fn(),
    },
    getWorkoutDates: {
      invalidate: vi.fn(),
    },
    getVolumeProgression: {
      invalidate: vi.fn(),
    },
    getConsistencyStats: {
      invalidate: vi.fn(),
    },
    getPersonalRecords: {
      invalidate: vi.fn(),
    },
  },
  workouts: {
    getRecent: {
      invalidate: vi.fn(),
    },
    getById: {
      invalidate: vi.fn(),
    },
  },
  templates: {
    getAll: {
      invalidate: vi.fn(),
    },
  },
  insights: {
    getExerciseInsights: {
      invalidate: vi.fn(),
    },
    getSessionInsights: {
      invalidate: vi.fn(),
    },
  },
  sessionDebriefs: {
    listRecent: {
      invalidate: vi.fn(),
    },
    listBySession: {
      invalidate: vi.fn(),
    },
  },
  healthAdvice: {
    getHistory: {
      invalidate: vi.fn(),
    },
    getBySessionId: {
      invalidate: vi.fn(),
    },
  },
  wellness: {
    getHistory: {
      invalidate: vi.fn(),
    },
    getBySessionId: {
      invalidate: vi.fn(),
    },
    getStats: {
      invalidate: vi.fn(),
    },
  },
};

describe("workout cache helpers", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  describe("warmProgressCaches", () => {
    it("should warm progress caches for users with exercises", async () => {
      const mockExerciseList = [
        {
          id: "exercise1",
          exerciseName: "Bench Press",
          lastUsed: new Date(),
          totalSets: 10,
          templateExerciseIds: ["template1"],
          masterExerciseId: 1,
        },
        {
          id: "exercise2",
          exerciseName: "Squat",
          lastUsed: new Date(),
          totalSets: 8,
          templateExerciseIds: ["template2"],
          masterExerciseId: 2,
        },
      ];

      mockUtils.progress.getExerciseList.fetch.mockResolvedValue(
        mockExerciseList,
      );

      await warmProgressCaches(mockUtils as any, "user123");

      // Should fetch exercise list
      expect(mockUtils.progress.getExerciseList.fetch).toHaveBeenCalled();

      // Should prefetch dashboard data
      expect(
        mockUtils.progress.getProgressDashboardData.prefetch,
      ).toHaveBeenCalledWith({
        timeRange: "month",
      });

      // Should prefetch progress highlights
      expect(
        mockUtils.progress.getProgressHighlights.prefetch,
      ).toHaveBeenCalledWith({
        tab: "prs",
        timeRange: "month",
      });

      // Should prefetch aggregated data for top exercises
      expect(
        mockUtils.progress.getExerciseStrengthProgression.prefetch,
      ).toHaveBeenCalledWith({
        exerciseName: "Bench Press",
        templateExerciseId: 1,
        timeRange: "quarter",
      });
      expect(
        mockUtils.progress.getExerciseVolumeProgression.prefetch,
      ).toHaveBeenCalledWith({
        exerciseName: "Bench Press",
        templateExerciseId: 1,
        timeRange: "quarter",
      });
      expect(
        mockUtils.progress.getExerciseStrengthProgression.prefetch,
      ).toHaveBeenCalledWith({
        exerciseName: "Squat",
        templateExerciseId: 2,
        timeRange: "quarter",
      });
      expect(
        mockUtils.progress.getExerciseVolumeProgression.prefetch,
      ).toHaveBeenCalledWith({
        exerciseName: "Squat",
        templateExerciseId: 2,
        timeRange: "quarter",
      });
    });

    it("should handle users with no exercises", async () => {
      mockUtils.progress.getExerciseList.fetch.mockResolvedValue([]);

      await warmProgressCaches(mockUtils as any, "user123");

      // Should fetch exercise list but not prefetch anything else
      expect(mockUtils.progress.getExerciseList.fetch).toHaveBeenCalled();
      expect(
        mockUtils.progress.getProgressDashboardData.prefetch,
      ).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      mockUtils.progress.getExerciseList.fetch.mockRejectedValue(
        new Error("Database error"),
      );

      // Should not throw
      await expect(
        warmProgressCaches(mockUtils as any, "user123"),
      ).resolves.toBeUndefined();
    });

    it("should limit to top 5 exercises", async () => {
      const mockExerciseList = Array.from({ length: 10 }, (_, i) => ({
        id: `exercise${i}`,
        exerciseName: `Exercise ${i}`,
        lastUsed: new Date(),
        totalSets: 10 - i,
        templateExerciseIds: [`template${i}`],
        masterExerciseId: i,
      }));

      mockUtils.progress.getExerciseList.fetch.mockResolvedValue(
        mockExerciseList,
      );

      await warmProgressCaches(mockUtils as any, "user123");

      // Should only prefetch for top 5 exercises (sorted by totalSets descending)
      expect(
        mockUtils.progress.getExerciseStrengthProgression.prefetch,
      ).toHaveBeenCalledTimes(5);
      expect(
        mockUtils.progress.getExerciseVolumeProgression.prefetch,
      ).toHaveBeenCalledTimes(5);
    });
  });

  describe("invalidateWorkoutDependentCaches", () => {
    it("should invalidate all workout-dependent caches", async () => {
      await invalidateWorkoutDependentCaches(mockUtils as any);

      // Check that all expected invalidations were called
      expect(mockUtils.workouts.getRecent.invalidate).toHaveBeenCalled();
      expect(mockUtils.templates.getAll.invalidate).toHaveBeenCalled();
      expect(mockUtils.progress.getWorkoutDates.invalidate).toHaveBeenCalled();
      expect(
        mockUtils.progress.getVolumeProgression.invalidate,
      ).toHaveBeenCalled();
      expect(
        mockUtils.progress.getConsistencyStats.invalidate,
      ).toHaveBeenCalled();
      expect(
        mockUtils.progress.getPersonalRecords.invalidate,
      ).toHaveBeenCalled();
      expect(
        mockUtils.progress.getProgressHighlights.invalidate,
      ).toHaveBeenCalled();
      expect(
        mockUtils.progress.getProgressDashboardData.invalidate,
      ).toHaveBeenCalled();
      expect(
        mockUtils.progress.getExerciseStrengthProgression.invalidate,
      ).toHaveBeenCalled();
      expect(
        mockUtils.progress.getExerciseVolumeProgression.invalidate,
      ).toHaveBeenCalled();
      expect(
        mockUtils.insights.getExerciseInsights.invalidate,
      ).toHaveBeenCalled();
      expect(
        mockUtils.insights.getSessionInsights.invalidate,
      ).toHaveBeenCalled();
      expect(
        mockUtils.sessionDebriefs.listRecent.invalidate,
      ).toHaveBeenCalled();
      expect(mockUtils.healthAdvice.getHistory.invalidate).toHaveBeenCalled();
      expect(mockUtils.wellness.getHistory.invalidate).toHaveBeenCalled();
      expect(mockUtils.wellness.getStats.invalidate).toHaveBeenCalled();
    });

    it("should invalidate session-specific caches when sessionIds provided", async () => {
      const sessionIds = [123, 456];

      await invalidateWorkoutDependentCaches(mockUtils as any, sessionIds);

      // Check session-specific invalidations
      expect(mockUtils.workouts.getById.invalidate).toHaveBeenCalledWith({
        id: 123,
      });
      expect(mockUtils.workouts.getById.invalidate).toHaveBeenCalledWith({
        id: 456,
      });
      expect(
        mockUtils.sessionDebriefs.listBySession.invalidate,
      ).toHaveBeenCalledWith({ sessionId: 123 });
      expect(
        mockUtils.sessionDebriefs.listBySession.invalidate,
      ).toHaveBeenCalledWith({ sessionId: 456 });
      expect(
        mockUtils.healthAdvice.getBySessionId.invalidate,
      ).toHaveBeenCalledWith({ sessionId: 123 });
      expect(
        mockUtils.healthAdvice.getBySessionId.invalidate,
      ).toHaveBeenCalledWith({ sessionId: 456 });
      expect(mockUtils.wellness.getBySessionId.invalidate).toHaveBeenCalledWith(
        { sessionId: 123 },
      );
      expect(mockUtils.wellness.getBySessionId.invalidate).toHaveBeenCalledWith(
        { sessionId: 456 },
      );
    });

    it("should handle invalidation errors gracefully", async () => {
      mockUtils.workouts.getRecent.invalidate.mockRejectedValue(
        new Error("Invalidation failed"),
      );

      // Should not throw despite the error
      await expect(
        invalidateWorkoutDependentCaches(mockUtils as any),
      ).resolves.toBeUndefined();
    });
  });
});
