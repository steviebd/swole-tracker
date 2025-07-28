import { createClient } from '@supabase/supabase-js'

/**
 * Create Supabase client with session token for use in client components
 * Pass the session from useSession() hook
 */
export function createClerkSupabaseClient(session: { getToken?: () => Promise<string | null> } | null) {
  const getAuthToken = async () => {
    if (!session?.getToken) return null
    try {
      return await session.getToken()
    } catch {
      return null
    }
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      global: {
        fetch: async (url, options = {}) => {
          const token = await getAuthToken()
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: token ? `Bearer ${token}` : '',
            },
          })
        },
      },
    }
  )
}
