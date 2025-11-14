# Database Performance Optimization TODO

This document outlines database performance improvements for the Swole Tracker application. All recommendations use standard SQL/SQLite features and maintain portability (no D1 vendor lock-in).

## Tech Context

- **Database**: Cloudflare D1 (SQLite-based)
- **ORM**: Drizzle ORM
- **Constraint**: D1 has ~90 SQL variable limit (vs 999 in standard SQLite)
- **Portability**: All optimizations are standard SQL - will work with PostgreSQL/SQLite migration

---

## Priority 0: Critical N+1 Query Problems (Fix First)

### 1. Session Debrief Version Lookups
**File**: `src/server/api/services/session-debrief.ts:142-162`

**Problem**:
- Loop queries version for EACH debrief record
- Current: 10 debriefs = 20 queries (N queries for versions + N queries for deactivation)
- Lines 142-152: `for (const record of debriefRecords)` with query inside loop
- Lines 157-162: Additional UPDATE query inside same loop

**Fix**:
```typescript
// BEFORE (Lines 142-162):
for (const record of debriefRecords) {
  const lastVersion = await dbClient
    .select({ version: sessionDebriefs.version })
    .from(sessionDebriefs)
    .where(and(
      eq(sessionDebriefs.user_id, userId),
      eq(sessionDebriefs.sessionId, sessionId),
    ))
    .orderBy(desc(sessionDebriefs.version))
    .limit(1);

  // Then another UPDATE query per record
  if (existingActive) {
    await dbClient
      .update(sessionDebriefs)
      .set({ isActive: false })
      .where(eq(sessionDebriefs.id, existingActive.id));
  }
}

// AFTER:
// 1. Batch fetch all versions before loop
const sessionIds = [...new Set(debriefRecords.map(r => r.sessionId))];
const latestVersions = await dbClient
  .select({
    sessionId: sessionDebriefs.sessionId,
    version: sessionDebriefs.version,
    id: sessionDebriefs.id,
  })
  .from(sessionDebriefs)
  .where(and(
    eq(sessionDebriefs.user_id, userId),
    inArray(sessionDebriefs.sessionId, sessionIds),
  ))
  .orderBy(desc(sessionDebriefs.version))
  .groupBy(sessionDebriefs.sessionId);

// 2. Create version lookup map
const versionMap = new Map(latestVersions.map(v => [v.sessionId, v.version]));

// 3. Process records with cached versions
const idsToDeactivate = [];
for (const record of debriefRecords) {
  const lastVersion = versionMap.get(record.sessionId) ?? 0;
  // ... use lastVersion
  if (existingActive) {
    idsToDeactivate.push(existingActive.id);
  }
}

// 4. Bulk deactivate in single query
if (idsToDeactivate.length > 0) {
  await dbClient
    .update(sessionDebriefs)
    .set({ isActive: false })
    .where(inArray(sessionDebriefs.id, idsToDeactivate));
}
```

**Impact**: 20 queries → 2-3 queries (90% reduction)

**Estimated Effort**: 3 hours

---

### 2. Duplicate Dashboard Data Fetch
**File**: `src/server/api/routers/progress.ts:153-176`

**Problem**:
- `getVolumeAndStrengthData()` called twice with identical parameters
- Line 167-168: Called again inside `comparativeData` calculation
- Each call scans `sessionExercises` for same date range

**Fix**:
```typescript
// BEFORE (Lines 153-176):
const [personalRecords, volumeData, comparativeData] = await Promise.all([
  calculatePersonalRecords(ctx, exerciseNames, startDate, endDate, "both"),
  getVolumeAndStrengthData(ctx, startDate, endDate), // First call
  (async () => {
    const [currentData, previousData] = await Promise.all([
      getVolumeAndStrengthData(ctx, startDate, endDate), // DUPLICATE!
      getVolumeAndStrengthData(ctx, prevStartDate, prevEndDate),
    ]);
    // ... process data
  })(),
]);

// AFTER:
const [personalRecords, volumeData, previousData] = await Promise.all([
  calculatePersonalRecords(ctx, exerciseNames, startDate, endDate, "both"),
  getVolumeAndStrengthData(ctx, startDate, endDate), // Single call
  getVolumeAndStrengthData(ctx, prevStartDate, prevEndDate),
]);

// Use volumeData for both volumeData and comparativeData calculation
const comparativeData = calculateComparison(volumeData, previousData);
```

