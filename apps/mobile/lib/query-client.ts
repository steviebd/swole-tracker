import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a custom storage adapter for AsyncStorage
const asyncStorageAdapter = {
  getItem: async (key: string) => {
    const value = await AsyncStorage.getItem(key);
    return value;
  },
  setItem: async (key: string, value: string) => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
  },
};

// Create the persister for offline storage
const persister = createSyncStoragePersister({
  storage: asyncStorageAdapter,
  key: 'swole-tracker-cache',
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

// Create the query client with mobile-optimized settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Increase stale time for mobile to reduce unnecessary refetches
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Increase cache time to keep data longer in offline scenarios
      gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime)
      // Retry failed requests with exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for network/server errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Reduce background refetch frequency for mobile
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      // Network mode for offline support
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations on network errors
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Network mode for offline support
      networkMode: 'offlineFirst',
    },
  },
});

// Set up persistence
export const setupQueryPersistence = async () => {
  try {
    await persistQueryClient({
      queryClient,
      persister,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      hydrateOptions: {
        defaultOptions: {
          queries: {
            // Don't refetch immediately on hydration to avoid unnecessary network calls
            staleTime: 5 * 60 * 1000,
          },
        },
      },
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Only persist successful queries that have data
          return query.state.status === 'success' && query.state.data !== undefined;
        },
      },
    });
  } catch (error) {
    console.warn('Failed to setup query persistence:', error);
  }
};

// Helper function to clear cache (useful for logout)
export const clearQueryCache = async () => {
  queryClient.clear();
  try {
    await AsyncStorage.removeItem('swole-tracker-cache');
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
};

// Helper function to get cache size (useful for debugging)
export const getCacheInfo = async () => {
  try {
    const cacheData = await AsyncStorage.getItem('swole-tracker-cache');
    if (cacheData) {
      const parsed = JSON.parse(cacheData);
      return {
        exists: true,
        size: new Blob([cacheData]).size,
        entries: Object.keys(parsed.clientState?.queries || {}).length,
        lastUpdated: new Date(parsed.timestamp || 0),
      };
    }
    return { exists: false };
  } catch (error) {
    console.warn('Failed to get cache info:', error);
    return { exists: false, error: error?.message };
  }
};

// Helper function to manually sync cache (useful for debugging)
export const forceCacheSync = async () => {
  try {
    // Force persist the current client state
    const dehydratedState = queryClient.getQueryCache().getAll().reduce((acc, query) => {
      if (query.state.status === 'success' && query.state.data !== undefined) {
        acc[query.queryHash] = query.state;
      }
      return acc;
    }, {} as Record<string, any>);
    
    await AsyncStorage.setItem('swole-tracker-cache', JSON.stringify({
      clientState: { queries: dehydratedState },
      timestamp: Date.now(),
    }));
    
    return true;
  } catch (error) {
    console.warn('Failed to force cache sync:', error);
    return false;
  }
};