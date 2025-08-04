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
 * Server-side Supabase with Clerk auth from request context.
 * Use in Server Components, Route Handlers, and Server Actions.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
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
export function createServerSupabaseClientFactory() {
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
