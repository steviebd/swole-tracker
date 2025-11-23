# Database Performance Optimization PDR

## Overview

This document outlines performance optimization opportunities for the Swole Tracker database schema and query patterns. The current implementation is well-optimized for D1 constraints, but several optimizations can provide significant performance gains.

## Current State Analysis

### Strengths

- ✅ Excellent indexing strategy with comprehensive composite indexes
- ✅ Smart chunking with 70-variable safety margin for D1 limits
- ✅ Well-implemented batch operations with transaction-like behavior
- ✅ In-memory caching for exercise names and user preferences
- ✅ Robust query performance monitoring and health checks

### Identified Issues

- ❌ Over-indexing on `sessionExercises` table (20+ indexes)
- ❌ N+1 query patterns in exercise resolution
- ❌ Expensive real-time aggregation
- ❌ Anti-pattern JSON fields storing frequently queried data
- ❌ Limited cross-request caching (D1 is serverless, no connection pooling)
- ❌ Large JSON payloads in WHOOP tables

### D1/Cloudflare Workers Constraints

Note: All optimizations must account for these platform constraints:

- **SQL Variable Limit**: ~90 variables per statement (use `chunk-utils.ts`)
- **No Triggers**: Cache invalidation must be application-level
- **No Materialized Views**: Must use regular tables with manual refresh
- **Serverless**: No connection pooling; use Cloudflare Cache API or KV
- **Worker Limits**: 128MB memory, 1000 subrequests per request
- **Row Size**: 1MB maximum per row

## Optimization Proposals

### 1. Index Consolidation & Optimization (HIGH PRIORITY)

**Problem**: Redundant indexes consuming storage and slowing writes

**Solution**: Remove redundant indexes covered by composite indexes

```sql
-- Remove redundant indexes - these are covered by composite indexes
DROP INDEX session_exercise_user_id_idx;           -- Covered by user+exercise composites
DROP INDEX session_exercise_session_id_idx;        -- Covered by user+session+name
DROP INDEX session_exercise_name_idx;              -- Covered by user+exercise composites

-- Add missing critical index for workout queries
CREATE INDEX session_exercise_user_session_date_idx
ON session_exercise(user_id, sessionId, workoutDate);
```

**Expected Impact**: 25% reduction in storage, 15% faster writes

### 2. Exercise Resolution Cache (HIGH PRIORITY)

**Problem**: N+1 query patterns when resolving exercise names

**Solution**: Pre-compute resolved exercise names in cache table

```sql
-- Create table with explicit schema (D1-compatible)
CREATE TABLE exercise_resolution_cache (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  resolved_name TEXT NOT NULL,
  master_exercise_id INTEGER
);

-- Populate cache
INSERT INTO exercise_resolution_cache (id, user_id, resolved_name, master_exercise_id)
SELECT
  se.id,
  se.user_id,
  COALESCE(me.name, te.exerciseName) as resolved_name,
  me.id as master_exercise_id
FROM session_exercises se
LEFT JOIN template_exercises te ON se.templateExerciseId = te.id
LEFT JOIN exercise_links el ON te.id = el.templateExerciseId
LEFT JOIN master_exercises me ON el.masterExerciseId = me.id;

-- Index for fast lookups
CREATE INDEX exercise_resolution_cache_id_idx ON exercise_resolution_cache(id);
CREATE INDEX exercise_resolution_cache_user_idx ON exercise_resolution_cache(user_id);
```

