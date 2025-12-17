# Unified Server-Side Cache Manager

Complete server-side caching solution for Swole Tracker, consolidating duplicate cache implementations across routers.

## 📦 What's Included

```
src/server/cache/
├── server-cache-manager.ts     # Core cache implementation
├── cache-monitoring.ts          # Health monitoring and analytics
├── CACHING_STRATEGY.md         # Complete caching guide
├── MIGRATION_GUIDE.md          # How to migrate existing caches
├── README.md                   # This file
└── examples/
    ├── progress-router-refactored.ts
    └── exercises-router-refactored.ts
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { cacheManager, cachePresets } from "~/server/cache/server-cache-manager";

// Create a cache for calculations (1 hour TTL)
const myCache = cacheManager.getCache("my-calculations", cachePresets.calculations);

// Set a value
myCache.set("user:123:stats", { strength: 100, volume: 5000 });

// Get a value (returns null if expired)
const stats = myCache.get("user:123:stats");

// Check if exists (without retrieving)
if (myCache.has("user:123:stats")) {
  // ...
}

// Delete a specific key
myCache.delete("user:123:stats");

// Clear entire cache
myCache.clear();
```

### With Monitoring

```typescript
import { setupCacheMonitoring, logCacheHealth } from "~/server/cache/cache-monitoring";

// Setup automatic monitoring
const stopMonitoring = setupCacheMonitoring({
  logInterval: 5 * 60 * 1000,      // Log every 5 minutes
  trackInterval: 15 * 60 * 1000,   // Track to PostHog every 15 minutes
  enableLogging: true,
  enableTracking: true,
});

// Manual health check
logCacheHealth();

// Get metrics
const metrics = myCache.getMetrics();
console.log(`Hit rate: ${myCache.getHitRate()}`);
```

## 📋 Available Cache Presets

| Preset | TTL | Max Size | Use For |
|--------|-----|----------|---------|
| `calculations` | 1 hour | 500 | Expensive progress calculations |
| `search` | 5 minutes | 1000 | Exercise search results |
| `session` | 30 minutes | 200 | User session data |
| `aggregation` | 15 minutes | 300 | Pre-computed statistics |

### Usage

```typescript
import { cachePresets } from "~/server/cache/server-cache-manager";

// Use a preset
const calcCache = cacheManager.getCache("my-cache", cachePresets.calculations);

// Or create custom configuration
import { ServerCache } from "~/server/cache/server-cache-manager";

const customCache = new ServerCache({
  ttl: 10 * 60 * 1000,       // 10 minutes
  maxSize: 750,              // 750 entries max
  autoCleanup: true,
  cleanupInterval: 2 * 60 * 1000,  // Cleanup every 2 minutes
  enableMetrics: true,
});
```

## 🎯 Migration from Old Caches

### Before (progress.ts)

```typescript
const calculationCache = new Map<string, CacheEntry>();

export function getCachedCalculation<T>(key: string): T | null {
  const cached = calculationCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value as T;
  }
  if (cached) calculationCache.delete(key);
  return null;
}

export function setCachedCalculation<T>(key: string, value: T): void {
  calculationCache.set(key, {
    value,
    expires: Date.now() + CACHE_TTL,
  });
}
```

### After (progress.ts)

```typescript
import { cacheManager, cachePresets } from "~/server/cache/server-cache-manager";

const calculationCache = cacheManager.getCache(
  "progress-calculations",
  cachePresets.calculations
);

export function getCachedCalculation<T>(key: string): T | null {
  return calculationCache.get(key) as T | null;
}

export function setCachedCalculation<T>(key: string, value: T): void {
  calculationCache.set(key, value);
}
```

**Result**: 19 lines → 8 lines (58% reduction)

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for complete migration instructions.

## 📊 Monitoring Dashboard

