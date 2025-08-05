import { QueryClient, dehydrate } from "@tanstack/react-query";
import { createCaller } from "~/server/api/root";
import { headers as nextHeaders } from "next/headers";
import { getServerDb } from "~/server/db/supabase";
import { randomUUID } from "crypto";

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
export async function prefetchHome(qc: QueryClient) {
  await Promise.all([
    qc.prefetchQuery({
      queryKey: [["workouts","getRecent"],{ input: { limit: 5 } }],
      // Provide headers synchronously for each call and pass server DB to caller
      queryFn: async () => {
        // Convert Next.js ReadonlyHeaders to a mutable Headers for caller context
        const rh = await nextHeaders(); // ensure we have the actual ReadonlyHeaders instance
        const h = new Headers();
        rh.forEach((value: string, key: string) => h.append(key, value));
        const db = getServerDb();
        const scopedCaller = createCaller({ headers: h, db, user: null, requestId: randomUUID() as `${string}-${string}-${string}-${string}-${string}` });
        return scopedCaller.workouts.getRecent({ limit: 5 });
      },
    }),
    qc.prefetchQuery({
      queryKey: [["templates","getAll"]],
      queryFn: async () => {
        const rh = await nextHeaders();
        const h = new Headers();
        rh.forEach((value: string, key: string) => h.append(key, value));
        const db = getServerDb();
        const scopedCaller = createCaller({ headers: h, db, user: null, requestId: randomUUID() as `${string}-${string}-${string}-${string}-${string}` });
        return scopedCaller.templates.getAll();
      },
    }),
  ]);
}

export async function prefetchTemplatesIndex(qc: QueryClient) {
  await qc.prefetchQuery({
    queryKey: [["templates","getAll"]],
    queryFn: async () => {
      const rh = await nextHeaders();
      const h = new Headers();
      rh.forEach((value: string, key: string) => h.append(key, value));
      const db = getServerDb();
      const scopedCaller = createCaller({ headers: h, db, user: null, requestId: randomUUID() as `${string}-${string}-${string}-${string}-${string}` });
      return scopedCaller.templates.getAll();
    },
  });
}

export async function prefetchWorkoutStart(qc: QueryClient) {
  await Promise.all([
    qc.prefetchQuery({
      queryKey: [["templates","getAll"]],
      queryFn: async () => {
        const rh = await nextHeaders();
        const h = new Headers();
        rh.forEach((value: string, key: string) => h.append(key, value));
        const db = getServerDb();
        const scopedCaller = createCaller({ headers: h, db, user: null, requestId: randomUUID() as `${string}-${string}-${string}-${string}-${string}` });
        return scopedCaller.templates.getAll();
      },
    }),
    qc.prefetchQuery({
      queryKey: [["workouts","getRecent"],{ input: { limit: 5 } }],
      queryFn: async () => {
        const rh = await nextHeaders();
        const h = new Headers();
        rh.forEach((value: string, key: string) => h.append(key, value));
        const db = getServerDb();
        const scopedCaller = createCaller({ headers: h, db, user: null, requestId: randomUUID() as `${string}-${string}-${string}-${string}-${string}` });
        return scopedCaller.workouts.getRecent({ limit: 5 });
      },
    }),
  ]);
}

/**
 * Dehydrate helper to serialize the QueryClient state for the client.
 */
export function getDehydratedState(qc: QueryClient) {
  return dehydrate(qc);
}
