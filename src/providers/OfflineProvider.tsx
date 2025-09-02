"use client";

import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { useBackgroundSync } from "~/hooks/use-background-sync";
import { setupEnhancedOfflinePersistence } from "~/lib/enhanced-offline-storage";
import { toast } from "sonner";

interface OfflineContextType {
  isInitialized: boolean;
}

const OfflineContext = createContext<OfflineContextType>({ isInitialized: false });

export const useOfflineContext = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOfflineContext must be used within an OfflineProvider');
  }
  return context;
};

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  // Initialize background sync
  const { syncStatus, connectionState } = useBackgroundSync();

  useEffect(() => {
    // Set up enhanced offline persistence
    const cleanup = setupEnhancedOfflinePersistence();
    
    // Show connection status changes
    if (connectionState.isOnline) {
      // Don't show "online" toast on first load
      const isFirstLoad = !sessionStorage.getItem('hasBeenOnline');
      if (!isFirstLoad) {
        toast.success('Connection restored', {
          description: 'Your changes will now sync automatically'
        });
      }
      sessionStorage.setItem('hasBeenOnline', 'true');
    }

    return cleanup;
  }, []);

  // Show sync status changes
  useEffect(() => {
    if (syncStatus.error) {
      toast.error('Sync failed', {
        description: syncStatus.error,
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => {
            // Trigger manual sync
            window.location.reload();
          }
        }
      });
    }
  }, [syncStatus.error]);

  // Show offline notifications
  useEffect(() => {
    if (!connectionState.isOnline && sessionStorage.getItem('hasBeenOnline')) {
      toast.warning('Connection lost', {
        description: 'Working offline - changes will sync when reconnected',
        duration: 4000
      });
    }
  }, [connectionState.isOnline]);

  const contextValue: OfflineContextType = {
    isInitialized: true
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
}