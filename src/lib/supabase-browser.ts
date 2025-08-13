import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "~/env";

/**
 * Browser/client Supabase with auth from cookies
 * Use in Client Components. Handles auth state automatically via cookies.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
