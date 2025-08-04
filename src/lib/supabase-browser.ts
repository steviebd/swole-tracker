import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared env guards (client-safe: only NEXT_PUBLIC_* are read)
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
export function createClerkSupabaseClient(
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
