import { useMemo } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

import { useOfflineSaveQueue } from "~/hooks/use-offline-save-queue";
import { useOnlineStatus } from "~/hooks/use-online-status";

export type SyncStatusKind =
  | "idle"
  | "syncing"
  | "saving"
  | "offline"
  | "error";

export type SyncTone = "success" | "info" | "warning" | "danger";

interface SyncSnapshot {
  pendingOperations: number;
  failedOperations: number;
  lastSync?: number;
  nextRetry?: number;
}

const initialSnapshot: SyncSnapshot = {
  pendingOperations: 0,
  failedOperations: 0,
  lastSync: undefined,
  nextRetry: undefined,
};

export interface SyncIndicatorState extends SyncSnapshot {
  status: SyncStatusKind;
  isActive: boolean;
  tone: SyncTone;
  badgeText: string;
  description: string;
  isOnline: boolean;
  isBusy: boolean;
}

export interface UseSyncIndicatorResult extends SyncIndicatorState {
  manualSync: () => Promise<void>;
  canManualSync: boolean;
}

const toneByStatus: Record<SyncStatusKind, SyncTone> = {
  idle: "success",
  syncing: "info",
  saving: "info",
  offline: "warning",
  error: "danger",
};

const descriptionByStatus: Record<SyncStatusKind, string> = {
  idle: "All changes are synced and ready.",
  syncing: "Syncing queued updates with the server.",
  saving: "Saving updates locally before syncing.",
  offline: "You're offline. We'll queue updates until you're back online.",
  error: "Some updates need attention. Retry sync when you're ready.",
};

export function useSyncIndicator(): UseSyncIndicatorResult {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isOnline = useOnlineStatus();
  const { queueSize, status: queueStatus, lastError, flush, isFlushing } = useOfflineSaveQueue();

  const computedStatus = useMemo(() => {
    let status: SyncStatusKind = "idle";
    let isActive = false;

    if (!isOnline) {
      status = "offline";
      isActive = true;
    } else if (isMutating > 0) {
      status = "saving";
      isActive = true;
    } else if (isFlushing || (isFetching > 0 && queueSize > 0)) {
      status = "syncing";
      isActive = true;
    } else if (lastError || queueSize > 0) {
      status = lastError ? "error" : "syncing";
      isActive = true;
    }

    return { status, isActive };
  }, [isOnline, isMutating, isFetching, queueSize, isFlushing, lastError]);

  const badgeText = useMemo(() => {
    const { status } = computedStatus;
    switch (status) {
      case "offline":
        return queueSize > 0 ? `Offline (${queueSize})` : "Offline";
      case "error":
        return queueSize > 0 ? `${queueSize} to retry` : "Needs attention";
      case "saving":
        return "Saving...";
      case "syncing":
        return queueSize > 0 ? `Syncing (${queueSize})` : "Syncing...";
      default:
        return "All synced";
    }
  }, [computedStatus, queueSize]);

  const canManualSync = useMemo(() => {
    if (!isOnline) return false;
    return !["syncing", "saving"].includes(computedStatus.status) && queueSize > 0;
  }, [computedStatus.status, isOnline, queueSize]);

  const status: SyncIndicatorState = {
    status: computedStatus.status,
    isActive: computedStatus.isActive,
    tone: toneByStatus[computedStatus.status],
    badgeText,
    description: descriptionByStatus[computedStatus.status],
    pendingOperations: queueSize,
    failedOperations: lastError ? 1 : 0, // Simplified: 1 if there's an error, 0 otherwise
    lastSync: undefined, // Not tracking this in legacy queue
    nextRetry: undefined, // Not tracking this in legacy queue
    isOnline,
    isBusy: ["syncing", "saving"].includes(computedStatus.status),
  };

  return {
    ...status,
    manualSync: flush,
    canManualSync,
  };
}

    return { status, isActive };
  }, [
    isOnline,
    isMutating,
    isFetching,
    snapshot.pendingOperations,
    snapshot.failedOperations,
  ]);

  const badgeText = useMemo(() => {
    const { status } = computedStatus;
    switch (status) {
      case "offline":
        return snapshot.pendingOperations > 0
          ? `Offline (${snapshot.pendingOperations})`
          : "Offline";
      case "error":
        return snapshot.failedOperations > 0
          ? `${snapshot.failedOperations} to retry`
          : "Needs attention";
      case "saving":
        return "Saving...";
      case "syncing":
        return snapshot.pendingOperations > 0
          ? `Syncing (${snapshot.pendingOperations})`
          : "Syncing...";
      default:
        return "All synced";
    }
  }, [computedStatus, snapshot.pendingOperations, snapshot.failedOperations]);

  const manualSync = useCallback(async () => {
    if (!isOnline) return;
    // TODO: Update to use legacy queue in Phase 3
    // await triggerManualSync();
  }, [isOnline]);

  const canManualSync = useMemo(() => {
    if (!isOnline) return false;
    return !["syncing", "saving"].includes(computedStatus.status);
  }, [computedStatus.status, isOnline]);

  const status: SyncIndicatorState = {
    status: computedStatus.status,
    isActive: computedStatus.isActive,
    tone: toneByStatus[computedStatus.status],
    badgeText,
    description: descriptionByStatus[computedStatus.status],
    pendingOperations: snapshot.pendingOperations,
    failedOperations: snapshot.failedOperations,
    lastSync: snapshot.lastSync,
    nextRetry: snapshot.nextRetry,
    isOnline,
    isBusy: ["syncing", "saving"].includes(computedStatus.status),
  };

  return {
    ...status,
    manualSync,
    canManualSync,
  };
}
