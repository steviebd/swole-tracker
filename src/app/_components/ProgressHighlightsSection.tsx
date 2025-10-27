"use client";

import { useCallback, useEffect, useState } from "react";

import { buttonVariants } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { formatTimeRangeLabel } from "~/lib/time-range";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useProgressRange } from "~/contexts/progress-range-context";
import { analytics } from "~/lib/analytics";

type HighlightTab = "prs" | "milestones" | "streaks";

const TAB_CONFIG: Record<HighlightTab, { label: string; emoji: string }> = {
  prs: { label: "PRs", emoji: "🏆" },
  milestones: { label: "Milestones", emoji: "📈" },
  streaks: { label: "Streaks", emoji: "🔥" },
};

export function ProgressHighlightsSection() {
  const [activeTab, setActiveTab] = useState<HighlightTab>("prs");
  const [showModal, setShowModal] = useState(false);
  const {
    range: timeRange,
    reset: resetOverviewRange,
    defaultValue: defaultOverviewRange,
  } = useProgressRange("overview");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tab = parseTabFromHash(window.location.hash);
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleHash = () => {
      const tab = parseTabFromHash(window.location.hash);
      if (tab) {
        setActiveTab(tab);
      }
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.hash = `highlights?tab=${activeTab}`;
    window.history.replaceState(null, "", url);
  }, [activeTab]);

  const { data, isLoading } = api.progress.getProgressHighlights.useQuery({
    tab: activeTab,
    timeRange,
  });

  // Track performance when data loads
  useEffect(() => {
    if (data && !isLoading) {
      const loadTime = performance.now();
      analytics.progressSectionLoad(
        "highlights",
        loadTime,
        data.cards?.length ?? 0,
      );
    }
  }, [data, isLoading]);

  const cards = data?.cards ?? [];
  const timeRangeLabel = formatTimeRangeLabel(timeRange);
  const previewCards = cards.slice(0, 4);
  const hasOverflow = cards.length > previewCards.length;
  const canReset = timeRange !== defaultOverviewRange;

  const handleTabChange = useCallback((tab: HighlightTab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="glass-surface border-border/60 space-y-6 rounded-2xl border p-6 shadow-sm">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">
            Highlights • {timeRangeLabel}
          </p>
          <h2 className="text-foreground text-2xl font-semibold">
            Progress Highlights
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-muted/40 flex gap-2 rounded-full p-1">
            {(Object.keys(TAB_CONFIG) as HighlightTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase transition",
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span aria-hidden>{TAB_CONFIG[tab].emoji}</span>
                {TAB_CONFIG[tab].label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => resetOverviewRange()}
            disabled={!canReset}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "rounded-full border border-transparent text-[10px] tracking-[0.25em] uppercase",
              canReset
                ? "text-muted-foreground hover:text-foreground"
                : "text-muted-foreground/60 cursor-not-allowed",
            )}
          >
            Reset
          </button>
        </div>
      </header>

      {isLoading ? (
        <HighlightsSkeleton />
      ) : data ? (
        <>
          {data.motivator && (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 shadow-inner",
                data.motivator.tone === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                  : data.motivator.tone === "warning"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100"
                    : data.motivator.tone === "danger"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-100"
                      : "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {data.motivator.emoji}
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-wide uppercase">
                    {data.motivator.title}
                  </p>
                  <p className="text-sm opacity-90">{data.motivator.message}</p>
                </div>
              </div>
            </div>
          )}

          {data.badges.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {data.badges.map((badge) => (
                <div
                  key={badge.id}
                  className={cn(
                    "rounded-xl border p-4",
                    badge.tone === "gold"
                      ? "border-yellow-500/50 bg-yellow-500/10"
                      : badge.tone === "silver"
                        ? "border-gray-400/50 bg-gray-400/10"
                        : "border-orange-500/50 bg-orange-500/10",
                  )}
                >
                  <p className="text-muted-foreground text-xs tracking-[0.25em] uppercase">
                    {badge.label}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xl font-bold",
                      badge.tone === "gold"
                        ? "text-yellow-900 dark:text-yellow-100"
                        : badge.tone === "silver"
                          ? "text-gray-900 dark:text-gray-100"
                          : "text-orange-900 dark:text-orange-100",
                    )}
                  >
                    {badge.value}
                  </p>
                  {badge.helper && (
                    <p
                      className={cn(
                        "text-xs",
                        badge.tone === "gold"
                          ? "text-yellow-800 dark:text-yellow-200"
                          : badge.tone === "silver"
                            ? "text-gray-800 dark:text-gray-200"
                            : "text-orange-800 dark:text-orange-200",
                      )}
                    >
                      {badge.helper}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            {cards.length === 0 ? (
              <div className="border-border/60 text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
                Log a few sessions to unlock highlights for this range.
              </div>
            ) : (
              <div className="border-border/60 bg-card/70 rounded-2xl border">
                <ul className="divide-border/60 divide-y">
                  {previewCards.map((card) => (
                    <HighlightListItem key={card.id} card={card} />
                  ))}
                </ul>
                {hasOverflow && (
                  <div className="from-card via-card/80 pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-2xl bg-gradient-to-t to-transparent" />
                )}
              </div>
            )}
          </div>

          {hasOverflow && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-muted-foreground hover:text-foreground",
                )}
              >
                View all
              </button>
            </div>
          )}

          <HighlightsModal
            open={showModal}
            onOpenChange={setShowModal}
            cards={cards}
            tab={activeTab}
          />
        </>
      ) : (
        <HighlightsSkeleton />
      )}
    </div>
  );
}

function HighlightListItem({
  card,
}: {
  card: {
    id: string;
    title: string;
    subtitle: string;
    detail?: string;
    meta?: string;
    icon?: string;
    tone?: "success" | "info" | "warning" | "danger";
  };
}) {
  const detailTone =
    card.tone === "success"
      ? "text-emerald-500"
      : card.tone === "info"
        ? "text-sky-500"
        : card.tone === "warning"
          ? "text-amber-500"
          : card.tone === "danger"
            ? "text-rose-500"
            : "text-muted-foreground";

  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <div className="bg-muted/60 flex h-10 w-10 items-center justify-center rounded-full text-lg">
        <span aria-hidden>{card.icon ?? "⭐"}</span>
      </div>
      <div className="flex-1">
        <p className="text-foreground text-sm font-semibold">{card.title}</p>
        <p className="text-muted-foreground text-sm">{card.subtitle}</p>
        {card.detail && (
          <p className={cn("text-xs", detailTone)}>{card.detail}</p>
        )}
      </div>
      {card.meta && (
        <p className="text-muted-foreground text-xs">
          {new Date(card.meta).toLocaleDateString()}
        </p>
      )}
    </li>
  );
}

