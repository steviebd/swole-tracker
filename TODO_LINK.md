# Exercise Search Performance Optimization Plan

## Overview

The current `searchMaster` API suffers from significant performance issues (1.6-2 second response times) due to sequential multi-table queries, inefficient pagination, and missing database indexes. This plan outlines a comprehensive optimization strategy to reduce search latency to under 200ms.

## Current Performance Issues

### Critical Bottlenecks

1. **Sequential Multi-Table Queries**: 3 separate DB queries executed sequentially
2. **OFFSET-Based Pagination**: Performance degrades exponentially with dataset size
3. **Missing Search Indexes**: Template and session exercises lack proper text search indexes
4. **Query Complexity**: Multiple LIKE operations without optimization

### Performance Metrics

- **Current**: 1.6-2 seconds per search
- **Target**: <200ms per search
- **Expected Improvement**: 85-90% faster

## Optimization Tasks

### Phase 1: Database Foundation (High Priority)

#### 1.1 Add Missing Database Indexes

**Priority**: Critical
**Estimated Time**: 30 minutes
**Impact**: 60-80% performance improvement

**Tasks**:

- [ ] Add index on `template_exercise(user_id, exerciseName)` for fast text search
- [ ] Add index on `session_exercise(user_id, resolvedExerciseName)` for workout history search
- [ ] Verify existing `master_exercise` indexes are optimal

**SQL**:

```sql
CREATE INDEX idx_template_exercise_search ON template_exercise(user_id, exerciseName);
CREATE INDEX idx_session_exercise_search ON session_exercise(user_id, resolvedExerciseName);
```

**Verification**:

```sql
EXPLAIN QUERY PLAN SELECT * FROM template_exercise WHERE user_id = ? AND exerciseName LIKE ?;
```

#### 1.2 Database Migration Script

**Priority**: Critical
**Estimated Time**: 15 minutes

**Tasks**:

- [ ] Create migration script in `drizzle/` directory
- [ ] Test migration on staging environment
- [ ] Deploy to production

### Phase 2: Query Consolidation (High Priority)

#### 2.1 Replace Sequential Queries with Single UNION Query

**Priority**: Critical
**Estimated Time**: 2 hours
**Impact**: 50-70% performance improvement

**Current Implementation**:

```typescript
// Executes 3 separate queries sequentially
const masterResults = await queryMaster();
const templateResults = await queryTemplates();
const sessionResults = await querySessions();
```

**Optimized Implementation**:

```sql
SELECT id, name, normalizedName, createdAt, 'master' as source
FROM master_exercise
WHERE user_id = ? AND normalizedName LIKE ?
UNION ALL
SELECT id, exerciseName as name, exerciseName as normalizedName, createdAt, 'template' as source
FROM template_exercise
WHERE user_id = ? AND exerciseName LIKE ?
UNION ALL
SELECT id, COALESCE(resolvedExerciseName, exerciseName) as name,
       COALESCE(resolvedExerciseName, exerciseName) as normalizedName, createdAt, 'session' as source
FROM session_exercise
WHERE user_id = ? AND COALESCE(resolvedExerciseName, exerciseName) LIKE ?
ORDER BY normalizedName
LIMIT ? OFFSET ?
```

**Tasks**:

- [ ] Refactor `searchMaster` function to use single UNION query
- [ ] Implement proper result deduplication logic
- [ ] Add source type identification for different result types
- [ ] Update result mapping to handle different table schemas
- [ ] Test query correctness with existing test suite

#### 2.2 Implement Cursor-Based Pagination

**Priority**: High
**Estimated Time**: 1 hour
**Impact**: 70-80% improvement for large result sets

**Current**: `OFFSET cursor LIMIT limit` (slow)
**Optimized**: `WHERE id > cursor ORDER BY id LIMIT limit` (fast)

**Tasks**:

- [ ] Modify query to use ID-based cursors
- [ ] Update pagination logic in searchMaster
- [ ] Handle cursor encoding/decoding for different result sources
- [ ] Update frontend to handle cursor-based pagination
- [ ] Test pagination with large datasets

### Phase 3: Caching & Optimization (Medium Priority)

#### 3.1 Implement Query Result Caching

**Priority**: Medium
**Estimated Time**: 1.5 hours
**Impact**: 80-95% improvement for repeated searches

**Strategy**:

- Cache results for 5 minutes using Redis/memory cache
- Cache key: `search:${userId}:${normalizedQuery}:${cursor}:${limit}`

**Tasks**:

- [ ] Add caching layer to searchMaster API
- [ ] Implement cache invalidation on exercise creation/update
- [ ] Add cache hit/miss metrics
- [ ] Test cache performance and correctness

#### 3.2 Frontend Optimizations

**Priority**: Medium
**Estimated Time**: 45 minutes
**Impact**: 40-60% perceived performance improvement

**Tasks**:

- [ ] Implement localStorage cache for recent searches
- [ ] Add request deduplication (cancel previous requests)
- [ ] Optimize debouncing (current: 300ms, target: 150ms)
- [ ] Add loading skeleton for better UX

### Phase 4: Advanced Optimizations (Low Priority)

#### 4.1 Fuzzy

**Priority**: Low
**Estimated Time**: 2-3 hours
**Impact**: Improved search relevance and speed

**Tasks**:

- [ ] Add fuzzy matching capabilities

## Implementation Timeline

### Week 1: Foundation

- [ ] Complete Phase 1 (Database indexes and migration)
- [ ] Deploy to staging and verify performance improvement

### Week 2: Core Optimization

- [ ] Complete Phase 2 (Query consolidation and cursor pagination)
- [ ] Test thoroughly on staging environment

### Week 3: Polish & Monitoring

- [ ] Complete Phase 3 (Caching and frontend optimizations)
- [ ] Add performance monitoring and alerts

### Week 4: Advanced Features

- [ ] Complete Phase 4 (Full-text search and analytics)
- [ ] Performance benchmarking and optimization

## Success Metrics

### Performance Targets

- **Search Latency**: <200ms (currently 1.6-2s)
- **Database Query Time**: <50ms (currently ~1.5s)
- **Cache Hit Rate**: >80%
- **User Satisfaction**: >95% search experience rating

## Testing Strategy

### Unit Tests

- [ ] Test single UNION query correctness
- [ ] Test cursor pagination logic
- [ ] Test caching behavior
- [ ] Test deduplication logic

### Integration Tests

- [ ] End-to-end search performance tests
- [ ] Load testing with concurrent users
- [ ] Database performance under load

### Manual Testing

- [ ] Test with various search terms and user datasets
- [ ] Test pagination with large result sets
- [ ] Test cache invalidation scenarios

## Risk Assessment

### High Risk

- Database migration could impact existing queries
- Cursor pagination changes API contract

### Medium Risk

- Caching could serve stale data
- UNION query complexity increases maintenance burden

### Low Risk

- Frontend optimizations
- Additional monitoring