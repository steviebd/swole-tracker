import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared env guards
 */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

// This file no longer exports client or server implementations.
// Import from "~/lib/supabase-browser" in client code and
// "~/lib/supabase-server" in server code to avoid mixing boundaries.
