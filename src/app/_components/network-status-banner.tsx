"use client";

import { useState, useEffect } from "react";
import { useOnlineStatus } from "~/hooks/use-online-status";
import { syncStatus, type SyncStatus } from "~/lib/mobile-offline-queue";
import { triggerManualSync } from "~/lib/enhanced-offline-storage";

export function NetworkStatusBanner() {
  const isOnline = useOnlineStatus();
  const [syncState, setSyncState] = useState<SyncStatus | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const loadSyncStatus = async () => {
      const status = await syncStatus.getSyncStatus();
      setSyncState(status);
    };
    
    loadSyncStatus();
    
    // Poll sync status every 10 seconds
    const interval = setInterval(() => void loadSyncStatus(), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Show banner when offline or when there are pending/failed operations
    const shouldShow = !isOnline || 
      (syncState && (syncState.pendingOperations > 0 || syncState.failedOperations > 0));
    setShowBanner(!!shouldShow);
  }, [isOnline, syncState]);

  const handleManualSync = async () => {
    if (!isOnline || isManualSyncing) return;
    
    setIsManualSyncing(true);
    try {
      await triggerManualSync();
      // Refresh sync status after manual sync
      const status = await syncStatus.getSyncStatus();
      setSyncState(status);
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getBannerContent = () => {
    if (!isOnline) {
      const pendingCount = syncState?.pendingOperations ?? 0;
      return {
        color: 'bg-orange-500',
        icon: '📶',
        title: 'You\'re offline',
        message: pendingCount > 0 
          ? `${pendingCount} changes will sync when connection is restored`
          : 'Changes will sync when connection is restored',
        action: null,
      };
    }

    if (syncState?.failedOperations && syncState.failedOperations > 0) {
      return {
        color: 'bg-red-500',
        icon: '⚠️',
        title: 'Sync failed',
        message: `${syncState.failedOperations} operations failed to sync`,
        action: (
          <button
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="ml-3 text-sm underline hover:no-underline disabled:opacity-50"
          >
            {isManualSyncing ? 'Retrying...' : 'Retry now'}
          </button>
        ),
      };
    }

    if (syncState?.pendingOperations && syncState.pendingOperations > 0) {
      return {
        color: 'bg-blue-500',
        icon: '🔄',
        title: 'Syncing',
        message: `${syncState.pendingOperations} changes syncing...`,
        action: null,
      };
    }

    return null;
  };

  if (!showBanner) {
    return null;
  }

  const content = getBannerContent();
  if (!content) {
    return null;
  }

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 ${content.color} text-background px-4 py-3 shadow-lg`}
      style={{ 
        transform: showBanner ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s ease-in-out'
      }}
    >
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-lg" role="img" aria-label="status">
            {content.icon}
          </span>
          <div>
            <p className="font-medium text-sm">
              {content.title}
            </p>
            <p className="text-xs opacity-90">
              {content.message}
            </p>
          </div>
        </div>
        
        <div className="flex items-center">
          {content.action}
          <button
            onClick={() => setShowBanner(false)}
            className="ml-3 text-white hover:text-gray-200 text-xl"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}