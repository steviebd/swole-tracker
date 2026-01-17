import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { D1Database } from "@cloudflare/workers-types";

function getDbFromEnv(): { DB: D1Database } | null {
  if (typeof process !== "undefined") {
    const binding = (process.env as unknown as { DB?: D1Database }).DB;
    if (binding) {
      return { DB: binding };
    }
  }

  const cfEnv = (
    globalThis as unknown as { __cloudflare?: { env?: { DB?: D1Database } } }
  ).__cloudflare?.env;
  if (cfEnv?.DB) {
    return { DB: cfEnv.DB };
  }

  const cfEnv2 = (
    globalThis as unknown as { __env__?: Record<string, unknown> }
  ).__env__;
  if (cfEnv2?.DB) {
    return { DB: cfEnv2.DB as D1Database };
  }

  return null;
}

interface D1QueryResult {
  results?: Array<{ value: unknown }>;
  success: boolean;
}

async function getRemoteDb() {
  const cfEnv = (globalThis as unknown as { __env__?: Record<string, string> })
    .__env__;
  const accountId =
    cfEnv?.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = cfEnv?.D1_DB_ID || process.env.D1_DB_ID;
  const token = cfEnv?.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !databaseId || !token) {
    throw new Error(
      "D1 remote database credentials not available. Ensure CLOUDFLARE_ACCOUNT_ID, D1_DB_ID, and CLOUDFLARE_API_TOKEN are set.",
    );
  }

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;

  const fetchDb = async (
    query: string,
    params?: unknown[],
  ): Promise<D1QueryResult> => {
    const response = await fetch(`${baseUrl}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: query,
        params: params || [],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`D1 query failed: ${response.statusText} - ${error}`);
    }

    return response.json();
  };

  const client = {
    prepare: (query: string) => ({
      bind: (...params: unknown[]) => ({
        first: async <T = unknown>(): Promise<T | null> => {
          const result = await fetchDb(query, params);
          return (result.results?.[0]?.value as T) || null;
        },
        run: async () => {
          await fetchDb(query, params);
        },
        all: async <T = unknown>(): Promise<T[]> => {
          const result = await fetchDb(query, params);
          return (result.results?.map((r) => r.value) as T[]) || [];
        },
        raw: async (): Promise<unknown[][]> => {
          const result = await fetchDb(query, params);
          return result.results?.map((r) => r.value as unknown[]) || [];
        },
      }),
    }),
    exec: async (query: string) => {
      const response = await fetch(`${baseUrl}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql: query }),
      });
      if (!response.ok) {
        throw new Error(`D1 exec failed: ${response.statusText}`);
      }
    },
    batch: async (queries: Array<{ sql: string }>) => {
      const response = await fetch(`${baseUrl}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ queries }),
      });
      if (!response.ok) {
        throw new Error(`D1 batch failed: ${response.statusText}`);
      }
    },
  } as unknown as D1Database;

  return drizzle(client, { schema });
}

export async function getDb() {
  const binding = getDbFromEnv();
  if (binding?.DB) {
    return drizzle(binding.DB, { schema });
  }

  return getRemoteDb();
}

export type Db = Awaited<ReturnType<typeof getDb>>;

export * from "./schema";
export * from "./chunk-utils";