**Impact**: 50% reduction in volume queries

**Estimated Effort**: 30 minutes

---

### 3. Exercise Link Updates Loop
**File**: `src/server/db/utils.ts:451-458`

**Problem**:
- Loop executes individual UPDATE for each link
- O(N) queries instead of O(1)

**Fix**:
```typescript
// BEFORE (Lines 451-458):
for (const link of linksToCreate) {
  await tx
    .update(exerciseLinks)
    .set({ masterExerciseId: link.masterExerciseId })
    .where(eq(exerciseLinks.templateExerciseId, link.templateExerciseId));
}

// AFTER:
// Single bulk update using CASE statement
await tx
  .update(exerciseLinks)
  .set({
    masterExerciseId: sql`CASE ${exerciseLinks.templateExerciseId}
      ${sql.join(
        linksToCreate.map(link =>
          sql`WHEN ${link.templateExerciseId} THEN ${link.masterExerciseId}`
        ),
        sql` `
      )}
      ELSE ${exerciseLinks.masterExerciseId}
      END`
  })
  .where(
    inArray(
      exerciseLinks.templateExerciseId,
      linksToCreate.map(l => l.templateExerciseId)
    )
  );

// OR use chunkedBatch if statement count exceeds limits:
await chunkedBatch(tx, linksToCreate, async (chunk) => {
  // Group by masterExerciseId to minimize updates
  const grouped = chunk.reduce((acc, link) => {
    if (!acc[link.masterExerciseId]) acc[link.masterExerciseId] = [];
    acc[link.masterExerciseId].push(link.templateExerciseId);
    return acc;
  }, {} as Record<string, string[]>);

  for (const [masterId, templateIds] of Object.entries(grouped)) {
    await tx
      .update(exerciseLinks)
      .set({ masterExerciseId: masterId })
      .where(inArray(exerciseLinks.templateExerciseId, templateIds));
  }
});
```

**Impact**: N queries → 1 query (95% reduction)

**Estimated Effort**: 1 hour

---

## Priority 1: JOIN Opportunities

### 4. Sequential Exercise Lookups
**File**: `src/server/api/routers/insights.ts:106-153`

**Problem**:
- First query to find one link (lines 106-113)
- Second query to find all links with same `masterExerciseId` (lines 116-122)
- Then processes linked results (potentially more queries)

**Fix**:
```typescript
// BEFORE (Lines 106-153):
const link = await ctx.db.query.exerciseLinks.findFirst({
  where: eq(exerciseLinks.templateExerciseId, input.templateExerciseId),
});

if (link) {
  const linked = await ctx.db.query.exerciseLinks.findMany({
    where: eq(exerciseLinks.masterExerciseId, link.masterExerciseId),
  });
  // Process results
}

// AFTER:
// Skip first query, go directly to findMany with subquery
const linked = await ctx.db
  .select()
  .from(exerciseLinks)
  .where(
    eq(
      exerciseLinks.masterExerciseId,
      ctx.db
        .select({ masterId: exerciseLinks.masterExerciseId })
        .from(exerciseLinks)
        .where(eq(exerciseLinks.templateExerciseId, input.templateExerciseId))
        .limit(1)
    )
  );

// OR use single JOIN:
const linked = await ctx.db
  .select({
    id: exerciseLinks.id,
    templateExerciseId: exerciseLinks.templateExerciseId,
    masterExerciseId: exerciseLinks.masterExerciseId,
  })
  .from(exerciseLinks)
  .innerJoin(
    sql`(SELECT masterExerciseId FROM exerciseLinks WHERE templateExerciseId = ${input.templateExerciseId} LIMIT 1)`.as('source'),
    eq(exerciseLinks.masterExerciseId, sql`source.masterExerciseId`)
  );
```

**Impact**: 2+ queries → 1 query

**Estimated Effort**: 2 hours

---

### 5. Workout Session + Exercise Resolution
**File**: `src/server/api/routers/workouts.ts:205-276`

