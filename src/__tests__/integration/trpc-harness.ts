/**
 * Ensure PUBLIC env is present before any imports that transitively load src/env.js,
 * which validates runtime env via @t3-oss/env-nextjs.
 */
process.env.NEXT_PUBLIC_POSTHOG_KEY ??= "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST ??= "https://us.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_KEY ??= "supabase_test_key";

// Ensure rate-limit middleware is mocked before any app imports to avoid env-core errors in jsdom
import "./setup.rate-limit-mocks";

// Also stub server-side env so @t3-oss/env-core proxy does not throw under jsdom.
// These values are safe test defaults and prevent "Attempted to access a server-side env on the client".
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR ??= "100";
process.env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR ??= "100";
process.env.RATE_LIMIT_JOKES_PER_HOUR ??= "100";
process.env.RATE_LIMIT_WHOOP_SYNC_PER_HOUR ??= "100";
/**
 * Jokes router reads server env from src/env.js via @t3-oss/env-nextjs/@t3-oss/env-core.
 * Under jsdom, any access to server env will throw unless values exist on process.env
 * BEFORE the module graph loads. Provide safe defaults and explicitly force the feature
 * flag off to keep the code path that uses fallback jokes instead of calling an AI gateway.
 */
process.env.AI_GATEWAY_ENABLED = "false";
process.env.AI_GATEWAY_URL ??= "https://ai-gateway.localtest";
process.env.AI_GATEWAY_API_KEY ??= "ai_test_key";
process.env.AI_GATEWAY_MODEL ??= "gpt-4o-mini";
process.env.AI_GATEWAY_PROMPT ??= "Tell a short fitness-themed joke.";
/**
 * NODE_ENV is read-only in many setups; don't assign directly.
 * Vitest already sets NODE_ENV appropriately for tests.
 * If missing, consumers should handle undefined gracefully.
 */
// process.env.NODE_ENV ||= 'test';

import { type AppRouter, createCaller } from "~/server/api/root";

// IMPORTANT: Provide a stub for the DB module before it is imported by trpc.ts/router files.
// We mock the module id that trpc.ts imports: "~/server/db" resolves to "src/server/db/index.ts".
vi.mock("~/server/db", () => {
  // We return a getter that points to our mutable mockState.db.
  return {
    get db() {
      return mockState.db;
    },
  };
});

// Force mock for env module to avoid @t3-oss/env-core throwing when accessed in routers during jsdom tests.
// This is targeted for the jokes router generateNew path which reads env.AI_* vars.
vi.mock("~/env.js", async () => {
  return {
    env: {
      // Public vars (unused in server code paths here, but keep for completeness)
      // No Clerk publishable key needed - using Supabase auth
      NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
      NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY!,
      // Server vars used by routers
      AI_GATEWAY_ENABLED: "false", // ensure fallback path
      AI_GATEWAY_URL: process.env.AI_GATEWAY_URL!,
      AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY!,
      AI_GATEWAY_MODEL: process.env.AI_GATEWAY_MODEL!,
      AI_GATEWAY_PROMPT: process.env.AI_GATEWAY_PROMPT!,
      RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR:
        process.env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR!,
      RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR:
        process.env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR!,
      RATE_LIMIT_JOKES_PER_HOUR: process.env.RATE_LIMIT_JOKES_PER_HOUR!,
      RATE_LIMIT_WHOOP_SYNC_PER_HOUR:
        process.env.RATE_LIMIT_WHOOP_SYNC_PER_HOUR!,
      DATABASE_URL: process.env.DATABASE_URL!,
      NODE_ENV: process.env.NODE_ENV ?? "test",
    },
  };
});
// Ensure rate limiting middleware is a no-op in tests to avoid undefined ctx.headers/requestId issues
// and to focus integration tests on router logic rather than infra.
vi.mock("~/lib/rate-limit-middleware", async () => {
  const { initTRPC } = await import("@trpc/server");
  const t = initTRPC.create();
  return {
    apiCallRateLimit: t.middleware(async ({ next }) => next()),
  };
});
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { vi } from "vitest";

// Minimal shape of context from createTRPCContext in src/server/api/trpc.ts
/* eslint-disable @typescript-eslint/no-unused-vars */
type Ctx = {
  db: unknown;
  user: { id?: string } | null;
  requestId: `${string}-${string}-${string}-${string}-${string}`;
  headers: Headers;
};

