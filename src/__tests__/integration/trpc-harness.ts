/**
 * Ensure PUBLIC env is present before any imports that transitively load src/env.js,
 * which validates runtime env via @t3-oss/env-nextjs.
 */
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= 'pk_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= 'phc_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= 'https://us.i.posthog.com';
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= 'supabase_test_key';

// Ensure rate-limit middleware is mocked before any app imports to avoid env-core errors in jsdom
import './setup.rate-limit-mocks';

// Also stub server-side env so @t3-oss/env-core proxy does not throw under jsdom.
// These values are safe test defaults and prevent "Attempted to access a server-side env on the client".
process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test';
process.env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR ||= '100';
process.env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR ||= '100';
process.env.RATE_LIMIT_JOKES_PER_HOUR ||= '100';
process.env.RATE_LIMIT_WHOOP_SYNC_PER_HOUR ||= '100';
/**
 * Jokes router reads server env from src/env.js via @t3-oss/env-nextjs/@t3-oss/env-core.
 * Under jsdom, any access to server env will throw unless values exist on process.env
 * BEFORE the module graph loads. Provide safe defaults and explicitly force the feature
 * flag off to keep the code path that uses fallback jokes instead of calling an AI gateway.
 */
process.env.AI_GATEWAY_ENABLED = 'false';
process.env.AI_GATEWAY_URL ||= 'https://ai-gateway.localtest';
process.env.AI_GATEWAY_API_KEY ||= 'ai_test_key';
process.env.AI_GATEWAY_MODEL ||= 'gpt-4o-mini';
process.env.AI_GATEWAY_PROMPT ||= 'Tell a short fitness-themed joke.';
/**
 * NODE_ENV is read-only in many setups; don't assign directly.
 * Vitest already sets NODE_ENV appropriately for tests.
 * If missing, consumers should handle undefined gracefully.
 */
// process.env.NODE_ENV ||= 'test';

import { type AppRouter, createCaller } from '~/server/api/root';

