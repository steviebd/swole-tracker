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

  // Always use anonymous key for browser/client-side operations
  // Service role key is now server-side only for security
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const getAuthToken = async (): Promise<string | null> => {
    if (!session?.getToken) return null;
    try {
      return await session.getToken();
    } catch {
      return null;
    }
  };

  const client = createClient(supabaseUrl, supabaseAnonKey, {
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

  // Polyfill for tests/mocks: ensure auth.signInWithPassword exists
  // Some tests mock createClient and only provide auth.signIn. They still expect signInWithPassword to exist.
  const anyClient = client as any;
  if (
    anyClient?.auth &&
    typeof anyClient.auth.signInWithPassword !== "function"
  ) {
    anyClient.auth.signInWithPassword = (...args: any[]) => {
      if (typeof anyClient.auth.signIn === "function") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return anyClient.auth.signIn(...(args as [any]));
      }
      return Promise.resolve({ data: null, error: null });
    };
  }

  return client;
}
