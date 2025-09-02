"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Signal
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { useBackgroundSync, useSyncConflicts } from "~/hooks/use-background-sync";
import { useCacheInvalidation } from "~/hooks/use-cache-invalidation";
import { toast } from "sonner";

interface SyncIndicatorProps {
  className?: string;
  compact?: boolean;
}

export function EnhancedSyncIndicator({ className, compact = true }: SyncIndicatorProps) {
  const { syncNow, syncStatus, connectionState, isActive } = useBackgroundSync();
  const { conflicts, hasConflicts } = useSyncConflicts();
  const { hasUnsynced } = useCacheInvalidation();
  const [lastSyncText, setLastSyncText] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  // Update last sync text
  useEffect(() => {
    if (syncStatus.lastSync) {
      const updateLastSyncText = () => {
        const now = Date.now();
        const diff = now - syncStatus.lastSync!;
        
        if (diff < 60000) {
          setLastSyncText('Just now');
        } else if (diff < 3600000) {
          setLastSyncText(`${Math.floor(diff / 60000)}m ago`);
        } else {
          setLastSyncText(`${Math.floor(diff / 3600000)}h ago`);
        }
      };
      
      updateLastSyncText();
      const interval = setInterval(updateLastSyncText, 30000); // Update every 30s
      return () => clearInterval(interval);
    } else {
      setLastSyncText('Never');
    }
  }, [syncStatus.lastSync]);

  // Get connection quality indicator
  const getConnectionIcon = () => {
    if (!connectionState.isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    
    switch (connectionState.effectiveType) {
      case '4g':
        return <Signal className="w-4 h-4 text-green-500" />;
      case '3g':
        return <Signal className="w-4 h-4 text-yellow-500" />;
      case '2g':
      case 'slow-2g':
        return <Signal className="w-4 h-4 text-orange-500" />;
      default:
        return <Wifi className="w-4 h-4 text-blue-500" />;
    }
  };

  // Get sync status indicator
  const getSyncStatusIndicator = () => {
    if (syncStatus.error) {
      return {
        icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
        color: 'text-red-500',
        text: 'Sync Error'
      };
    }
    
    if (syncStatus.isActive) {
      return {
        icon: <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />,
        color: 'text-blue-500',
        text: 'Syncing...'
      };
    }
    
    if (hasUnsynced) {
      return {
        icon: <Clock className="w-4 h-4 text-yellow-500" />,
        color: 'text-yellow-500',
        text: `${syncStatus.queueLength} pending`
      };
    }
    
    return {
      icon: <CheckCircle className="w-4 h-4 text-green-500" />,
      color: 'text-green-500',
      text: 'Up to date'
    };
  };

  const syncIndicator = getSyncStatusIndicator();
  
  // Don't show if everything is synced and online (unless forced to show)
  if (!hasUnsynced && !syncStatus.isActive && connectionState.isOnline && !hasConflicts && compact) {
    return null;
  }

  const handleManualSync = async () => {
    try {
      await syncNow();
      toast.success('Sync completed');
    } catch (error) {
      toast.error('Sync failed');
    }
  };

  if (compact) {
    return (
      <div className="relative">
        <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 relative",
              hasConflicts && "text-red-500",
              className
            )}
          >
            <div className="flex items-center gap-1">
              {getConnectionIcon()}
              {syncIndicator.icon}
              {hasConflicts && (
                <Badge variant="destructive" className="h-4 w-4 p-0 text-xs">!</Badge>
              )}
            </div>
          </Button>
        
        {/* Simple dropdown panel */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            <SyncStatusPanel
              syncStatus={syncStatus}
              connectionState={connectionState}
              syncIndicator={syncIndicator}
              lastSyncText={lastSyncText}
              hasUnsynced={hasUnsynced}
              hasConflicts={hasConflicts}
              conflicts={conflicts}
              onManualSync={handleManualSync}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 p-2 rounded-lg border bg-card", className)}>
      <SyncStatusPanel
        syncStatus={syncStatus}
        connectionState={connectionState}
        syncIndicator={syncIndicator}
        lastSyncText={lastSyncText}
        hasUnsynced={hasUnsynced}
        hasConflicts={hasConflicts}
        conflicts={conflicts}
        onManualSync={handleManualSync}
        compact={false}
      />
    </div>
  );
}

// Internal component for sync status panel
interface SyncStatusPanelProps {
  syncStatus: any;
  connectionState: any;
  syncIndicator: any;
  lastSyncText: string;
  hasUnsynced: boolean;
  hasConflicts: boolean;
  conflicts: any[];
  onManualSync: () => void;
  compact?: boolean;
}

function SyncStatusPanel({
  syncStatus,
  connectionState,
  syncIndicator,
  lastSyncText,
  hasUnsynced,
  hasConflicts,
  conflicts,
  onManualSync,
  compact = true
}: SyncStatusPanelProps) {
  const formatConnectionType = (type: string) => {
    switch (type) {
      case 'wifi':
        return 'Wi-Fi';
      case 'cellular':
        return 'Cellular';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {syncIndicator.icon}
          <span className={cn("text-sm font-medium", syncIndicator.color)}>
            {syncIndicator.text}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onManualSync}
          disabled={syncStatus.isActive || !connectionState.isOnline}
        >
          <RefreshCw className={cn("w-3 h-3 mr-1", syncStatus.isActive && "animate-spin")} />
          Sync
        </Button>
      </div>

      {/* Progress bar for active sync */}
      <AnimatePresence>
        {syncStatus.isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Progress value={syncStatus.progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {syncStatus.progress}% complete
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection status */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Connection:</span>
        <div className="flex items-center gap-1">
          {connectionState.isOnline ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>{formatConnectionType(connectionState.networkType)}</span>
              <span className="text-muted-foreground">({connectionState.effectiveType})</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Sync details */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Last sync:</span>
          <span>{lastSyncText}</span>
        </div>
        
        {hasUnsynced && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pending:</span>
            <Badge variant="secondary">{syncStatus.queueLength}</Badge>
          </div>
        )}
        
        {syncStatus.nextRetry && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Next retry:</span>
            <span>{new Date(syncStatus.nextRetry).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Conflicts warning */}
      <AnimatePresence>
        {hasConflicts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-2 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800"
          >
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-red-700 dark:text-red-300 font-medium">
                {conflicts.length} sync conflict{conflicts.length !== 1 ? 's' : ''} detected
              </span>
            </div>
            <Button variant="link" size="sm" className="h-auto p-0 text-red-600 hover:text-red-700">
              Resolve conflicts
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {syncStatus.error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-2 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800"
          >
            <p className="text-sm text-red-700 dark:text-red-300">
              {syncStatus.error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}