"use client";

import { useCallback, useRef } from "react";
import { RefreshCcw, WifiOff } from "lucide-react";

import { useSyncIndicator } from "~/hooks/use-sync-indicator";
import { cn } from "~/lib/utils";

export function PreferencesStatusBar() {
  const {
    badgeText,
    status,
    tone,
    isOnline,
    isBusy,
    canManualSync,
    manualSync,
    failedOperations,
    pendingOperations,
  } = useSyncIndicator();
  const lastManualRef = useRef(0);

  const showSyncButton =
    !isOnline || canManualSync || failedOperations > 0 || pendingOperations > 0;

  const handleManualSync = useCallback(async () => {
    const now = Date.now();
    if (now - lastManualRef.current < 1500) return;
    lastManualRef.current = now;
    if (!isOnline || !canManualSync) return;
    await manualSync();
  }, [isOnline, canManualSync, manualSync]);

  const iconTone =
    tone === "danger"
      ? "text-rose-400"
      : tone === "warning"
        ? "text-amber-400"
        : tone === "info"
          ? "text-sky-300"
          : "text-emerald-300";

  return (
    <div className="w-full border-b border-border/60 bg-surface-secondary/80 backdrop-blur">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-2">
        <span className="text-sm font-medium text-content-primary">
          Preferences
        </span>
        <div className="flex items-center gap-3 text-xs text-content-secondary">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-border/50 px-3 py-1 font-semibold uppercase tracking-wide",
              iconTone,
            )}
          >
            <span className="flex h-2 w-2 items-center justify-center">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  status === "error"
                    ? "bg-rose-400"
                    : status === "offline"
                      ? "bg-amber-400"
                      : status === "syncing" || status === "saving"
                        ? "bg-sky-300 animate-pulse"
                        : "bg-emerald-300",
                )}
              />
            </span>
            {badgeText}
          </span>
          {showSyncButton && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={!isOnline || (!canManualSync && !isBusy)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isOnline
                  ? "bg-white/10 text-content-primary hover:bg-white/15"
                  : "bg-white/5 text-content-secondary",
                (!isOnline || (!canManualSync && !isBusy)) &&
                  "cursor-not-allowed opacity-60",
              )}
              aria-label={isOnline ? "Sync now" : "Offline. Sync unavailable"}
            >
              {isOnline ? (
                <RefreshCcw
                  className={cn(
                    "h-3.5 w-3.5",
                    isBusy && "animate-spin",
                    iconTone,
                  )}
                  aria-hidden
                />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-amber-300" aria-hidden />
              )}
              {isOnline ? (isBusy ? "Syncing…" : "Sync now") : "Offline"}
            </button>
          )}
        </div>
        <div className="sr-only" aria-live="polite">
          Sync status {status}. {badgeText}. Pending {pendingOperations}. Failed{" "}
          {failedOperations}.
        </div>
      </div>
    </div>
  );
}

