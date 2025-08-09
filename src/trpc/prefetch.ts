import { QueryClient, dehydrate } from "@tanstack/react-query";

/**
 * Returns a fresh QueryClient configured for SSR prefetch.
 */
export function getQueryClient() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // 1 min
        gcTime: 5 * 60_000, // 5 min
        retry: 1,
      },
    },
  });
  return qc;
}

/**
 * Prefetch common queries with tRPC + TanStack Query on the server.
 * You can call this in Next.js server components, then pass the dehydrated state to a Hydrate client wrapper.
 */
export async function prefetchHome(_qc: QueryClient) {
  // Skip prefetching protected queries - they require authentication
  // The client-side queries will handle fetching once authenticated
  return;
}

export async function prefetchTemplatesIndex(_qc: QueryClient) {
  // Skip prefetching templates as it requires authentication
  // The client-side query will handle fetching once authenticated
  return;
}

export async function prefetchWorkoutStart(_qc: QueryClient) {
  // Skip prefetching protected queries - they require authentication
  // The client-side queries will handle fetching once authenticated
  return;
}

/**
 * Dehydrate helper to serialize the QueryClient state for the client.
 */
export function getDehydratedState(qc: QueryClient) {
  return dehydrate(qc);
}
