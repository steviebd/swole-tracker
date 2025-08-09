import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { env } from "~/env";


/**
 * Server-side Supabase with Clerk auth from request context.
 * Use in Server Components, Route Handlers, and Server Actions.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // In test, avoid importing real server auth behaviors; just construct a client
  if (process.env.NODE_ENV === "test") {
    return createClient(supabaseUrl, supabaseAnonKey);
  }

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
export function createServerSupabaseClientFactory() {
  return async (): Promise<SupabaseClient> => {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // In test, simply return a client without server auth headers
    if (process.env.NODE_ENV === "test") {
      return createClient(supabaseUrl, supabaseAnonKey);
    }

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