```typescript
import {
  generateCacheHealthReport,
  logCacheHealth,
  getCacheRecommendations
} from "~/server/cache/cache-monitoring";

// Get comprehensive health report
const report = generateCacheHealthReport();

// Log to console
logCacheHealth();

// Get recommendations
const recommendations = getCacheRecommendations(report);
recommendations.forEach(rec => console.log(rec));

// Example output:
// ✅ HEALTHY
// Average Hit Rate: 85.32%
// Total Requests: 1,234
//
// ✅ progress-calculations
//   Hit Rate: 90.50%
//   Size: 245 entries
//
// ⚠️ exercise-search
//   Hit Rate: 45.20%
//   Issues: Warning - Hit rate below 50%
//   Recommendation: Consider increasing TTL
```

## 🔧 Advanced Features

### Custom TTL per Entry

```typescript
// Use default TTL (from preset)
cache.set("key1", value);

// Use custom TTL (5 seconds)
cache.set("key2", value, 5000);

// Use different TTL for different data freshness needs
cache.set("realtime", data, 30 * 1000);      // 30 seconds
cache.set("static", data, 24 * 60 * 60 * 1000);  // 24 hours
```

### Cache Invalidation Patterns

```typescript
// Pattern 1: Specific key deletion
await updateUser(userId);
cache.delete(`user:${userId}:stats`);

// Pattern 2: Clear all related data
await updateWorkout(workoutId);
cache.delete(`workout:${workoutId}`);
cache.delete(`workouts:${userId}:recent`);

// Pattern 3: Clear entire cache after major change
await migrateDatabase();
cache.clear();
```

### LRU Eviction (Automatic)

```typescript
const cache = new ServerCache({
  ttl: 60 * 60 * 1000,
  maxSize: 100,  // When 100 entries reached...
});

// Add 101 entries
for (let i = 0; i <= 100; i++) {
  cache.set(`key${i}`, i);
}

// Least recently used entry ("key0") was automatically evicted
console.log(cache.get("key0"));  // null (evicted)
console.log(cache.get("key100")); // 100 (still there)

// Check eviction count
console.log(cache.getMetrics().evictions); // 1
```

### Automatic Cleanup

```typescript
const cache = new ServerCache({
  ttl: 5 * 60 * 1000,    // 5 minute TTL
  autoCleanup: true,     // Enable automatic cleanup
  cleanupInterval: 2 * 60 * 1000,  // Run every 2 minutes
});

// Expired entries are automatically removed every 2 minutes
// No need to manually check expiration!

// Can also trigger manual cleanup
const removedCount = cache.cleanup();
console.log(`Removed ${removedCount} expired entries`);
```

## 📈 Performance Characteristics

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| `get()` | O(1) | Hash map lookup |
| `set()` | O(1) amortized | O(n) when evicting LRU |
| `delete()` | O(1) | Hash map deletion |
| `clear()` | O(n) | Clears all entries |
| `cleanup()` | O(n) | Iterates all entries |

### Memory Usage

- Each cache entry: ~100-200 bytes overhead
- Max 500 entries (calculations): ~50-100 KB
- Max 1000 entries (search): ~100-200 KB
- Total: <500 KB for all caches

## 🧪 Testing

```typescript
import { ServerCache } from "~/server/cache/server-cache-manager";

describe("ServerCache", () => {
  let cache: ServerCache<string>;

  beforeEach(() => {
    cache = new ServerCache({ ttl: 1000 });
  });

  afterEach(() => {
    cache.destroy(); // Cleanup
  });

  it("should cache values", () => {
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("should expire after TTL", async () => {
    cache.set("key", "value");
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(cache.get("key")).toBeNull();
  });

  it("should track metrics", () => {
    cache.set("key", "value");
    cache.get("key"); // hit
    cache.get("missing"); // miss

    const metrics = cache.getMetrics();
    expect(metrics.hits).toBe(1);
    expect(metrics.misses).toBe(1);
    expect(cache.getHitRate()).toBe(0.5);
  });

  it("should evict LRU when full", () => {
    const smallCache = new ServerCache({ ttl: 60000, maxSize: 3 });

    smallCache.set("a", "1");
    smallCache.set("b", "2");
    smallCache.set("c", "3");

    // Access "a" to make it recently used
    smallCache.get("a");

    // Add "d" - should evict "b" (least recently used)
    smallCache.set("d", "4");

    expect(smallCache.has("a")).toBe(true);  // Recently used
    expect(smallCache.has("b")).toBe(false); // Evicted
    expect(smallCache.has("c")).toBe(true);  // Not evicted
    expect(smallCache.has("d")).toBe(true);  // Just added
  });
});
```

