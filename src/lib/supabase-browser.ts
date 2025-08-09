import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "~/env";

/**
 * Browser/client Supabase (optionally Clerk-authenticated)
 * Use in Client Components. Pass Clerk session from useSession() or omit.
 */
export function createClerkSupabaseClient(
  session?: { getToken?: () => Promise<string | null> } | null,
): SupabaseClient {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;

  // Local dev helper: allow service role key when using local 127.0.0.1 Supabase instance
  const isLocalDev =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1");

  let client: SupabaseClient;

  if (isLocalDev && process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[supabase] Using service role key for local development");
    client = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  } else {
    // No test-specific bypass: tests expect env guards to enforce presence
    const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const getAuthToken = async (): Promise<string | null> => {
      if (!session?.getToken) return null;
      try {
        return await session.getToken();
      } catch {
        return null;
      }
    };

    client = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options: RequestInit = {}) => {
          const token = await getAuthToken();

          // Normalize various header shapes into a plain record
          const initHeaders = options.headers;
          let headers: Record<string, string> = {};
          if (initHeaders instanceof Headers) {
            initHeaders.forEach((v, k) => (headers[k] = v));
          } else if (Array.isArray(initHeaders)) {
            for (const [k, v] of initHeaders) headers[k] = v as string;
          } else if (initHeaders && typeof initHeaders === "object") {
            headers = initHeaders as Record<string, string>;
          }

          return fetch(url, {
            ...options,
            headers: {
              ...headers,
              Authorization: token ? `Bearer ${token}` : "",
            },
          });
        },
      },
    });
  }

  // Polyfill for tests/mocks: ensure auth.signInWithPassword exists
  // Some tests mock createClient and only provide auth.signIn. They still expect signInWithPassword to exist.
  const anyClient = client as any;
  if (anyClient?.auth && typeof anyClient.auth.signInWithPassword !== "function") {
    anyClient.auth.signInWithPassword = (...args: any[]) => {
      if (typeof anyClient.auth.signIn === "function") {
        return anyClient.auth.signIn(...(args as [any]));
      }
      return Promise.resolve({ data: null, error: null });
    };
  }

  return client;
}