type WorkoutTemplateRow = {
  id: number;
  name: string;
  user_id: string;
  createdAt: Date;
  exercises?: TemplateExerciseRow[];
};

type TemplateExerciseRow = {
  id: number;
  templateId: number;
  user_id: string;
  exerciseName: string;
  orderIndex: number;
  linkingRejected: boolean;
};

type WorkoutSessionRow = {
  id: number | string;
  user_id: string;
  templateId: number;
  workoutDate: Date;
  template?:
    | { id: number; name: string; exercises: TemplateExerciseRow[] }
    | undefined;
  exercises?: Array<Record<string, unknown>> | undefined;
};

type ExerciseLinkRow = {
  id: number;
  user_id: string;
  templateExerciseId: number;
  masterExerciseId: number;
};

type FindManyArgs<
  TInclude extends Record<string, unknown> | undefined = undefined,
> = {
  with?: TInclude;
};

type WorkoutTemplatesQuery = {
  findMany: (args?: FindManyArgs) => Promise<WorkoutTemplateRow[]>;
  findFirst: (args?: {
    with?: { exercises?: boolean };
  }) => Promise<WorkoutTemplateRow>;
};

type WorkoutSessionsQuery = {
  findMany: (args?: FindManyArgs) => Promise<WorkoutSessionRow[]>;
  findFirst: (args?: {
    with?: { template?: boolean; exercises?: boolean };
  }) => Promise<WorkoutSessionRow>;
};

type SimpleQuery<T> = {
  findFirst: (_args?: unknown) => Promise<T | null>;
  findMany: (_args?: unknown) => Promise<T[]>;
};

// Partial versions for overrides - allow providing only some methods
type PartialWorkoutTemplatesQuery = Partial<WorkoutTemplatesQuery>;
type PartialWorkoutSessionsQuery = Partial<WorkoutSessionsQuery>;
type PartialSimpleQuery<T> = Partial<SimpleQuery<T>>;

type QueryNamespace = {
  _workoutTemplates: Record<string, unknown>;
  _templateExercises: Record<string, unknown>;
  _exerciseLinks: Record<string, unknown>;
  _workoutSessions: Record<string, unknown>;
  workoutTemplates: WorkoutTemplatesQuery;
  workoutSessions: WorkoutSessionsQuery;
  exerciseLinks: SimpleQuery<unknown>;
  templateExercises: SimpleQuery<unknown>;
  masterExercises: SimpleQuery<{
    id: number;
    user_id: string;
    name: string;
    normalizedName: string;
  }>;
};

type InsertReturning<T> = { returning: () => Promise<T[]> };

type InsertExerciseLinksChain = {
  values: (v: unknown) => InsertExerciseLinksChain;
  onConflictDoNothing: () => InsertExerciseLinksChain;
  onConflictDoUpdate: (_cfg?: unknown) => InsertExerciseLinksChain;
  returning: () => Promise<ExerciseLinkRow[]>;
};

type UpdateChain = {
  set: (_v?: unknown) => UpdateChain;
  where: (_v?: unknown) => Promise<unknown[]>;
};

type DeleteChain = {
  where: (_v?: unknown) => Promise<unknown[]>;
  returning: () => Promise<unknown[]>;
};

type SelectChain = {
  from: (_tbl: unknown) => SelectChain;
  where: (_v?: unknown) => SelectChain;
  innerJoin: (_a?: unknown, _b?: unknown) => SelectChain;
  orderBy: (_v?: unknown) => SelectChain;
  limit: (_v?: unknown) => SelectChain;
  with: (_v?: unknown) => SelectChain;
  execute: () => Promise<unknown[]>;
  _table?: string;
};

type MockDb = {
  query: QueryNamespace;
  insert: (table: { _?: { name?: string } } | Record<string, unknown>) => {
    values: (vals: unknown) => unknown;
  };
  update: (
    _table: { _?: { name?: string } } | Record<string, unknown>,
  ) => UpdateChain;
  delete: (
    _table: { _?: { name?: string } } | Record<string, unknown>,
  ) => DeleteChain;
  select: (_cols?: unknown) => SelectChain;
  jokes: {
    insert: (
      _userId: string,
      text: string,
    ) => Promise<{ id: string; userId: string; text: string; createdAt: Date }>;
    clearByUserId: (_userId: string) => Promise<number>;
  };
};
/* eslint-enable @typescript-eslint/no-unused-vars */

