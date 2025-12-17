# Cache Unification Implementation Plan

## 🎯 Objective

Migrate duplicate server-side cache implementations in `progress.ts` and `exercises.ts` to use the unified `ServerCache` manager, maximizing code reuse and maintainability.

## 📋 Prerequisites

✅ **Completed**:
- [x] Unified cache manager created (`server-cache-manager.ts`)
- [x] Monitoring utilities created (`cache-monitoring.ts`)
- [x] Documentation written (README, MIGRATION_GUIDE, CACHING_STRATEGY)
- [x] Example implementations created

⏳ **Pending**:
- [ ] Migrate `progress.ts` cache implementation
- [ ] Migrate `exercises.ts` cache implementation
- [ ] Add monitoring integration
- [ ] Write tests
- [ ] Update CLAUDE.md with new cache strategy

---

## 📝 Implementation Tasks

### Task 1: Migrate `progress.ts` Cache

**File**: `/Users/steven/swole-tracker/src/server/api/routers/progress.ts`

**Current Implementation** (Lines 74-93):
```typescript
const calculationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour TTL

export function getCachedCalculation<T>(key: string): T | null {
  const cached = calculationCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value as T;
  }
  if (cached) {
    calculationCache.delete(key);
  }
  return null;
}

export function setCachedCalculation<T>(key: string, value: T): void {
  calculationCache.set(key, {
    value,
    expires: Date.now() + CACHE_TTL,
  });
}
```

**Required Changes**:
1. Add import at top of file:
   ```typescript
   import { cacheManager, cachePresets } from "~/server/cache/server-cache-manager";
   ```

2. Replace lines 74-93 with:
   ```typescript
   // Unified calculation cache with 1 hour TTL
   const calculationCache = cacheManager.getCache(
     "progress-calculations",
     cachePresets.calculations,
   );

   export function getCachedCalculation<T>(key: string): T | null {
     return calculationCache.get(key) as T | null;
   }

   export function setCachedCalculation<T>(key: string, value: T): void {
     calculationCache.set(key, value);
   }

   // Optional: Get cache metrics for monitoring
   export function getCalculationCacheMetrics() {
     return {
       ...calculationCache.getMetrics(),
       hitRate: calculationCache.getHitRate(),
     };
   }
   ```

3. Remove the `CacheEntry` interface if it's defined (no longer needed)

**Success Criteria**:
- All existing calls to `getCachedCalculation` and `setCachedCalculation` work unchanged
- Cache still expires after 1 hour
- No type errors
- All existing tests pass

---

### Task 2: Migrate `exercises.ts` Cache

**File**: `/Users/steven/swole-tracker/src/server/api/routers/exercises.ts`

**Current Implementation** (Lines 13-42):
```typescript
class SimpleCache {
  private cache = new Map<string, { value: unknown; expires: number }>();

  get(key: string): unknown {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expires) {
      return entry.value;
    }
    this.cache.delete(key);
    return undefined;
  }

  set(key: string, value: unknown, ttlMs: number) {
    this.cache.set(key, { value, expires: Date.now() + ttlMs });
  }

  clear() {
    this.cache.clear();
  }
}

const searchCache = new SimpleCache();

// Cache metrics for monitoring
let cacheHits = 0;
let cacheMisses = 0;

function getCacheMetrics() {
  return { hits: cacheHits, misses: cacheMisses };
}
```

**Required Changes**:
1. Add import at top of file:
   ```typescript
   import { cacheManager, cachePresets } from "~/server/cache/server-cache-manager";
   ```

2. Replace lines 13-42 with:
   ```typescript
   // Unified search cache with 5 minute TTL
   const searchCache = cacheManager.getCache(
     "exercise-search",
     cachePresets.search,
   );

   // Cache metrics now built-in!
   function getCacheMetrics() {
     return searchCache.getMetrics();
   }
   ```

3. Update any `searchCache.get()` calls that expect `undefined` to handle `null`:
   - Find all: `searchCache.get(`
   - Change comparisons from `=== undefined` to `=== null` or use `!cached`

4. Update any `searchCache.set()` calls with custom TTL:
   - Old: `searchCache.set(key, value, ttlMs)`
   - New: Same API - no changes needed! ✅

