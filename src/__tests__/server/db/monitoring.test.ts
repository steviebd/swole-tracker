import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  dbMonitor,
  queryPerformanceMonitor,
  queueMonitor,
  monitorQuery,
  checkDatabaseHealth,
  monitoredDbQuery,
  type ConnectionMetrics,
  type QueryMetrics,
  type QueueMetrics,
} from "~/server/db/monitoring";
import { analytics } from "~/lib/analytics";

// Mock analytics - consistent with other tests
vi.mock("~/lib/analytics", () => ({
  analytics: {
    event: vi.fn(),
    databaseQueryPerformance: vi.fn(),
    progressSectionLoad: vi.fn(),
  },
}));

describe("Database Monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all monitors before each test
    dbMonitor.resetMetrics();
    queryPerformanceMonitor.resetMetrics();
    queueMonitor.resetMetrics();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("DatabaseMonitor", () => {
    it("should track successful queries", async () => {
      // Small delay to ensure uptime > 0
      await new Promise((resolve) => setTimeout(resolve, 10));

      dbMonitor.trackQuery(100, true);

      const metrics = dbMonitor.getMetrics();

      expect(metrics.totalQueries).toBe(1);
      expect(metrics.averageQueryTime).toBe(100);
      expect(metrics.errors).toBe(0);
      expect(metrics.uptime).toBeGreaterThan(0);
    });

    it("should track failed queries", () => {
      dbMonitor.trackQuery(200, false);

      const metrics = dbMonitor.getMetrics();

      expect(metrics.totalQueries).toBe(1);
      expect(metrics.averageQueryTime).toBe(200);
      expect(metrics.errors).toBe(1);
    });

    it("should calculate moving average for query times", () => {
      dbMonitor.trackQuery(100, true);
      dbMonitor.trackQuery(200, true);

      const metrics = dbMonitor.getMetrics();

      expect(metrics.totalQueries).toBe(2);
      expect(metrics.averageQueryTime).toBe(150); // (100 + 200) / 2
    });

    it("should handle first query correctly", () => {
      dbMonitor.trackQuery(150, true);

      const metrics = dbMonitor.getMetrics();

      expect(metrics.averageQueryTime).toBe(150);
    });

    it("should reset metrics", () => {
      dbMonitor.trackQuery(100, true);
      dbMonitor.trackQuery(200, false);

      dbMonitor.resetMetrics();

      const metrics = dbMonitor.getMetrics();
      expect(metrics.totalQueries).toBe(0);
      expect(metrics.averageQueryTime).toBe(0);
      expect(metrics.errors).toBe(0);
      // Uptime should be reset to current timestamp, so it should be >= 0
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    });

    it("should calculate uptime correctly", async () => {
      const initialMetrics = dbMonitor.getMetrics();
      const initialUptime = initialMetrics.uptime;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const laterMetrics = dbMonitor.getMetrics();
      expect(laterMetrics.uptime).toBeGreaterThan(initialUptime);
    });
  });

  describe("QueryPerformanceMonitor", () => {
    it("should record query metrics", () => {
      const metrics: QueryMetrics = {
        queryName: "test.query",
        duration: 100,
        success: true,
        rowCount: 10,
        timestamp: Date.now(),
        userId: "user123",
      };

      queryPerformanceMonitor.recordQuery(metrics);

      const stats = queryPerformanceMonitor.getQueryStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.averageDuration).toBe(100);
      expect(stats.errorRate).toBe(0);
      expect(stats.slowestQueries).toHaveLength(1);
      expect(stats.slowestQueries[0]).toEqual(metrics);
    });

    it("should handle multiple queries and calculate stats", () => {
      const metrics1: QueryMetrics = {
        queryName: "test.query1",
        duration: 100,
        success: true,
        timestamp: Date.now(),
      };
      const metrics2: QueryMetrics = {
        queryName: "test.query2",
        duration: 200,
        success: false,
        timestamp: Date.now(),
      };

      queryPerformanceMonitor.recordQuery(metrics1);
      queryPerformanceMonitor.recordQuery(metrics2);

      const stats = queryPerformanceMonitor.getQueryStats();
      expect(stats.totalQueries).toBe(2);
      expect(stats.averageDuration).toBe(150); // (100 + 200) / 2
      expect(stats.errorRate).toBe(0.5); // 1 error out of 2 queries
      expect(stats.slowestQueries).toHaveLength(2);
      expect(stats.slowestQueries[0]?.duration).toBe(200); // Slowest first
    });

    it("should return empty stats when no queries recorded", () => {
      const stats = queryPerformanceMonitor.getQueryStats();

      expect(stats.totalQueries).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.errorRate).toBe(0);
      expect(stats.slowestQueries).toHaveLength(0);
    });

    it("should filter slow queries by threshold", () => {
      const slowQuery: QueryMetrics = {
        queryName: "slow.query",
        duration: 150,
        success: true,
        timestamp: Date.now(),
      };
      const fastQuery: QueryMetrics = {
        queryName: "fast.query",
        duration: 50,
        success: true,
        timestamp: Date.now(),
      };

      queryPerformanceMonitor.recordQuery(slowQuery);
      queryPerformanceMonitor.recordQuery(fastQuery);

      const slowQueries = queryPerformanceMonitor.getSlowQueries(100);
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0]).toEqual(slowQuery);

      const allQueries = queryPerformanceMonitor.getSlowQueries(200);
      expect(allQueries).toHaveLength(0);
    });

    it("should group metrics by query name", () => {
      const metrics1: QueryMetrics = {
        queryName: "same.query",
        duration: 100,
        success: true,
        timestamp: Date.now(),
      };
      const metrics2: QueryMetrics = {
        queryName: "same.query",
        duration: 200,
        success: false,
        timestamp: Date.now(),
      };
      const metrics3: QueryMetrics = {
        queryName: "other.query",
        duration: 150,
        success: true,
        timestamp: Date.now(),
      };

      queryPerformanceMonitor.recordQuery(metrics1);
      queryPerformanceMonitor.recordQuery(metrics2);
      queryPerformanceMonitor.recordQuery(metrics3);

      const byName = queryPerformanceMonitor.getMetricsByQueryName();

      expect(byName["same.query"]).toEqual({
        count: 2,
        averageDuration: 150, // (100 + 200) / 2
        maxDuration: 200,
        errorCount: 1,
      });

      expect(byName["other.query"]).toEqual({
        count: 1,
        averageDuration: 150,
        maxDuration: 150,
        errorCount: 0,
      });
    });

    it("should limit stored metrics to max size", () => {
      // Mock the maxMetrics to be small for testing
      const monitor = new (queryPerformanceMonitor.constructor as any)();
      monitor.maxMetrics = 2;

      const metrics1: QueryMetrics = {
        queryName: "query1",
        duration: 100,
        success: true,
        timestamp: Date.now(),
      };
      const metrics2: QueryMetrics = {
        queryName: "query2",
        duration: 200,
        success: true,
        timestamp: Date.now(),
      };
      const metrics3: QueryMetrics = {
        queryName: "query3",
        duration: 300,
        success: true,
        timestamp: Date.now(),
      };

      monitor.recordQuery(metrics1);
      monitor.recordQuery(metrics2);
      monitor.recordQuery(metrics3);

      const stats = monitor.getQueryStats();
      expect(stats.totalQueries).toBe(2); // Should only keep last 2
      expect(stats.slowestQueries).toHaveLength(2);
    });

    it("should reset metrics", () => {
      const metrics: QueryMetrics = {
        queryName: "test.query",
        duration: 100,
        success: true,
        timestamp: Date.now(),
      };

      queryPerformanceMonitor.recordQuery(metrics);
      expect(queryPerformanceMonitor.getQueryStats().totalQueries).toBe(1);

      queryPerformanceMonitor.resetMetrics();
      expect(queryPerformanceMonitor.getQueryStats().totalQueries).toBe(0);
    });
  });

  describe("QueueMonitor", () => {
    it("should update and track queue depth", () => {
      queueMonitor.updateDepth(5);

      const metrics = queueMonitor.getMetrics();
      expect(metrics.depth).toBe(5);
    });

    it("should record processed items", () => {
      queueMonitor.recordProcessed(10);

      const metrics = queueMonitor.getMetrics();
      expect(metrics.processedCount).toBe(10);
      expect(metrics.lastProcessedAt).toBeDefined();
      expect(metrics.lastProcessedAt).toBeGreaterThan(0);
    });

    it("should record errors", () => {
      queueMonitor.recordError();
      queueMonitor.recordError();

      const metrics = queueMonitor.getMetrics();
      expect(metrics.errorCount).toBe(2);
    });

    it("should accumulate processed counts", () => {
      queueMonitor.recordProcessed(5);
      queueMonitor.recordProcessed(3);

      const metrics = queueMonitor.getMetrics();
      expect(metrics.processedCount).toBe(8);
    });

    it("should reset metrics", () => {
      queueMonitor.updateDepth(5);
      queueMonitor.recordProcessed(10);
      queueMonitor.recordError();

      queueMonitor.resetMetrics();

      const metrics = queueMonitor.getMetrics();
      expect(metrics.depth).toBe(0);
      expect(metrics.processedCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.lastProcessedAt).toBeUndefined();
    });
  });

  describe("monitorQuery function", () => {
    it("should track successful query", async () => {
      const queryFn = vi.fn().mockResolvedValue("success");

      const result = await monitorQuery("test.query", queryFn);

      expect(result).toBe("success");
      expect(queryFn).toHaveBeenCalled();

      const metrics = dbMonitor.getMetrics();
      expect(metrics.totalQueries).toBe(1);
      expect(metrics.errors).toBe(0);
    });

    it("should track failed query", async () => {
      const error = new Error("Query failed");
      const queryFn = vi.fn().mockRejectedValue(error);

      await expect(monitorQuery("test.query", queryFn)).rejects.toThrow(
        "Query failed",
      );

      const metrics = dbMonitor.getMetrics();
      expect(metrics.totalQueries).toBe(1);
      expect(metrics.errors).toBe(1);
    });

    it("should track query duration", async () => {
      const queryFn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "success";
      });

      await monitorQuery("test.query", queryFn);

      const metrics = dbMonitor.getMetrics();
      expect(metrics.averageQueryTime).toBeGreaterThan(0);
    });
  });

  describe("checkDatabaseHealth", () => {
    it("should return healthy status for successful query", async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue([{ rows: [{ 1: 1 }] }]),
      };

      const result = await checkDatabaseHealth(mockDb);

      expect(result.healthy).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
      expect(mockDb.execute).toHaveBeenCalledWith("SELECT 1");
    });

    it("should return unhealthy status for failed query", async () => {
      const error = new Error("Connection failed");
      const mockDb = {
        execute: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw error;
        }),
      };

      const result = await checkDatabaseHealth(mockDb);

      expect(result.healthy).toBe(false);
      expect(result.latency).toBeGreaterThan(0);
      expect(result.error).toBe("Connection failed");
    });

    it("should consider latency in health check", async () => {
      const mockDb = {
        execute: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return [{ 1: 1 }];
        }),
      };

      const result = await checkDatabaseHealth(mockDb);

      expect(result.healthy).toBe(true); // 100ms < 500ms threshold
      expect(result.latency).toBeGreaterThan(90);
    });

    it("should consider error rate in health check", async () => {
      // Simulate high error rate
      dbMonitor.trackQuery(100, false);
      dbMonitor.trackQuery(100, false);
      dbMonitor.trackQuery(100, false);
      dbMonitor.trackQuery(100, false);
      dbMonitor.trackQuery(100, false);
      dbMonitor.trackQuery(100, true); // 5 errors out of 6 = 83% error rate

      const mockDb = {
        execute: vi.fn().mockResolvedValue([{ 1: 1 }]),
      };

      const result = await checkDatabaseHealth(mockDb);

      expect(result.healthy).toBe(false); // Error rate > 10%
    });

    it("should handle zero queries for error rate calculation", async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue([{ 1: 1 }]),
      };

      const result = await checkDatabaseHealth(mockDb);

      expect(result.healthy).toBe(true);
      // Should not crash with zero queries
    });
  });

  describe("monitoredDbQuery", () => {
    it("should monitor successful database query", async () => {
      const queryFn = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const ctx = { userId: "user123", timings: new Map() };

      const result = await monitoredDbQuery("test.query", queryFn, ctx);

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
      expect(queryFn).toHaveBeenCalled();

      // Check analytics was called
      expect(analytics.databaseQueryPerformance).toHaveBeenCalledWith(
        "test.query",
        expect.any(Number),
        2, // row count
        "user123",
      );

      // Check timing was recorded
      expect(ctx.timings.has("db-test-query")).toBe(true);
    });

    it("should monitor failed database query", async () => {
      const error = new Error("Database error");
      const queryFn = vi.fn().mockRejectedValue(error);
      const ctx = { userId: "user123", timings: new Map() };

      await expect(
        monitoredDbQuery("test.query", queryFn, ctx),
      ).rejects.toThrow("Database error");

      // Check error analytics was called
      expect(analytics.event).toHaveBeenCalledWith("database.query.error", {
        queryName: "test.query",
        duration: expect.any(Number),
        error: "Database error",
        userId: "user123",
        timestamp: expect.any(String),
      });

      // Check timing was recorded even on error
      expect(ctx.timings.has("db-test-query")).toBe(true);
    });

    it("should handle query without context", async () => {
      const queryFn = vi.fn().mockResolvedValue("result");

      const result = await monitoredDbQuery("test.query", queryFn);

      expect(result).toBe("result");
      expect(analytics.databaseQueryPerformance).toHaveBeenCalledWith(
        "test.query",
        expect.any(Number),
        0, // no row count for non-array result
        "unknown",
      );
    });

    it("should handle non-array results", async () => {
      const queryFn = vi.fn().mockResolvedValue({ count: 5 });
      const ctx = { userId: "user123" };

      const result = await monitoredDbQuery("test.query", queryFn, ctx);

      expect(result).toEqual({ count: 5 });
      expect(analytics.databaseQueryPerformance).toHaveBeenCalledWith(
        "test.query",
        expect.any(Number),
        0, // row count should be 0 for non-array
        "user123",
      );
    });

    it("should sanitize query name for timing header", async () => {
      const queryFn = vi.fn().mockResolvedValue("result");
      const ctx = { timings: new Map() };

      await monitoredDbQuery("test.query.name", queryFn, ctx);

      expect(ctx.timings.has("db-test-query-name")).toBe(true);
    });

    it("should record query performance metrics", async () => {
      // Reset to ensure clean state
      queryPerformanceMonitor.resetMetrics();

      const queryFn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "result";
      });
      const ctx = { userId: "user123" };

      await monitoredDbQuery("performance.test", queryFn, ctx);

      const stats = queryPerformanceMonitor.getQueryStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });

    it("should record error performance metrics", async () => {
      const error = new Error("Test error");
      const queryFn = vi.fn().mockRejectedValue(error);
      const ctx = { userId: "user123" };

      await expect(
        monitoredDbQuery("error.test", queryFn, ctx),
      ).rejects.toThrow();

      const stats = queryPerformanceMonitor.getQueryStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.errorRate).toBe(1); // 100% error rate
    });
  });
});