// Create a mocked db layer you can tailor per test
export function createMockDb(overrides: Partial<MockDb> = {}): MockDb {
  // Provide minimal stubs used by integration routers. Tests can override any of these.
  const now = new Date();
  const defaultDb: MockDb = {
    // Drizzle-like query API used by routers
    query: {
      _workoutTemplates: {} as Record<string, unknown>,
      _templateExercises: {} as Record<string, unknown>,
      _exerciseLinks: {} as Record<string, unknown>,
      _workoutSessions: {} as Record<string, unknown>,

      workoutTemplates: {
        findMany: vi.fn(
          async (_args?: FindManyArgs): Promise<WorkoutTemplateRow[]> => {
            return [];
          },
        ),
        findFirst: vi.fn(
          async ({
            with: withRel,
          }: {
            with?: { exercises?: boolean };
          } = {}): Promise<WorkoutTemplateRow> => {
            const userId = mockState.user?.id ?? "user_test_123";
            return {
              id: 1,
              name: "Mock Template",
              user_id: userId,
              createdAt: now,
              exercises: withRel?.exercises
                ? [
                    {
                      id: 11,
                      templateId: 1,
                      user_id: userId,
                      exerciseName: "Bench Press",
                      orderIndex: 0,
                      linkingRejected: false,
                    },
                    {
                      id: 12,
                      templateId: 1,
                      user_id: userId,
                      exerciseName: "Squat",
                      orderIndex: 1,
                      linkingRejected: false,
                    },
                  ]
                : undefined,
            };
          },
        ),
      } satisfies WorkoutTemplatesQuery,

      workoutSessions: {
        findMany: vi.fn(
          async (_args?: FindManyArgs): Promise<WorkoutSessionRow[]> => [],
        ),
        findFirst: vi.fn(
          async ({
            with: withRel,
          }: {
            with?: { template?: boolean; exercises?: boolean };
          } = {}): Promise<WorkoutSessionRow> => ({
            id: 99,
            user_id: mockState.user?.id ?? "user_test_123",
            templateId: 1,
            workoutDate: now,
            template: withRel?.template
              ? { id: 1, name: "Mock Template", exercises: [] }
              : undefined,
            exercises: withRel?.exercises ? [] : undefined,
          }),
        ),
      } satisfies WorkoutSessionsQuery,

      exerciseLinks: {
        findFirst: vi.fn(
          async (_args?: unknown): Promise<Record<string, unknown> | null> =>
            null,
        ),
        findMany: vi.fn(
          async (_args?: unknown): Promise<Record<string, unknown>[]> => [],
        ),
      } satisfies SimpleQuery<Record<string, unknown>>,

      templateExercises: {
        findFirst: vi.fn(
          async (_args?: unknown): Promise<Record<string, unknown> | null> =>
            null,
        ),
        findMany: vi.fn(
          async (_args?: unknown): Promise<Record<string, unknown>[]> => [],
        ),
      } satisfies SimpleQuery<Record<string, unknown>>,

      masterExercises: {
        findFirst: vi.fn(
          async (
            _args?: unknown,
          ): Promise<{
            id: number;
            user_id: string;
            name: string;
            normalizedName: string;
          } | null> => ({
            id: 200,
            user_id: mockState.user?.id ?? "user_test_123",
            name: "Bench Press",
            normalizedName: "bench press",
          }),
        ),
        findMany: vi.fn(
          async (
            _args?: unknown,
          ): Promise<
            Array<{
              id: number;
              user_id: string;
              name: string;
              normalizedName: string;
            }>
          > => [],
        ),
      } satisfies SimpleQuery<{
        id: number;
        user_id: string;
        name: string;
        normalizedName: string;
      }>,
    },

    // Minimal builders for insert/update/delete/select used in routers
    insert: vi.fn(
      (table: { _?: { name?: string } } | Record<string, unknown>) => {
        return {
          values: vi.fn(function (vals: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const logTbl: Record<string, unknown> = table as
              | { _?: { name?: string } }
              | Record<string, unknown> as Record<string, unknown>;
            // Template creation path
            if (
              (table as { _?: { name?: string } } as { _?: { name?: string } })
                ?._?.name === "workout_templates"
            ) {
              const builder = {
                returning: vi.fn(async () => {
                  const v = vals as Record<string, unknown>;
                  const rows = [
                    {
                      id: 1,
                      name: v?.name as string | undefined,
                      user_id:
                        (v?.user_id as string | undefined) ??
                        mockState.user?.id ??
                        "user_test_123",
                      createdAt: now,
                    },
                  ];
                  console.log(
                    "[HARNESS] workout_templates.returning() ->",
                    rows,
                  );
                  return rows as Array<Record<string, unknown>>;
                }),
              };
              return builder as unknown as Record<string, unknown>;
            }
            // Template exercises insert path (returning inserted rows with ids and names)
            if (
              (table as { _?: { name?: string } } as { _?: { name?: string } })
                ?._?.name === "template_exercises"
            ) {
              const items = Array.isArray(vals)
                ? (vals as Array<Record<string, unknown>>)
                : [vals as Record<string, unknown>];
              const rows = items.map(
                (v: Record<string, unknown>, i: number) => ({
                  id: i + 100,
                  templateId: v?.templateId as number | undefined,
                  user_id:
                    (v?.user_id as string | undefined) ??
                    mockState.user?.id ??
                    "user_test_123",
                  exerciseName: v?.exerciseName as string | undefined,
                  orderIndex: v?.orderIndex as number | undefined,
                  linkingRejected:
                    (v?.linkingRejected as boolean | undefined) ?? false,
                }),
              );
              const chain = {
                returning: vi.fn(async () => {
                  console.log(
                    "[HARNESS] template_exercises.returning() ->",
                    rows,
                  );
                  return rows as unknown[];
                }),
                onConflictDoNothing: vi.fn(() => chain),
              };
              return chain as unknown as Record<string, unknown>;
            }
            // master_exercises insert path (used by templates.create helper createAndLinkMasterExercise)
            if (
              (table as { _?: { name?: string } } as { _?: { name?: string } })
                ?._?.name === "master_exercises"
            ) {
              const items = Array.isArray(vals)
                ? (vals as Array<Record<string, unknown>>)
                : [vals as Record<string, unknown>];
              const rows = items.map(
                (v: Record<string, unknown>, i: number) => ({
                  id: i + 200,
                  user_id:
                    (v?.user_id as string | undefined) ??
                    mockState.user?.id ??
                    "user_test_123",
                  name: v?.name as string | undefined,
                  normalizedName: v?.normalizedName as string | undefined,
                }),
              );
              const ret: { returning: () => Promise<unknown[]> } = {
                returning: vi.fn(async () => {
                  console.log(
                    "[HARNESS] master_exercises.returning() ->",
                    rows,
                  );
                  return rows as unknown[];
                }),
              };
              return ret as unknown as Record<string, unknown>;
            }
            // exercise_links insert path: allow onConflictDoNothing chaining and return inserted link-like rows
            if (
              (table as { _?: { name?: string } } as { _?: { name?: string } })
                ?._?.name === "exercise_links"
            ) {
              let provided: unknown;
              const chain: InsertExerciseLinksChain = {
                values: vi.fn((v: unknown) => {
                  provided = v;
                  return chain;
                }) as unknown as InsertExerciseLinksChain["values"],
                onConflictDoNothing: vi.fn(
                  () => chain,
                ) as unknown as InsertExerciseLinksChain["onConflictDoNothing"],
                onConflictDoUpdate: vi.fn(
                  (_cfg?: unknown) => chain,
                ) as unknown as InsertExerciseLinksChain["onConflictDoUpdate"],
                returning: vi.fn(async (): Promise<ExerciseLinkRow[]> => {
                  const rows = (
                    Array.isArray(provided) ? provided : [provided]
                  ) as Array<Record<string, unknown>>;
                  const normalized: ExerciseLinkRow[] = rows.map((v, i) => ({
                    id: 300 + i,
                    user_id:
                      (v.user_id as string | undefined) ?? "user_test_123",
                    templateExerciseId:
                      (v.templateExerciseId as number | undefined) ??
                      (v.template_exercise_id as number | undefined) ??
                      100 + i,
                    masterExerciseId:
                      (v.masterExerciseId as number | undefined) ??
                      (v.master_exercise_id as number | undefined) ??
                      200 + i,
                  }));
                  console.log(
                    "[HARNESS] exercise_links.returning() ->",
                    normalized,
                  );
                  return normalized;
                }) as unknown as InsertExerciseLinksChain["returning"],
              } as unknown as InsertExerciseLinksChain;
              return chain as unknown as Record<string, unknown>;
            }
            // master_exercises insert path (used by exercises.createOrGetMaster)
            if (
              (table as { _?: { name?: string } } as { _?: { name?: string } })
                ?._?.name === "master_exercises"
            ) {
              let provided: unknown;
              const builder = {
                values: vi.fn((v: unknown) => {
                  provided = v;
                  return builder;
                }),
                returning: vi.fn(async () => {
                  const items = Array.isArray(provided) ? provided : [provided];
                  const rows = (items as Record<string, unknown>[]).map(
                    (v, i) => ({
                      id: 200 + i,
                      user_id:
                        (v.user_id as string | undefined) ??
                        mockState.user?.id ??
                        "user_test_123",
                      name: (v.name as string | undefined) ?? "Bench Press",
                      normalizedName:
                        (v.normalizedName as string | undefined) ??
                        "bench press",
                      createdAt:
                        (v.createdAt as Date | undefined) ?? new Date(),
                    }),
                  );
                  // eslint-disable-next-line no-console
                  console.log(
                    "[HARNESS] master_exercises.returning() ->",
                    rows,
                  );
                  return rows as unknown[];
                }),
              };
              return builder as unknown as Record<string, unknown>;
            }
            // workout_sessions insert path
            if (
              (table as { _?: { name?: string } } as { _?: { name?: string } })
                ?._?.name === "workout_sessions"
            ) {
              const v = vals as Record<string, unknown>;
              const ret: { returning: () => Promise<unknown[]> } = {
                returning: vi.fn(async () => {
                  const rows = [
                    {
                      id: 500,
                      user_id: v?.user_id,
                      templateId: v?.templateId,
                      workoutDate: v?.workoutDate ?? now,
                    },
                  ];
                  console.log(
                    "[HARNESS] workout_sessions.returning() ->",
                    rows,
                  );
                  return rows as unknown[];
                }),
              };
              return ret as unknown as Record<string, unknown>;
            }
            // session_exercises insert path
            if (
              (table as { _?: { name?: string } } as { _?: { name?: string } })
                ?._?.name === "session_exercises"
            ) {
              const items = Array.isArray(vals)
                ? (vals as Array<Record<string, unknown>>)
                : [vals as Record<string, unknown>];
              const rows = items.map(
                (v: Record<string, unknown>, i: number) => ({
                  id: 1000 + i,
                  sessionId: v?.sessionId as number | string | undefined,
                  exerciseName: v?.exerciseName as string | undefined,
                  weight: v?.weight as number | undefined,
                  reps: v?.reps as number | undefined,
                  sets: v?.sets as number | undefined,
                  unit: v?.unit as string | undefined,
                }),
              );
              const ret: { returning: () => Promise<unknown[]> } = {
                returning: vi.fn(async () => {
                  // eslint-disable-next-line no-console
                  console.log(
                    "[HARNESS] session_exercises.returning() ->",
                    rows,
                  );
                  return rows as unknown[];
                }),
              };
              return ret as unknown as Record<string, unknown>;
            }
            // Fallback builder
            const chain = {
              returning: vi.fn(async () => [] as unknown[]),
              onConflictDoNothing: vi.fn(() => chain),
            } as {
              returning: () => Promise<unknown[]>;
              onConflictDoNothing: () => unknown;
            };
            return chain as unknown as Record<string, unknown>;
          }),
        };
      },
    ),

    update: vi.fn(
      (
        _table: { _?: { name?: string } } | Record<string, unknown>,
      ): UpdateChain => {
        const chain: UpdateChain = {
          set: vi.fn(() => chain) as unknown as UpdateChain["set"],
          where: vi.fn(
            async () => [] as unknown[],
          ) as unknown as UpdateChain["where"],
        };
        return chain;
      },
    ),

    delete: vi.fn(
      (
        _table: { _?: { name?: string } } | Record<string, unknown>,
      ): DeleteChain => {
        const tableName: string =
          (_table as { _?: { name?: string } })?._?.name ?? String(_table);
        const chain: DeleteChain = {
          where: vi.fn(async () => {
            if (tableName === "workout_sessions") {
              return [{ id: 77, user_id: "user_test_123" }] as unknown[];
            }
            return [] as unknown[];
          }) as unknown as DeleteChain["where"],
          returning: vi.fn(async () => {
            if (tableName === "workout_sessions") {
              return [{ id: 77, user_id: "user_test_123" }] as unknown[];
            }
            return [] as unknown[];
          }) as unknown as DeleteChain["returning"],
        };
        return chain;
      },
    ),

    select: vi.fn((_cols?: unknown): SelectChain => {
      const chain: SelectChain = {
        from: vi.fn((tbl: unknown) => {
          const name =
            typeof tbl === "string"
              ? tbl
              : (tbl as { _?: { name?: string } })?._?.name;
          // avoid setting a non-string to prevent base-to-string warning
          chain._table = typeof name === "string" ? name : undefined;
          return chain;
        }) as unknown as SelectChain["from"],
        where: vi.fn(() => chain) as unknown as SelectChain["where"],
        innerJoin: vi.fn(() => chain) as unknown as SelectChain["innerJoin"],
        orderBy: vi.fn(() => chain) as unknown as SelectChain["orderBy"],
        limit: vi.fn(() => chain) as unknown as SelectChain["limit"],
        with: vi.fn(() => chain) as unknown as SelectChain["with"],
        execute: vi.fn(async (): Promise<unknown[]> => {
          // Always return an array to avoid unsafe any return
          return [];
        }) as unknown as SelectChain["execute"],
        _table: undefined as string | undefined,
      };
      return chain;
    }),

    // Jokes namespace used by jokes router to store/cache jokes (kept for completeness)
    jokes: {
      insert: vi.fn(async (_userId: string, text: string) => ({
        id: "j_1",
        userId: _userId,
        text,
        createdAt: now,
      })),
      clearByUserId: vi.fn(async (_userId: string) => 1),
    },
  };

  // Properly merge query objects with their nested properties
  const mergedQuery = { ...defaultDb.query };
  if (overrides.query) {
    // For each query property, ensure both findFirst and findMany are available
    if (overrides.query.exerciseLinks) {
      const override = overrides.query.exerciseLinks;
      mergedQuery.exerciseLinks = {
        findFirst: override.findFirst || mergedQuery.exerciseLinks.findFirst,
        findMany: override.findMany || mergedQuery.exerciseLinks.findMany,
      };
    }
    if (overrides.query.templateExercises) {
      const override = overrides.query.templateExercises;
      mergedQuery.templateExercises = {
        findFirst:
          override.findFirst || mergedQuery.templateExercises.findFirst,
        findMany: override.findMany || mergedQuery.templateExercises.findMany,
      };
    }
    if (overrides.query.workoutSessions) {
      const override = overrides.query.workoutSessions;
      mergedQuery.workoutSessions = {
        findFirst: override.findFirst || mergedQuery.workoutSessions.findFirst,
        findMany: override.findMany || mergedQuery.workoutSessions.findMany,
      };
    }
    if (overrides.query.masterExercises) {
      const override = overrides.query.masterExercises;
      mergedQuery.masterExercises = {
        findFirst: override.findFirst || mergedQuery.masterExercises.findFirst,
        findMany: override.findMany || mergedQuery.masterExercises.findMany,
      };
    }
    // Handle any other query properties that don't need the dual interface
    for (const [key, value] of Object.entries(overrides.query)) {
      if (
        ![
          "exerciseLinks",
          "templateExercises",
          "workoutSessions",
          "masterExercises",
        ].includes(key)
      ) {
        (mergedQuery as any)[key] = value;
      }
    }
  }

  const db: MockDb = {
    ...defaultDb,
    ...overrides,
    query: mergedQuery,
  };

  return db;
}

