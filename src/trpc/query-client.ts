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
        // Optimized caching for performance and reduced server load
        staleTime: 10 * 60 * 1000, // 10 minutes - longer default to reduce requests
        gcTime: 60 * 60 * 1000, // 1 hour - longer cache retention for better offline experience
        refetchOnWindowFocus: false, // Disable to reduce unnecessary requests
        refetchOnReconnect: true, // Keep for offline recovery
        refetchInterval: false, // No polling by default
        retry: (failureCount, error) => {
          // Very conservative retry logic
          if (error && typeof error === "object" && "data" in error) {
            const errorData = error.data as any;
            // Don't retry on authentication or authorization errors
            if (errorData?.code === "UNAUTHORIZED" || errorData?.code === "FORBIDDEN") {
              return false;
            }
          }
          // Only retry once to reduce server load
          return failureCount < 1;
        },
        retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000), // Slower, less aggressive retries
        // Use cached data aggressively
        refetchOnMount: false, // Don't refetch if data exists and is not stale
        networkMode: "offlineFirst", // Prioritize cached data
      },
      mutations: {
        // Conservative mutation retry to prevent duplicate operations
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error && "status" in error && typeof error.status === "number") {
            if (error.status >= 400 && error.status < 500) {
              return false;
            }
          }
          return failureCount < 1; // Only retry once to prevent duplicate mutations
        },
        retryDelay: (attemptIndex) => Math.min(3000 * 2 ** attemptIndex, 10000), // Slower retries
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
