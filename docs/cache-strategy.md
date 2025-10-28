# Cache Strategy Guide

## Overview

This document outlines the comprehensive caching strategy implemented for Swole Tracker's progress page performance optimization. The strategy focuses on TanStack Query (React Query) configuration, smart invalidation, and proactive cache warming to minimize database load and improve user experience.

## Cache Configuration

### Stale Times

Cache stale times are configured in `src/trpc/cache-config.ts`:

- **Daily summaries**: 48 hours stale time
- **Weekly summaries**: 9 days stale time
- **Monthly summaries**: 45 days stale time

These extended stale times reduce unnecessary refetches while ensuring data freshness for long-term trends.

### Cache Keys

Consistent cache key patterns are used across the application:

- `progress.aggregated.{userId}.{exerciseName}.{period}` - For aggregated progress data
- `progress.highlights.{userId}` - For progress highlights
- `progress.dashboard.{userId}` - For dashboard overview data

## Smart Cache Invalidation

### Automatic Invalidation

Cache invalidation is handled in `src/hooks/use-cache-invalidation.ts`:

- **Workout Session Saves**: Invalidates all aggregated progress data for affected exercises
- **Exercise Updates**: Invalidates specific exercise aggregations
- **User-Specific**: Only invalidates cache for the current user to avoid cross-user pollution

### Partial Updates

The system supports partial cache updates for incremental changes, reducing the need for full refetches when only small data changes occur.

## Cache Warming

### Background Service

Implemented in `src/lib/workout-cache-helpers.ts`, the cache warming service:

- **Triggers**: Runs after successful workout session saves
- **Pre-loads**: Frequently accessed data including:
  - Dashboard overview metrics
  - Progress highlights
  - Top exercises' aggregated data
- **Background Execution**: Non-blocking to avoid impacting save performance

### Integration Points

Cache warming is integrated at:

- `src/hooks/use-workout-session-state.ts` - After successful saves
- `src/hooks/use-workout-updates.ts` - For offline sync completions

## Implementation Details

### Files Modified

- `src/trpc/cache-config.ts`: Extended cache times and invalidation helpers
- `src/hooks/use-cache-invalidation.ts`: Progress aggregated invalidation hooks
- `src/lib/workout-cache-helpers.ts`: Cache warming service implementation
- `src/hooks/use-workout-session-state.ts`: Integration of cache warming after saves

### Performance Benefits

- **Reduced Database Load**: Extended stale times minimize query frequency
- **Faster UI**: Cached data provides instant loading for repeated views
- **Proactive Loading**: Cache warming ensures data is ready when users navigate to progress pages
- **Smart Updates**: Invalidation ensures cache consistency without over-invalidation

## Future Enhancements

### Deferred Features

- **Cache Invalidation Webhooks**: Real-time infrastructure for instant cache updates across user sessions (deferred due to complexity)
- **Predictive Warming**: ML-based prediction of user navigation patterns for even more proactive caching

### Monitoring

Track cache effectiveness through:

- Cache hit rates in PostHog analytics
- Query performance metrics
- User experience timing (page load times)

## Testing

Comprehensive tests cover:

- Cache warming functionality (`src/__tests__/unit/workout-cache-helpers.test.ts`)
- Invalidation hooks (`src/__tests__/hooks/use-cache-invalidation.test.tsx`)
- Cache configuration behavior

## Rollback Plan

If caching issues arise:

1. Reduce stale times in `cache-config.ts`
2. Disable cache warming by commenting out calls in save hooks
3. Clear all caches using TanStack Query's `queryClient.clear()`
