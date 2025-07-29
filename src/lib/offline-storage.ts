/**
 * Enhanced offline storage utilities for TanStack Query persistence
 */

import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { type QueryClient } from "@tanstack/react-query";

// Create a persister that uses localStorage
const localStoragePersister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "swole-tracker-cache",
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

/**
 * Setup offline persistence for the query client
 */
export function setupOfflinePersistence(queryClient: QueryClient) {
  if (typeof window === "undefined") return;

  void persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    buster: "swole-tracker-v1", // Increment to clear old cache
    hydrateOptions: {},
    dehydrateOptions: {
      // Don't persist failed or loading queries
      shouldDehydrateQuery: (query) => {
        return query.state.status === "success";
      },
    },
  });
}

/**
 * Clear offline cache (useful for debugging or user logout)
 */
export function clearOfflineCache() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("swole-tracker-cache");
}

/**
 * Get cache size for debugging
 */
export function getCacheSize(): string {
  if (typeof window === "undefined") return "0 KB";
  
  const cache = localStorage.getItem("swole-tracker-cache");
  if (!cache) return "0 KB";
  
  const sizeInBytes = new Blob([cache]).size;
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}
