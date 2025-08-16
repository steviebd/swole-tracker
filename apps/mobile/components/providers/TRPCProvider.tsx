import React, { ReactNode, useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { trpc, trpcClient } from '../../lib/trpc';
import { queryClient, setupQueryPersistence, clearQueryCache } from '../../lib/query-client';
import { useAuth } from './AuthProvider';
import { LoadingScreen } from '../ui';

interface TRPCProviderProps {
  children: ReactNode;
}

export function TRPCProvider({ children }: TRPCProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  
  // Track previous session to detect sign out
  const [previousSession, setPreviousSession] = useState(session);

  useEffect(() => {
    const initializeProvider = async () => {
      try {
        // Set up query persistence
        await setupQueryPersistence();
        setIsReady(true);
      } catch (err) {
        console.error('Failed to initialize TRPC provider:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsReady(true); // Still render children even if persistence fails
      }
    };

    initializeProvider();
  }, []);

  // Handle auth state changes for cache management
  useEffect(() => {
    const handleAuthChange = async () => {
      // Clear cache when user signs out
      if (previousSession && !session) {
        console.log('User signed out, clearing query cache');
        await clearQueryCache();
      }
      
      // Update the previous session
      setPreviousSession(session);
    };

    handleAuthChange();
  }, [session, previousSession]);

  // Show loading state while initializing
  if (!isReady) {
    return <LoadingScreen message="Setting up..." />;
  }

  // Show error if something went wrong (but still render children)
  if (error) {
    console.warn('TRPC Provider initialization error:', error);
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* Only show React Query devtools in development */}
        {__DEV__ && (
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-left"
          />
        )}
      </QueryClientProvider>
    </trpc.Provider>
  );
}