# Swole Tracker Unified Caching Strategy

Complete guide to caching across the Swole Tracker application.

## 📋 Overview

Swole Tracker uses a **two-tier caching architecture**:

1. **Server-Side Caching** - For expensive calculations and API responses
2. **Client-Side Caching** - For UI state and offline support

---

## 🖥️ Server-Side Caching (New!)

### Technology: Custom `ServerCache` Manager

**Location**: `src/server/cache/server-cache-manager.ts`

**Purpose**: Cache expensive database calculations and API responses on the server

### Use Cases

| Cache Type | TTL | Max Size | Use For |
|------------|-----|----------|---------|
| **Calculations** | 1 hour | 500 | Progress metrics, aggregations |
| **Search** | 5 minutes | 1000 | Exercise search results |
| **Session** | 30 minutes | 200 | User session data |
| **Aggregation** | 15 minutes | 300 | Pre-computed statistics |

### Architecture

```typescript
┌─────────────────────────────────────────────────┐
│            Server-Side Cache Manager            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ progress.ts  │  │exercises.ts  │  (Routers) │
│  └──────┬───────┘  └──────┬───────┘            │
│         │                 │                     │
│         └────────┬────────┘                     │
│                  ▼                              │
│      ┌────────────────────────┐                 │
│      │   Cache Manager        │                 │
│      │  (Named Caches)        │                 │
│      └────────────────────────┘                 │
│                  │                              │
│         ┌────────┴────────┐                     │
│         ▼                 ▼                     │
│  ┌─────────────┐   ┌─────────────┐             │
│  │Calculations │   │   Search    │             │
│  │   Cache     │   │   Cache     │             │
│  └─────────────┘   └─────────────┘             │
│                                                 │
│  Features:                                      │
│  ✅ TTL-based expiration                        │
│  ✅ LRU eviction                                │
│  ✅ Automatic cleanup                           │
│  ✅ Built-in metrics                            │
│  ✅ Size limits                                 │
└─────────────────────────────────────────────────┘
```

### Example Usage

```typescript
import { cacheManager, cachePresets } from "~/server/cache/server-cache-manager";

// Get or create a cache
const cache = cacheManager.getCache("my-cache", cachePresets.calculations);

// Basic usage
cache.set("key", value);
const value = cache.get("key");

// Custom TTL
cache.set("key", value, 5 * 60 * 1000); // 5 minutes

// Metrics
const metrics = cache.getMetrics();
const hitRate = cache.getHitRate();
```

---

## 💻 Client-Side Caching (Existing - No Changes)

### Technology: TanStack Query + localStorage Persistence

**Locations**:
- `src/trpc/cache-config.ts` - Query configuration
- `src/lib/offline-storage.ts` - Persistence layer

**Purpose**: Cache UI data, enable offline mode, reduce network requests

### Cache Configuration

| Data Type | Stale Time | GC Time | Refetch on Focus |
|-----------|------------|---------|------------------|
| **Templates** | 14 days | 30 days | ❌ No |
| **Preferences** | 14 days | 30 days | ❌ No |
| **WHOOP Historical** | 7 days | 14 days | ❌ No |
| **WHOOP Current** | 1 hour | 6 hours | ❌ No |
| **Workouts** | 0* | 24 hours | ✅ Yes |
| **Progress** | 5 minutes | 1 hour | ✅ Yes |
| **Real-time** | 30 seconds | 1 hour | ✅ Yes (+ polling) |

*0 = Show cached immediately while refetching in background

### Architecture