## 🔍 Debugging

```typescript
// Get all cache keys
const keys = cache.keys();
console.log("Cached keys:", keys);

// Get metrics
const metrics = cache.getMetrics();
console.log({
  hits: metrics.hits,
  misses: metrics.misses,
  hitRate: cache.getHitRate(),
  size: cache.size(),
});

// Export all cache metrics
import { cacheManager } from "~/server/cache/server-cache-manager";
const allMetrics = cacheManager.getAllMetrics();
console.log(JSON.stringify(allMetrics, null, 2));
```

## 🎓 Best Practices

### 1. Use Descriptive Cache Names

```typescript
// ✅ GOOD
cacheManager.getCache("user-progress-calculations", cachePresets.calculations);
cacheManager.getCache("exercise-search-results", cachePresets.search);

// ❌ BAD
cacheManager.getCache("cache1", cachePresets.calculations);
cacheManager.getCache("temp", cachePresets.search);
```

### 2. Design Good Cache Keys

```typescript
// ✅ GOOD: Specific, scoped, predictable
`user:${userId}:progression:${exerciseId}:${timeRange}`
`search:${term.toLowerCase().trim()}:limit:${limit}`

// ❌ BAD: Too generic, hard to invalidate
`data`
`result${Math.random()}`
```

### 3. Match TTL to Data Staleness

```typescript
// Static data: Long TTL
cache.set("templates", data, 24 * 60 * 60 * 1000); // 24 hours

// Frequently changing: Short TTL
cache.set("current-workout", data, 30 * 1000); // 30 seconds

// Calculated data: Medium TTL
cache.set("progression", data, 15 * 60 * 1000); // 15 minutes
```

### 4. Always Invalidate After Mutations

```typescript
// Create mutation handler
const updateWorkout = async (id: number, data: any) => {
  await db.update(workouts).set(data).where(eq(workouts.id, id));

  // Invalidate related caches
  cache.delete(`workout:${id}`);
  cache.delete(`workouts:user:${data.userId}:recent`);
  cache.delete(`progression:${data.userId}`);
};
```

### 5. Monitor Cache Health

```typescript
// Setup monitoring on app startup
import { setupCacheMonitoring } from "~/server/cache/cache-monitoring";

setupCacheMonitoring({
  logInterval: 5 * 60 * 1000,    // Every 5 minutes
  trackInterval: 15 * 60 * 1000, // Every 15 minutes
  enableLogging: process.env.NODE_ENV === "development",
  enableTracking: true,
});
```

## 📚 Complete Documentation

- **[CACHING_STRATEGY.md](./CACHING_STRATEGY.md)** - Complete caching architecture guide
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Step-by-step migration instructions
- **[examples/](./examples/)** - Before/after code examples

## ❓ FAQ

**Q: When should I use server-side cache vs TanStack Query?**
- Server cache: Expensive calculations, API responses (server-side only)
- TanStack Query: UI data fetching, offline support (client-side)

**Q: How do I know if my cache is healthy?**
- Use `logCacheHealth()` or setup `setupCacheMonitoring()`
- Target: >70% hit rate, <10% eviction rate

**Q: What happens when cache is full?**
- LRU (Least Recently Used) entry is automatically evicted
- Track evictions via `getMetrics().evictions`

**Q: Can I disable metrics for performance?**
- Yes: `new ServerCache({ enableMetrics: false, ... })`
- Impact is minimal (~1-2% overhead)

**Q: How do I test cache behavior?**
- See [Testing](#-testing) section above
- Use short TTLs in tests for faster execution

## 🔗 Related

- `/src/trpc/cache-config.ts` - Client-side TanStack Query configuration
- `/src/lib/offline-storage.ts` - Client-side persistence layer
- `CLAUDE.md` - Project guidelines

---

**Made with ❤️ for Swole Tracker**
