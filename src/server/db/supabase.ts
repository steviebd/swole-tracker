import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { currentUser } from "@clerk/nextjs/server";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Create a database connection with Clerk user context for RLS
 */
export async function getSupabaseDb() {
  const user = await currentUser();
  
  if (!user) {
    throw new Error("User not authenticated");
  }

  // Create connection with user context for RLS
  const conn = postgres(env.DATABASE_URL, {
    // Set the user context for RLS policies
    connection: {
      "request.jwt.claims": JSON.stringify({ sub: user.id }),
      "request.jwt.claim.sub": user.id,
      "role": "authenticated"
    }
  });

  return drizzle(conn, { schema });
}

/**
 * Create a database connection without user context (for server admin operations)
 */
export function getServerDb() {
  const conn = postgres(env.DATABASE_URL);
  return drizzle(conn, { schema });
}
