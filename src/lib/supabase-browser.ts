import { createBrowserClient } from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";
import { env } from "~/env";

let client: SupabaseClient | null = null;

/**
 * Browser/client Supabase with auth from cookies
 * Use in Client Components. Handles auth state automatically via cookies.
 * Uses singleton pattern to prevent multiple client instances.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}

/**
 * Clear all Supabase auth data from local storage
 * Useful for debugging auth issues
 */
export function clearSupabaseAuth(): void {
  if (typeof window !== 'undefined') {
    // Clear Supabase auth data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear session cookies if any
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.startsWith('sb-') || name.includes('supabase')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  }
}
