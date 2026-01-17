import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

function getDbFromEnv(): any {
  // In Cloudflare production, use the DB binding
  if (typeof process !== "undefined" && process.env.CF_PAGES === "1") {
    // @ts-ignore - DB binding is only available in Cloudflare
    return { DB: process.env.DB };
  }

  // In local development via wrangler, use the DB binding from wrangler
  // The DB binding is injected by wrangler into the process.env
  // @ts-ignore - DB binding is injected by wrangler
  const binding = process.env.DB;
  if (binding) {
    return { DB: binding };
  }

  // Fallback: try to use D1 from wrangler's local mode
  // @ts-ignore
  if (typeof __env__ !== "undefined" && __env__.DB) {
    // @ts-ignore
    return { DB: __env__.DB };
  }

  return null;
}

export function getDb() {
  const env = getDbFromEnv();
  if (!env || !env.DB) {
    throw new Error(
      "D1 database binding not available. Make sure wrangler dev is running with D1 bindings.",
    );
  }
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof getDb>;

// Re-export schema and utilities
export * from "./schema";
export * from "./chunk-utils";