**Problem**:
- Three separate queries: linked names → latest session → sets
- Lines 206-221: Fetch linked names
- Line 246-253: Separate query for latest session
- Line 260-276: Another query for sets from that session

**Fix**:
```typescript
// BEFORE (Lines 205-276):
// Query 1: Get linked names
const linkedNames = await ctx.db
  .select({...})
  .from(templateExercises)
  .leftJoin(exerciseLinks, ...)
  .leftJoin(masterExercises, ...)
  .where(eq(templateExercises.id, input.templateExerciseId));

// Query 2: Get latest session
const latestSession = await ctx.db
  .select({ sessionId: sessionExercises.sessionId })
  .from(sessionExercises)
  .innerJoin(workoutSessions, ...)
  .where(and(..., or(...exerciseConditions)))
  .orderBy(desc(workoutSessions.workoutDate))
  .limit(1);

// Query 3: Get sets from that session
const rows = await ctx.db
  .select({...})
  .from(sessionExercises)
  .where(and(..., or(...exerciseConditions)));

// AFTER:
// Single query with CTE (Common Table Expression)
const result = await ctx.db.execute(sql`
  WITH linked_exercises AS (
    SELECT
      te.id,
      COALESCE(me.name, te.exerciseName) as resolvedName
    FROM ${templateExercises} te
    LEFT JOIN ${exerciseLinks} el ON te.id = el.templateExerciseId
    LEFT JOIN ${masterExercises} me ON el.masterExerciseId = me.id
    WHERE te.id = ${input.templateExerciseId}
  ),
  latest_session AS (
    SELECT se.sessionId
    FROM ${sessionExercises} se
    INNER JOIN ${workoutSessions} ws ON se.sessionId = ws.id
    WHERE se.user_id = ${ctx.user.id}
      AND se.exerciseName IN (SELECT resolvedName FROM linked_exercises)
    ORDER BY ws.workoutDate DESC
    LIMIT 1
  )
  SELECT
    se.*,
    ws.workoutDate
  FROM ${sessionExercises} se
  INNER JOIN ${workoutSessions} ws ON se.sessionId = ws.id
  INNER JOIN latest_session ls ON se.sessionId = ls.sessionId
  WHERE se.user_id = ${ctx.user.id}
`);
```

**Impact**: 3 queries → 1 query

**Estimated Effort**: 4 hours

---

### 6. Template Exercise Nested Relationships
**File**: `src/server/api/routers/workouts.ts:82-130`

**Problem**:
- Fetches `template + exercises` for EVERY session
- 10 sessions = 10 template lookups (even if same template)
- Uses nested `with` relationships

**Fix**:
```typescript
// BEFORE (Lines 82-130):
const sessions = await ctx.db.query.workoutSessions.findMany({
  where: and(...),
  orderBy: [desc(workoutSessions.workoutDate)],
  limit: input.limit,
  with: {
    template: {
      columns: {...},
      with: {
        exercises: { columns: {...} }, // Fetched N times for same template
      },
    },
    exercises: { columns: {...} },
  },
});

// AFTER:
// 1. Fetch sessions without template details
const sessions = await ctx.db.query.workoutSessions.findMany({
  where: and(...),
  orderBy: [desc(workoutSessions.workoutDate)],
  limit: input.limit,
  columns: {
    id: true,
    workoutDate: true,
    templateId: true,
    createdAt: true,
  },
  with: {
    exercises: { columns: {...} },
  },
});

// 2. Get unique template IDs
const templateIds = [...new Set(
  sessions.map(s => s.templateId).filter(Boolean)
)];

// 3. Batch fetch templates once
const templates = await ctx.db.query.workoutTemplates.findMany({
  where: inArray(workoutTemplates.id, templateIds),
  with: {
    exercises: { columns: {...} },
  },
});

// 4. Create lookup map
const templateMap = new Map(templates.map(t => [t.id, t]));

// 5. Attach templates to sessions
const sessionsWithTemplates = sessions.map(session => ({
  ...session,
  template: session.templateId ? templateMap.get(session.templateId) : null,
}));
```

**Impact**: 10 template queries → 1 template query (for 10 sessions with duplicate templates)

**Estimated Effort**: 3 hours

---

## Priority 2: Index Optimization

### 7. Add Missing Composite Indexes
**File**: `src/server/db/schema.ts`

