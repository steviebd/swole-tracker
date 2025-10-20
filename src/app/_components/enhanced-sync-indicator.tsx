"use client";

import { useEffect, useRef, useState } from "react";

import { Toast, type ToastType } from "~/components/ui/toast";
import { useSyncIndicator } from "~/hooks/use-sync-indicator";
import { cn } from "~/lib/utils";

const toneContainer: Record<string, string> = {
  success: "bg-emerald-500/95 text-white",
  info: "bg-sky-500/95 text-white",
  warning: "bg-amber-500/95 text-black",
  danger: "bg-rose-500/95 text-white",
  default: "bg-slate-500/95 text-white",
};

const mutedText: Record<string, string> = {
  success: "text-emerald-100",
  info: "text-sky-100",
  warning: "text-amber-100",
  danger: "text-rose-100",
  default: "text-white/80",
};

function formatTimeAgo(timestamp?: number) {
  if (!timestamp) return "Never";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function EnhancedSyncIndicator() {
  const [showDetails, setShowDetails] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastProps, setToastProps] = useState<{
    type: ToastType;
    message: string;
  } | null>(null);
  const [manualSyncRequested, setManualSyncRequested] = useState(false);
  const previousBusyRef = useRef<boolean>(false);
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

  const handleToast = (type: ToastType, message: string) => {
    setToastProps({ type, message });
    setToastOpen(true);
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      handleToast("warning", "You're offline. We'll sync again once you're back online.");
      return;
    }
    if (!canManualSync && !isBusy) {
      handleToast("info", "All changes are already queued. We'll keep syncing automatically.");
      return;
    }
    setManualSyncRequested(true);
    try {
      await manualSync();
    } catch (error) {
      handleToast("error", "Manual sync couldn't start. Please try again.");
      setManualSyncRequested(false);
    }
  };

  useEffect(() => {
    if (manualSyncRequested) {
      const wasBusy = previousBusyRef.current;
      if (wasBusy && !isBusy) {
        const succeeded = failedOperations === 0 && pendingOperations === 0;
        handleToast(
          succeeded ? "success" : "warning",
          succeeded
            ? "Queue cleared. All workouts are synced."
            : "Sync ran but some items still need attention. We'll keep retrying.",
        );
        setManualSyncRequested(false);
      }
    }
    previousBusyRef.current = isBusy;
  }, [isBusy, failedOperations, pendingOperations, manualSyncRequested]);

  if (!isActive && status === "idle") {
    return null;
  }

  const toneKey = tone ?? "default";
  const containerTone = toneContainer[toneKey] ?? toneContainer.default;
  const mutedToneClass = mutedText[toneKey] ?? mutedText.default;
  const statusSummary = `Sync status ${status}. ${badgeText}. ${pendingOperations} pending, ${failedOperations} failed.`;

  return (
    <>
      <div className="fixed top-4 right-4 z-40 flex flex-col items-end gap-2">
        <div
          className={cn(
            "flex items-center gap-3 rounded-full px-4 py-2 shadow-lg backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
            containerTone,
          )}
        >
          <button
            type="button"
            onClick={() => setShowDetails((open) => !open)}
            className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide focus-visible:outline-none"
          >
            <span className="flex items-center gap-2">
              {(status === "syncing" || status === "saving") && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.25s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                </span>
              )}
              {status === "offline" && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
              )}
              {status === "error" && (
                <span className="flex h-2 w-2 items-center justify-center rounded-full bg-current text-[9px] font-bold">
                  !
                </span>
              )}
              {status === "idle" && (
                <span className="h-2 w-2 rounded-full bg-current" />
              )}
            </span>
            <span>{badgeText}</span>
          </button>

          {isOnline && canManualSync && (
            <button
              type="button"
              onClick={handleManualSync}
              className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {isBusy ? "Syncing…" : "Sync now"}
            </button>
          )}
        </div>

        {showDetails && (
          <div className="w-72 rounded-2xl border border-border/60 bg-surface-elevated p-4 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-content-primary">
                Sync status
              </p>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="text-content-muted hover:text-content-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Close sync details"
              >
                ×
              </button>
            </div>
            <div className="mt-3 space-y-2 text-xs text-content-secondary">
              <div className="flex justify-between">
                <span>Connection</span>
                <span className={isOnline ? "text-emerald-500" : "text-rose-500"}>
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pending operations</span>
                <span>{pendingOperations}</span>
              </div>
              <div className="flex justify-between">
                <span>Failed operations</span>
                <span className={failedOperations > 0 ? "text-rose-500" : ""}>
                  {failedOperations}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last sync</span>
                <span>{formatTimeAgo(lastSync)}</span>
              </div>
              {nextRetry && (
                <div className="flex justify-between">
                  <span>Next retry</span>
                  <span>{formatTimeAgo(nextRetry)}</span>
                </div>
              )}
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={!isOnline || (!canManualSync && !isBusy)}
                className="w-full rounded-full bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? "Syncing…" : isOnline ? "Sync now" : "Offline"}
              </button>
              <p className={cn("mt-2 text-[11px]", mutedToneClass)}>
                {isBusy
                  ? "Queue is syncing. You can close this while we finish."
                  : canManualSync
                    ? "Tap sync to flush the offline queue right away."
                    : "We're monitoring the queue and will retry automatically."}
              </p>
            </div>
          </div>
        )}

        <div className="sr-only" aria-live="polite">
          {statusSummary}
        </div>
      </div>

      <Toast
        open={toastOpen}
        type={toastProps?.type ?? "info"}
        message={toastProps?.message ?? ""}
        onClose={() => setToastOpen(false)}
      />
    </>
  );
}
