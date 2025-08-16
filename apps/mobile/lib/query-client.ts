import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Set up persistence (simplified for now)
export const setupQueryPersistence = async () => {
  // Persistence will be added later
  return Promise.resolve();
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
      return {
        exists: true,
        size: cacheData.length,
        lastUpdated: new Date(),
      };
    }
    return { exists: false };
  } catch (error) {
    console.warn('Failed to get cache info:', error);
    return { exists: false, error: (error as any)?.message };
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