import { logger } from "~/lib/logger";

/**
 * Database connection monitoring and performance metrics
 */

export interface ConnectionMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  waitingQueries: number;
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  errors: number;
  uptime: number;
}

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

class DatabaseMonitor {
  private metrics: ConnectionMetrics = {
    activeConnections: 0,
    idleConnections: 0,
    totalConnections: 0,
    waitingQueries: 0,
    totalQueries: 0,
    averageQueryTime: 0,
    slowQueries: 0,
    errors: 0,
    uptime: Date.now(),
  };

  private queryHistory: QueryMetrics[] = [];
  private readonly maxHistorySize = 1000;
  private readonly slowQueryThreshold = 1000; // 1 second

  /**
   * Track query execution metrics
   */
  public trackQuery(query: string, duration: number, success: boolean, error?: string) {
    const queryMetric: QueryMetrics = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      success,
      error,
    };

    // Update metrics
    this.metrics.totalQueries++;
    
    if (!success) {
      this.metrics.errors++;
      logger.warn("Database query error", { query: queryMetric.query, error });
    }

    if (duration > this.slowQueryThreshold) {
      this.metrics.slowQueries++;
      logger.warn("Slow database query detected", { 
        query: queryMetric.query, 
        duration,
        threshold: this.slowQueryThreshold 
      });
    }

    // Update average query time (exponential moving average)
    this.metrics.averageQueryTime = 
      this.metrics.averageQueryTime === 0 
        ? duration 
        : (this.metrics.averageQueryTime * 0.9) + (duration * 0.1);

    // Store in history (circular buffer)
    this.queryHistory.push(queryMetric);
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory.shift();
    }

    // Log performance metrics periodically
    if (this.metrics.totalQueries % 100 === 0) {
      this.logPerformanceMetrics();
    }
  }

  /**
   * Update connection pool metrics
   */
  public updateConnectionMetrics(stats: {
    active: number;
    idle: number;
    total: number;
    waiting: number;
  }) {
    this.metrics.activeConnections = stats.active;
    this.metrics.idleConnections = stats.idle;
    this.metrics.totalConnections = stats.total;
    this.metrics.waitingQueries = stats.waiting;

    // Log connection pool warnings
    if (stats.waiting > 5) {
      logger.warn("High number of waiting queries", { waiting: stats.waiting });
    }

    if (stats.active / stats.total > 0.8) {
      logger.warn("High connection pool utilization", { 
        utilization: `${Math.round((stats.active / stats.total) * 100)}%`,
        active: stats.active,
        total: stats.total
      });
    }
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
   * Get recent query history
   */
  public getQueryHistory(limit: number = 50): QueryMetrics[] {
    return this.queryHistory.slice(-limit);
  }

  /**
   * Get slow queries from recent history
   */
  public getSlowQueries(limit: number = 20): QueryMetrics[] {
    return this.queryHistory
      .filter(q => q.duration > this.slowQueryThreshold)
      .slice(-limit);
  }

  /**
   * Get error queries from recent history
   */
  public getErrorQueries(limit: number = 20): QueryMetrics[] {
    return this.queryHistory
      .filter(q => !q.success)
      .slice(-limit);
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  public resetMetrics() {
    this.metrics = {
      activeConnections: this.metrics.activeConnections,
      idleConnections: this.metrics.idleConnections,
      totalConnections: this.metrics.totalConnections,
      waitingQueries: this.metrics.waitingQueries,
      totalQueries: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      errors: 0,
      uptime: Date.now(),
    };
    this.queryHistory = [];
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/VALUES\s*\([^)]+\)/gi, 'VALUES (...)')
      .replace(/=\s*'[^']*'/gi, "= '[REDACTED]'")
      .replace(/=\s*\$\d+/gi, '= $[PARAM]')
      .substring(0, 200); // Limit length
  }

  /**
   * Log performance metrics
   */
  private logPerformanceMetrics() {
    const metrics = this.getMetrics();
    const recentErrors = this.getErrorQueries(10);
    const recentSlowQueries = this.getSlowQueries(10);

    logger.info("Database performance metrics", {
      totalQueries: metrics.totalQueries,
      averageQueryTime: Math.round(metrics.averageQueryTime),
      slowQueries: metrics.slowQueries,
      errors: metrics.errors,
      activeConnections: metrics.activeConnections,
      connectionUtilization: `${Math.round((metrics.activeConnections / metrics.totalConnections) * 100)}%`,
      uptime: Math.round(metrics.uptime / 1000 / 60), // minutes
    });

    if (recentErrors.length > 0) {
      logger.warn("Recent database errors", { 
        count: recentErrors.length,
        errors: recentErrors.map(e => ({ query: e.query, error: e.error }))
      });
    }

    if (recentSlowQueries.length > 0) {
      logger.warn("Recent slow queries", { 
        count: recentSlowQueries.length,
        queries: recentSlowQueries.map(q => ({ 
          query: q.query, 
          duration: q.duration 
        }))
      });
    }
  }
}

// Global database monitor instance
export const dbMonitor = new DatabaseMonitor();

/**
 * Middleware function to wrap database queries with monitoring
 */
export function monitorQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  return queryFn()
    .then(result => {
      const duration = Date.now() - startTime;
      dbMonitor.trackQuery(queryName, duration, true);
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      dbMonitor.trackQuery(queryName, duration, false, error.message);
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
    await db.execute('SELECT 1');
    const latency = Date.now() - startTime;
    
    const metrics = dbMonitor.getMetrics();
    
    // Consider healthy if:
    // - Query executed successfully
    // - Latency is reasonable (< 500ms)
    // - Error rate is low (< 10% of recent queries)
    // - Not too many slow queries (< 20% of recent queries)
    const errorRate = metrics.totalQueries > 0 ? metrics.errors / metrics.totalQueries : 0;
    const slowQueryRate = metrics.totalQueries > 0 ? metrics.slowQueries / metrics.totalQueries : 0;
    
    const healthy = latency < 500 && errorRate < 0.1 && slowQueryRate < 0.2;
    
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