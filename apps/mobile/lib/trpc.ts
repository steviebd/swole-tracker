import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink, loggerLink } from '@trpc/client';
import superjson from 'superjson';
import { supabase } from './supabase';

// Import the shared AppRouter type
import type { AppRouter } from './shared-types';

// Create the tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// Get the API URL from environment variables
const getBaseUrl = () => {
  // During development, this should point to your local web app
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL environment variable is required');
  }
  return apiUrl;
};

// Create the tRPC client configuration
export const trpcClient = createTRPCClient<AppRouter>({
  transformer: superjson,
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === 'development' ||
        (opts.direction === 'down' && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      headers: async () => {
        // Get the current session and add authorization header
        const { data: { session } } = await supabase.auth.getSession();
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add authorization header if user is authenticated
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        return headers;
      },
      // Enable batch requests for better performance
      maxURLLength: 2048,
      // Add retry logic for mobile networks
      fetch: async (url, options) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      },
    }),
  ],
});