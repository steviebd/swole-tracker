import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Enhanced caching and performance settings
        staleTime: 5 * 60 * 1000, // 5 minutes - consider data fresh for longer
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
        refetchOnWindowFocus: true, // Refetch when user returns to tab
        refetchOnReconnect: true, // Refetch when internet reconnects
        refetchInterval: false, // Disable automatic polling by default
        retry: (failureCount, _error) => {
          // Retry logic for better offline handling
          if (failureCount < 3) {
            // Exponential backoff: 1s, 2s, 4s
            return true;
          }
          return false;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Show cached data while refetching in background
        refetchOnMount: "always",
        networkMode: "offlineFirst", // Use cached data when offline
      },
      mutations: {
        // Enhanced mutation settings for better UX
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error && "status" in error && typeof error.status === "number") {
            if (error.status >= 400 && error.status < 500) {
              return false;
            }
          }
          return failureCount < 2; // Retry once for network issues
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
        networkMode: "offlineFirst",
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