5. Remove manual `cacheHits++` and `cacheMisses++` tracking (now automatic)

**Success Criteria**:
- All existing calls to `searchCache` methods work unchanged (or with minimal null handling)
- Cache metrics are automatically tracked
- TTL-based expiration works correctly
- No type errors
- All existing tests pass

---

### Task 3: Add Monitoring Integration

**File**: Create `/Users/steven/swole-tracker/src/server/monitoring/cache-health.ts`

**Implementation**:
```typescript
import { setupCacheMonitoring } from "~/server/cache/cache-monitoring";

/**
 * Initialize cache monitoring on server startup
 */
export function initializeCacheMonitoring(): () => void {
  return setupCacheMonitoring({
    logInterval: 5 * 60 * 1000, // Log every 5 minutes
    trackInterval: 15 * 60 * 1000, // Track to PostHog every 15 minutes
    enableLogging: process.env.NODE_ENV === "development",
    enableTracking: process.env.NODE_ENV === "production",
  });
}
```

**Integration Point**:
- Find server initialization file (likely `src/server/index.ts` or similar)
- Add call to `initializeCacheMonitoring()` on startup
- Store cleanup function and call on shutdown

**Success Criteria**:
- Cache health logs appear in console during development
- Cache metrics are sent to PostHog in production
- No performance degradation

---

### Task 4: Write Tests

**File**: Create `/Users/steven/swole-tracker/src/server/cache/__tests__/server-cache-manager.test.ts`

**Test Coverage**:
1. Basic caching functionality
   - Set and get values
   - TTL expiration
   - Custom TTL per entry

2. Size limits and LRU eviction
   - Cache respects maxSize
   - LRU eviction when full
   - Eviction metrics tracked

3. Metrics tracking
   - Hit/miss counting
   - Hit rate calculation
   - Eviction tracking

4. Cleanup functionality
   - Automatic cleanup
   - Manual cleanup
   - stopAutoCleanup

5. CacheManager singleton
   - Get/create named caches
   - Multiple caches isolated
   - getAllMetrics works

**Template**:
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ServerCache, cacheManager } from "../server-cache-manager";