**Current Issues**:
- No composite index for `(user_id, resolvedExerciseName, sessionId)` on `sessionExercises`
- No date range index on `workoutSessions` without user_id
- No `(user_id, sessionId, exerciseName)` for bulk operations

**Fix**:
```typescript
// Add to sessionExercises table (around line 158-224):

// For date range + exercise queries (common in progress.ts)
index("session_exercise_user_resolved_session_idx").on(
  t.user_id,
  t.resolvedExerciseName,
  t.sessionId  // Enables efficient JOIN with workoutSessions
),

// For bulk operations pattern (workouts.ts:823)
index("session_exercise_user_session_name_idx").on(
  t.user_id,
  t.sessionId,
  t.exerciseName
),

// Add to workoutSessions table (around line 92-96):

// For date range queries without user context
index("workout_session_date_idx").on(t.workoutDate),

// For date-based filtering with user (already exists but verify)
// index("workout_session_user_date_idx").on(t.user_id, t.workoutDate), // Should already exist

// Add to userPreferences table (around line 228-254):
index("user_preferences_created_idx").on(t.createdAt),

// Add to rateLimits table (around line 314-332):
index("rate_limit_window_start_idx").on(t.windowStart),
```

**Impact**: Query performance improvement 10-100x for affected queries

**Estimated Effort**: 2 hours (testing + migration)

---

### 8. Consolidate Excessive Indexes
**File**: `src/server/db/schema.ts:158-224`

**Problem**:
- `sessionExercises` has 16 separate indexes
- Some may be redundant or unused
- Each index costs write performance

**Investigation Required**:
1. Profile actual query patterns in production
2. Check which indexes are actually used
3. Identify overlapping/redundant indexes (e.g., single-column indexes covered by composite)

**Example Candidates for Removal**:
```typescript
// Lines 179-183: Weight-based indexes may be overkill
index("session_exercise_user_weight_idx").on(t.user_id, t.maxWeight),
index("session_exercise_user_total_weight_idx").on(t.user_id, t.totalWeight),

// Lines 186-197: Multiple volume/one_rm combinations
// May be able to consolidate to fewer indexes
```

**Target**: Reduce from 16 to 8-10 essential indexes

**Estimated Effort**: 4-6 hours (requires production query profiling)

**Note**: Don't remove indexes without data - use D1 query stats or add logging

---

## Priority 3: Batching & Chunking Optimization

### 9. Remove Unnecessary Read Chunking
**Files**:
- `src/server/api/routers/progress.ts:1108`
- `src/server/api/routers/workouts.ts:823-846`

