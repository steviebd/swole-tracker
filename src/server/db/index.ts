import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import { env } from "~/env";
import * as schema from "./schema";

// Conditionally import vi for test environment
let vi: any;
if (process.env.NODE_ENV === "test") {
  // Check if vi is already available globally (from test setup)
  if (typeof globalThis !== "undefined" && (globalThis as any).vi) {
    vi = (globalThis as any).vi;
  } else {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      vi = require("vitest").vi;
    } catch {
      // Fallback if vitest is not available
      vi = {
        fn: () => ({
          mockReturnValue: () => ({}),
          mockReturnThis: () => ({}),
        }),
      };
    }
  }
}

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
type CloudflareContext = {
  env?: {
    DB?: unknown;
  };
};

const CLOUDFLARE_CONTEXT_SYMBOL = Symbol.for("__cloudflare-context__");

let cachedDb: DrizzleDb | undefined;
let cachedBinding: D1Database | undefined;
let cachedNodeEnv: string | undefined;

function getCloudflareEnv(): CloudflareContext["env"] {
  const context = (globalThis as Record<symbol, CloudflareContext | undefined>)[
    CLOUDFLARE_CONTEXT_SYMBOL
  ];

  return context?.env;
}

function isD1Database(value: unknown): value is D1Database {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Partial<D1Database>).prepare === "function"
  );
}

export function getD1Binding(): D1Database {
  const CLOUDFLARE_CONTEXT_SYMBOL = Symbol.for("__cloudflare-context__");
  const context = (
    globalThis as Record<symbol, { env?: { DB?: D1Database } } | undefined>
  )[CLOUDFLARE_CONTEXT_SYMBOL];
  const binding = context?.env?.DB ?? env.DB;

  if (!isD1Database(binding)) {
    throw new Error(
      "Cloudflare D1 binding `DB` is not available. Ensure wrangler.toml binds the database and requests run through the Workers runtime.",
    );
  }

  return binding;
}

function createDbInstance(binding: D1Database): DrizzleDb {
  const db = drizzle(binding, {
    schema,
  });
  /**
   * IMPORTANT: D1 does not support SQL transactions.
   * This is a no-op that executes the callback with the same db instance.
   *
   * Implications:
   * - No atomicity: If operations fail mid-way, partial changes persist
   * - No isolation: Concurrent requests see partial updates
   * - No rollback: Failed operations must be manually compensated
   *
   * Migration Note: When moving to PostgreSQL/standard SQLite, remove this
   * mock and use real transactions.
   *
   * For critical multi-step operations:
   * 1. Add application-level validation before writes
   * 2. Implement retry logic with idempotency keys
   * 3. Use status fields to track operation completion
   */
  db.transaction = async (callback) => callback(db as any);
  return db;
}

function resolveDb(): DrizzleDb {
  // In test environment, return a mock database
  // Check NODE_ENV every time to handle test environment changes
  const currentNodeEnv = process.env.NODE_ENV;

  // If NODE_ENV changed, clear cache
  if (cachedNodeEnv !== currentNodeEnv) {
    cachedDb = undefined;
    cachedBinding = undefined;
    cachedNodeEnv = currentNodeEnv;
  }

  if (currentNodeEnv === "test") {
    // Create a comprehensive mock that matches drizzle-orm interface
    const createQueryBuilder = (result: any[] = []) => {
      const builder = {
        from: vi.fn(() => builder),
        where: vi.fn(() => builder),
        leftJoin: vi.fn(() => builder),
        groupBy: vi.fn(() => builder),
        orderBy: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        offset: vi.fn(() => builder),
        innerJoin: vi.fn(() => builder),
        select: vi.fn(() => builder),
        then: vi.fn((resolve: (value: any[]) => void) => resolve(result)),
        execute: vi.fn(() => Promise.resolve(result)),
      };
      return builder;
    };

    const mockDb = {
      select: vi.fn(() => createQueryBuilder()),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(() => ({
            set: vi.fn(() => ({
              returning: vi.fn(() => createQueryBuilder([{ id: 1 }])),
            })),
          })),
          returning: vi.fn(() => createQueryBuilder([{ id: 1 }])),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => createQueryBuilder([{ id: 1 }])),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => createQueryBuilder()),
      })),
      // Add missing Drizzle properties for compatibility
      batch: vi.fn(() => []),
      transaction: vi.fn((callback: (tx: any) => Promise<any>) =>
        callback(mockDb),
      ),
      resultKind: "async",
      _: {},
      $with: vi.fn(() => mockDb),
      $client: {} as any,
      // Legacy query interface for existing tests - make these spies
      query: {
        users: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        workoutTemplates: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        workoutSessions: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        sessionExercises: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        userPreferences: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        userIntegrations: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        externalWorkoutsWhoop: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        rateLimits: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        masterExercises: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        exerciseLinks: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        healthAdvice: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        wellnessData: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        aiSuggestionHistory: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
      },
    };

    return mockDb as unknown as DrizzleDb;
  }

  const runtimeEnv = getCloudflareEnv();
  const binding = runtimeEnv?.DB ?? env.DB;

  if (!isD1Database(binding)) {
    throw new Error(
      "Cloudflare D1 binding `DB` is not available. Ensure wrangler.toml binds the database and requests run through the Workers runtime.",
    );
  }

  if (!cachedDb || binding !== cachedBinding) {
    cachedDb = createDbInstance(binding);
    cachedBinding = binding;
  }

  return cachedDb;
}

// Create a database instance from an explicit D1 binding
export function createDb(binding: D1Database): DrizzleDb {
  if (process.env.NODE_ENV === "test") {
    return resolveDb(); // Return mock in test environment
  }
  return createDbInstance(binding);
}

// Lazily resolve the D1 binding per request so the Worker runtime always provides the latest env.
// This is kept for backward compatibility but should be phased out in favor of createDb.
const dbProxy = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    const instance = resolveDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return (
      typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(instance)
        : value
    ) as unknown;
  },
}) as DrizzleDb;

export const db = dbProxy;

// Export database utilities for performance optimizations
export { monitorQuery, dbMonitor, checkDatabaseHealth } from "./monitoring";
export {
  batchInsertWorkouts,
  batchUpdateSessionExercises,
  batchCreateMasterExerciseLinks,
  batchDeleteWorkouts,
  type BatchWorkoutData,
} from "./utils";
