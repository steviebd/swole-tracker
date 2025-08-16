import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink, loggerLink } from '@trpc/client';
import superjson from 'superjson';
import { supabase } from './supabase';

// Import the shared AppRouter type
import type { AppRouter } from './shared-types';

// Create the tRPC React hooks
export const trpc = createTRPCReact();

// Get the API URL from environment variables
const getBaseUrl = () => {
  // During development, this should point to your local web app
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL environment variable is required');
  }
  
  // Debug: Log the URL being used
  console.log('🌐 Using API URL:', apiUrl);
  
  return apiUrl;
};

// Create the tRPC client configuration
export const trpcClient = createTRPCClient({
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === 'development' ||
        (opts.direction === 'down' && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers: async () => {
        // Get the current session and add authorization header
        const { data: { session } } = await supabase.auth.getSession();
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add authorization header if user is authenticated
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
          console.log('🌐 tRPC headers with auth token');
        } else {
          console.log('🌐 tRPC headers without auth token');
        }

        console.log('🌐 Making request to:', `${getBaseUrl()}/api/trpc`);
        return headers;
      },
      // Enable batch requests for better performance
      maxURLLength: 2048,
      // Add retry logic for mobile networks
      fetch: async (url, options) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        console.log('🌐 Fetch attempt:', { url, method: options?.method });

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          console.log('🌐 Fetch success:', { status: response.status, url });
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          console.error('🌐 Fetch error details:', { 
            message: error.message, 
            name: error.name,
            url,
            code: error.code,
            cause: error.cause,
            stack: error.stack
          });
          
          // Add specific guidance for common mobile network issues
          if (error.message.includes('Network request failed')) {
            console.error('🌐 Network troubleshooting:');
            console.error('- If using Expo Go: Try using your machine IP instead of localhost');
            console.error('- If using simulator: Check firewall settings');
            console.error('- Current URL:', url);
            console.error('- Try alternative: http://localhost:3000 or http://127.0.0.1:3000');
          }
          
          throw error;
        }
      },
    }),
  ],
});