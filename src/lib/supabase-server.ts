import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client with Clerk authentication
 * Use this in Server Components, API routes, and Server Actions
 */
export async function createServerSupabaseClient() {
  const { getToken } = await auth()
  const token = await getToken()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      global: {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      },
    }
  )
}

/**
 * Server-side Supabase client factory for reuse
 * Returns a function that creates a client with the current auth context
 */
export function createServerSupabaseClientFactory() {
  return async () => {
    const { getToken } = await auth()
    const token = await getToken()

    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!,
      {
        global: {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        },
      }
    )
  }
}
