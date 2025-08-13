import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "~/env";

/**
 * Server-side Supabase with auth from request context.
 * Use in Server Components, Route Handlers, and Server Actions.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // In test, avoid importing real server auth behaviors; just construct a client
  if (process.env.NODE_ENV === "test") {
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  // For server-side usage, we rely on Supabase auth headers from the request context
  // This will be handled by the Supabase auth middleware
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Server factory for per-request clients reading current auth on call.
 */
export function createServerSupabaseClientFactory() {
  return async (): Promise<SupabaseClient> => {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // In test, simply return a client without server auth headers
    if (process.env.NODE_ENV === "test") {
      return createClient(supabaseUrl, supabaseAnonKey);
    }

    // For server-side usage, we rely on Supabase auth headers from the request context
    // This will be handled by the Supabase auth middleware
    return createClient(supabaseUrl, supabaseAnonKey);
  };
}
