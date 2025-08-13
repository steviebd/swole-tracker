import { createServerClient } from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "~/env";

/**
 * Server-side Supabase with auth from request context.
 * Use in Server Components, Route Handlers, and Server Actions.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // In test, avoid importing real server auth behaviors; just construct a client
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  const cookieStore = await cookies();

  // Debug: Check what cookies are available
  const allCookies = cookieStore.getAll();
  const supabaseCookies = allCookies.filter(cookie => 
    cookie.name.includes('sb-') || cookie.name.includes('supabase')
  );
  
  console.log('Server-side cookies debug:', {
    totalCookies: allCookies.length,
    supabaseCookies: supabaseCookies.length,
    cookieNames: supabaseCookies.map(c => c.name),
  });

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

/**
 * Server factory for per-request clients reading current auth on call.
 */
export function createServerSupabaseClientFactory() {
  return createServerSupabaseClient;
}
