/**
 * Query Performance Monitoring for D1/SQLite Compatibility
 * 
 * Provides utilities for monitoring and optimizing database queries
 * specifically for Cloudflare D1's limitations and performance characteristics.
 */

import { logger } from "~/lib/logger";

// D1 Performance Limits
export const D1_LIMITS = {
  CPU_TIME_MS: 10, // 10ms CPU time limit per query
  MAX_RESULT_ROWS: 100000, // Practical limit for result sets
  MAX_INARRAY_PARAMS: 100, // Safe limit for inArray() operations
  QUERY_TIMEOUT_MS: 5000, // 5 second timeout for complex queries
} as const;

// Query performance metrics
interface QueryMetrics {
  queryName: string;
  executionTimeMs: number;
  resultCount?: number;
  parameterCount?: number;
  userId?: string;
  success: boolean;
  error?: string;
}

// Query performance tracker
class QueryPerformanceTracker {
  private metrics: QueryMetrics[] = [];
  private enabled: boolean;

  constructor() {
    // Enable in development, tests, or when specifically requested
    this.enabled = 
      process.env.NODE_ENV === 'development' || 
      process.env.ENABLE_QUERY_PERFORMANCE === 'true' ||
      Boolean(process.env.VITEST) ||
      process.env.NODE_ENV === 'test';
  }

