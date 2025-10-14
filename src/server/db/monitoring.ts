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
      dbMonitor.trackQuery(duration, true);
      return result;
    })
    .catch(error => {
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
    await db.execute('SELECT 1');
    const latency = Date.now() - startTime;
    
    const metrics = dbMonitor.getMetrics();
    
    // Consider healthy if:
    // - Query executed successfully
    // - Latency is reasonable (< 500ms)
    // - Error rate is low (< 10% of recent queries)
    const errorRate = metrics.totalQueries > 0 ? metrics.errors / metrics.totalQueries : 0;

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