// Force mock for env module to avoid @t3-oss/env-core throwing when accessed in routers during jsdom tests.
// This is targeted for the jokes router generateNew path which reads env.AI_* vars.
vi.mock('~/env.js', async () => {
  return {
    env: {
      // Public vars (unused in server code paths here, but keep for completeness)
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
      NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
      NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY!,
      // Server vars used by routers
      AI_GATEWAY_ENABLED: 'false', // ensure fallback path
      AI_GATEWAY_URL: process.env.AI_GATEWAY_URL!,
      AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY!,
      AI_GATEWAY_MODEL: process.env.AI_GATEWAY_MODEL!,
      AI_GATEWAY_PROMPT: process.env.AI_GATEWAY_PROMPT!,
      RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR: process.env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR!,
      RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR: process.env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR!,
      RATE_LIMIT_JOKES_PER_HOUR: process.env.RATE_LIMIT_JOKES_PER_HOUR!,
      RATE_LIMIT_WHOOP_SYNC_PER_HOUR: process.env.RATE_LIMIT_WHOOP_SYNC_PER_HOUR!,
      DATABASE_URL: process.env.DATABASE_URL!,
      NODE_ENV: process.env.NODE_ENV ?? 'test',
    },
  };
});
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
  // Provide minimal stubs used by integration routers. Tests can override any of these.
  const now = new Date();
  const defaultDb = {
    // Drizzle-like query API used by routers
    query: {
      // Expose schema-like table refs with _ names for our simple router checks (do not duplicate keys)
      _workoutTemplates: undefined as any,
      _templateExercises: undefined as any,
      _exerciseLinks: undefined as any,
      _workoutSessions: undefined as any,

      workoutTemplates: {
        findMany: vi.fn(async (_args: any) => {
          // Return empty list by default
          return [];
        }),
        findFirst: vi.fn(async ({ with: withRel }: any) => {
          // Ensure user_id matches the authenticated user so ownership checks pass
          const userId = mockState.user?.id ?? 'user_test_123';
          return {
            id: 1,
            name: 'Mock Template',
            user_id: userId,
            createdAt: now,
            // workouts.start expects ordered exercises list
            exercises: withRel?.exercises
              ? [
                  { id: 11, templateId: 1, user_id: userId, exerciseName: 'Bench Press', orderIndex: 0, linkingRejected: false },
                  { id: 12, templateId: 1, user_id: userId, exerciseName: 'Squat', orderIndex: 1, linkingRejected: false },
                ]
              : undefined,
          };
        }),
      },
      workoutSessions: {
        findMany: vi.fn(async (_args: any) => []),
        findFirst: vi.fn(async ({ where, with: withRel }: any) => ({
          id: 99,
          user_id: 'user_test_123',
          templateId: 1,
          workoutDate: now,
          template: withRel?.template
            ? { id: 1, name: 'Mock Template', exercises: [] }
            : undefined,
          exercises: withRel?.exercises ? [] : undefined,
        })),
      },
      exerciseLinks: {
        findFirst: vi.fn(async (_args: any) => null),
        findMany: vi.fn(async (_args: any) => []),
      },
      // Match drizzle-orm "query.<table>.findFirst/findMany" access seen across routers
      templateExercises: {
        findFirst: vi.fn(async (_args: any) => null),
        findMany: vi.fn(async (_args: any) => []),
      },
    },

    // Minimal builders for insert/update/delete/select used in routers
    insert: vi.fn((table: any) => {
      return {
        values: vi.fn(function (vals: any) {
          const logTbl = table?._?.name ?? '(unknown)';
          // Template creation path
          if (table && table._.name === 'workout_templates') {
            const ret = {
              returning: vi.fn(async () => {
                const rows = [{ id: 1, name: vals?.name, user_id: vals?.user_id, createdAt: now }];
                // eslint-disable-next-line no-console
                console.log('[HARNESS] workout_templates.returning() ->', rows);
                if (!rows) throw new Error('HARNESS: workout_templates.returning() produced undefined');
                return rows;
              }),
            };
            return ret;
          }
          // Template exercises insert path (returning inserted rows with ids and names)
          if (table && table._.name === 'template_exercises') {
            const items = Array.isArray(vals) ? vals : [vals];
            const rows = items.map((v: any, i: number) => ({
              id: i + 100,
              templateId: v?.templateId,
              user_id: v?.user_id,
              exerciseName: v?.exerciseName,
              orderIndex: v?.orderIndex,
              linkingRejected: v?.linkingRejected ?? false,
            }));
            const ret = {
              returning: vi.fn(async () => {
                // eslint-disable-next-line no-console
                console.log('[HARNESS] template_exercises.returning() ->', rows);
                if (!rows) throw new Error('HARNESS: template_exercises.returning() produced undefined');
                return rows;
              }),
            };
            // Allow optional onConflictDoNothing chaining when used by exerciseLinks insert
            (ret as any).onConflictDoNothing = vi.fn(() => ret);
            return ret;
          }
          // master_exercises insert path (used by templates.create helper createAndLinkMasterExercise)
          if (table && table._.name === 'master_exercises') {
            const items = Array.isArray(vals) ? vals : [vals];
            const rows = items.map((v: any, i: number) => ({
              id: i + 200,
              user_id: v?.user_id,
              name: v?.name,
              normalizedName: v?.normalizedName,
            }));
            return {
              returning: vi.fn(async () => {
                // eslint-disable-next-line no-console
                console.log('[HARNESS] master_exercises.returning() ->', rows);
                if (!rows) throw new Error('HARNESS: master_exercises.returning() produced undefined');
                return rows;
              }),
            };
          }
          // exercise_links insert path: allow onConflictDoNothing chaining and return inserted link-like rows
          if (table && table._.name === 'exercise_links') {
            // Capture last provided values to synthesize returning rows
            let provided: any;
            const ret: any = {
              values: vi.fn((v: any) => {
                provided = v;
                return ret;
              }),
              onConflictDoNothing: vi.fn(() => ret),
              returning: vi.fn(async () => {
                const rows = Array.isArray(provided) ? provided : [provided];
                const normalized = rows.map((v: any, i: number) => ({
                  id: 300 + i,
                  user_id: v?.user_id ?? (Array.isArray(v) ? undefined : v?.user_id) ?? 'user_test_123',
                  templateExerciseId: v?.templateExerciseId ?? v?.template_exercise_id ?? 100 + i,
                  masterExerciseId: v?.masterExerciseId ?? v?.master_exercise_id ?? 200 + i,
                }));
                // eslint-disable-next-line no-console
                console.log('[HARNESS] exercise_links.returning() ->', normalized);
                if (!normalized) throw new Error('HARNESS: exercise_links.returning() produced undefined');
                return normalized;
              }),
            };
            return ret;
          }
          // workout_sessions insert path
          if (table && table._.name === 'workout_sessions') {
            // Return a created session row object as Drizzle returning()
            const ret = {
              returning: vi.fn(async () => {
                const rows = [
                  { id: 500, user_id: vals?.user_id, templateId: vals?.templateId, workoutDate: vals?.workoutDate ?? now },
                ];
                // eslint-disable-next-line no-console
                console.log('[HARNESS] workout_sessions.returning() ->', rows);
                if (!rows) throw new Error('HARNESS: workout_sessions.returning() produced undefined');
                return rows;
              }),
            };
            return ret;
          }
          // Fallback builder that still supports onConflictDoNothing chaining (safety)
          const ret: any = {
            returning: vi.fn(async () => {
              const rows: any[] = [];
              // eslint-disable-next-line no-console
              console.log(`[HARNESS] ${logTbl}.returning() ->`, rows);
              if (!rows) throw new Error(`HARNESS: ${logTbl}.returning() produced undefined`);
              return rows;
            }),
          };
          (ret as any).onConflictDoNothing = vi.fn(() => ret);
          return ret;
        }),
      };
    }),

    update: vi.fn((table: any) => {
      // exercise_links update used by templates.create helper to ensure link points to latest masterExerciseId
      if (table && table._.name === 'exercise_links') {
        const chain = {
          set: vi.fn(() => chain),
          where: vi.fn(async () => []),
        };
        return chain;
      }
      const chain = {
        set: vi.fn(() => chain),
        where: vi.fn(async () => []),
      };
      return chain;
    }),

    delete: vi.fn((_table: any) => {
      const chain = {
        where: vi.fn(async () => []),
      };
      return chain;
    }),

    select: vi.fn((_cols?: any) => {
      // Provide a tiny query builder that returns arrays when awaited,
      // and supports both `.limit(1)` returning [] and `.execute()`.
      let result: any[] = [];
      const chain: any = {
        _table: undefined as string | undefined,
        from: vi.fn((tbl: any) => {
          chain._table = tbl?._?.name ?? tbl?.tableName ?? tbl?._?.alias ?? String(tbl);
          // Default for master_exercises probe: return empty to force insert
          if (chain._table === 'master_exercises') {
            result = [];
          }
          return chain;
        }),
        where: vi.fn((_cond?: any) => chain),
        limit: vi.fn((n?: number) => {
          // When tests do `.limit(1)` and expect an array directly, emulate returning array
          // Keep result as-is; consumers either use returned value or call .execute()
          return n ? result.slice(0, n) : result;
        }),
        innerJoin: vi.fn((_tbl: any, _on: any) => chain),
        orderBy: vi.fn((_o: any) => chain),
        with: vi.fn((_w: any) => chain),
        execute: vi.fn(async () => result),
      };
      return chain;
    }),

    // Jokes namespace used by jokes router to store/cache jokes (kept for completeness)
    jokes: {
      insert: vi.fn(async (_userId: string, text: string) => ({
        id: 'j_1',
        userId: _userId,
        text,
        createdAt: now,
      })),
      clearByUserId: vi.fn(async (_userId: string) => 1),
    },
  };

  const db = {
    ...defaultDb,
    ...overrides,
  } as any;

  return db;
}

/**
 * Wrap a mock DB with verbose logging proxies to trace calls and returned values.
 * Use in failing tests to pinpoint undefined throws in builder chains.
 */
export function createLoggedMockDb(overrides: Partial<Record<string, unknown>> = {}) {
  const base = createMockDb(overrides);

  const wrap = (obj: any, ns = 'db') =>
    new Proxy(obj, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'function') {
          return (...args: any[]) => {
            // eslint-disable-next-line no-console
            console.log(`[logged:${ns}] call ${String(prop)}(`, ...args, ')');
            try {
              const ret = value.apply(target, args);
              if (ret && typeof ret === 'object') {
                // chainable builders
                return wrap(ret, `${ns}.${String(prop)}`);
              }
              // eslint-disable-next-line no-console
              console.log(`[logged:${ns}] return from ${String(prop)} ->`, ret);
              return ret;
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error(`[logged:${ns}] threw in ${String(prop)}:`, e);
              throw e;
            }
          };
        }
        if (value && typeof value === 'object') {
          return wrap(value, `${ns}.${String(prop)}`);
        }
        return value;
      },
    });

  return wrap(base);
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