/**
 * Wrap a mock DB with verbose logging proxies to trace calls and returned values.
 * Use in failing tests to pinpoint undefined throws in builder chains.
 */
export function createLoggedMockDb(overrides: Partial<MockDb> = {}) {
  const base = createMockDb(overrides);

  const wrap = (
    obj: Record<string, unknown>,
    ns = "db",
  ): Record<string, unknown> =>
    new Proxy(obj, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === "function") {
          return (...args: unknown[]) => {
            // eslint-disable-next-line no-console
            console.log(
              `[logged:${ns}] call ${String(prop)}(`,
              ...args.map((a) => {
                try {
                  if (
                    typeof a === "string" ||
                    typeof a === "number" ||
                    typeof a === "boolean" ||
                    a == null
                  )
                    return a;
                  if (Array.isArray(a)) return `[Array(${a.length})]`;
                  if (a instanceof Date) return a.toISOString();
                  // Avoid stringifying plain objects which triggers no-base-to-string
                  const tbl = (a as { _?: { name?: string } })?._?.name;
                  return typeof tbl === "string" ? tbl : "[Object]";
                } catch {
                  return "[Unserializable]";
                }
              }),
              ")",
            );
            try {
              const ret = (value as (...a: unknown[]) => unknown).apply(
                target,
                args,
              );
              if (ret && typeof ret === "object") {
                // chainable builders
                return wrap(
                  ret as Record<string, unknown>,
                  `${ns}.${String(prop)}`,
                );
              }
              // Avoid stringifying raw objects which triggers no-base-to-string
              try {
                if (
                  typeof ret === "string" ||
                  typeof ret === "number" ||
                  typeof ret === "boolean" ||
                  ret == null
                ) {
                  console.log(
                    `[logged:${ns}] return from ${String(prop)} ->`,
                    ret,
                  );
                } else if (Array.isArray(ret)) {
                  console.log(
                    `[logged:${ns}] return from ${String(prop)} ->`,
                    `[Array(${ret.length})]`,
                  );
                } else if (ret instanceof Date) {
                  console.log(
                    `[logged:${ns}] return from ${String(prop)} ->`,
                    ret.toISOString(),
                  );
                } else {
                  const tbl = (ret as { _?: { name?: string } })?._?.name;
                  console.log(
                    `[logged:${ns}] return from ${String(prop)} ->`,
                    typeof tbl === "string" ? tbl : "[Object]",
                  );
                }
              } catch {
                console.log(
                  `[logged:${ns}] return from ${String(prop)} ->`,
                  "[Unserializable]",
                );
              }
              return ret;
            } catch (e) {
              console.error(`[logged:${ns}] threw in ${String(prop)}:`, e);
              throw e;
            }
          };
        }
        if (value && typeof value === "object") {
          return wrap(
            value as Record<string, unknown>,
            `${ns}.${String(prop)}`,
          );
        }
        return value;
      },
    });

  // Cast through unknown to avoid unsafe assignment/return complaints in tests
  return wrap(base as Record<string, unknown>, "db") as unknown as MockDb;
}

