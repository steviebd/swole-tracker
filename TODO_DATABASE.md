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
- ❌ No connection pooling or read replicas
- ❌ Large JSON payloads in WHOOP tables

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

**Solution**: Pre-compute resolved exercise names in materialized cache

```sql
CREATE TABLE exercise_resolution_cache AS
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

### 6. Connection & Caching Strategy (MEDIUM PRIORITY)

**Problem**: No connection pooling, limited caching scope

**Solution**: Implement enhanced caching and connection reuse

```typescript
// Add to db/index.ts
class ConnectionPool {
  private connections: Map<string, D1Database> = new Map();
  private maxConnections = 10;

  getConnection(context: string): D1Database {
    // Implement connection reuse logic
  }
}

// Enhanced caching with TTL
class AdvancedCache {
  private cache = new Map<
    string,
    { data: any; expires: number; hitCount: number }
  >();

  set(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs,
      hitCount: 0,
    });
  }

  // Implement LRU eviction for frequently accessed data
}
```

**Expected Impact**: 35% reduction in database connection overhead

### 7. Progress Query Materialization (LOW PRIORITY)

**Problem**: Complex progression queries are computationally expensive

**Solution**: Materialized views for trend data

```sql
CREATE MATERIALIZED VIEW exercise_trends AS
SELECT
  user_id,
  exercise_name,
  week_start,
  LAG(max_one_rm) OVER (PARTITION BY user_id, exercise_name ORDER BY week_start) as prev_one_rm,
  max_one_rm as current_one_rm,
  (max_one_rm - LAG(max_one_rm) OVER (PARTITION BY user_id, exercise_name ORDER BY week_start)) as one_rm_change
FROM exercise_weekly_summary;

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_exercise_trends()
BEGIN
  REFRESH MATERIALIZED VIEW exercise_trends;
END;
```

**Expected Impact**: 80% reduction in progression query time

### 8. JSON Payload Optimization (LOW PRIORITY)

**Problem**: Large JSON payloads consuming storage and slowing queries

**Solution**: Compress and selectively store JSON data

```typescript
// Add compression utility
export function compressJson(data: any): string {
  const jsonString = JSON.stringify(data);
  return Buffer.from(jsonString).toString('base64');
}

export function decompressJson(compressed: string): any {
  const jsonString = Buffer.from(compressed, 'base64').toString();
  return JSON.parse(jsonString);
}

// Update schema to use compressed fields
ALTER TABLE whoop_recovery ADD COLUMN raw_data_compressed TEXT;
ALTER TABLE whoop_sleep ADD COLUMN raw_data_compressed TEXT;
```

**Expected Impact**: 50% reduction in storage for WHOOP data

## Implementation Plan

### Phase 1: High Priority (Week 1-2)

1. **Index Consolidation**
   - Run analysis to identify redundant indexes
   - Create migration script to drop redundant indexes
   - Add missing critical indexes
   - Test query performance impact

2. **Exercise Resolution Cache**
   - Create `exercise_resolution_cache` table
   - Implement cache population script
   - Update `loadResolvedExerciseNameMap()` function
   - Add cache invalidation triggers

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

6. **Connection & Caching Strategy**
   - Implement connection pooling
   - Enhance caching with LRU eviction
   - Add cache warming strategies
   - Monitor cache hit rates

### Phase 3: Low Priority (Week 5-6)

7. **Progress Query Materialization**
   - Create materialized views
   - Implement refresh strategies
   - Update progression queries
   - Add monitoring for view freshness

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

### Medium Risk

- Connection pooling implementation complexity
- Materialized view refresh scheduling
- JSON compression/decompression overhead

### Low Risk

- Query rewriting with CTEs
- Monitoring enhancements
- Documentation updates

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

## Next Steps

1. **Review and approve this PDR**
2. **Assign development resources**
3. **Set up staging environment**
4. **Establish baseline metrics**
5. **Begin Phase 1 implementation**

---

_This PDR should be reviewed by the development team and updated based on feedback before implementation begins._
