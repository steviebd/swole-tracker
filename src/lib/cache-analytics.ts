/**
 * Cache performance monitoring and analytics
 * Integrates with PostHog to track cache hit/miss rates, performance improvements, and usage patterns
 */

import { type QueryClient } from "@tanstack/react-query";

interface CacheMetrics {
  hits: number;
  misses: number;
  backgroundFetches: number;
  cacheSize: number;
  queryCount: number;
  oldestCacheEntry: number;
  newestCacheEntry: number;
  memoryOnlyMode: boolean;
}

interface CacheEvent {
  type: 'hit' | 'miss' | 'background_fetch' | 'cache_health' | 'quota_exceeded' | 'cache_cleared';
  queryKey: string;
  timestamp: number;
  size?: number;
  loadTime?: number;
  fromCache?: boolean;
}

/**
 * Cache analytics manager
 */
class CacheAnalytics {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    backgroundFetches: 0,
    cacheSize: 0,
    queryCount: 0,
    oldestCacheEntry: Date.now(),
    newestCacheEntry: Date.now(),
    memoryOnlyMode: false,
  };
  
  private events: CacheEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events
  private reportingInterval?: NodeJS.Timeout;

  constructor(private queryClient: QueryClient) {
    this.setupQueryClientMonitoring();
    this.startPeriodicReporting();
  }

  /**
   * Setup monitoring on the QueryClient to track cache events
   */
  private setupQueryClientMonitoring(): void {
    if (typeof window === "undefined") return;

    const queryCache = this.queryClient.getQueryCache();
    
    // Monitor query cache events
    const eventHandler = (event: any) => {
      if (!event.query) return;

      const queryKey = JSON.stringify(event.query.queryKey);
      const now = Date.now();

      switch (event.type) {
        case 'added':
          this.recordEvent({
            type: 'miss',
            queryKey,
            timestamp: now,
          });
          this.metrics.misses++;
          break;

        case 'updated':
          // Determine if this was a cache hit or background fetch
          const query = event.query;
          const state = query.state as any;
          const fromCache = state.isFetching && state.data !== undefined;
          
          if (fromCache) {
            this.recordEvent({
              type: 'background_fetch',
              queryKey,
              timestamp: now,
              fromCache: true,
            });
            this.metrics.backgroundFetches++;
          } else if (state.data !== undefined) {
            this.recordEvent({
              type: 'hit',
              queryKey,
              timestamp: now,
              fromCache: false,
            });
            this.metrics.hits++;
          }
          break;

        case 'removed':
          // Query evicted from cache
          break;
      }

      // Update general metrics
      this.updateMetrics();
    };
    
    queryCache.subscribe(eventHandler);
  }

  /**
   * Record a cache event for analytics
   */
  private recordEvent(event: CacheEvent): void {
    this.events.push(event);
    
    // Keep only the most recent events to prevent memory leaks
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Update cache metrics from current state
   */
  private updateMetrics(): void {
    if (typeof window === "undefined") return;

    try {
      // Calculate cache size
      const cacheVersion = "swole-tracker-cache-v3";
      const cache = localStorage.getItem(cacheVersion);
      this.metrics.cacheSize = cache ? new Blob([cache]).size : 0;

      // Get query count from QueryClient
      const queries = this.queryClient.getQueryCache().getAll();
      this.metrics.queryCount = queries.length;

      // Calculate oldest and newest cache entries
      if (queries.length > 0) {
        const timestamps = queries
          .map(q => q.state.dataUpdatedAt)
          .filter(t => t > 0)
          .sort();
        
        if (timestamps.length > 0) {
          this.metrics.oldestCacheEntry = timestamps[0]!;
          this.metrics.newestCacheEntry = timestamps[timestamps.length - 1]!;
        }
      }
    } catch (error) {
      console.debug("Failed to update cache metrics:", error);
    }
  }

  /**
   * Get current cache performance metrics
   */
  getMetrics(): CacheMetrics & { 
    hitRate: number; 
    totalRequests: number; 
    averageCacheAge: number;
  } {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;
    const averageCacheAge = this.metrics.queryCount > 0 
      ? (Date.now() - this.metrics.oldestCacheEntry) / this.metrics.queryCount 
      : 0;

    return {
      ...this.metrics,
      hitRate,
      totalRequests,
      averageCacheAge,
    };
  }

  /**
   * Get recent cache events for debugging
   */
  getRecentEvents(limit = 50): CacheEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Track cache health and performance
   */
  recordCacheHealth(data: {
    cacheSize: number;
    availableSpace: number;
    memoryOnlyMode: boolean;
    cleanupPerformed?: boolean;
    queriesEvicted?: number;
  }): void {
    this.metrics.memoryOnlyMode = data.memoryOnlyMode;
    
    this.recordEvent({
      type: 'cache_health',
      queryKey: 'system',
      timestamp: Date.now(),
      size: data.cacheSize,
    });

    // Send to PostHog immediately for critical health events
    if (data.memoryOnlyMode || data.cleanupPerformed) {
      void this.sendToPostHog('cache_health_critical', data);
    }
  }

  /**
   * Track quota exceeded events
   */
  recordQuotaExceeded(data: { previousSize: number }): void {
    this.recordEvent({
      type: 'quota_exceeded',
      queryKey: 'system',
      timestamp: Date.now(),
      size: data.previousSize,
    });

    void this.sendToPostHog('cache_quota_exceeded', data);
  }

  /**
   * Track cache clear events
   */
  recordCacheCleared(trigger: 'logout' | 'corruption' | 'manual'): void {
    this.recordEvent({
      type: 'cache_cleared',
      queryKey: 'system',
      timestamp: Date.now(),
    });

    void this.sendToPostHog('cache_cleared', { trigger });
    
    // Reset metrics after cache clear
    this.metrics = {
      hits: 0,
      misses: 0,
      backgroundFetches: 0,
      cacheSize: 0,
      queryCount: 0,
      oldestCacheEntry: Date.now(),
      newestCacheEntry: Date.now(),
      memoryOnlyMode: false,
    };
  }

  /**
   * Send analytics data to PostHog
   */
  private async sendToPostHog(event: string, properties: Record<string, any>): Promise<void> {
    try {
      if (typeof window !== "undefined" && (window as any).posthog) {
        const metrics = this.getMetrics();
        
        (window as any).posthog.capture(event, {
          ...properties,
          // Include current metrics for context
          cache_hit_rate: metrics.hitRate,
          cache_size_mb: (metrics.cacheSize / (1024 * 1024)).toFixed(2),
          total_requests: metrics.totalRequests,
          query_count: metrics.queryCount,
          average_cache_age_hours: (metrics.averageCacheAge / (1000 * 60 * 60)).toFixed(2),
          memory_only_mode: metrics.memoryOnlyMode,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.debug("Failed to send cache analytics to PostHog:", error);
    }
  }

  /**
   * Start periodic reporting of cache performance metrics
   */
  private startPeriodicReporting(): void {
    if (typeof window === "undefined") return;

    // Report metrics every 5 minutes
    this.reportingInterval = setInterval(() => {
      const metrics = this.getMetrics();
      
      // Only report if there's meaningful activity
      if (metrics.totalRequests > 0) {
        void this.sendToPostHog('cache_performance_report', {
          reporting_interval_minutes: 5,
        });
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop periodic reporting and cleanup
   */
  destroy(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = undefined;
    }
  }

  /**
   * Measure query performance for specific operations
   */
  async measureQueryPerformance<T>(
    queryKey: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Track performance metrics
      void this.sendToPostHog('query_performance', {
        query_key: queryKey,
        load_time_ms: loadTime,
        success: true,
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const loadTime = endTime - startTime;

      void this.sendToPostHog('query_performance', {
        query_key: queryKey,
        load_time_ms: loadTime,
        success: false,
        error: String(error),
      });

      throw error;
    }
  }

  /**
   * Get cache effectiveness report for debugging
   */
  getCacheReport(): {
    summary: string;
    metrics: CacheMetrics & { 
      hitRate: number; 
      totalRequests: number; 
      averageCacheAge: number;
    };
    recentEvents: CacheEvent[];
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const recentEvents = this.getRecentEvents(20);
    
    const recommendations: string[] = [];
    
    if (metrics.hitRate < 50) {
      recommendations.push("Low cache hit rate - consider increasing staleTime for frequently accessed data");
    }
    
    if (metrics.memoryOnlyMode) {
      recommendations.push("Running in memory-only mode - consider clearing old data or reducing cache size");
    }
    
    if (metrics.cacheSize > 4 * 1024 * 1024) {
      recommendations.push("Cache size is large - consider implementing more aggressive cleanup policies");
    }
    
    if (metrics.queryCount > 500) {
      recommendations.push("High number of cached queries - some queries might not be getting evicted properly");
    }

    return {
      summary: `Cache Hit Rate: ${metrics.hitRate.toFixed(1)}%, Size: ${(metrics.cacheSize / (1024 * 1024)).toFixed(2)}MB, Queries: ${metrics.queryCount}`,
      metrics,
      recentEvents,
      recommendations,
    };
  }
}

// Global analytics instance
let cacheAnalytics: CacheAnalytics | null = null;

/**
 * Initialize cache analytics with QueryClient
 */
export function initializeCacheAnalytics(queryClient: QueryClient): CacheAnalytics {
  if (cacheAnalytics) {
    cacheAnalytics.destroy();
  }
  
  cacheAnalytics = new CacheAnalytics(queryClient);
  return cacheAnalytics;
}

/**
 * Get the current cache analytics instance
 */
export function getCacheAnalytics(): CacheAnalytics | null {
  return cacheAnalytics;
}

/**
 * Cleanup cache analytics
 */
export function destroyCacheAnalytics(): void {
  if (cacheAnalytics) {
    cacheAnalytics.destroy();
    cacheAnalytics = null;
  }
}

// Export types for external usage
export type { CacheMetrics, CacheEvent };
export { CacheAnalytics };