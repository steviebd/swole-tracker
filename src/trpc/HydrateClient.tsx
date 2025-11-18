"use client";

import React, { type PropsWithChildren, useState } from "react";
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { type DehydratedState } from "@tanstack/react-query";

/**
 * Client-side wrapper to provide a QueryClient and hydrate prefetch state.
 * Uses a lazy-initialized QueryClient per session.
 */
export default function HydrateClient({
  children,
  state,
}: PropsWithChildren<{ state: DehydratedState }>) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <HydrationBoundary state={state}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}
