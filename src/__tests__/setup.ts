import '@testing-library/jest-dom';

import { afterEach, beforeAll, vi } from 'vitest';

// JSDOM defaults: stub scroll/resize if needed
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });

// Mock PostHog to no-op to avoid network
vi.mock('~/lib/posthog', () => {
  return {
    default: {
      capture: vi.fn(),
      identify: vi.fn(),
      init: vi.fn(),
      reset: vi.fn(),
    },
  };
});

/**
 * Public env must be present before any module imports that validate env.
 * Put defaults here so any test (unit/integration) has them set early.
 */
beforeAll(() => {
  const defaults: Record<string, string> = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_dummy',
    NEXT_PUBLIC_POSTHOG_KEY: 'phc_test_dummy',
    NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_KEY: 'supabase_test_key',
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (!process.env[k]) {
      (process.env as Record<string, string>)[k] = v;
    }
  }
});

/**
 * Mock env.js to short-circuit @t3-oss/env-nextjs validation during tests.
 * Provide minimal server-side env values to avoid errors in codepaths that reference them.
 */
vi.mock('~/env.js', () => {
  return {
    env: {
      NODE_ENV: process.env.NODE_ENV ?? 'test',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://user:pass@localhost:5432/testdb',
      // add other server env keys here if referenced in server code
    },
  };
});

// Mock supabase client/server modules to avoid network
vi.mock('~/lib/supabase-client', () => {
  return {
    supabase: {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
});

vi.mock('~/lib/supabase-server', () => {
  return {
    createServerClient: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  };
});

/**
 * Stub public env prior to module imports that read src/env.js (T3 env).
 * This must run before any tested module is imported. Vitest loads setupFiles first.
 */
beforeAll(() => {
  const defaults: Record<string, string> = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_dummy',
    NEXT_PUBLIC_POSTHOG_KEY: 'phc_test_dummy',
    NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_KEY: 'supabase_test_key',
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (!process.env[k]) {
      (process.env as Record<string, string>)[k] = v;
    }
  }
  if (!process.env.NODE_ENV) {
    (process.env as Record<string, string>)['NODE_ENV'] = 'test';
  }
});

// Mock Clerk helpers for unit/integration (E2E can use live)
vi.mock('@clerk/nextjs', async () => {
  // Only provide pieces commonly imported in code; extend as needed
  return {
    auth: () =>
      Promise.resolve({
        userId: 'test_user_123',
        sessionId: 'test_session_123',
        getToken: async () => 'test_token',
      }),
    currentUser: async () => ({
      id: 'test_user_123',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
    }),
    ClerkProvider: ({ children }: { children: React.ReactNode }) => children as any,
    SignedIn: ({ children }: { children: React.ReactNode }) => children as any,
    SignedOut: ({ children }: { children: React.ReactNode }) => children as any,
    useAuth: () => ({
      isSignedIn: true,
      userId: 'test_user_123',
      sessionId: 'test_session_123',
      getToken: async () => 'test_token',
    }),
  };
});

/**
 * Provide minimal runtime env so @t3-oss/env-nextjs (src/env.js) doesn't throw
 * during tests. These are SAFE dummy values used only in test environment.
 */
beforeAll(() => {
  const defaults: Record<string, string> = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_dummy',
    NEXT_PUBLIC_POSTHOG_KEY: 'phc_test_dummy',
    NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_KEY: 'supabase_test_key',
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (!process.env[k]) {
      (process.env as Record<string, string>)[k] = v;
    }
  }
  // Ensure NODE_ENV is set for libs relying on it
  if (!process.env.NODE_ENV) {
    (process.env as Record<string, string>)['NODE_ENV'] = 'test';
  }
});

// Cleanup after each test if Testing Library is used (jsdom cleans DOM automatically)
// RTL v16 auto cleans between tests; explicit cleanup not required here, but keep placeholder.
afterEach(() => {
  // placeholder for additional per-test cleanup if needed
});
