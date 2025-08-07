/**
 * Ensure PUBLIC env is present before any imports that transitively load src/env.js,
 * which validates runtime env via @t3-oss/env-nextjs.
 */
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= 'pk_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_KEY ??= 'phc_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_HOST ??= 'https://us.i.posthog.com';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_KEY ??= 'supabase_test_key';

// Ensure rate-limit middleware is mocked before any app imports to avoid env-core errors in jsdom
import './setup.rate-limit-mocks';

// Also stub server-side env so @t3-oss/env-core proxy does not throw under jsdom.
// These values are safe test defaults and prevent "Attempted to access a server-side env on the client".
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR ??= '100';
process.env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR ??= '100';
process.env.RATE_LIMIT_JOKES_PER_HOUR ??= '100';
process.env.RATE_LIMIT_WHOOP_SYNC_PER_HOUR ??= '100';
/**
 * Jokes router reads server env from src/env.js via @t3-oss/env-nextjs/@t3-oss/env-core.
 * Under jsdom, any access to server env will throw unless values exist on process.env
 * BEFORE the module graph loads. Provide safe defaults and explicitly force the feature
 * flag off to keep the code path that uses fallback jokes instead of calling an AI gateway.
 */
process.env.AI_GATEWAY_ENABLED = 'false';
process.env.AI_GATEWAY_URL ??= 'https://ai-gateway.localtest';
process.env.AI_GATEWAY_API_KEY ??= 'ai_test_key';
process.env.AI_GATEWAY_MODEL ??= 'gpt-4o-mini';
process.env.AI_GATEWAY_PROMPT ??= 'Tell a short fitness-themed joke.';
/**
 * NODE_ENV is read-only in many setups; don't assign directly.
 * Vitest already sets NODE_ENV appropriately for tests.
 * If missing, consumers should handle undefined gracefully.
 */
// process.env.NODE_ENV ||= 'test';

import { type AppRouter, createCaller } from '~/server/api/root';

// IMPORTANT: Provide a stub for the DB module before it is imported by trpc.ts/router files.
// We mock the module id that trpc.ts imports: "~/server/db" resolves to "src/server/db/index.ts".
vi.mock('~/server/db', () => {
  // We return a getter that points to our mutable mockState.db.
  return {
    get db() {
      return (mockState as any).db;
    },
  };
});

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
// Ensure rate limiting middleware is a no-op in tests to avoid undefined ctx.headers/requestId issues
// and to focus integration tests on router logic rather than infra.
vi.mock('~/lib/rate-limit-middleware', async () => {
  const { initTRPC } = await import('@trpc/server');
  const t = initTRPC.create();
  return {
    apiCallRateLimit: t.middleware(async ({ next }) => next()),
  };
});
import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server';
import { vi } from 'vitest';