**Cache Invalidation Strategy** (application-level, since D1 doesn't support triggers):

```typescript
// Add to src/server/db/cache-invalidation.ts
import { chunkedBatch } from '~/server/db/chunk-utils';

export async function invalidateExerciseCache(
  db: D1Database,
  userId: string,
  exerciseIds: number[]
): Promise<void> {
  // Delete stale cache entries (respecting D1 variable limits)
  await chunkedBatch(db, exerciseIds, async (chunk) => {
    await db
      .delete(exerciseResolutionCache)
      .where(inArray(exerciseResolutionCache.id, chunk));
  });

  // Repopulate cache for affected exercises
  await chunkedBatch(db, exerciseIds, async (chunk) => {
    await db.run(sql`
      INSERT INTO exercise_resolution_cache (id, user_id, resolved_name, master_exercise_id)
      SELECT se.id, se.user_id, COALESCE(me.name, te.exerciseName), me.id
      FROM session_exercises se
      LEFT JOIN template_exercises te ON se.templateExerciseId = te.id
      LEFT JOIN exercise_links el ON te.id = el.templateExerciseId
      LEFT JOIN master_exercises me ON el.masterExerciseId = me.id
      WHERE se.id IN (${chunk.join(',')})
    `);
  });
}

// Call after exercise mutations
await invalidateExerciseCache(db, userId, [exerciseId]);
```

**Implementation**: Update `loadResolvedExerciseNameMap()` to use this cache table

**Expected Impact**: 60-80% reduction in exercise resolution query time

### 3. Dashboard Query Optimization (HIGH PRIORITY)

**Problem**: Multiple separate queries for user dashboard data

**Solution**: Consolidate into single query with CTEs

```sql
WITH user_sessions AS (
  SELECT id, workoutDate, templateId
  FROM workout_sessions
  WHERE user_id = ? AND workoutDate >= date('now', '-30 days')
),
session_metrics AS (
  SELECT
    COUNT(*) as session_count,
    SUM(volume_load) as total_volume,
    MAX(one_rm_estimate) as max_one_rm
  FROM session_exercises se
  JOIN user_sessions us ON se.sessionId = us.id
)
SELECT * FROM session_metrics;
```

**Drizzle ORM Implementation**:

```typescript
// In src/server/api/routers/progress.ts
import { sql, eq, gte, and } from 'drizzle-orm';

export async function getDashboardMetrics(db: D1Database, userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const metrics = await db
    .select({
      sessionCount: sql<number>`COUNT(DISTINCT ${workoutSessions.id})`,
      totalVolume: sql<number>`SUM(${sessionExercises.volumeLoad})`,
      maxOneRm: sql<number>`MAX(${sessionExercises.oneRmEstimate})`,
    })
    .from(sessionExercises)
    .innerJoin(
      workoutSessions,
      eq(sessionExercises.sessionId, workoutSessions.id)
    )
    .where(
      and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.workoutDate, thirtyDaysAgo.toISOString())
      )
    );

  return metrics[0];
}
```

**Implementation**: Update dashboard queries in `src/server/api/routers/progress.ts`

**Expected Impact**: 40-50% reduction in dashboard load time

### 4. Incremental Aggregation (MEDIUM PRIORITY)

**Problem**: Real-time aggregation is expensive and recomputes everything

**Solution**: Implement incremental aggregation with change tracking

```typescript
// Add to aggregation.ts
export class IncrementalAggregator {
  async onExerciseChange(exerciseId: number, userId: string): Promise<void> {
    // Get affected dates for this exercise
    const affectedDates = await this.getAffectedDates(exerciseId, userId);

    // Only re-aggregate changed dates
    for (const date of affectedDates) {
      await this.reaggregateDate(userId, date);
    }
  }

  private async getAffectedDates(
    exerciseId: number,
    userId: string,
  ): Promise<Date[]> {
    // Get unique workout dates for this exercise
    return await db
      .selectDistinct({ date: workoutSessions.workoutDate })
      .from(sessionExercises)
      .innerJoin(
        workoutSessions,
        eq(sessionExercises.sessionId, workoutSessions.id),
      )
      .where(
        and(
          eq(sessionExercises.id, exerciseId),
          eq(sessionExercises.user_id, userId),
        ),
      );
  }
}
```

**Expected Impact**: 70% reduction in aggregation processing time

### 5. Schema Normalization (MEDIUM PRIORITY)

**Problem**: JSON fields storing frequently queried data

**Solution**: Extract hot JSON fields to dedicated columns

```sql
-- Extract frequently queried preferences
ALTER TABLE user_preferences ADD COLUMN progression_type_enum TEXT;
ALTER TABLE user_preferences ADD COLUMN warmup_percentages_array TEXT;

-- Extract WHOOP metrics for faster querying
ALTER TABLE whoop_recovery ADD COLUMN recovery_score_tier TEXT; -- 'low', 'medium', 'high'
ALTER TABLE whoop_sleep ADD COLUMN sleep_quality_tier TEXT;
```

**Implementation**: Update schema and migration scripts

**Expected Impact**: 30% faster preference queries, 25% faster WHOOP analytics

### 6. Worker-Appropriate Caching Strategy (MEDIUM PRIORITY)

**Problem**: Limited cross-request caching scope

**Solution**: Implement caching using Cloudflare Cache API for cross-request data persistence

> **Note**: D1 is serverless and doesn't use connection pooling. Use Cloudflare's Cache API or KV for cross-request caching.

```typescript
// Add to src/server/cache/cloudflare-cache.ts

// Option 1: Cloudflare Cache API (free, automatic invalidation)
export async function getCachedDashboard(
  userId: string,
  fetchFn: () => Promise<DashboardData>
): Promise<DashboardData> {
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.internal/dashboard/${userId}`);

  // Check cache first
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached.json();
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Cache for 5 minutes
  await cache.put(
    cacheKey,
    new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=300', // 5 minutes
      },
    })
  );

  return data;
}

