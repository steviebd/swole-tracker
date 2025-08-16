"use client";

import { useState, useEffect } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { onSyncStatusChange, triggerManualSync } from "~/lib/enhanced-offline-storage";
import { useOnlineStatus } from "~/hooks/use-online-status";

type SyncIndicatorState = {
  isActive: boolean;
  status: 'syncing' | 'saving' | 'offline' | 'idle' | 'error';
  pendingOperations: number;
  failedOperations: number;
  lastSync?: number;
  nextRetry?: number;
};

export function EnhancedSyncIndicator() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isOnline = useOnlineStatus();
  
  const [syncState, setSyncState] = useState<SyncIndicatorState>({
    isActive: false,
    status: 'idle',
    pendingOperations: 0,
    failedOperations: 0,
  });

  const [showDetails, setShowDetails] = useState(false);

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = onSyncStatusChange((status) => {
      setSyncState(prev => ({
        ...prev,
        pendingOperations: status.pendingOperations || 0,
        failedOperations: status.failedOperations || 0,
        lastSync: status.lastSync,
        nextRetry: status.nextRetry,
      }));
    });

    return unsubscribe;
  }, []);

  // Update sync state based on React Query activity and network status
  useEffect(() => {
    let status: SyncIndicatorState['status'] = 'idle';
    let isActive = false;

    if (!isOnline) {
      status = 'offline';
      isActive = true;
    } else if (isMutating > 0) {
      status = 'saving';
      isActive = true;
    } else if (isFetching > 0 || syncState.pendingOperations > 0) {
      status = 'syncing';
      isActive = true;
    } else if (syncState.failedOperations > 0) {
      status = 'error';
      isActive = true;
    }

    setSyncState(prev => ({
      ...prev,
      isActive,
      status,
    }));
  }, [isFetching, isMutating, isOnline, syncState.pendingOperations, syncState.failedOperations]);

  const handleManualSync = async () => {
    if (!isOnline || syncState.status === 'syncing') return;
    await triggerManualSync();
  };

  const getStatusColor = () => {
    switch (syncState.status) {
      case 'offline':
        return 'bg-orange-500';
      case 'error':
        return 'bg-red-500';
      case 'saving':
      case 'syncing':
        return 'bg-blue-500';
      default:
        return 'bg-green-500';
    }
  };

  const getStatusText = () => {
    switch (syncState.status) {
      case 'offline':
        return `Offline${syncState.pendingOperations > 0 ? ` (${syncState.pendingOperations} pending)` : ''}`;
      case 'error':
        return `${syncState.failedOperations} failed`;
      case 'saving':
        return 'Saving...';
      case 'syncing':
        return 'Syncing...';
      default:
        return 'All synced';
    }
  };

  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (!syncState.isActive && syncState.status === 'idle') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-40">
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-background shadow-lg cursor-pointer transition-all ${getStatusColor()}`}
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Animated status indicator */}
        <div className="flex items-center gap-2">
          {(syncState.status === 'syncing' || syncState.status === 'saving') && (
            <div className="flex space-x-1">
              <div className="h-1 w-1 animate-bounce rounded-full bg-white [animation-delay:-0.3s]"></div>
              <div className="h-1 w-1 animate-bounce rounded-full bg-white [animation-delay:-0.15s]"></div>
              <div className="h-1 w-1 animate-bounce rounded-full bg-white"></div>
            </div>
          )}
          
          {syncState.status === 'offline' && (
            <div className="h-2 w-2 animate-pulse rounded-full bg-white"></div>
          )}
          
          {syncState.status === 'error' && (
            <div className="h-2 w-2 rounded-full bg-white">!</div>
          )}
          
          {syncState.status === 'idle' && (
            <div className="h-2 w-2 rounded-full bg-white"></div>
          )}
        </div>

        <span className="text-xs">{getStatusText()}</span>

        {/* Manual sync button for failed operations */}
        {syncState.failedOperations > 0 && isOnline && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleManualSync();
            }}
            className="ml-1 text-xs underline hover:no-underline"
          >
            Retry
          </button>
        )}
      </div>

      {/* Detailed status panel */}
      {showDetails && (
        <div className="absolute top-12 right-0 w-64 rounded-lg bg-white shadow-xl border border-gray-200 p-4 text-sm">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Sync Status</span>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Connection:</span>
                <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Pending operations:</span>
                <span>{syncState.pendingOperations}</span>
              </div>

              <div className="flex justify-between">
                <span>Failed operations:</span>
                <span className={syncState.failedOperations > 0 ? 'text-red-600' : ''}>
                  {syncState.failedOperations}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Last sync:</span>
                <span>{formatTimeAgo(syncState.lastSync)}</span>
              </div>

              {syncState.nextRetry && (
                <div className="flex justify-between">
                  <span>Next retry:</span>
                  <span>{formatTimeAgo(syncState.nextRetry)}</span>
                </div>
              )}
            </div>

            {/* Manual sync button */}
            {isOnline && (
              <button
                onClick={handleManualSync}
                disabled={syncState.status === 'syncing'}
                className="w-full px-3 py-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
              >
                {syncState.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}