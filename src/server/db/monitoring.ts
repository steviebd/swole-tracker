import { logger } from "~/lib/logger";

/**
 * Simplified database monitoring for basic health checks
 */

export interface ConnectionMetrics {
  totalQueries: number;
  averageQueryTime: number;
  errors: number;
  uptime: number;
}

export interface QueryMetrics {
  queryName: string;
  duration: number;
  success: boolean;
  rowCount?: number;
  timestamp: number;
  userId?: string;
}

export interface QueueMetrics {
  depth: number;
  processedCount: number;
  errorCount: number;
  lastProcessedAt?: number;
}

class DatabaseMonitor {
  private metrics: ConnectionMetrics = {
    totalQueries: 0,
    averageQueryTime: 0,
    errors: 0,
    uptime: Date.now(),
  };

  /**
   * Track basic query execution metrics
   */
  public trackQuery(duration: number, success: boolean) {
    this.metrics.totalQueries++;

    if (!success) {
      this.metrics.errors++;
    }

    // Update average query time (simple moving average)
    this.metrics.averageQueryTime =
      this.metrics.averageQueryTime === 0
        ? duration
        : (this.metrics.averageQueryTime + duration) / 2;
  }

  /**
   * Get current metrics
   */
  public getMetrics(): ConnectionMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime,
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  public resetMetrics() {
    this.metrics = {
      totalQueries: 0,
      averageQueryTime: 0,
      errors: 0,
      uptime: Date.now(),
    };
  }
}

class QueryPerformanceMonitor {
  private queryMetrics: QueryMetrics[] = [];
  private readonly maxMetrics = 1000;

  public recordQuery(metrics: QueryMetrics) {
    this.queryMetrics.push(metrics);
    if (this.queryMetrics.length > this.maxMetrics) {
      this.queryMetrics.shift();
    }
  }

  public getSlowQueries(thresholdMs = 100): QueryMetrics[] {
    return this.queryMetrics.filter((m) => m.duration > thresholdMs);
  }

  public getQueryStats(): {
    totalQueries: number;
    averageDuration: number;
    slowestQueries: QueryMetrics[];
    errorRate: number;
  } {
    const totalQueries = this.queryMetrics.length;
    if (totalQueries === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowestQueries: [],
        errorRate: 0,
      };
    }

    const totalDuration = this.queryMetrics.reduce(
      (sum, m) => sum + m.duration,
      0,
    );
    const errors = this.queryMetrics.filter((m) => !m.success).length;
    const slowestQueries = [...this.queryMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      totalQueries,
      averageDuration: totalDuration / totalQueries,
      slowestQueries,
      errorRate: errors / totalQueries,
    };
  }

  public getMetricsByQueryName(): Record<
    string,
    {
      count: number;
      averageDuration: number;
      maxDuration: number;
      errorCount: number;
    }
  > {
    const stats: Record<
      string,
      {
        count: number;
        totalDuration: number;
        maxDuration: number;
        errorCount: number;
      }
    > = {};

    for (const metric of this.queryMetrics) {
      if (!stats[metric.queryName]) {
        stats[metric.queryName] = {
          count: 0,
          totalDuration: 0,
          maxDuration: 0,
          errorCount: 0,
        };
      }

      const stat = stats[metric.queryName]!;
      stat.count++;
      stat.totalDuration += metric.duration;
      stat.maxDuration = Math.max(stat.maxDuration, metric.duration);
      if (!metric.success) {
        stat.errorCount++;
      }
    }

    // Convert to final format
    const result: Record<
      string,
      {
        count: number;
        averageDuration: number;
        maxDuration: number;
        errorCount: number;
      }
    > = {};

    for (const [queryName, stat] of Object.entries(stats)) {
      result[queryName] = {
        count: stat.count,
        averageDuration: stat.totalDuration / stat.count,
        maxDuration: stat.maxDuration,
        errorCount: stat.errorCount,
      };
    }

    return result;
  }

  public resetMetrics() {
    this.queryMetrics = [];
  }
}

class QueueMonitor {
  private metrics: QueueMetrics = {
    depth: 0,
    processedCount: 0,
    errorCount: 0,
  };

  public updateDepth(depth: number) {
    this.metrics.depth = depth;
  }

  public recordProcessed(count: number) {
    this.metrics.processedCount += count;
    this.metrics.lastProcessedAt = Date.now();
  }

  public recordError() {
    this.metrics.errorCount++;
  }

  public getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  public resetMetrics() {
    this.metrics = {
      depth: 0,
      processedCount: 0,
      errorCount: 0,
    };
  }
}

// Global database monitor instance
export const dbMonitor = new DatabaseMonitor();

// Global query performance monitor instance
export const queryPerformanceMonitor = new QueryPerformanceMonitor();

// Global queue monitor instance
export const queueMonitor = new QueueMonitor();

/**
 * Middleware function to wrap database queries with monitoring
 */
export function monitorQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();

  return queryFn()
    .then((result) => {
      const duration = Date.now() - startTime;
      dbMonitor.trackQuery(duration, true);
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      dbMonitor.trackQuery(duration, false);
      throw error;
    });
}

/**
 * Health check function for database connection
 */
export async function checkDatabaseHealth(db: any): Promise<{
  healthy: boolean;
  metrics: ConnectionMetrics;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Simple query to test connection
    await db.execute("SELECT 1");
    const latency = Date.now() - startTime;

    const metrics = dbMonitor.getMetrics();

    // Consider healthy if:
    // - Query executed successfully
    // - Latency is reasonable (< 500ms)
    // - Error rate is low (< 10% of recent queries)
    const errorRate =
      metrics.totalQueries > 0 ? metrics.errors / metrics.totalQueries : 0;

    const healthy = latency < 500 && errorRate < 0.1;

    return {
      healthy,
      metrics,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    return {
      healthy: false,
      metrics: dbMonitor.getMetrics(),
      latency,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Lightweight wrapper for database operations in tRPC procedures
 * Wraps db calls with monitoring to capture latency and error metrics
 */
export function monitoredDbQuery<T>(
  queryName: string,
  dbOperation: () => Promise<T>,
  ctx?: { timings?: Map<string, number>; userId?: string },
): Promise<T> {
  const startTime = Date.now();

  return monitorQuery(queryName, dbOperation)
    .then((result) => {
      const duration = Date.now() - startTime;

      // Record detailed metrics
      queryPerformanceMonitor.recordQuery({
        queryName,
        duration,
        success: true,
        rowCount: Array.isArray(result) ? result.length : undefined,
        timestamp: startTime,
        userId: ctx?.userId,
      });

      // Record timing for Server-Timing header
      if (ctx?.timings) {
        ctx.timings.set(`db-${queryName.replace(/\./g, "-")}`, duration);
      }
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;

      // Record detailed metrics even on error
      queryPerformanceMonitor.recordQuery({
        queryName,
        duration,
        success: false,
        timestamp: startTime,
        userId: ctx?.userId,
      });

      // Record timing even on error
      if (ctx?.timings) {
        ctx.timings.set(`db-${queryName.replace(/\./g, "-")}`, duration);
      }
      throw error;
    });
}
