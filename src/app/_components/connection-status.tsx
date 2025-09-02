"use client";

import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, AlertTriangle } from "lucide-react";
import { useOnlineStatus } from "~/hooks/use-online-status";
import { useCacheInvalidation } from "~/hooks/use-cache-invalidation";

export function ConnectionStatus() {
  const { isOnline, connectionState, hasChecked } = useOnlineStatus();
  const { hasUnsynced, syncStatus } = useCacheInvalidation();

  // Don't show anything until we've checked the connection
  if (!hasChecked) {
    return null;
  }

  // Show different messages based on connection state
  const getStatusMessage = () => {
    if (isOnline) {
      if (hasUnsynced && syncStatus.queueLength > 0) {
        return {
          icon: <Wifi className="w-4 h-4" />,
          message: `Online - Syncing ${syncStatus.queueLength} changes...`,
          bgColor: 'var(--color-info)',
          textColor: 'var(--color-text)',
          showPulse: true
        };
      }
      return null; // Don't show when online and synced
    }

    return {
      icon: <WifiOff className="w-4 h-4" />,
      message: `You're offline. ${hasUnsynced ? `${syncStatus.queueLength} changes will sync when reconnected.` : 'Changes will sync when connection is restored.'}`,
      bgColor: 'var(--color-warning)',
      textColor: 'var(--color-text)',
      showPulse: true
    };
  };

  const status = getStatusMessage();

  if (!status) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed top-0 right-0 left-0 z-50 px-4 py-2 text-center text-sm shadow-sm backdrop-blur-sm"
        style={{
          backgroundColor: status.bgColor,
          color: status.textColor,
          borderBottom: '1px solid var(--color-border)'
        }}
      >
        <div className="container mx-auto">
          <span className="inline-flex items-center gap-2">
            {status.showPulse && (
              <div 
                className="h-2 w-2 animate-pulse rounded-full"
                style={{
                  backgroundColor: 'color-mix(in oklab, var(--color-text) 60%, transparent 40%)'
                }}
              />
            )}
            {status.icon}
            <span>{status.message}</span>
            {connectionState.effectiveType && connectionState.effectiveType !== '4g' && (
              <span className="text-xs opacity-75">
                ({connectionState.effectiveType.toUpperCase()})
              </span>
            )}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