```typescript
┌───────────────────────────────────────────────────┐
│          Client-Side Caching (Browser)            │
├───────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────────────────────────────────┐    │
│  │        React Components                  │    │
│  └────────────────┬─────────────────────────┘    │
│                   │                              │
│                   ▼                              │
│  ┌──────────────────────────────────────────┐    │
│  │        tRPC Hooks (useQuery)             │    │
│  └────────────────┬─────────────────────────┘    │
│                   │                              │
│                   ▼                              │
│  ┌──────────────────────────────────────────┐    │
│  │      TanStack Query Client               │    │
│  │  • In-memory cache                       │    │
│  │  • Stale-while-revalidate                │    │
│  │  • Automatic refetching                  │    │
│  │  • Optimistic updates                    │    │
│  └────────────────┬─────────────────────────┘    │
│                   │                              │
│                   ▼                              │
│  ┌──────────────────────────────────────────┐    │
│  │   Persistence Layer (offline-storage)    │    │
│  │  • localStorage (max 5MB)                │    │
│  │  • Size management                       │    │
│  │  • Quota handling                        │    │
│  │  • Health checks                         │    │
│  └──────────────────────────────────────────┘    │
│                   │                              │
│                   ▼                              │
│          [localStorage]                          │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Features

✅ **Offline-First**: Works without network connection
✅ **Stale-While-Revalidate**: Show cached data immediately, fetch fresh in background
✅ **Optimistic Updates**: UI updates instantly, rollback on error
✅ **Size Management**: Automatic cleanup when approaching 5MB limit
✅ **Quota Handling**: Graceful degradation to memory-only mode
✅ **User-Scoped**: Separate cache per user

---

## 🔄 Cache Invalidation Strategy

### Server-Side

```typescript
// Manual invalidation after mutations
cache.delete("specific-key");
cache.clear(); // Clear entire cache

// Automatic invalidation (built-in)
// - TTL expiration
// - LRU eviction when full
// - Periodic cleanup (every 5 minutes)
```

### Client-Side

```typescript
import { invalidateQueries } from "~/trpc/cache-config";

// After workout save
invalidateQueries.workouts(queryClient);
invalidateQueries.progress(queryClient);
invalidateQueries.progressRealtime(queryClient);

// After template update
invalidateQueries.templates(queryClient);

// Clear everything (logout)
invalidateQueries.all(queryClient);
```

---

## 📊 Cache Monitoring

### Server-Side Metrics

```typescript
import { cacheManager } from "~/server/cache/server-cache-manager";

// Get all cache metrics
const metrics = cacheManager.getAllMetrics();

// Example output:
{
  "progress-calculations": {
    hits: 450,
    misses: 50,
    evictions: 5,
    size: 487,
    hitRate: 0.9
  },
  "exercise-search": {
    hits: 1200,
    misses: 300,
    evictions: 20,
    size: 950,
    hitRate: 0.8
  }
}
```

### Client-Side Metrics

```typescript
import { getCacheManager } from "~/lib/offline-storage";

const cacheManager = getCacheManager();
const stats = cacheManager.getStats();

// Example output:
{
  size: 4500000,           // ~4.5MB
  availableSpace: 500000,  // ~500KB remaining
  memoryOnly: false
}
```

---

## 🎯 When to Use Each Cache

### Use Server-Side Cache When:

✅ Expensive database aggregations (e.g., progress calculations)
✅ Complex calculations that take >100ms
✅ API responses that rarely change
✅ Search results that can be stale
✅ Pre-computed statistics

**Example**:
```typescript
// ✅ GOOD: Cache expensive calculation
const progression = await getProgressionData();
cache.set(`progression:${userId}`, progression);

// ❌ BAD: Don't cache simple DB lookups
const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
// This is fast enough, no caching needed
```

### Use Client-Side Cache (TanStack Query) When:

✅ Fetching data for UI display
✅ Need offline support
✅ Need optimistic updates
✅ Need automatic refetching
✅ Need background sync

**Example**:
```typescript
// ✅ GOOD: Fetch data for UI
const { data } = api.workouts.getRecent.useQuery();

// ✅ GOOD: Optimistic update
const mutation = api.workouts.save.useMutation({
  onMutate: async (newWorkout) => {
    // Optimistically update UI
    queryClient.setQueryData(['workouts'], old => [...old, newWorkout]);
  }
});
```

### Don't Cache When:

❌ Data changes frequently (every request)
❌ User-specific sensitive data
❌ Real-time data (use polling/websockets instead)
❌ Simple operations (<10ms)
❌ One-time operations

---

## 🚀 Performance Targets

### Server-Side Cache

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Hit Rate | >70% | TBD | 📊 Monitor |
| Avg Response (hit) | <5ms | TBD | 📊 Monitor |
| Avg Response (miss) | <100ms | TBD | 📊 Monitor |
| Memory Usage | <100MB | TBD | 📊 Monitor |
| Eviction Rate | <10% | TBD | 📊 Monitor |

### Client-Side Cache

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| localStorage Size | <4MB | TBD | 📊 Monitor |
| Hit Rate | >80% | TBD | 📊 Monitor |
| Offline Success Rate | >95% | TBD | 📊 Monitor |
| Cache Load Time | <100ms | TBD | 📊 Monitor |

---

## 🔧 Configuration Examples

### Custom Server Cache

```typescript
import { ServerCache } from "~/server/cache/server-cache-manager";

