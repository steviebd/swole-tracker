import { describe, it, expect, vi } from 'vitest';

// Ensure required public env vars exist BEFORE importing any module that may load src/env.js
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= 'pk_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= 'phc_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= 'https://us.i.posthog.com';
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= 'supabase_test_key';

/**
 * Import the module under test lazily after setting env, to avoid early env validation
 * via src/env.js. Using dynamic import defers module evaluation until after setup.
 */
let rateLimit: any;
beforeAll(async () => {
  // Load rate-limit in a Node-like context to avoid client-side env guard.
  const mod = await import('~/lib/rate-limit');
  rateLimit = mod;
});

describe.skip('rate-limit utilities (skipped in Phase 1)', () => {
  it('should provide middleware factory or utilities', async () => {
    expect(rateLimit).toBeTruthy();
    const keys = Object.keys(rateLimit);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('middleware utilities are present without initializing DB connections', async () => {
    // This test avoids invoking code paths that instantiate DB connections.
    // Validate presence of exports only.
    const keys = Object.keys(rateLimit);
    expect(keys.some((k) => typeof (rateLimit as any)[k] === 'function')).toBe(true);
  });
});
