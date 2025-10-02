"use client";

import { useState } from "react";

import { useSyncIndicator } from "~/hooks/use-sync-indicator";

export function EnhancedSyncIndicator() {
  const [showDetails, setShowDetails] = useState(false);
  const {
    status,
    badgeText,
    tone,
    isActive,
    isOnline,
    isBusy,
    pendingOperations,
    failedOperations,
    lastSync,
    nextRetry,
    manualSync,
    canManualSync,
  } = useSyncIndicator();

  const getStatusColor = () => {
    switch (tone) {
      case 'warning':
        return 'bg-orange-500';
      case 'danger':
        return 'bg-red-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-green-500';
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

  if (!isActive && status === 'idle') {
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
          {(status === 'syncing' || status === 'saving') && (
            <div className="flex space-x-1">
              <div className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.3s]"></div>
              <div className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.15s]"></div>
              <div className="h-1 w-1 animate-bounce rounded-full bg-current"></div>
            </div>
          )}
          
          {status === 'offline' && (
            <div className="h-2 w-2 animate-pulse rounded-full bg-current"></div>
          )}
          
          {status === 'error' && (
            <div className="h-2 w-2 rounded-full bg-current flex items-center justify-center text-xs">!</div>
          )}
          
          {status === 'idle' && (
            <div className="h-2 w-2 rounded-full bg-current"></div>
          )}
        </div>

        <span className="text-xs">{badgeText}</span>

        {/* Manual sync button for failed operations */}
        {failedOperations > 0 && isOnline && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              void manualSync();
            }}
            className="ml-1 text-xs underline hover:no-underline"
          >
            Retry
          </button>
        )}
      </div>

      {/* Detailed status panel */}
      {showDetails && (
        <div className="absolute top-12 right-0 w-64 rounded-lg bg-card shadow-xl border border-border p-4 text-sm">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Sync Status</span>
              <button
                onClick={() => setShowDetails(false)}
                className="text-content-muted hover:text-content-secondary"
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
                <span>{pendingOperations}</span>
              </div>

              <div className="flex justify-between">
                <span>Failed operations:</span>
                <span className={failedOperations > 0 ? 'text-red-600' : ''}>
                  {failedOperations}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Last sync:</span>
                <span>{formatTimeAgo(lastSync)}</span>
              </div>

              {nextRetry && (
                <div className="flex justify-between">
                  <span>Next retry:</span>
                  <span>{formatTimeAgo(nextRetry)}</span>
                </div>
              )}
            </div>

            {/* Manual sync button */}
            {isOnline && (
              <button
                onClick={() => void manualSync()}
                disabled={!canManualSync}
                className="w-full px-3 py-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
              >
                {isBusy ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