function HighlightsModal({
  open,
  onOpenChange,
  cards,
  tab,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  cards: Array<{
    id: string;
    title: string;
    subtitle: string;
    detail?: string;
    meta?: string;
    icon?: string;
  }>;
  tab: HighlightTab;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>All {TAB_CONFIG[tab].label} Highlights</DialogTitle>
        </DialogHeader>
        {cards.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No highlights available yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {cards.map((card) => (
              <li
                key={card.id}
                className="border-border/60 bg-card/80 rounded-xl border p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-muted/60 flex h-10 w-10 items-center justify-center rounded-full text-lg">
                    <span aria-hidden>{card.icon ?? "⭐"}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground text-sm font-semibold">
                      {card.title}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {card.subtitle}
                    </p>
                    {card.detail && (
                      <p className="text-muted-foreground text-xs">
                        {card.detail}
                      </p>
                    )}
                  </div>
                  {card.meta && (
                    <p className="text-muted-foreground text-xs">
                      {new Date(card.meta).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HighlightsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Skeleton key={idx} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function parseTabFromHash(hash: string): HighlightTab | null {
  if (!hash.startsWith("#highlights")) return null;
  const query = hash.split("?")[1];
  if (!query) return null;
  const params = new URLSearchParams(query);
  const tab = params.get("tab");
  if (tab === "prs" || tab === "milestones" || tab === "streaks") {
    return tab;
  }
  return null;
}
