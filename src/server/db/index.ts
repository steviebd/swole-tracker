import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import { vi } from "vitest";
import { env } from "~/env";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
type CloudflareContext = {
  env?: {
    DB?: unknown;
  };
};

const CLOUDFLARE_CONTEXT_SYMBOL = Symbol.for("__cloudflare-context__");

let cachedDb: DrizzleDb | undefined;
let cachedBinding: D1Database | undefined;

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

function resolveDb(): DrizzleDb {
  // In test environment, return a mock database
  if (process.env.NODE_ENV === "test") {
    const createQueryBuilder = (result: any[] = []) => ({
      from: vi.fn(() => createQueryBuilder(result)),
      where: vi.fn(() => createQueryBuilder(result)),
      leftJoin: vi.fn(() => createQueryBuilder(result)),
      groupBy: vi.fn(() => createQueryBuilder(result)),
      orderBy: vi.fn(() => createQueryBuilder(result)),
      limit: vi.fn(() => createQueryBuilder(result)),
      offset: vi.fn(() => createQueryBuilder(result)),
      innerJoin: vi.fn(() => createQueryBuilder(result)),
      select: vi.fn(() => createQueryBuilder(result)),
      then: vi.fn((resolve: (value: any[]) => void) => resolve(result)),
      execute: vi.fn(() => Promise.resolve(result)),
    });

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
      // Legacy query interface for existing tests
      query: {
        workoutTemplates: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        templateExercises: {
          findMany: vi.fn(() => []),
        },
        masterExercises: {
          findFirst: vi.fn(() => null),
          findMany: vi.fn(() => []),
        },
        exerciseLinks: {
          findFirst: vi.fn(() => null),
          findMany: vi.fn(() => []),
        },
        workoutSessions: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        whoopData: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        jokes: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
        healthAdvice: {
          findMany: vi.fn(() => []),
          findFirst: vi.fn(() => null),
        },
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return mockDb as any;
  }

  const runtimeEnv = getCloudflareEnv();
  const binding = runtimeEnv?.DB ?? env.DB;

  if (!isD1Database(binding)) {
    throw new Error(
      "Cloudflare D1 binding `DB` is not available. Ensure wrangler.toml binds the database and requests run through the Workers runtime.",
    );
  }

  if (!cachedDb || binding !== cachedBinding) {
    cachedDb = drizzle(binding, {
      schema,
    });
    cachedBinding = binding;
  }

  return cachedDb;
}

// Lazily resolve the D1 binding per request so the Worker runtime always provides the latest env.
const dbProxy = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    const instance = resolveDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return (
      typeof value === "function" ? (value as Function).bind(instance) : value
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
