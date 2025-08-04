import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

/**
 * Shared env guards
 */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

/**
 * Browser/client Supabase (optionally Clerk-authenticated)
 * Use in Client Components. Pass Clerk session from useSession() or omit.
 */
export function createBrowserClient(
  session?: { getToken?: () => Promise<string | null> } | null,
): SupabaseClient {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");

  // Local dev helper: allow service role key when using local 127.0.0.1 Supabase instance
  const isLocalDev =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1");

  if (isLocalDev && process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    // eslint-disable-next-line no-console
    console.warn("[supabase] Using service role key for local development");
    return createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_KEY");

  const getAuthToken = async (): Promise<string | null> => {
    if (!session?.getToken) return null;
    try {
      return await session.getToken();
    } catch {
      return null;
    }
  };

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options: RequestInit = {}) => {
        const token = await getAuthToken();
        return fetch(url, {
          ...options,
          headers: {
            ...(options.headers as Record<string, string>),
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
      },
    },
  });
}

/**
 * Server-side Supabase with Clerk auth from request context.
 * Use in Server Components, Route Handlers, and Server Actions.
 */
export async function createServerClient(): Promise<SupabaseClient> {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_KEY");

  const { getToken } = await auth();
  const token = await getToken();

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  });
}

/**
 * Server factory for per-request clients reading current Clerk auth on call.
 */
export function createServerClientFactory() {
  return async (): Promise<SupabaseClient> => {
    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_KEY");

    const { getToken } = await auth();
    const token = await getToken();

    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      },
    });
  };
}

/**
 * Backwards-compat exports used elsewhere in the codebase.
 * These re-exported names allow staged refactors without churn.
 */
export {
  createBrowserClient as createClerkSupabaseClient, // from src/lib/supabase-client.ts
  createServerClient as createServerSupabaseClient, // from src/lib/supabase-server.ts
  createServerClientFactory as createServerSupabaseClientFactory, // from src/lib/supabase-server.ts
};