// Option 2: In-memory cache with LRU eviction (per-request only)
export class RequestScopedCache {
  private cache = new Map<string, { data: unknown; expires: number }>();
  private maxSize = 100;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set(key: string, data: unknown, ttlMs: number): void {
    // LRU eviction if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs,
    });
  }
}

// Usage in tRPC router
export const progressRouter = createTRPCRouter({
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    return getCachedDashboard(ctx.userId, () =>
      getDashboardMetrics(ctx.db, ctx.userId)
    );
  }),
});
```

**Cache Invalidation**:

```typescript
// Invalidate when data changes
export async function invalidateDashboardCache(userId: string): Promise<void> {
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.internal/dashboard/${userId}`);
  await cache.delete(cacheKey);
}
```

**Expected Impact**: 35% reduction in database queries for frequently accessed data

### 7. Progress Query Materialization (LOW PRIORITY)

**Problem**: Complex progression queries are computationally expensive

**Solution**: Pre-computed trend tables with scheduled refresh

> **Note**: D1 doesn't support materialized views. Use regular tables with scheduled Worker refresh.

```sql
-- Create trend table (replaces materialized view)
CREATE TABLE exercise_trends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  week_start TEXT NOT NULL,
  prev_one_rm REAL,
  current_one_rm REAL,
  one_rm_change REAL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX exercise_trends_user_idx ON exercise_trends(user_id);
CREATE INDEX exercise_trends_user_exercise_idx ON exercise_trends(user_id, exercise_name);
```

**Scheduled Refresh Worker**:

```typescript
// In src/workers/refresh-trends.ts
import { chunkedBatch } from '~/server/db/chunk-utils';

export default {
  // Cron trigger: runs hourly
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const db = env.DB;

    // Clear existing trends
    await db.exec('DELETE FROM exercise_trends');

    // Populate with fresh data using window functions
    await db.exec(`
      INSERT INTO exercise_trends (user_id, exercise_name, week_start, prev_one_rm, current_one_rm, one_rm_change)
      SELECT
        user_id,
        exercise_name,
        week_start,
        LAG(max_one_rm) OVER (PARTITION BY user_id, exercise_name ORDER BY week_start) as prev_one_rm,
        max_one_rm as current_one_rm,
        (max_one_rm - LAG(max_one_rm) OVER (PARTITION BY user_id, exercise_name ORDER BY week_start)) as one_rm_change
      FROM exercise_weekly_summary
    `);

    console.log('Exercise trends refreshed at', new Date().toISOString());
  },
};

// wrangler.toml addition:
// [triggers]
// crons = ["0 * * * *"]  # Every hour
```

**Usage in Progress Queries**:

```typescript
// Fast lookup from pre-computed table
export async function getExerciseTrends(
  db: D1Database,
  userId: string,
  exerciseName: string
) {
  return db
    .select()
    .from(exerciseTrends)
    .where(
      and(
        eq(exerciseTrends.userId, userId),
        eq(exerciseTrends.exerciseName, exerciseName)
      )
    )
    .orderBy(desc(exerciseTrends.weekStart))
    .limit(12); // Last 12 weeks
}
```

**Expected Impact**: 80% reduction in progression query time

### 8. JSON Payload Optimization (LOW PRIORITY)

**Problem**: Large JSON payloads consuming storage and slowing queries

**Solution**: Compress JSON data using gzip and selectively store

> **Note**: Base64 encoding increases size by ~33%. Use actual compression (gzip/deflate) for storage savings.

```typescript
// Add to src/lib/compression.ts
import pako from 'pako'; // Install: bun add pako @types/pako

// Compress JSON to base64-encoded gzip
export function compressJson(data: unknown): string {
  const jsonString = JSON.stringify(data);
  const compressed = pako.deflate(jsonString);
  // Convert Uint8Array to base64 for TEXT column storage
  return btoa(String.fromCharCode(...compressed));
}

// Decompress base64-encoded gzip back to JSON
export function decompressJson<T>(compressed: string): T {
  const binaryString = atob(compressed);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const jsonString = pako.inflate(bytes, { to: 'string' });
  return JSON.parse(jsonString) as T;
}

// Usage example
const rawData = { /* large WHOOP payload */ };
const compressed = compressJson(rawData); // ~60-70% smaller
const restored = decompressJson<WhoopRecoveryData>(compressed);
```

**Schema Migration**:

```sql
-- Add compressed columns
ALTER TABLE whoop_recovery ADD COLUMN raw_data_compressed TEXT;
ALTER TABLE whoop_sleep ADD COLUMN raw_data_compressed TEXT;

-- Migration script to compress existing data (run via Worker)
-- After migration, consider dropping original raw_data columns
```

**Migration Worker**:

```typescript
// Migrate existing data to compressed format
export async function migrateWhoopData(db: D1Database): Promise<void> {
  const recoveries = await db
    .select({ id: whoopRecovery.id, rawData: whoopRecovery.rawData })
    .from(whoopRecovery)
    .where(isNull(whoopRecovery.rawDataCompressed));

  await chunkedBatch(db, recoveries, async (chunk) => {
    for (const record of chunk) {
      if (record.rawData) {
        const compressed = compressJson(JSON.parse(record.rawData));
        await db
          .update(whoopRecovery)
          .set({ rawDataCompressed: compressed })
          .where(eq(whoopRecovery.id, record.id));
      }
    }
  });
}
```

**Expected Impact**: 50-70% reduction in storage for WHOOP data

## Implementation Plan

### Phase 1: High Priority (Week 1-2)

1. **Index Consolidation**
   - Run analysis to identify redundant indexes
   - Create migration script to drop redundant indexes
   - Add missing critical indexes
   - Test query performance impact

2. **Exercise Resolution Cache**
   - Create `exercise_resolution_cache` table with explicit schema
   - Implement cache population script
   - Update `loadResolvedExerciseNameMap()` function
   - Add application-level cache invalidation (D1 doesn't support triggers)

3. **Dashboard Query Optimization**
   - Identify dashboard query patterns
   - Rewrite queries using CTEs
   - Update API endpoints
   - Performance test with realistic data

### Phase 2: Medium Priority (Week 3-4)

4. **Incremental Aggregation**
   - Implement change tracking for exercises
   - Create incremental aggregation logic
   - Update aggregation triggers
   - Add background job for cleanup

5. **Schema Normalization**
   - Identify hot JSON fields
   - Create migration for new columns
   - Update application code to use new columns
   - Migrate existing data

6. **Worker-Appropriate Caching Strategy**
   - Implement Cloudflare Cache API integration
   - Add request-scoped LRU cache
   - Implement cache invalidation on data mutations
   - Monitor cache hit rates via PostHog

### Phase 3: Low Priority (Week 5-6)

7. **Progress Query Materialization**
   - Create `exercise_trends` table (D1 doesn't support materialized views)
   - Implement scheduled Worker for hourly refresh
   - Update progression queries to use pre-computed table
   - Add monitoring for data freshness

8. **JSON Payload Optimization**
   - Implement compression utilities
   - Create migration for compressed fields
   - Update WHOOP data handling
   - Monitor storage savings

## Testing Strategy

### Performance Benchmarks

- Establish baseline metrics for all query patterns
- Create performance test suite with realistic data volumes
- Measure impact of each optimization phase

### Regression Testing

- Ensure all existing functionality works with optimizations
- Test edge cases and error conditions
- Validate data consistency after schema changes

### Load Testing

- Test with concurrent user loads
- Monitor database performance under stress
- Validate D1 constraint compliance

## Monitoring & Metrics

### Key Performance Indicators

- Query latency (p50, p95, p99)
- Database connection utilization
- Cache hit rates
- Aggregation processing time
- Storage usage trends

### Alerting

- Slow query alerts (>500ms)
- Cache miss rate alerts (>30%)
- Aggregation failure alerts
- Storage usage alerts (>80% capacity)

## Risk Assessment

### High Risk

- Schema changes requiring data migration
- Index changes affecting query performance
- Cache invalidation bugs causing stale data
- Breaking D1 variable limits in bulk operations (always use `chunk-utils.ts`)

### Medium Risk

- Cloudflare Cache API integration complexity
- Scheduled Worker refresh timing (data staleness)
- JSON compression/decompression CPU overhead
- Offline sync conflicts with cached data

### Low Risk

- Query rewriting with CTEs
- Monitoring enhancements
- Documentation updates

### D1-Specific Risks

- **Row Size Limits**: 1MB per row - ensure compressed WHOOP data fits
- **Query Result Size**: Large result sets may hit limits
- **Rate Limiting**: Heavy sync operations may be throttled
- **Cold Starts**: First request after idle may be slower
- **Subrequest Limits**: Max 1000 subrequests per Worker invocation

## Rollback Strategy

### Database Changes

- All migrations include rollback scripts
- Performance monitoring to detect regressions
- Feature flags to enable/disable optimizations

### Application Changes

- Gradual rollout with feature flags
- A/B testing for query optimizations
- Fallback to original implementations

## Success Criteria

### Performance Targets

- Dashboard load time: <200ms (40% improvement)
- Exercise resolution: <50ms (60% improvement)
- Aggregation processing: <1s (70% improvement)
- Database storage: 25% reduction

### Quality Targets

- Zero data loss during migrations
- 99.9% uptime during optimization rollout
- All existing tests pass
- New performance tests added

## Resources Required

### Development

- 1 senior developer (database optimization focus)
- 1 backend developer (application changes)
- 1 DevOps engineer (monitoring & deployment)

### Infrastructure

- Staging environment with production-like data
- Performance testing tools
- Enhanced monitoring and alerting

### Timeline

- **Phase 1**: 2 weeks
- **Phase 2**: 2 weeks
- **Phase 3**: 2 weeks
- **Testing & Validation**: 1 week
- **Total**: 7 weeks

## Optimization Dependencies

Understanding the relationships between optimizations helps with implementation order and risk management.

### Dependency Map

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1 (Foundation)                      │
├─────────────────────────────────────────────────────────────┤
│  [1] Index Consolidation ─────┐                              │
│          │                    │                              │
│          ▼                    ▼                              │
│  [2] Exercise Resolution  [3] Dashboard Query                │
│      Cache                    Optimization                   │
│          │                    │                              │
└──────────┼────────────────────┼──────────────────────────────┘
           │                    │
           ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 2 (Enhancement)                     │
├─────────────────────────────────────────────────────────────┤
│  [4] Incremental         [6] Worker Caching                  │
│      Aggregation              Strategy                       │
│      (requires #2)            │                              │
│          │                    │                              │
│          ▼                    │                              │
│  [5] Schema Normalization ◄───┘                              │
│      (blocks other changes during migration)                 │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 3 (Optimization)                    │
├─────────────────────────────────────────────────────────────┤
│  [7] Progress Query      [8] JSON Payload                    │
│      Materialization         Optimization                    │
│      (requires #4)           (independent)                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Dependencies

| Optimization | Depends On | Blocks |
|--------------|------------|--------|
| #1 Index Consolidation | None | #2, #3 (performance baseline) |
| #2 Exercise Resolution Cache | #1 | #4 (uses cache pattern) |
| #3 Dashboard Query | #1 | None |
| #4 Incremental Aggregation | #2 | #7 |
| #5 Schema Normalization | None | All (during migration window) |
| #6 Worker Caching | None | None |
| #7 Progress Materialization | #4 | None |
| #8 JSON Compression | None | None (independent) |

### Recommended Implementation Order

1. **#1 Index Consolidation** - Foundation for all other optimizations
2. **#2 Exercise Resolution Cache** - Highest impact, enables #4
3. **#3 Dashboard Query** - Can run parallel with #2
4. **#6 Worker Caching** - Independent, can run anytime
5. **#4 Incremental Aggregation** - After #2 is stable
6. **#5 Schema Normalization** - Schedule during low-traffic window
7. **#8 JSON Compression** - Independent, low risk
8. **#7 Progress Materialization** - Final optimization, requires #4

### Parallel Implementation Opportunities

- **#2 and #3** can be developed in parallel (both depend only on #1)
- **#6 and #8** are independent and can run anytime
- **#4 and #5** should be sequential (both modify core data handling)

## Next Steps

1. **Review and approve this PDR**
2. **Assign development resources**
3. **Set up staging environment**
4. **Establish baseline metrics**
5. **Begin Phase 1 implementation**

---

_This PDR should be reviewed by the development team and updated based on feedback before implementation begins._
