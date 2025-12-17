# Swole Tracker Project Details

## Overview

Swole Tracker is a modern fitness tracking application built with Next.js, React 19, TypeScript, and the T3 Stack. It provides comprehensive workout tracking, WHOOP integration, offline-first functionality, and cross-platform support with mobile PWA capabilities.

## Features

- **Workout Tracking**: Log workouts, exercises, sets, and track progress over time
- **WHOOP Integration**: Sync workout data and recovery metrics from WHOOP devices
- **Offline-First**: Full offline functionality with automatic sync when online
- **Cross-Platform**: Web application with mobile PWA capabilities
- **Real-time Sync**: Live workout session updates and conflict resolution

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Backend**: tRPC v11, Drizzle ORM
- **Database**: Cloudflare D1
- **Authentication**: WorkOS
- **Analytics**: PostHog
- **Package Manager**: Bun
- **Deployment**: Cloudflare Workers
- **Data Fetching**: TanStack Query (formerly React Query)

## Design Principles

- Energy Through Motion: Smooth transitions and purposeful animations
- Warm Motivation Over Cold Data: Transform data into inspiring experiences
- Mobile-First, Touch-Optimized: Thumb-friendly design for gym usage
- Glass Architecture: Depth through layering and backdrop blur effects
- Accessible Energy: WCAG 2.2 AA compliance with high-energy design

## Key Components

- Material 3 theming system with tonal palettes
- Comprehensive test suite with Vitest
- Offline storage and queue management
- Real-time workout session state
- Health advice and analytics integration

## Chunking Strategy

- Introduced shared database helpers to stay under Cloudflare D1 variable limits.
- All bulk inserts/updates now use chunked batches (typically <= 90 params per statement).
- Large IN clauses go through `whereInChunks` to avoid exceeding parameter caps.
- Whoop sync, analytics, and debrief generation rely on paging data in manageable slices.
- This design trades a few extra DB round trips for guaranteed success under D1 constraints.

### 6. Server-Side Caching

**Location**: `src/server/cache/`

Swole Tracker uses a unified server-side cache manager for expensive calculations and API responses. The cache system provides automatic TTL expiration, LRU eviction, and built-in metrics.

#### Quick Usage

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

#### Cache Types

- **calculations** (`cachePresets.calculations`): 1 hour TTL, for expensive progress calculations
- **search** (`cachePresets.search`): 5 minute TTL, for API search results
- **session** (`cachePresets.session`): 30 minute TTL, for user session data
- **aggregation** (`cachePresets.aggregation`): 15 minute TTL, for pre-computed statistics

#### Current Cache Usage

- `progress-calculations`: Progress router calculations (strength trends, volume, etc.)
- `exercise-search`: Exercise search results with pagination

#### Monitoring

Cache health is automatically tracked with metrics:

```typescript
import { cacheManager } from "~/server/cache/server-cache-manager";

// Get metrics for a specific cache
const cache = cacheManager.getCache("progress-calculations");
const metrics = cache.getMetrics();
console.log(metrics); // { hits, misses, evictions, size }
console.log(cache.getHitRate()); // 0.0 - 1.0

// Get metrics for all caches
const allMetrics = cacheManager.getAllMetrics();
```

#### Best Practices

1. **Use presets** for consistent TTL and size limits
2. **Namespace keys** by user ID to prevent data leaks: `${cacheType}:${userId}:${identifier}`
3. **Invalidate caches** when data changes: `cache.clear()` or `cache.delete(key)`
4. **Monitor hit rates** - target >70% for optimal performance
5. **Check cache limits** - caches automatically evict LRU entries when full

#### Documentation

See `src/server/cache/README.md` for complete API documentation.


## Pre-Commit Checklist

- [ ] Run `bun check` (lint + typecheck)
- [ ] Run `bun run test` (all tests pass)
- [ ] Check chunking for any bulk DB operations
- [ ] Verify accessibility (WCAG 2.2 AA)
- [ ] Test on mobile viewport
- [ ] Test offline functionality if applicable
- [ ] Update tests for new features
- [ ] Update docs if needed
- [ ] **NEW: Test component in all 5 themes (light, dark, cool, warm, neutral)**
- [ ] **NEW: No hardcoded colors - use CSS variables or `getStatusColors()`**
- [ ] **NEW: Shadows use `shadow-*` utility classes, not inline styles**
