import { drizzle } from "drizzle-orm/d1";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Database connection for D1/SQLite
 * In Cloudflare Workers, the D1 binding is available via the global env object
 * For local development, we'll use a local D1 database
 */

// Type for Cloudflare D1 database binding
type D1Database = {
  prepare: (query: string) => any;
  exec: (query: string) => Promise<any>;
  batch: (statements: any[]) => Promise<any>;
  dump: () => Promise<ArrayBuffer>;
};

// Cache the database connection in development
const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema, D1Database>> | undefined;
};

// Function to get D1 database binding
function getD1Database(): D1Database {
  // In Cloudflare Workers environment, D1 is available via env.DB
  if (typeof process !== "undefined" && process.env) {
    // For local development, check if we have access to Cloudflare bindings
    if ((globalThis as any).DB) {
      return (globalThis as any).DB as D1Database;
    }
    
    // Fallback for local development - mock D1 interface
    // In practice, wrangler dev will provide the DB binding
    console.warn("D1 binding not found, using development fallback");
    return {
      prepare: (_query: string) => ({
        bind: (..._params: any[]) => ({
          all: () => Promise.resolve({ results: [], meta: {} }),
          first: () => Promise.resolve(null),
          run: () => Promise.resolve({ success: true, meta: {} }),
        }),
        all: () => Promise.resolve({ results: [], meta: {} }),
        first: () => Promise.resolve(null),
        run: () => Promise.resolve({ success: true, meta: {} }),
      }),
      exec: () => Promise.resolve({ results: [], meta: {} }),
      batch: () => Promise.resolve([]),
      dump: () => Promise.resolve(new ArrayBuffer(0)),
    };
  }
  
  throw new Error("D1 database binding not available");
}

const d1Instance = getD1Database();
export const db = globalForDb.db ?? drizzle(d1Instance, { schema });

if (env.NODE_ENV !== "production") globalForDb.db = db;
