import { createClient } from "@supabase/supabase-js";

/**
 * Create Supabase client with session token for use in client components
 * Pass the session from useSession() hook
 */
export function createClerkSupabaseClient(
  session: { getToken?: () => Promise<string | null> } | null,
) {
  // For local development, use service role key to bypass JWT validation
  const isLocalDev =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1");

  if (isLocalDev && process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    console.log("Using service role key for local development");
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  const getAuthToken = async () => {
    if (!session?.getToken) return null;
    try {
      return await session.getToken();
    } catch {
      return null;
    }
  };

  // Ensure we have the required environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_KEY is not set");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY,
    {
      global: {
        fetch: async (url, options = {}) => {
          const token = await getAuthToken();
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: token ? `Bearer ${token}` : "",
            },
          });
        },
      },
    },
  );
}
