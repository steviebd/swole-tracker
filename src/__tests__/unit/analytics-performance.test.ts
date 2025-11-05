import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  analytics,
  setPosthogClientForTesting,
  resetPosthogClientForTesting,
} from "~/lib/analytics";

const mockPosthog = {
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
};

describe("analytics performance tracking", () => {
  beforeEach(() => {
    mockPosthog.capture.mockClear();
    mockPosthog.identify.mockClear();
    mockPosthog.reset.mockClear();
    setPosthogClientForTesting(mockPosthog);
    // Mock navigator.onLine for analytics
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
    });
    // Mock window for timestamp generation
    Object.defineProperty(global, "window", {
      value: {
        location: { href: "http://localhost:3000" },
      },
      writable: true,
    });
  });

  afterEach(() => {
    resetPosthogClientForTesting();
  });

  describe("progressPageLoad", () => {
    it("should track progress page load performance", () => {
      const loadTime = 2500;
      const queryCount = 3;
      const dataPoints = 150;
      const cacheHit = true;

      expect(() => {
        analytics.progressPageLoad(loadTime, queryCount, dataPoints, cacheHit);
      }).not.toThrow();

      expect(mockPosthog.capture).toHaveBeenCalledWith("progress_page_load", {
        loadTime,
        queryCount,
        dataPoints,
        cacheHit,
        timestamp: expect.any(String),
      });
    });

    it("should handle cache miss scenarios", () => {
      const loadTime = 4500;
      const queryCount = 8;
      const dataPoints = 75;
      const cacheHit = false;

      analytics.progressPageLoad(loadTime, queryCount, dataPoints, cacheHit);

      expect(mockPosthog.capture).toHaveBeenCalledWith("progress_page_load", {
        loadTime,
        queryCount,
        dataPoints,
        cacheHit,
        timestamp: expect.any(String),
      });
    });
  });

  describe("progressSectionLoad", () => {
    it("should track section load performance", () => {
      const section = "highlights";
      const loadTime = 800;
      const dataPoints = 25;

      expect(() => {
        analytics.progressSectionLoad(section, loadTime, dataPoints);
      }).not.toThrow();

      expect(mockPosthog.capture).toHaveBeenCalledWith(
        "progress_section_load",
        {
          section,
          loadTime,
          dataPoints,
          timestamp: expect.any(String),
        },
      );
    });

    it("should handle section load errors", () => {
      const section = "strength";
      const loadTime = 1200;
      const dataPoints = 50;
      const error = "Database timeout";

      analytics.progressSectionLoad(section, loadTime, dataPoints, error);

      expect(mockPosthog.capture).toHaveBeenCalledWith(
        "progress_section_load",
        {
          section,
          loadTime,
          dataPoints,
          error,
          timestamp: expect.any(String),
        },
      );
    });

    it("should track different section types", () => {
      const sections = [
        "highlights",
        "strength",
        "consistency",
        "wellness",
        "whoop",
      ];

      sections.forEach((section) => {
        analytics.progressSectionLoad(section, 500, 20);
      });

      expect(mockPosthog.capture).toHaveBeenCalledTimes(sections.length);
      sections.forEach((section, index) => {
        expect(mockPosthog.capture).toHaveBeenNthCalledWith(
          index + 1,
          "progress_section_load",
          {
            section,
            loadTime: 500,
            dataPoints: 20,
            timestamp: expect.any(String),
          },
        );
      });
    });
  });

  describe("databaseQueryPerformance", () => {
    it("should track database query performance", () => {
      const queryName = "getProgressDashboardData";
      const duration = 150;
      const rowCount = 45;
      const userId = "user-123";

      expect(() => {
        analytics.databaseQueryPerformance(
          queryName,
          duration,
          rowCount,
          userId,
        );
      }).not.toThrow();

      expect(mockPosthog.capture).toHaveBeenCalledWith(
        "database_query_performance",
        {
          queryName,
          duration,
          rowCount,
          userId,
          timestamp: expect.any(String),
        },
      );
    });

    it("should handle different query types", () => {
      const queries = [
        { name: "calculatePersonalRecords", duration: 200, rows: 10 },
        { name: "getVolumeAndStrengthData", duration: 80, rows: 1 },
        { name: "getProgressHighlights", duration: 120, rows: 25 },
      ];

      queries.forEach(({ name, duration, rows }) => {
        analytics.databaseQueryPerformance(name, duration, rows, "user-456");
      });

      expect(mockPosthog.capture).toHaveBeenCalledTimes(queries.length);
    });

    it("should include timestamp in all events", () => {
      const beforeCall = Date.now();
      analytics.progressPageLoad(1000, 2, 50, true);
      const afterCall = Date.now();

      const call = mockPosthog.capture.mock.calls[0]![1] as any;
      const eventTimestamp = new Date(call.timestamp).getTime();

      expect(eventTimestamp).toBeGreaterThanOrEqual(beforeCall);
      expect(eventTimestamp).toBeLessThanOrEqual(afterCall);
    });
  });
});
