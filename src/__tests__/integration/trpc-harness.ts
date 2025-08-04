/**
 * Ensure PUBLIC env is present before any imports that transitively load src/env.js,
 * which validates runtime env via @t3-oss/env-nextjs.
 */
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= 'pk_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= 'phc_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= 'https://us.i.posthog.com';
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= 'supabase_test_key';

import { type AppRouter, createCaller } from '~/server/api/root';
import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server';
import { vi } from 'vitest';

// Minimal shape of context from createTRPCContext in src/server/api/trpc.ts
type Ctx = {
  db: any;
  user: any;
  // match uuid format `${string}-${string}-${string}-${string}-${string}`
  requestId: `${string}-${string}-${string}-${string}-${string}`;
  headers: Headers;
};

// Create a mocked db layer you can tailor per test
export function createMockDb(overrides: Partial<Record<string, unknown>> = {}) {
  // You can expand this per router namespace (e.g., workouts, templates) in tests.
  return {
    ...overrides,
  } as any;
}

// Create a mocked Clerk user or anonymous
export function createMockUser(
  arg: boolean | { id?: string; emailAddresses?: Array<{ emailAddress: string }> } = true,
) {
  if (typeof arg === 'boolean') {
    return arg
      ? {
          id: 'user_test_123',
          emailAddresses: [{ emailAddress: 'test@example.com' }],
        }
      : null;
  }
  // object form allows overriding id for tests
  return {
    id: arg.id ?? 'user_test_123',
    emailAddresses: arg.emailAddresses ?? [{ emailAddress: 'test@example.com' }],
  };
}

// Build a tRPC caller with mocked ctx (db/auth)
/**
 * IMPORTANT: Module mocks must be defined before importing modules that consume them.
 * These vi.mock calls are hoisted by Vitest. We store mutable references that tests can set.
 */
const mockState: {
  db: any;
  user: any;
} = {
  db: undefined,
  user: undefined,
};

// Hoisted mocks
vi.mock('@clerk/nextjs/server', () => {
  return {
    currentUser: async () => mockState.user,
  };
});

vi.mock('~/server/db', () => {
  return {
    get db() {
      return mockState.db;
    },
  };
});

export function buildCaller(opts?: {
  db?: any;
  user?: any; // allow explicit null to simulate unauthenticated
  headers?: HeadersInit;
}): ReturnType<typeof createCaller> {
  mockState.db = opts?.db ?? createMockDb();
  // Preserve explicit null; only default to authenticated user when user is truly undefined
  mockState.user = (opts && 'user' in opts) ? opts.user : createMockUser(true);
  const headers = new Headers(opts?.headers ?? { 'x-test': '1' });

  // Create a requestId and caller bound to our mocked ctx
  const requestId = '00000000-0000-4000-8000-000000000000' as `${string}-${string}-${string}-${string}-${string}`;
  return createCaller({
    db: mockState.db,
    user: mockState.user,
    requestId,
    headers,
  } as Ctx);
}

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
