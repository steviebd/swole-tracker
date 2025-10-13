"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useState, useEffect, useRef } from "react";
import SuperJSON from "superjson";

import { type AppRouter } from "~/server/api/root";
import { createQueryClient } from "./query-client";
import { setupOfflinePersistence } from "~/lib/offline-storage";
import { useAuth } from "~/providers/AuthProvider";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  clientQueryClientSingleton ??= createQueryClient();

  return clientQueryClientSingleton;
};

export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const { user, isLoading } = useAuth();
  const previousUserIdRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);
  const userId = user?.id ?? null;

  // Setup offline persistence for React Query cache
  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (previousUserIdRef.current && previousUserIdRef.current !== userId) {
      queryClient.clear();
    }

    previousUserIdRef.current = userId;

    setupOfflinePersistence(queryClient);

    return () => {
      // No cleanup needed for simple persistence
    };
  }, [queryClient, userId, isLoading]);

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
          // Enhanced error handling for offline scenarios
          fetch: (url, options) => {
            return fetch(url, {
              ...options,
              // Add timeout for better offline detection
              signal: AbortSignal.timeout(30000), // 30 second timeout
            }).catch((error: unknown) => {
              // Transform network errors for better React Query handling
              if (error && typeof error === "object" && "name" in error) {
                const errorName = error.name as string;
                if (
                  errorName === "AbortError" ||
                  errorName === "TimeoutError"
                ) {
                  throw new Error("NETWORK_ERROR");
                }
              }
              throw error;
            });
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