**Problem**:
- Chunking is needed for INSERT/UPDATE (D1's 90 variable limit)
- But these are SELECT queries - chunking adds unnecessary complexity
- Only chunk when actual parameter count > 300

**Fix**:
```typescript
// BEFORE (progress.ts:1108-1127):
await whereInChunks(exerciseNames, async (nameChunk) => {
  const chunkSeries = await ctx.db
    .select({...})
    .from(sessionExerciseMetricsView)
    .where(and(..., inArray(resolvedColumn, nameChunk)));
});

// AFTER:
// Only chunk if truly necessary
if (exerciseNames.length > 300) {
  // Chunk for very large lists
  await whereInChunks(exerciseNames, async (nameChunk) => {
    const chunkSeries = await ctx.db
      .select({...})
      .from(sessionExerciseMetricsView)
      .where(and(..., inArray(resolvedColumn, nameChunk)));
  });
} else {
  // Single query for normal use cases
  const series = await ctx.db
    .select({...})
    .from(sessionExerciseMetricsView)
    .where(and(..., inArray(resolvedColumn, exerciseNames)));
}

// OR use helper function:
const series = exerciseNames.length > 300
  ? await whereInChunks(exerciseNames, async (nameChunk) => { ... })
  : await ctx.db.select({...}).from(...).where(inArray(..., exerciseNames));
```

**Impact**: Fewer queries for common cases, simpler code

**Estimated Effort**: 1 hour

---

### 10. Optimize D1 Batch Size
**File**: `src/server/db/chunk-utils.ts:66-86`

**Current**:
- `DEFAULT_D1_BATCH_LIMIT = 50` (line 4)
- Conservative limit for D1's batch API

**Investigation**:
- Test with 100-200 statements per batch
- D1 may support larger batches than current limit
- Already has fallback for non-batch databases (line 87-93)

**Fix**:
```typescript
// Line 4:
const DEFAULT_D1_BATCH_LIMIT = 100; // Test: was 50

// OR make it configurable:
export const D1_BATCH_LIMIT = process.env.D1_BATCH_LIMIT
  ? parseInt(process.env.D1_BATCH_LIMIT, 10)
  : 50;
```

**Testing Required**: Monitor errors in staging before increasing

**Impact**: Fewer network round-trips for bulk operations

**Estimated Effort**: 2 hours (testing + monitoring)

---

## Priority 4: Caching Improvements

### 11. Template Data Caching
**File**: `src/server/api/routers/workouts.ts:438-464`

**Problem**:
- Template queried twice in same request
- Line 438-448: First query
- Line 457-464: Second query (same template)

**Fix**:
```typescript
// BEFORE (Lines 438-464):
// First query
if (input.sessionId) {
  const session = await ctx.db.query.workoutSessions.findFirst({...});
  if (session?.templateId) {
    template = await ctx.db.query.workoutTemplates.findFirst({
      where: eq(workoutTemplates.id, session.templateId),
    });
  }
}

// Later...
if (!template && input.templateId) {
  template = await ctx.db.query.workoutTemplates.findFirst({
    where: eq(workoutTemplates.id, input.templateId),
    with: { exercises: {...} }
  });
}

// AFTER:
let template = null;
let templateId = input.templateId;

if (input.sessionId) {
  const session = await ctx.db.query.workoutSessions.findFirst({...});
  if (session?.templateId) {
    templateId = session.templateId;
  }
}

// Single query using resolved templateId
if (templateId) {
  template = await ctx.db.query.workoutTemplates.findFirst({
    where: eq(workoutTemplates.id, templateId),
    with: { exercises: {...} }
  });
}
```

**Impact**: Eliminate duplicate template queries

**Estimated Effort**: 30 minutes

---

### 12. Exercise Name Resolution Cache Extension
**File**: `src/server/db/utils.ts:45-117`

**Current**:
- 5-minute TTL in SimpleCache (line 64)
- Good pattern already implemented

**Optional Enhancement**:
- Increase TTL to 15-30 minutes for `masterExercises` (rarely change)
- Keep 5-min for `templateExercises` (change more frequently)

**Fix**:
```typescript
// Line 64:
const EXERCISE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MASTER_EXERCISE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Separate cache for master exercises
const masterExerciseCache = new SimpleCache<string, MasterExercise>(
  MASTER_EXERCISE_CACHE_TTL_MS
);
```

**Impact**: Fewer queries for stable data

**Estimated Effort**: 1 hour

---

## Priority 5: D1-Specific Optimizations

### 13. Reduce Variable Limit Safety Margin
**File**: `src/server/db/chunk-utils.ts:3`

**Current**:
- `DEFAULT_SQLITE_VARIABLE_LIMIT = 90`
- Close to D1's actual limit

**Risk**:
- Wide tables (many columns) × rows can hit limit
- Example: 10 columns × 9 rows = 90 variables (at limit)

**Fix**:
```typescript
// Line 3:
const DEFAULT_SQLITE_VARIABLE_LIMIT = 70; // Safer: was 90

// Reasoning:
// - sessionExercises has ~15 columns
// - 70 / 15 = 4-5 rows per batch (safer)
// - 90 / 15 = 6 rows per batch (risky)
```

**Impact**: More batches but fewer errors

**Estimated Effort**: 30 minutes (change + test)

---

### 14. Transaction Handling Documentation
**File**: `src/server/db/index.ts:78`

**Current**:
```typescript
// Line 78:
// Mock transaction since D1 doesn't support SQL transactions
db.transaction = async (callback) => callback(db as any);
```

**Issue**:
- D1 doesn't support ACID transactions
- Multi-step operations aren't atomic
- If operations fail mid-way, data can become inconsistent

**Used In**:
- `src/server/db/utils.ts:192` - Batch inserts
- `src/server/api/services/session-debrief.ts:138` - Debrief persistence

**Fix**: Add documentation and retry logic

```typescript
// src/server/db/index.ts:78
/**
 * IMPORTANT: D1 does not support SQL transactions.
 * This is a no-op that executes the callback with the same db instance.
 *
 * Implications:
 * - No atomicity: If operations fail mid-way, partial changes persist
 * - No isolation: Concurrent requests see partial updates
 * - No rollback: Failed operations must be manually compensated
 *
 * Migration Note: When moving to PostgreSQL/standard SQLite, remove this
 * mock and use real transactions.
 *
 * For critical multi-step operations:
 * 1. Add application-level validation before writes
 * 2. Implement retry logic with idempotency keys
 * 3. Use status fields to track operation completion
 */
db.transaction = async (callback) => callback(db as any);
```

**Add Retry Helper**:
```typescript
// src/server/db/utils.ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 100
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  throw lastError!;
}

// Usage in critical operations:
await withRetry(async () => {
  // Multi-step operation
  await db.insert(...);
  await db.update(...);
});
```

**Impact**: Better error handling, easier migration path

**Estimated Effort**: 1 hour (documentation + helper)

---

## Bonus: Query Pattern Analysis

### 15. Use Database Views Consistently
**File**: `src/server/db/schema.ts:1132-1159`

**Current**:
- View exists: `viewSessionExerciseMetrics`
- Pre-joins `sessionExercises` + `workoutSessions` + exercise name resolution

**Opportunity**:
```typescript
// Instead of manual JOINs in routers:
const data = await ctx.db
  .select({...})
  .from(sessionExercises)
  .innerJoin(workoutSessions, eq(...))
  .leftJoin(exerciseLinks, eq(...))
  .leftJoin(masterExercises, eq(...))
  .where(...);

// Use the view:
const data = await ctx.db
  .select({...})
  .from(sessionExerciseMetricsView)
  .where(...);
```

**Files to Update**:
- `src/server/api/routers/progress.ts` - Multiple JOIN patterns
- `src/server/api/routers/workouts.ts` - Exercise resolution JOINs

**Impact**: Simpler queries, easier maintenance

**Estimated Effort**: 2-3 hours

---

### 16. Parallel Query Execution
**Current Status**: ✅ Already Good!

**Example** (`src/server/api/routers/whoop.ts:143-210`):
```typescript
const [workoutLatest, recoveryLatest, sleepLatest, cycleLatest, bodyMeasurementLatest] =
  await Promise.all([...]);
```

**Recommendation**: Continue this pattern for all independent queries

---

## Testing Checklist

Before implementing any optimization:

- [ ] Add logging to measure current query count/time
- [ ] Create benchmark test with realistic data volume
- [ ] Test with D1's 90 variable limit constraints
- [ ] Verify results match original implementation
- [ ] Check performance in staging environment
- [ ] Monitor error rates after deployment

After implementation:

- [ ] Compare benchmark results (query count, execution time)
- [ ] Verify no N+1 queries using query logging
- [ ] Test with edge cases (empty results, large datasets)
- [ ] Confirm chunking still works for bulk operations
- [ ] Update any affected tests

---

## Performance Measurement

### Add Query Monitoring
```typescript
// src/server/db/monitoring.ts (already exists)
// Use existing monitorQuery function

import { monitorQuery } from '~/server/db/monitoring';

// Wrap optimized queries:
const result = await monitorQuery(
  'getProgressDashboard',
  async () => {
    // Your optimized query
  }
);
```

### Expected Improvements

| Optimization | Current | Target | Impact |
|--------------|---------|--------|---------|
| Session debrief N+1 | 20 queries | 2 queries | 90% ↓ |
| Dashboard duplicate | 2x scan | 1x scan | 50% ↓ |
| Exercise links loop | N queries | 1 query | 95% ↓ |
| Template per session | 10 queries | 1 query | 90% ↓ |
| Missing indexes | Full scan | Index scan | 10-100x ↑ |

---

## Migration Path (Future Portability)

All optimizations maintain compatibility with standard SQLite/PostgreSQL:

**When migrating from D1:**

1. **Change Drizzle import**:
   ```typescript
   // FROM:
   import { drizzle } from "drizzle-orm/d1";

   // TO (PostgreSQL):
   import { drizzle } from "drizzle-orm/postgres-js";

   // OR (SQLite):
   import { drizzle } from "drizzle-orm/better-sqlite3";
   ```

2. **Remove transaction mock** (`src/server/db/index.ts:78`):
   ```typescript
   // DELETE THIS LINE:
   db.transaction = async (callback) => callback(db as any);

   // Use real transactions automatically
   ```

3. **Increase variable limits**:
   ```typescript
   // src/server/db/chunk-utils.ts:3
   const DEFAULT_SQLITE_VARIABLE_LIMIT = 999; // Standard SQLite
   // or 32767 for PostgreSQL
   ```

4. **Increase batch sizes**:
   ```typescript
   // src/server/db/chunk-utils.ts:4
   const DEFAULT_BATCH_LIMIT = 1000; // No limit in standard DBs
   ```

---

## Priority Summary

| Priority | Items | Total Effort | Impact |
|----------|-------|--------------|--------|
| P0 (Critical) | #1, #2, #3 | 4.5 hours | High - 90% query reduction |
| P1 (High) | #4, #5, #6, #7 | 11 hours | High - Eliminate N+1, faster queries |
| P2 (Medium) | #8, #9, #10 | 7-9 hours | Medium - Cleaner code, fewer round-trips |
| P3 (Low) | #11, #12, #13, #14 | 3 hours | Low - Polish, documentation |
| Bonus | #15, #16 | 2-3 hours | Low - Code quality |

**Recommended Implementation Order:**

**Week 1 - Quick Wins** (5 hours):
- #2: Duplicate dashboard query (30 min) ✅ Easy
- #3: Exercise link loop (1 hour) ✅ Easy
- #11: Template caching (30 min) ✅ Easy
- #13: Variable limit (30 min) ✅ Easy
- #14: Transaction docs (1 hour) ✅ Easy
- #9: Remove chunking (1 hour) ✅ Easy

**Week 2 - High Impact** (9 hours):
- #1: Session debrief N+1 (3 hours) 🔥 Critical
- #7: Add indexes (2 hours) 🔥 Critical
- #4: Sequential lookups (2 hours) 🚀 High value
- #6: Template joins (2 hours) 🚀 High value

**Week 3 - Complex** (7 hours):
- #5: Workout consolidation (4 hours)
- #15: View usage (3 hours)

**Week 4 - Optimization** (7-9 hours):
- #8: Index consolidation (4-6 hours) ⚠️ Requires profiling
- #10: Batch size testing (2 hours) ⚠️ Requires monitoring
- #12: Cache extension (1 hour)

---

## Notes for Implementation Agent

### Context Files to Review:
- `CLAUDE.md` - Project setup, D1 constraints, chunking patterns
- `src/server/db/chunk-utils.ts` - Chunking utilities (already portable)
- `src/server/db/schema.ts` - Database schema and indexes
- `src/server/db/monitoring.ts` - Query performance monitoring

### Key Constraints:
1. **D1 Variable Limit**: ~90 SQL variables per query (keep chunking for writes)
2. **No Transactions**: D1 doesn't support ACID transactions (mock exists)
3. **Portability**: All changes must work with future PostgreSQL/SQLite migration
4. **Existing Patterns**: Already has good chunking/batching - build on it

### Testing Commands:
```bash
# Type check
bun check

# Run tests
bun run test

# Test specific file
bun run test src/__tests__/db/

# Coverage
bun run coverage
```

### Database Commands:
```bash
# Push schema changes
infisical run -- bun db:push

# Create views (manual after schema changes)
infisical run --env <env> -- wrangler d1 execute <db> --file scripts/create-views.sql
```

---

## Questions for Discussion

Before starting implementation:

1. **Index Consolidation (#8)**: Do we have production query stats to identify unused indexes?
2. **Batch Size (#10)**: What's acceptable error rate for testing larger batch sizes in staging?
3. **Caching (#12)**: Are exercise names expected to change frequently, or can we extend TTL?
4. **Priority**: Any specific performance pain points we should prioritize?

---

**Last Updated**: 2025-11-14
**Portability Status**: ✅ All recommendations are standard SQL, no vendor lock-in
**Estimated Total Effort**: ~28-32 hours across 4 weeks