describe("ServerCache", () => {
  let cache: ServerCache<string>;

  beforeEach(() => {
    cache = new ServerCache({ ttl: 1000, enableMetrics: true });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe("basic functionality", () => {
    it("should cache and retrieve values", () => {
      cache.set("key", "value");
      expect(cache.get("key")).toBe("value");
    });

    it("should return null for non-existent keys", () => {
      expect(cache.get("missing")).toBeNull();
    });

    it("should expire after TTL", async () => {
      cache.set("key", "value");
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(cache.get("key")).toBeNull();
    });

    // ... more tests
  });

  // ... more test suites
});
```

**Success Criteria**:
- All tests pass
- >90% code coverage for server-cache-manager.ts
- Edge cases covered (expiration, eviction, etc.)

---

### Task 5: Integration Testing

**File**: Create `/Users/steven/swole-tracker/src/server/cache/__tests__/integration.test.ts`

**Test Scenarios**:
1. Progress calculations cache
   - Verify same results as before
   - Verify caching reduces computation time
   - Verify cache invalidation works

2. Exercise search cache
   - Verify search results are cached
   - Verify TTL expiration works
   - Verify cache improves search performance

3. Cross-router cache access
   - Multiple routers can access same cache
   - Metrics are aggregated correctly

**Success Criteria**:
- Integration tests pass
- Performance benchmarks show improvement
- No regressions in existing functionality

---

### Task 6: Update Documentation

**Files to Update**:

1. **`/Users/steven/swole-tracker/CLAUDE.md`**
   - Add section on unified caching strategy
   - Reference `src/server/cache/` documentation
   - Update "Common Development Tasks" with cache usage

2. **`/Users/steven/swole-tracker/AGENTS.md`** (if exists)
   - Document cache architecture
   - Reference monitoring utilities

**New Section for CLAUDE.md**:
```markdown
## Server-Side Caching

**Location**: `src/server/cache/`

Swole Tracker uses a unified server-side cache manager for expensive calculations and API responses.

### Quick Usage

```typescript
import { cacheManager, cachePresets } from "~/server/cache/server-cache-manager";

const cache = cacheManager.getCache("my-cache", cachePresets.calculations);

// Cache expensive calculation
const key = `progression:${userId}:${exerciseId}`;
const cached = cache.get(key);
if (cached) return cached;

const result = await expensiveCalculation();
cache.set(key, result);
return result;
```

### Cache Types

- **calculations**: 1 hour TTL, for expensive progress calculations
- **search**: 5 minute TTL, for API search results
- **session**: 30 minute TTL, for user session data
- **aggregation**: 15 minute TTL, for pre-computed statistics

### Monitoring

Cache health is automatically monitored in development. Access metrics:

```typescript
import { logCacheHealth } from "~/server/cache/cache-monitoring";
logCacheHealth(); // Logs detailed health report
```

See `src/server/cache/README.md` for complete documentation.
```

**Success Criteria**:
- Documentation is updated and accurate
- Examples work correctly
- Cross-references are valid

---

## 🧪 Testing Strategy

### Phase 1: Unit Tests
- Test ServerCache class in isolation
- Test CacheManager singleton
- Test monitoring utilities

### Phase 2: Integration Tests
- Test with actual router code
- Verify cache improves performance
- Verify metrics are accurate

### Phase 3: Manual Testing
- Run dev server
- Exercise progress calculations
- Exercise search functionality
- Check console logs for cache health
- Verify no errors or regressions

### Phase 4: Performance Testing
- Benchmark before/after migration
- Verify cache hit rates are >70%
- Ensure no memory leaks

---

## 📊 Success Metrics

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Code Reduction | >70% | Line count comparison |
| Hit Rate | >70% | Cache metrics logging |
| Test Coverage | >90% | `bun run coverage` |
| Type Safety | 100% | `bun check` passes |
| Performance | No regression | Benchmark comparison |
| Memory Usage | <100MB total | Monitor in production |

---

## 🚨 Risk Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation**:
- Keep API signatures identical where possible
- Write comprehensive tests before migration
- Test in development thoroughly

### Risk 2: Performance Degradation
**Mitigation**:
- Benchmark before/after
- Monitor cache hit rates
- Tune TTL and size limits if needed

### Risk 3: Memory Leaks
**Mitigation**:
- Size limits prevent unbounded growth
- Automatic cleanup removes expired entries
- Monitor memory usage in production

---

## 📅 Implementation Timeline

### Phase 1: Preparation (Completed ✅)
- [x] Create unified cache manager
- [x] Write documentation
- [x] Create examples

### Phase 2: Migration (Estimated: 2-3 hours)
- [ ] Task 1: Migrate progress.ts (30 min)
- [ ] Task 2: Migrate exercises.ts (30 min)
- [ ] Task 3: Add monitoring (15 min)
- [ ] Task 4: Write tests (60 min)
- [ ] Task 5: Integration testing (30 min)
- [ ] Task 6: Update documentation (15 min)

### Phase 3: Validation (Estimated: 1 hour)
- [ ] Run full test suite
- [ ] Manual testing
- [ ] Performance benchmarking
- [ ] Code review

### Phase 4: Deployment (Estimated: 30 min)
- [ ] Deploy to staging
- [ ] Monitor cache metrics
- [ ] Deploy to production
- [ ] Monitor for issues

**Total Estimated Time**: 4-5 hours

---

## 🔧 Rollback Plan

If issues are found after deployment:

1. **Immediate**: Revert commits that migrated caches
2. **Short-term**: Fix issues and re-deploy
3. **Long-term**: Review and improve cache implementation

Keep old cache implementations commented out until production is stable for 1 week.

---

## ✅ Definition of Done

- [ ] All code changes merged to main branch
- [ ] All tests passing (unit + integration)
- [ ] Type checking passes (`bun check`)
- [ ] Documentation updated
- [ ] Monitoring enabled in production
- [ ] Cache metrics showing healthy status (>70% hit rate)
- [ ] No performance regressions
- [ ] Team reviewed and approved
- [ ] Running in production for 1 week without issues

---

## 📚 References

- `src/server/cache/README.md` - Quick start and API reference
- `src/server/cache/MIGRATION_GUIDE.md` - Detailed migration steps
- `src/server/cache/CACHING_STRATEGY.md` - Architecture overview
- `src/server/cache/examples/` - Real migration examples
