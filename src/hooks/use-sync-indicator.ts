import { useCallback, useEffect, useMemo, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

import { onSyncStatusChange, triggerManualSync } from "~/lib/offline-storage";
import { useOnlineStatus } from "~/hooks/use-online-status";

export type SyncStatusKind = "idle" | "syncing" | "saving" | "offline" | "error";

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
  const [snapshot, setSnapshot] = useState<SyncSnapshot>(initialSnapshot);
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const unsubscribe = onSyncStatusChange((status) => {
      if (!status) return;
      setSnapshot((prev) => ({
        pendingOperations: status.pendingOperations ?? prev.pendingOperations ?? 0,
        failedOperations: status.failedOperations ?? prev.failedOperations ?? 0,
        lastSync: status.lastSync ?? prev.lastSync,
        nextRetry: status.nextRetry ?? prev.nextRetry,
      }));
    });

    return unsubscribe;
  }, []);

  const computedStatus = useMemo(() => {
    let status: SyncStatusKind = "idle";
    let isActive = false;

    if (!isOnline) {
      status = "offline";
      isActive = true;
    } else if (isMutating > 0) {
      status = "saving";
      isActive = true;
    } else if (isFetching > 0 || snapshot.pendingOperations > 0) {
      status = "syncing";
      isActive = true;
    } else if (snapshot.failedOperations > 0) {
      status = "error";
      isActive = true;
    }

    return { status, isActive };
  }, [isOnline, isMutating, isFetching, snapshot.pendingOperations, snapshot.failedOperations]);

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
    await triggerManualSync();
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