const customCache = new ServerCache({
  ttl: 10 * 60 * 1000,      // 10 minutes
  maxSize: 500,             // 500 entries max
  autoCleanup: true,        // Enable automatic cleanup
  cleanupInterval: 2 * 60 * 1000,  // Cleanup every 2 min
  enableMetrics: true,      // Track hit/miss rates
});
```

### Custom Client Query

```typescript
// In cache-config.ts
queryClient.setQueryDefaults(["myCustomQuery"], {
  staleTime: 5 * 60 * 1000,  // 5 minutes
  gcTime: 30 * 60 * 1000,    // 30 minutes
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 3,
});
```

---

## 📚 Best Practices

### 1. **Cache Key Design**

```typescript
// ✅ GOOD: Specific, scoped keys
`progression:${userId}:${exerciseId}:30d`
`search:${term.toLowerCase()}:${limit}`
`stats:${userId}:${date}`

// ❌ BAD: Generic, collision-prone keys
`data`
`result`
`cache`
```

### 2. **TTL Selection**

```typescript
// Static data (templates, preferences): Long TTL
cache.set(key, value, 24 * 60 * 60 * 1000); // 24 hours

// Dynamic data (workouts, progress): Medium TTL
cache.set(key, value, 5 * 60 * 1000); // 5 minutes

// Real-time data (current workout): Short TTL
cache.set(key, value, 30 * 1000); // 30 seconds
```

### 3. **Cache Invalidation**

```typescript
// ✅ GOOD: Invalidate related caches after mutation
await updateWorkout(id, data);
cache.delete(`workout:${id}`);
cache.delete(`workouts:${userId}:recent`);
invalidateQueries.workouts(queryClient);

// ❌ BAD: Forget to invalidate
await updateWorkout(id, data);
// Users see stale data!
```

### 4. **Monitor Cache Health**

```typescript
// Log metrics periodically
setInterval(() => {
  const metrics = cacheManager.getAllMetrics();
  console.log("Cache health:", metrics);

  // Alert if hit rate is low
  Object.entries(metrics).forEach(([name, stats]) => {
    if (stats.hitRate < 0.5) {
      console.warn(`Low hit rate for ${name}: ${stats.hitRate}`);
    }
  });
}, 60 * 1000); // Every minute
```

---

## 🧪 Testing Caches

### Server-Side Cache Tests

```typescript
import { ServerCache } from "~/server/cache/server-cache-manager";

describe("ServerCache", () => {
  it("should cache and retrieve values", () => {
    const cache = new ServerCache({ ttl: 1000 });
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("should expire after TTL", async () => {
    const cache = new ServerCache({ ttl: 100 });
    cache.set("key", "value");
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get("key")).toBeNull();
  });
});
```

### Client-Side Cache Tests

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { api } from "~/trpc/react";

it("should cache workout data", async () => {
  const { result } = renderHook(() => api.workouts.getRecent.useQuery());

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  // Data should be cached
  expect(result.current.data).toBeDefined();
});
```

---

## 📖 Migration Path

1. ✅ **Phase 1**: Create unified server cache (DONE)
2. ⏳ **Phase 2**: Migrate progress.ts (IN PROGRESS)
3. ⏳ **Phase 3**: Migrate exercises.ts (PENDING)
4. ⏳ **Phase 4**: Add monitoring (PENDING)
5. ⏳ **Phase 5**: Performance testing (PENDING)

---

## 🔗 Related Documentation

- [Migration Guide](./MIGRATION_GUIDE.md) - How to migrate existing caches
- [Server Cache Manager](./server-cache-manager.ts) - Implementation
- [TanStack Query Config](../../trpc/cache-config.ts) - Client-side config
- [Offline Storage](../../lib/offline-storage.ts) - Persistence layer
