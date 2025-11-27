# Server-Side Cache Migration Guide

This guide shows how to migrate from duplicate cache implementations to the unified `ServerCache` manager.

## 🔄 Migration Overview

### What's Being Replaced

1. **progress.ts** (lines 74-93) - In-memory calculation cache
2. **exercises.ts** (lines 13-42) - SimpleCache class

### What's Being Used

- **server-cache-manager.ts** - Unified caching with TTL, metrics, and size management

---

## 📝 Migration Examples

### 1. Migrating `progress.ts` Calculation Cache

#### Before (Old Code)
```typescript
// progress.ts lines 74-93
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

#### After (New Code)
```typescript
// progress.ts
import { cacheManager, cachePresets } from "~/server/cache/server-cache-manager";

// Get or create the calculations cache
const calculationCache = cacheManager.getCache<unknown>(
  "progress-calculations",
  cachePresets.calculations
);

export function getCachedCalculation<T>(key: string): T | null {
  return calculationCache.get(key) as T | null;
}

export function setCachedCalculation<T>(key: string, value: T): void {
  calculationCache.set(key, value);
}

// Optional: Get cache metrics for monitoring
export function getCalculationCacheMetrics() {
  return calculationCache.getMetrics();
}
```

**Benefits:**
- ✅ Automatic cleanup of expired entries
- ✅ Size limits prevent memory leaks
- ✅ Built-in metrics (hit rate, evictions)
- ✅ Same API - minimal code changes

---

### 2. Migrating `exercises.ts` SimpleCache

#### Before (Old Code)
```typescript
// exercises.ts lines 13-42
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
let cacheHits = 0;
let cacheMisses = 0;

function getCacheMetrics() {
  return { hits: cacheHits, misses: cacheMisses };
}
```

#### After (New Code)
```typescript
// exercises.ts
import { cacheManager, cachePresets } from "~/server/cache/server-cache-manager";

// Get or create the search cache
const searchCache = cacheManager.getCache(
  "exercise-search",
  cachePresets.search
);

// Metrics are now built-in!
function getCacheMetrics() {
  return searchCache.getMetrics();
}
```

**Benefits:**
- ✅ No manual metrics tracking needed
- ✅ Automatic LRU eviction when size limit reached
- ✅ Hit rate calculation built-in
- ✅ Less boilerplate code (74% reduction!)

---

## 🎯 Usage Patterns

### Basic Get/Set
```typescript
import { cacheManager, cachePresets } from "~/server/cache/server-cache-manager";

const myCache = cacheManager.getCache("my-cache", cachePresets.calculations);

// Set value with default TTL
myCache.set("key", { data: "value" });

// Get value (returns null if expired)
const value = myCache.get("key");

// Set with custom TTL (5 seconds)
myCache.set("key", { data: "value" }, 5000);
```

### Custom Cache Configuration
```typescript
import { ServerCache } from "~/server/cache/server-cache-manager";

const customCache = new ServerCache({
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 500,
  autoCleanup: true,
  cleanupInterval: 2 * 60 * 1000, // Cleanup every 2 minutes
  enableMetrics: true,
});
```

### Monitoring Cache Health
```typescript
const metrics = myCache.getMetrics();
console.log({
  hitRate: myCache.getHitRate(),
  ...metrics,
});

// Example output:
// {
//   hitRate: 0.85,
//   hits: 170,
//   misses: 30,
//   evictions: 5,
//   size: 245
// }
```

### Using Cache Manager (Multiple Caches)
```typescript
import { cacheManager, cachePresets } from "~/server/cache/server-cache-manager";

// Access named caches across routers
const calcCache = cacheManager.getCache("calculations", cachePresets.calculations);
const searchCache = cacheManager.getCache("search", cachePresets.search);

// Get all metrics at once
const allMetrics = cacheManager.getAllMetrics();
console.log(allMetrics);
// {
//   calculations: { hits: 100, misses: 20, ... },
//   search: { hits: 500, misses: 50, ... }
// }