  /**
   * Track the performance of a database query
   */
  async trackQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    options: {
      userId?: string;
      parameterCount?: number;
      expectedMaxResults?: number;
    } = {}
  ): Promise<T> {
    if (!this.enabled) {
      return queryFn();
    }

    const startTime = performance.now();
    let result: T;
    let error: string | undefined;
    let success = true;

    try {
      result = await queryFn();
      
      // Check for potential D1 limit violations
      const executionTime = performance.now() - startTime;
      if (executionTime > D1_LIMITS.CPU_TIME_MS * 0.8) { // 80% of limit
        logger.warn(`Query "${queryName}" approaching D1 CPU limit`, {
          executionTimeMs: executionTime,
          limit: D1_LIMITS.CPU_TIME_MS,
          userId: options.userId
        });
      }

      // Check result count if it's an array
      if (Array.isArray(result) && result.length > D1_LIMITS.MAX_RESULT_ROWS * 0.8) {
        logger.warn(`Query "${queryName}" returning large result set`, {
          resultCount: result.length,
          limit: D1_LIMITS.MAX_RESULT_ROWS,
          userId: options.userId
        });
      }

    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`Query "${queryName}" failed`, {
        error,
        userId: options.userId,
        executionTimeMs: performance.now() - startTime
      });
      throw err;
    }

    const metrics: QueryMetrics = {
      queryName,
      executionTimeMs: performance.now() - startTime,
      resultCount: Array.isArray(result) ? result.length : undefined,
      parameterCount: options.parameterCount,
      userId: options.userId,
      success,
      error
    };

    this.logMetrics(metrics);
    return result;
  }

  /**
   * Validate inArray parameters don't exceed D1 limits
   */
  validateInArrayParams<T>(params: T[], queryName: string): T[] {
    if (params.length > D1_LIMITS.MAX_INARRAY_PARAMS) {
      logger.warn(`Query "${queryName}" inArray params exceed recommended limit`, {
        paramCount: params.length,
        limit: D1_LIMITS.MAX_INARRAY_PARAMS
      });
      
      // In production, we might want to batch the query
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Query parameter count (${params.length}) exceeds D1 limit (${D1_LIMITS.MAX_INARRAY_PARAMS})`);
      }
    }
    return params;
  }

  /**
   * Create batched inArray operations for large parameter sets
   */
  async batchInArrayQuery<TParam, TResult>(
    params: TParam[],
    batchSize: number = D1_LIMITS.MAX_INARRAY_PARAMS,
    queryFn: (batchParams: TParam[]) => Promise<TResult[]>,
    queryName: string = 'batchInArrayQuery'
  ): Promise<TResult[]> {
    if (params.length <= batchSize) {
      // No batching needed
      return queryFn(params);
    }

    const results: TResult[] = [];
    const batches = chunkInArrayParams(params, batchSize);
    
    logger.info(`Batching large inArray query "${queryName}"`, {
      totalParams: params.length,
      batchCount: batches.length,
      batchSize
    });

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!;
      const batchResults = await this.trackQuery(
        `${queryName}_batch_${i}`,
        () => queryFn(batch),
        { parameterCount: batch.length }
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Paginated query helper for large datasets
   */
  async paginatedQuery<TResult>(
    queryFn: (limit: number, offset: number) => Promise<TResult[]>,
    options: {
      pageSize?: number;
      maxResults?: number;
      queryName: string;
      userId?: string;
    }
  ): Promise<TResult[]> {
    const pageSize = Math.min(options.pageSize ?? 1000, 1000); // Max 1000 per page
    const maxResults = options.maxResults ?? D1_LIMITS.MAX_RESULT_ROWS;
    const results: TResult[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && results.length < maxResults) {
      const currentPageSize = Math.min(pageSize, maxResults - results.length);
      
      const pageResults = await this.trackQuery(
        `${options.queryName}_page_${Math.floor(offset / pageSize)}`,
        () => queryFn(currentPageSize, offset),
        {
          userId: options.userId,
          expectedMaxResults: currentPageSize
        }
      );

      results.push(...pageResults);
      hasMore = pageResults.length === currentPageSize;
      offset += pageSize;

      // Safety break to prevent infinite loops
      if (offset > maxResults) {
        logger.warn(`Pagination limit reached for query "${options.queryName}"`, {
          offset,
          maxResults,
          userId: options.userId
        });
        break;
      }
    }

    return results;
  }

  private logMetrics(metrics: QueryMetrics): void {
    // Log performance metrics
    if (metrics.executionTimeMs > 100) { // Log slow queries (>100ms)
      logger.info('Slow query detected', metrics);
    } else if (process.env.NODE_ENV === 'development') {
      logger.debug('Query performance', metrics);
    }

    // Store metrics for analysis (in memory for now, could be sent to analytics)
    this.metrics.push(metrics);
    
    // Keep only recent metrics (last 1000)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalQueries: number;
    avgExecutionTime: number;
    slowQueries: QueryMetrics[];
    failedQueries: QueryMetrics[];
  } {
    const totalQueries = this.metrics.length;
    const avgExecutionTime = totalQueries > 0 
      ? this.metrics.reduce((sum, m) => sum + m.executionTimeMs, 0) / totalQueries 
      : 0;
    
    const slowQueries = this.metrics.filter(m => m.executionTimeMs > 100);
    const failedQueries = this.metrics.filter(m => !m.success);

    return {
      totalQueries,
      avgExecutionTime,
      slowQueries,
      failedQueries
    };
  }

  /**
   * Clear collected metrics
   */
  clearStats(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const queryPerformanceTracker = new QueryPerformanceTracker();

/**
 * Utility function for common pagination patterns
 */
export function createPaginationQuery<T>(
  baseQuery: T,
  limit: number = 50,
  offset: number = 0
) {
  // Ensure reasonable pagination limits for D1
  const safeLimit = Math.min(limit, 1000); // Max 1000 results per query
  const safeOffset = Math.max(offset, 0);

  return {
    query: baseQuery,
    limit: safeLimit,
    offset: safeOffset,
  };
}

/**
 * Helper to safely chunk large inArray operations
 */
export function chunkInArrayParams<T>(
  params: T[], 
  chunkSize: number = D1_LIMITS.MAX_INARRAY_PARAMS
): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < params.length; i += chunkSize) {
    chunks.push(params.slice(i, i + chunkSize));
  }
  return chunks;
}