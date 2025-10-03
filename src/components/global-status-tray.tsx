"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCheck,
  Loader2,
  RefreshCcw,
  WifiOff,
} from "lucide-react";

import { OfflineWorkoutManager } from "~/app/_components/offline-workout-manager";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { useSyncIndicator } from "~/hooks/use-sync-indicator";
import { getReadinessSummary, type ReadinessTone } from "~/lib/readiness";
import { cn } from "~/lib/utils";
import { useAuth } from "~/providers/AuthProvider";
import { api } from "~/trpc/react";

const toneStyles: Record<ReadinessTone, string> = {
  success:
    "bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 border border-emerald-400/40",
  info: "bg-sky-500/10 text-sky-100 hover:bg-sky-500/20 border border-sky-400/40",
  warning:
    "bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 border border-amber-400/40",
  danger:
    "bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 border border-rose-400/40",
};

const iconByStatus = {
  idle: CheckCheck,
  syncing: RefreshCcw,
  saving: Loader2,
  offline: WifiOff,
  error: AlertTriangle,
} as const;
const toneAccent: Record<ReadinessTone, string> = {
  success: "text-emerald-300",
  info: "text-sky-300",
  warning: "text-amber-300",
  danger: "text-rose-300",
} as const;

function formatRelativeTime(value?: string | Date | number) {
  if (!value) return "never";
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "unknown";

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function GlobalStatusTray() {
  const { user } = useAuth();
  const sync = useSyncIndicator();

  const { data: adviceHistory, isLoading: readinessLoading } =
    api.healthAdvice.getHistory.useQuery(
      { limit: 1 },
      { enabled: Boolean(user) },
    );

  const latestAdvice = adviceHistory?.[0];
  const readinessScore = latestAdvice?.readiness_rho
    ? Number(latestAdvice.readiness_rho)
    : null;

  const readinessSummary = useMemo(
    () => getReadinessSummary(Number.isFinite(readinessScore) ? readinessScore : null),
    [readinessScore],
  );

  const ReadinessIcon = readinessScore != null && readinessScore >= 0.6 ? Activity : AlertTriangle;
  const StatusIcon = iconByStatus[sync.status];

  if (!user) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
            toneStyles[sync.tone],
          )}
          aria-label="Open sync and readiness status"
        >
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-75",
                sync.tone === "danger"
                  ? "bg-rose-400 animate-ping"
                  : sync.tone === "warning"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-sky-400 animate-ping",
                sync.isBusy ? "" : "animate-none",
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                sync.tone === "danger"
                  ? "bg-rose-300"
                  : sync.tone === "warning"
                  ? "bg-amber-300"
                  : sync.tone === "info"
                  ? "bg-sky-300"
                  : "bg-emerald-300",
              )}
            />
          </span>
          <StatusIcon className={cn("h-3.5 w-3.5", sync.status === "saving" && "animate-spin")}
            aria-hidden
          />
          <span>{sync.badgeText}</span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="h-[80vh] overflow-y-auto rounded-t-3xl bg-gradient-to-b from-background/80 via-background to-background/95 px-5 pb-10 pt-6 sm:left-1/2 sm:top-auto sm:max-w-md sm:-translate-x-1/2"
        aria-label="Sync and readiness status drawer"
      >
        <div className="mx-auto flex h-full max-w-xl flex-col gap-6">
          <header className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
              Session health
            </p>
            <h2 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-xl font-semibold text-transparent">
              Sync & Readiness
            </h2>
            <p className="text-sm text-muted-foreground">{sync.description}</p>
          </header>

          <section className="rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="border-border/50 text-xs uppercase tracking-wide">
                {sync.isOnline ? "Online" : "Offline"}
              </Badge>
              {sync.pendingOperations > 0 && (
                <Badge className="bg-sky-500/10 text-sky-200">
                  {sync.pendingOperations} pending
                </Badge>
              )}
              {sync.failedOperations > 0 && (
                <Badge className="bg-rose-500/15 text-rose-200">
                  {sync.failedOperations} retry
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Last sync {formatRelativeTime(sync.lastSync)}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => void sync.manualSync()}
                disabled={!sync.canManualSync}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {sync.isBusy ? (
                  <span className="flex items-center justify-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing
                  </span>
                ) : (
                  <span className="text-sm">Sync now</span>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-dashed border-border/60 text-sm"
                onClick={() => void sync.manualSync()}
                disabled={!sync.isOnline || sync.isBusy}
              >
                Refresh status
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                  Readiness snapshot
                </p>
                <div className="flex items-center gap-2">
                  <ReadinessIcon className={cn("h-4 w-4", toneAccent[readinessSummary.tone])} aria-hidden />
                  <h3 className={cn("text-base font-semibold", toneAccent[readinessSummary.tone])}>
                    {readinessSummary.label}
                  </h3>
                </div>
              </div>
              {readinessScore != null && (
                <div className="text-right">
                  <span className="text-2xl font-semibold text-foreground">
                    {(readinessScore * 100).toFixed(0)}
                  </span>
                  <span className="text-xs text-muted-foreground"> /100</span>
                </div>
              )}
            </header>

            <div className="mt-3 text-sm text-muted-foreground">
              {readinessLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ) : (
                <>
                  <p>{readinessSummary.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground/80">
                    Updated {formatRelativeTime(latestAdvice?.createdAt)}
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur">
            <header className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                  Offline queue
                </p>
                <h3 className="text-base font-semibold text-foreground">
                  Pending sessions
                </h3>
              </div>
              {!sync.isOnline && (
                <Badge className="bg-amber-500/20 text-amber-200">Offline</Badge>
              )}
            </header>
            <OfflineWorkoutManager />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