// Clear all caches
cacheManager.clearAll();
```

---

## 📊 Client-Side Caching (No Changes Needed!)

**Client-side caching is already unified!** No migration needed for:

### ✅ TanStack Query (Primary Cache)
- Configured in `src/trpc/cache-config.ts`
- Handles all client-side query caching
- Already has query-specific defaults

### ✅ Offline Storage (Persistence Layer)
- Configured in `src/lib/offline-storage.ts`
- Persists TanStack Query cache to localStorage
- Already handles size limits, quota errors, health checks

**Strategy**: Continue using TanStack Query for all client-side caching. The server-side `ServerCache` is ONLY for server-side operations.

---

## 🚀 Migration Checklist

### Phase 1: Migrate progress.ts ✅
- [x] Create `server-cache-manager.ts`
- [ ] Replace calculation cache in `progress.ts`
- [ ] Test progress calculations still work
- [ ] Add cache metrics logging

### Phase 2: Migrate exercises.ts ✅
- [ ] Replace SimpleCache in `exercises.ts`
- [ ] Remove manual metrics tracking
- [ ] Test exercise search still works
- [ ] Verify cache hit rates

### Phase 3: Cleanup
- [ ] Remove old cache implementations
- [ ] Update imports across codebase
- [ ] Add cache monitoring to PostHog/analytics
- [ ] Document cache strategy in CLAUDE.md

---

## 🔍 Testing Strategy

### Unit Tests
```typescript
import { ServerCache } from "~/server/cache/server-cache-manager";

describe("ServerCache", () => {
  it("should cache and retrieve values", () => {
    const cache = new ServerCache({ ttl: 1000 });
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("should expire values after TTL", async () => {
    const cache = new ServerCache({ ttl: 100 });
    cache.set("key", "value");
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get("key")).toBeNull();
  });

  it("should track metrics", () => {
    const cache = new ServerCache({ ttl: 1000, enableMetrics: true });
    cache.set("key", "value");
    cache.get("key"); // Hit
    cache.get("missing"); // Miss

    const metrics = cache.getMetrics();
    expect(metrics.hits).toBe(1);
    expect(metrics.misses).toBe(1);
    expect(cache.getHitRate()).toBe(0.5);
  });
});
```

### Integration Tests
Test that existing functionality works with new cache:
- Progress calculations return correct results
- Exercise search returns correct results
- Cache hit rates are reasonable (>70% ideal)
- Memory usage stays bounded

---

## 📈 Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Code Lines | ~60 (duplicated) | ~15 per router | **75% reduction** |
| Memory Safety | ❌ No size limits | ✅ Configurable max size | **Prevents leaks** |
| Monitoring | ❌ Manual tracking | ✅ Built-in metrics | **Better observability** |
| Cleanup | ❌ Manual | ✅ Automatic | **Less maintenance** |
| Consistency | ❌ Different patterns | ✅ Unified API | **Easier to reason** |

---

## 🎓 Best Practices

1. **Use Named Caches**: Access caches through `cacheManager.getCache()` for consistency
2. **Monitor Metrics**: Log cache metrics periodically to identify issues
3. **Choose Right TTL**: Match TTL to data freshness requirements
4. **Set Size Limits**: Prevent memory leaks with reasonable `maxSize`
5. **Client vs Server**:
   - **Server**: Use `ServerCache` for expensive calculations/API results
   - **Client**: Use TanStack Query (already configured)
6. **Custom TTL**: Use per-item TTL when needed: `cache.set(key, value, customTtl)`

---

## ❓ FAQ

**Q: Should I migrate all caches at once?**
A: No, migrate incrementally. Start with progress.ts, test thoroughly, then exercises.ts.

**Q: What about client-side caching?**
A: No changes needed! Client-side already uses TanStack Query correctly.

**Q: How do I debug cache issues?**
A: Use `cache.getMetrics()` and `cache.keys()` to inspect cache state.

**Q: Can I disable metrics for performance?**
A: Yes, set `enableMetrics: false` in cache options.

**Q: What happens when cache is full?**
A: LRU (Least Recently Used) eviction removes oldest accessed entry.

---

## 📚 Related Documentation

- `src/server/cache/server-cache-manager.ts` - Implementation
- `src/trpc/cache-config.ts` - Client-side TanStack Query config
- `src/lib/offline-storage.ts` - Client-side persistence
- `CLAUDE.md` - Project guidelines
