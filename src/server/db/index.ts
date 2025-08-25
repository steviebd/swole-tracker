import { drizzle } from "drizzle-orm/d1";

import { env } from "~/env";
import { getD1Binding } from "~/lib/cloudflare-bindings";
import { createWranglerD1Client, shouldUseRemoteD1 } from "~/lib/wrangler-d1-client";
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
  console.log("[Database] Attempting to get D1 database binding");
  
  // PRIORITY 1: Check for remote D1 connection via Wrangler API
  if (shouldUseRemoteD1()) {
    console.log("[Database] Remote D1 mode detected, attempting Wrangler API connection");
    const wranglerClient = createWranglerD1Client();
    if (wranglerClient) {
      console.log("[Database] Successfully created Wrangler D1 client for remote connection");
      return wranglerClient;
    } else {
      console.error("[Database] FAILED to create Wrangler D1 client - missing environment variables");
      console.error("[Database] Required: CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN");
      throw new Error("Remote D1 mode enabled but failed to create Wrangler client. Check environment variables.");
    }
  }
  
  // PRIORITY 2: Check if the binding is already available on globalThis (runtime)
  if ((globalThis as any).DB) {
    console.log("[Database] Found D1 binding on globalThis.DB");
    return (globalThis as any).DB as D1Database;
  }
  
  // PRIORITY 3: Try to get D1 binding from Cloudflare runtime
  const d1Binding = getD1Binding();
  if (d1Binding) {
    console.log("[Database] Found D1 binding via getD1Binding()");
    return d1Binding;
  }
  
  // PRIORITY 4: Check if we're in a Cloudflare Workers environment with direct env access
  if (typeof globalThis !== 'undefined' && (globalThis as any).env?.DB) {
    console.log("[Database] Found D1 binding via globalThis.env.DB");
    return (globalThis as any).env.DB as D1Database;
  }
  
  // PRIORITY 5: Check for OpenNext Cloudflare context
  try {
    const cloudflareContext = (globalThis as any)[Symbol.for("__cloudflare-context__")];
    console.log("[Database] Cloudflare context available:", !!cloudflareContext);
    console.log("[Database] Cloudflare context env:", !!cloudflareContext?.env);
    console.log("[Database] Cloudflare context DB binding:", !!cloudflareContext?.env?.DB);
    
    if (cloudflareContext?.env?.DB) {
      console.log("[Database] Found D1 binding via OpenNext Cloudflare context");
      return cloudflareContext.env.DB as D1Database;
    }
  } catch (error) {
    console.log("[Database] Error accessing Cloudflare context:", error);
  }
  
  // FALLBACK: Only use mock database if NOT in remote mode
  if (shouldUseRemoteD1()) {
    console.error("[Database] Remote D1 mode enabled but no connection method worked");
    throw new Error("Remote D1 connection failed. Cannot use mock database in remote mode.");
  }
  
  console.log("[Database] D1 binding not found, using development fallback (this is normal during local build)");
  
  // Counter for mock IDs
  let mockIdCounter = 1;
  
  const createMockPreparedStatement = (query: string) => ({
    all: () => {
      if (query.includes("RETURNING") || query.includes("SELECT")) {
        // For SELECT or RETURNING queries, return mock data
        const results: any[] = [];
        if (query.includes("workout_template")) {
          results.push({
            id: mockIdCounter++,
            name: "Mock Template",
            user_id: "mock_user",
            createdAt: new Date().toISOString(),
            updatedAt: null,
          });
        }
        return Promise.resolve({ results, meta: {}, success: true });
      }
      return Promise.resolve({ results: [], meta: {}, success: true });
    },
    first: () => {
      if (query.includes("RETURNING") || query.includes("SELECT")) {
        if (query.includes("workout_template")) {
          return Promise.resolve({
            id: mockIdCounter++,
            name: "Mock Template", 
            user_id: "mock_user",
            createdAt: new Date().toISOString(),
            updatedAt: null,
          });
        }
      }
      return Promise.resolve(null);
    },
    run: () => {
      // For INSERT/UPDATE/DELETE operations
      return Promise.resolve({ 
        success: true, 
        meta: { 
          changes: 1,
          last_row_id: mockIdCounter++,
          duration: 10,
          rows_read: 0,
          rows_written: 1
        } 
      });
    },
    raw: () => Promise.resolve([]),
    bind: (..._params: any[]) => createMockPreparedStatement(query),
  });
  
  return {
    prepare: (query: string) => createMockPreparedStatement(query),
    exec: () => Promise.resolve({ results: [], meta: {}, success: true }),
    batch: () => Promise.resolve([]),
    dump: () => Promise.resolve(new ArrayBuffer(0)),
    withSession: (_fn: (session: any) => any) => Promise.resolve(null),
  } as unknown as D1Database;
}

// Runtime injection function for OpenNext
export function injectDatabaseBindings(env: { DB?: D1Database }) {
  if (env.DB) {
    console.log("[Database] Injecting D1 binding at runtime");
    (globalThis as any).DB = env.DB;
    (globalThis as any).env = { ...((globalThis as any).env || {}), DB: env.DB };
    
    // Clear the cached database instance so it gets recreated with real binding
    if (globalForDb.db) {
      console.log("[Database] Clearing cached database instance");
      globalForDb.db = undefined;
    }
  }
}

// Function to create database instance with runtime bindings
export function createDbWithBindings(bindings?: { DB?: D1Database }): ReturnType<typeof drizzle<typeof schema>> {
  let d1Instance: D1Database;
  
  if (bindings?.DB) {
    // Use provided binding (from Cloudflare Workers runtime)
    d1Instance = bindings.DB;
  } else {
    // Fallback to existing logic
    d1Instance = getD1Database();
  }
  
  return drizzle(d1Instance, { schema });
}

const d1Instance = getD1Database();
export const db = globalForDb.db ?? drizzle(d1Instance, { schema });

if (env.NODE_ENV !== "production") globalForDb.db = db;