// Minimal shape of context from createTRPCContext in src/server/api/trpc.ts
type Ctx = {
  db: unknown;
  user: { id?: string } | null;
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
      _workoutTemplates: undefined as unknown as Record<string, unknown>,
      _templateExercises: undefined as unknown as Record<string, unknown>,
      _exerciseLinks: undefined as unknown as Record<string, unknown>,
      _workoutSessions: undefined as unknown as Record<string, unknown>,

      workoutTemplates: {
        findMany: vi.fn(async (_args: unknown) => {
          // Return empty list by default
          return [];
        }),
        findFirst: vi.fn(async ({ with: withRel }: { with?: { exercises?: boolean } }) => {
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
        findMany: vi.fn(async (_args: unknown) => []),
        findFirst: vi.fn(async ({ with: withRel }: { with?: { template?: boolean; exercises?: boolean } }) => ({
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
        findFirst: vi.fn(async (_args: unknown) => null),
        findMany: vi.fn(async (_args: unknown) => []),
      },
      // Match drizzle-orm "query.<table>.findFirst/findMany" access seen across routers
      templateExercises: {
        findFirst: vi.fn(async (_args: unknown) => null),
        findMany: vi.fn(async (_args: unknown) => []),
      },
      // Minimal masterExercises query API used by exercises router for bulkLinkSimilar
      masterExercises: {
        findFirst: vi.fn(async (_args: unknown) => ({
          id: 200,
          user_id: mockState.user?.id ?? 'user_test_123',
          name: 'Bench Press',
          normalizedName: 'bench press',
        })),
      },
    },

    // Minimal builders for insert/update/delete/select used in routers
    insert: vi.fn((table: { _?: { name?: string } } | Record<string, unknown>) => {
      return {
        values: vi.fn(function (vals: unknown) {
          const logTbl = (table as { _?: { name?: string } } | Record<string, unknown>) as Record<string, unknown>;
          // Template creation path
          if ((table as any)?._?.name === 'workout_templates') {
            const ret = {
              returning: vi.fn(async () => {
                const v: any = vals as any;
                const rows = [{ id: 1, name: v?.name, user_id: v?.user_id, createdAt: now }];
                // eslint-disable-next-line no-console
                console.log('[HARNESS] workout_templates.returning() ->', rows);
                if (!rows) throw new Error('HARNESS: workout_templates.returning() produced undefined');
                return rows;
              }),
            };
            return ret;
          }
          // Template exercises insert path (returning inserted rows with ids and names)
          if ((table as any)?._?.name === 'template_exercises') {
            const items = Array.isArray(vals) ? vals : [vals];
            const rows = items.map((v: Record<string, unknown>, i: number) => ({
              id: i + 100,
              templateId: v?.templateId as number | undefined,
              user_id: (v?.user_id as string | undefined) ?? (mockState.user?.id ?? 'user_test_123'),
              exerciseName: v?.exerciseName as string | undefined,
              orderIndex: v?.orderIndex as number | undefined,
              linkingRejected: (v?.linkingRejected as boolean | undefined) ?? false,
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
          if ((table as any)?._?.name === 'master_exercises') {
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
          if ((table as any)?._?.name === 'exercise_links') {
            // Capture last provided values to synthesize returning rows
            let provided: unknown;
            const ret: any = {
              values: vi.fn((v: unknown) => {
                provided = v;
                return ret;
              }),
              onConflictDoNothing: vi.fn(() => ret),
              // Support onConflictDoUpdate used by exercises.linkToMaster
              onConflictDoUpdate: vi.fn((_cfg?: any) => ret),
              returning: vi.fn(async () => {
                const rows = Array.isArray(provided) ? provided : [provided];
                const normalized = rows.map((v: Record<string, unknown>, i: number) => ({
                  id: 300 + i,
                  user_id: (v?.user_id as string | undefined) ?? 'user_test_123',
                  templateExerciseId: (v?.templateExerciseId as number | undefined) ?? (v?.template_exercise_id as number | undefined) ?? 100 + i,
                  masterExerciseId: (v?.masterExerciseId as number | undefined) ?? (v?.master_exercise_id as number | undefined) ?? 200 + i,
                }));
                // eslint-disable-next-line no-console
                console.log('[HARNESS] exercise_links.returning() ->', normalized);
                if (!normalized) throw new Error('HARNESS: exercise_links.returning() produced undefined');
                return normalized;
              }),
            };
            return ret;
          }
          // master_exercises insert path (used by exercises.createOrGetMaster)
          if ((table as any)?._?.name === 'master_exercises') {
            let provided: unknown;
            const ret: any = {
              values: vi.fn((v: unknown) => {
                provided = v;
                return ret;
              }),
              returning: vi.fn(async () => {
                const items = Array.isArray(provided) ? provided : [provided];
                const rows = items.map((v: Record<string, unknown>, i: number) => ({
                  id: 200 + i,
                  user_id: (v?.user_id as string | undefined) ?? mockState.user?.id ?? 'user_test_123',
                  name: (v?.name as string | undefined) ?? 'Bench Press',
                  normalizedName: (v?.normalizedName as string | undefined) ?? 'bench press',
                  createdAt: (v?.createdAt as Date | undefined) ?? new Date(),
                }));
                // eslint-disable-next-line no-console
                console.log('[HARNESS] master_exercises.returning() ->', rows);
                if (!rows) throw new Error('HARNESS: master_exercises.returning() produced undefined');
                return rows;
              }),
            };
            return ret;
          }
          // workout_sessions insert path
          if ((table as any)?._?.name === 'workout_sessions') {
            const v = vals as Record<string, unknown>;
            const ret = {
              returning: vi.fn(async () => {
                const rows = [
                  { id: 500, user_id: v?.user_id, templateId: v?.templateId, workoutDate: v?.workoutDate ?? now },
                ];
                console.log('[HARNESS] workout_sessions.returning() ->', rows);
                return rows;
              }),
            };
            return ret;
          }
          // session_exercises insert path
          if ((table as any)?._?.name === 'session_exercises') {
            const items = Array.isArray(vals) ? vals : [vals];
            const rows = items.map((v: Record<string, unknown>, i: number) => ({
              id: 1000 + i,
              sessionId: v?.sessionId as number | string | undefined,
              exerciseName: v?.exerciseName as string | undefined,
              weight: v?.weight as number | undefined,
              reps: v?.reps as number | undefined,
              sets: v?.sets as number | undefined,
              unit: v?.unit as string | undefined,
            }));
            return {
              returning: vi.fn(async () => {
                console.log('[HARNESS] session_exercises.returning() ->', rows);
                return rows;
              }),
            };
          }
          // Fallback builder
          const ret: any = {
            returning: vi.fn(async () => []),
          };
          (ret as any).onConflictDoNothing = vi.fn(() => ret);
          return ret;
        }),
      };
    }),

    update: vi.fn((table: { _?: { name?: string } } | Record<string, unknown>) => {
      // exercise_links update used by templates.create helper to ensure link points to latest masterExerciseId
      if ((table as any)?._?.name === 'exercise_links') {
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

    delete: vi.fn((_table: { _?: { name?: string } } | Record<string, unknown>) => {
      const tableName: string = (_table as any)?._?.name ?? String(_table);
      const chain = {
        where: vi.fn(async () => {
          if (tableName === 'workout_sessions') {
            return [{ id: 77, user_id: 'user_test_123' }];
          }
          return [];
        }),
        returning: vi.fn(async () => {
          if (tableName === 'workout_sessions') {
            return [{ id: 77, user_id: 'user_test_123' }];
          }
          return [];
        }),
      };
      return chain;
    }),

    select: vi.fn((_cols?: unknown) => {
      const chain: any = {
        from: vi.fn((tbl: unknown) => {
          chain._table = String(tbl);
          return chain;
        }),
        where: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        with: vi.fn(() => chain),
        execute: vi.fn(async () => []),
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

  const wrap = (obj: unknown, ns = 'db') =>
    new Proxy(obj, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'function') {
          return (...args: unknown[]) => {
            // eslint-disable-next-line no-console
            console.log(`[logged:${ns}] call ${String(prop)}(`, ...args, ')');
            try {
              const ret = (value as (...a: unknown[]) => unknown).apply(target, args);
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
  db: unknown;
  user: { id?: string } | null;
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

// "~/server/db" is already mocked above immediately after importing createCaller.
// Do not re-declare another vi.mock here to avoid module-not-found/hoisting issues.

export function buildCaller(opts?: {
  db?: unknown;
  user?: { id?: string } | null; // allow explicit null to simulate unauthenticated
  headers?: HeadersInit;
}): ReturnType<typeof createCaller> {
  // If a db override is provided, use it as-is; otherwise create a default mock db.
  mockState.db = (opts && 'db' in opts) ? opts?.db : (createMockDb() as unknown);
  // Preserve explicit null; only default to authenticated user when user is truly undefined
  mockState.user = (opts && 'user' in opts) ? opts.user : createMockUser(true);
  const headers = new Headers(opts?.headers ?? { 'x-test': '1', 'x-forwarded-for': '127.0.0.1' });

  // Create a requestId and caller bound to our mocked ctx
  const requestId = '00000000-0000-4000-8000-000000000000' as `${string}-${string}-${string}-${string}-${string}`;

  // Patch protectedProcedure expectation: ensure user object has at least an id string when authenticated
  const userPatched = mockState.user ? { id: (mockState.user as { id?: string }).id ?? 'user_test_123', ...(mockState.user as object) } : null;

  // Cast the mocked db to unknown then to the expected db type to satisfy TRPCContext during tests.
  return createCaller({
    db: (mockState.db as unknown) as import('drizzle-orm/postgres-js').PostgresJsDatabase<typeof import('~/server/db/schema')> & { $client: import('postgres').Sql<object> },
    user: userPatched,
    requestId,
    headers,
  } as unknown as import('~/server/api/trpc').TRPCContext);
}

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