// Create a mocked Supabase user or anonymous
export function createMockUser(
  arg:
    | boolean
    | { id?: string; emailAddresses?: Array<{ emailAddress: string }> } = true,
) {
  if (typeof arg === "boolean") {
    return arg
      ? {
          id: "user_test_123",
          emailAddresses: [{ emailAddress: "test@example.com" }],
        }
      : null;
  }
  // object form allows overriding id for tests
  return {
    id: arg.id ?? "user_test_123",
    emailAddresses: arg.emailAddresses ?? [
      { emailAddress: "test@example.com" },
    ],
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
  user: null,
};

// Hoisted mocks - using Supabase auth instead of Clerk
vi.mock("~/lib/supabase-server", async () => {
  return {
    createServerSupabaseClient: async () => ({
      auth: {
        getUser: async () => ({
          data: { user: mockState.user },
          error: mockState.user ? null : new Error("Not authenticated"),
        }),
      },
    }),
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
  mockState.db = opts && "db" in opts ? opts?.db : (createMockDb() as unknown);
  // Preserve explicit null; only default to authenticated user when user is truly undefined
  mockState.user =
    opts && "user" in opts
      ? (opts.user as { id?: string } | null)
      : createMockUser(true);
  const headers = new Headers(
    opts?.headers ?? { "x-test": "1", "x-forwarded-for": "127.0.0.1" },
  );

  // Create a requestId and caller bound to our mocked ctx
  const requestId =
    "00000000-0000-4000-8000-000000000000" as `${string}-${string}-${string}-${string}-${string}`;

  // Patch protectedProcedure expectation: ensure user object has at least an id string when authenticated
  const userPatched = mockState.user
    ? {
        id: (mockState.user as { id?: string }).id ?? "user_test_123",
        ...(mockState.user as Record<string, unknown>),
      }
    : null;

  // Cast the mocked db to unknown then to the expected db type to satisfy TRPCContext during tests.
  return createCaller({
    db: mockState.db as unknown as import("drizzle-orm/postgres-js").PostgresJsDatabase<
      typeof import("~/server/db/schema")
    > & { $client: import("postgres").Sql<Record<string, unknown>> },
    user: userPatched,
    requestId,
    headers,
  } as unknown as import("~/server/api/trpc").TRPCContext);
}

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
