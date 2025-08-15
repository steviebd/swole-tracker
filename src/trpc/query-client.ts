import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";
import { configureQueryCache } from "./cache-config";

export const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Enhanced caching and performance settings
        staleTime: 5 * 60 * 1000, // 5 minutes default
        gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache much longer for offline
        refetchOnWindowFocus: true, // Refetch when user returns to tab
        refetchOnReconnect: true, // Refetch when internet reconnects
        refetchInterval: false, // Disable automatic polling by default
        retry: (failureCount, error) => {
          // More conservative retry logic to prevent infinite loops
          if (error && typeof error === "object" && "data" in error) {
            const errorData = error.data as any;
            // Don't retry on authentication or authorization errors
            if (errorData?.code === "UNAUTHORIZED" || errorData?.code === "FORBIDDEN") {
              return false;
            }
          }
          // Reduce retry count to prevent excessive requests
          if (failureCount < 2) {
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

  // Configure query-specific cache settings
  configureQueryCache(queryClient);

  return queryClient;
};
