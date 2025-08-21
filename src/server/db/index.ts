import { drizzle } from "drizzle-orm/d1";

import { env } from "~/env";
import { getD1Binding } from "~/lib/cloudflare-bindings";
import * as schema from "./schema";

/**
 * Database connection for D1/SQLite
 * In Cloudflare Workers, the D1 binding is available via the global env object
 * For local development, we'll use a local D1 database
 */

// Cache the database connection in development
const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

// Function to get D1 database binding
function getD1Database(): D1Database {
  // Try to get D1 binding from Cloudflare runtime
  const d1Binding = getD1Binding();
  if (d1Binding) {
    return d1Binding;
  }
  
  // For build time and local development - provide fallback
  console.warn("D1 binding not found, using development fallback");
  
  const mockPreparedStatement = {
    all: () => Promise.resolve({ results: [], meta: {} }),
    first: () => Promise.resolve(null),
    run: () => Promise.resolve({ success: true, meta: {} }),
    raw: () => Promise.resolve([]),
    bind: (..._params: any[]) => mockPreparedStatement,
  };
  
  return {
    prepare: (_query: string) => mockPreparedStatement,
    exec: () => Promise.resolve({ results: [], meta: {} }),
    batch: () => Promise.resolve([]),
    dump: () => Promise.resolve(new ArrayBuffer(0)),
    withSession: (_fn: (session: any) => any) => Promise.resolve(null),
  } as unknown as D1Database;
}

const d1Instance = getD1Database();
export const db = globalForDb.db ?? drizzle(d1Instance, { schema });

if (env.NODE_ENV !== "production") globalForDb.db = db;
