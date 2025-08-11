/**
 * Vitest-only mock to prevent env-core server-only variable access when routers import
 * ~/lib/rate-limit-middleware under the jsdom environment used by integration tests.
 *
 * This mock must be loaded before any imports that transitively load the middleware.
 * We import this file from trpc-harness to ensure ordering for all integration tests.
 */

import { vi } from "vitest";

// Provide safe defaults for server-only env so any direct reads won't throw
process.env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR ??= "100";
process.env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR ??= "100";
process.env.RATE_LIMIT_JOKES_PER_HOUR ??= "100";
process.env.RATE_LIMIT_WHOOP_SYNC_PER_HOUR ??= "100";

// Mock the middleware module to no-op wrappers so handlers run without rate limiting.
vi.mock("~/lib/rate-limit-middleware", async () => {
  // Align mock shape with tRPC middleware signature used by routers:
  // t.middleware(async ({ next }) => next())
  const { initTRPC } = await import("@trpc/server");
  const t = initTRPC.create();

  const trpcNoop = t.middleware(async ({ next }) => next());

  // For code that constructs middleware dynamically
  const rateLimitMiddleware = () => trpcNoop;

  return {
    rateLimitMiddleware,
    templateRateLimit: trpcNoop,
    workoutRateLimit: trpcNoop,
    jokesRateLimit: trpcNoop,
    whoopSyncRateLimit: trpcNoop,
    apiCallRateLimit: trpcNoop,
  };
});
