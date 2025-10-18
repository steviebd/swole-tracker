"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
} from "lucide-react";
import {
  AnimatePresence,
  m as motion,
  useReducedMotion,
} from "framer-motion";

import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { analytics } from "~/lib/analytics";
import { getReadinessSummary, type ReadinessTone } from "~/lib/readiness";
import { cn } from "~/lib/utils";
import { useAuth } from "~/providers/AuthProvider";
import { api } from "~/trpc/react";
import type { HealthAdviceResponse } from "~/server/api/schemas/health-advice";

const toneAccent: Record<ReadinessTone, string> = {
  success: "text-emerald-200",
  info: "text-sky-200",
  warning: "text-amber-200",
  danger: "text-rose-200",
};

const toneBorder: Record<ReadinessTone, string> = {
  success: "border-emerald-400/40",
  info: "border-sky-400/40",
  warning: "border-amber-400/40",
  danger: "border-rose-400/40",
};

const deltaChipTone = {
  positive: "bg-emerald-500/20 text-emerald-100",
  negative: "bg-rose-500/20 text-rose-100",
  neutral: "bg-white/15 text-white/80",
} as const;

interface TipCard {
  id: string;
  label: string;
  body: string;
}

function formatScore(score: number | null | undefined) {
  if (score == null || Number.isNaN(score)) return "--";
  return `${Math.round(score * 100)}`;
}

function formatRelativeTimestamp(value?: Date | string) {
  if (!value) return "never";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatFlag(flag: string) {
  return flag.replace(/_/g, " ");
}

function parseAdviceResponse(
  raw: unknown,
): HealthAdviceResponse | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as HealthAdviceResponse;
    } catch {
      return undefined;
    }
  }
  return raw as HealthAdviceResponse;
}

function buildStrengthCopy(
  tone: ReadinessTone,
  readinessPercent: number | null,
  predictedChance: number | null,
) {
  const chance = predictedChance != null
    ? Math.round(predictedChance * 100)
    : null;

  switch (tone) {
    case "success":
      return {
        headline: "Primed for heavy work",
        support:
          chance != null
            ? `You're ${chance}% likely to beat last session. Chase a controlled top set and micro PR.`
            : "Push aggressive top sets at RPE 8-9 and add back-off volume if it moves well.",
      };
    case "info":
      return {
        headline: "Solid platform today",
        support:
          chance != null
            ? `Hold the plan—there's a ${chance}% shot to outpace last effort.`
            : "Stay disciplined on your ramp sets and keep accessories crisp and purposeful.",
      };
    case "warning":
      return {
        headline: "Keep tension, trim fluff",
        support:
          "Extend your ramp-up, cap top sets near RPE 7.5, and let accessories do the work with intent.",
      };
    case "danger":
      return {
        headline: "Play it smart today",
        support:
          "Use primer sets, tempo reps, and mobility to groove positions. Save all-out loading for the rebound.",
      };
    default:
      return {
        headline: "Stay ready",
        support: "Sync your device or log a wellness check to unlock coaching cues.",
      };
  }
}

function buildStrengthTips({
  tone,
  readinessPercent,
  predictedChance,
  delta,
  flags,
}: {
  tone: ReadinessTone;
  readinessPercent: number | null;
  predictedChance: number | null;
  delta: number | null;
  flags: string[];
}): TipCard[] {
  const chance = predictedChance != null
    ? Math.round(predictedChance * 100)
    : null;
  const highReady = (readinessPercent ?? 0) >= 80;
  const mediumReady = (readinessPercent ?? 0) >= 60;
  const trendingDown = (delta ?? 0) < 0;
  const hasSleepFlag = flags.some((flag) => flag.includes("sleep"));
  const hasRecoveryFlag = flags.some((flag) =>
    flag.includes("recovery") || flag.includes("fatigue"),
  );

  const warmupBody = highReady
    ? "Prime the nervous system with explosive jumps or swings, then climb through 3-4 ramp sets before your top lift."
    : mediumReady
      ? "Layer in dynamic mobility and tempo ramp sets to groove positions before loading heavy."
      : "Dedicate 8-10 minutes to mobility, isometric holds, and lighter ramp sets before touching working weight.";

  const intensityBody = tone === "danger"
    ? "Cap top sets at RPE 7 and bias quality volume. Tempo and pauses keep stimulus high without digging the hole deeper."
    : tone === "warning"
      ? "Work to a confident RPE 7.5 top set, then ride controlled back-off volume. Trim junk accessories."
      : chance != null && chance >= 70
        ? "Take a confident top double or triple at RPE 8-9, then stack two crisp back-off sets to lock in wins."
        : "Hold the progression steady. Keep top sets honest and let accessories carry the overload.";

  const recoveryBody = hasSleepFlag
    ? "Prioritise post-session parasympathetic work—box breathing, light walk, and early lights-out to repay sleep debt."
    : hasRecoveryFlag || trendingDown
      ? "Log how today's session felt and extend recovery between heavy sets. Contrast showers or mobility flush can help."
      : "Log rep quality and mood after training so we can keep cues calibrated for tomorrow.";

  return [
    { id: "warmup", label: "Warm-up focus", body: warmupBody },
    { id: "intensity", label: "Suggested intensity", body: intensityBody },
    { id: "recovery", label: "Recovery priority", body: recoveryBody },
  ];
}

export function ReadinessHighlight() {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [activeTip, setActiveTip] = useState(0);
  const [tipsVisible, setTipsVisible] = useState(true);
  const [selectedEntryIndex, setSelectedEntryIndex] = useState(0);
  const swipeStartRef = useRef<number | null>(null);

  const { data, isLoading } = api.healthAdvice.getHistory.useQuery(
    { limit: 7 },
    { enabled: Boolean(user) },
  );

  const latestAdvice = data?.[0];
  const previousAdvice = data?.[1];

  const response = parseAdviceResponse(latestAdvice?.response);
  const readinessScore = latestAdvice?.readiness_rho
    ? Number(latestAdvice.readiness_rho)
    : response?.readiness?.rho ?? null;
  const readinessPercent = readinessScore != null
    ? Math.round(readinessScore * 100)
    : null;

  const previousResponse = parseAdviceResponse(previousAdvice?.response);
  const previousScore = previousAdvice?.readiness_rho
    ? Number(previousAdvice.readiness_rho)
    : previousResponse?.readiness?.rho ?? null;

  const readinessDelta =
    readinessScore != null && previousScore != null
      ? Math.round((readinessScore - previousScore) * 100)
      : null;

  const predictedChance = response?.session_predicted_chance ?? null;

  const rawFlags = response?.readiness?.flags;
  const flags = useMemo(
    () =>
      Array.isArray(rawFlags)
        ? (rawFlags as string[]).slice(0, 3)
        : [],
    [rawFlags],
  );

  const summary = useMemo(
    () => getReadinessSummary(readinessScore),
    [readinessScore],
  );

  const strengthCopy = useMemo(
    () => buildStrengthCopy(summary.tone, readinessPercent, predictedChance),
    [summary.tone, readinessPercent, predictedChance],
  );

  const tipDeck = useMemo(
    () =>
      buildStrengthTips({
        tone: summary.tone,
        readinessPercent,
        predictedChance,
        delta: readinessDelta,
        flags,
      }),
    [summary.tone, readinessPercent, predictedChance, readinessDelta, flags],
  );

  useEffect(() => {
    setActiveTip(0);
  }, [tipDeck]);

  const timelineEntries = useMemo(() => {
    if (!data?.length) return [];
    return [...data]
      .reverse()
      .map((entry, index) => {
        const parsed = parseAdviceResponse(entry.response);
        const readiness =
          entry?.readiness_rho != null
            ? Number(entry.readiness_rho)
            : parsed?.readiness?.rho ?? null;
        return {
          id: entry.id ?? entry.sessionId ?? index,
          sessionId: entry.sessionId ?? null,
          date: entry.createdAt ? new Date(entry.createdAt) : null,
          readinessPercent:
            readiness != null ? Math.round(readiness * 100) : null,
          summary: parsed?.summary ?? null,
        };
      })
      .filter((entry) => entry.readinessPercent != null);
  }, [data]);

  useEffect(() => {
    if (!timelineEntries.length) {
      setSelectedEntryIndex(0);
      return;
    }
    setSelectedEntryIndex(timelineEntries.length - 1);
  }, [timelineEntries.length]);

  const sparklineData = useMemo(() => {
    if (!timelineEntries.length) return null;
    const values = timelineEntries.map(
      (entry) => entry.readinessPercent ?? 0,
    );
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    const width = Math.max((timelineEntries.length - 1) * 32 + 16, 64);
    const height = 56;
    const coords = timelineEntries.map((entry, index) => {
      const x =
        timelineEntries.length === 1
          ? width / 2
          : (index / (timelineEntries.length - 1)) * (width - 16) + 8;
      const value = entry.readinessPercent ?? min;
      const y = height - ((value - min) / range) * (height - 16) - 8;
      return { x, y, value };
    });
    const path = coords.map((point) => `${point.x},${point.y}`).join(" ");
    return { width, height, coords, path, min, max };
  }, [timelineEntries]);

  const clampedEntryIndex = Math.min(
    selectedEntryIndex,
    Math.max(timelineEntries.length - 1, 0),
  );
  const selectedEntry = timelineEntries[clampedEntryIndex];

  const changeTip = useCallback(
    (direction: 1 | -1, source: "button" | "swipe") => {
      if (tipDeck.length <= 1) return;
      setActiveTip((prev) => {
        const next = (prev + direction + tipDeck.length) % tipDeck.length;
        if (next !== prev && tipDeck[next]) {
          analytics.event("readiness_tip_opened", {
            tipId: tipDeck[next]!.id,
            tone: summary.tone,
            readinessScore: readinessPercent,
            source,
          });
        }
        return next;
      });
    },
    [tipDeck, summary.tone, readinessPercent],
  );

  const handleDismissTips = useCallback(() => {
    setTipsVisible(false);
    analytics.event("readiness_tip_dismissed", {
      tone: summary.tone,
      readinessScore: readinessPercent,
      tipId: tipDeck[activeTip]?.id ?? null,
    });
  }, [summary.tone, readinessPercent, tipDeck, activeTip]);

  const handleRestoreTips = useCallback(() => {
    setTipsVisible(true);
    analytics.event("readiness_tip_restored", {
      tone: summary.tone,
      readinessScore: readinessPercent,
    });
  }, [summary.tone, readinessPercent]);

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    swipeStartRef.current = event.clientX;
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      const start = swipeStartRef.current;
      swipeStartRef.current = null;
      if (start == null) return;
      const deltaX = event.clientX - start;
      if (Math.abs(deltaX) > 40) {
        changeTip(deltaX < 0 ? 1 : -1, "swipe");
      }
    },
    [changeTip],
  );

  const handleCta = useCallback(
    (action: "view_coaching" | "start_session") => {
      analytics.event("readiness_cta_click", {
        action,
        tone: summary.tone,
        readinessScore: readinessPercent,
        readinessDelta,
        tipId: tipDeck[activeTip]?.id ?? null,
      });
    },
    [summary.tone, readinessPercent, readinessDelta, tipDeck, activeTip],
  );

  if (!user) return null;

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden border border-border/40 bg-card/85 p-6 shadow-sm">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-3/5" />
        <div className="mt-5 space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-9 w-2/5" />
        </div>
      </Card>
    );
  }

  const ToneIcon =
    summary.tone === "danger" || summary.tone === "warning"
      ? AlertTriangle
      : Activity;

  const lastSyncedLabel = formatRelativeTimestamp(latestAdvice?.createdAt);
  const deltaLabel =
    readinessDelta != null
      ? `${readinessDelta > 0 ? "+" : readinessDelta < 0 ? "" : ""}${readinessDelta}`
      : null;
  const deltaTone =
    readinessDelta == null
      ? "neutral"
      : readinessDelta > 0
        ? "positive"
        : readinessDelta < 0
          ? "negative"
          : "neutral";

  const readinessToneClass = toneAccent[summary.tone];

  return (
    <Card
      padding="lg"
      surface="card"
      className={cn(
        "relative overflow-hidden border text-white shadow-2xl",
        toneBorder[summary.tone],
      )}
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--md-ref-palette-tertiary-30) 80%, black 15%) 0%, color-mix(in oklab, var(--md-ref-palette-secondary-40) 80%, black 20%) 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/20 via-black/0 to-black/50" />
      <div className="relative flex flex-col gap-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-white/70">
            <Badge className="bg-white/15 px-3 py-1 text-white shadow-sm backdrop-blur">
              Readiness
            </Badge>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-white/80 shadow-sm backdrop-blur">
              <Clock3 className="h-3.5 w-3.5" aria-hidden />
              Last synced {lastSyncedLabel}
            </span>
            {deltaLabel ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium shadow-sm backdrop-blur",
                  deltaChipTone[deltaTone],
                )}
              >
                {deltaLabel} pts vs last sync
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full bg-white/10 shadow-sm backdrop-blur",
                    readinessToneClass,
                  )}
                >
                  <ToneIcon className="h-5 w-5" aria-hidden />
                </span>
                <h2 className="text-lg font-semibold sm:text-xl">
                  {strengthCopy.headline}
                </h2>
              </div>
              <p className="text-sm text-white/80 sm:max-w-xl">
                {strengthCopy.support}
              </p>
              {flags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide">
                  {flags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full bg-white/12 px-3 py-1 text-white/75 shadow-sm backdrop-blur-sm"
                    >
                      {formatFlag(flag)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white/12 px-5 py-4 text-right shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-white/70">
                Score
              </p>
              <p className="text-3xl font-semibold">
                {formatScore(readinessScore)}
                <span className="ml-1 text-sm text-white/70">/100</span>
              </p>
              {predictedChance != null && (
                <p className="mt-1 text-xs text-white/80">
                  {Math.round(predictedChance * 100)}% to beat last session
                </p>
              )}
            </div>
          </div>
        </header>

        <section
          className="rounded-2xl bg-white/10 p-4 shadow-inner backdrop-blur"
          onPointerDown={tipsVisible ? handlePointerDown : undefined}
          onPointerUp={tipsVisible ? handlePointerUp : undefined}
          onPointerLeave={() => {
            swipeStartRef.current = null;
          }}
          aria-label="Strength coaching tips"
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/70">
            <span>Strength coaching tips</span>
            <button
              type="button"
              onClick={tipsVisible ? handleDismissTips : handleRestoreTips}
              className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80 transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {tipsVisible ? "Hide tips" : "Show tips"}
            </button>
          </div>

          {tipsVisible ? (
            <>
              <div className="mt-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/70">
                <span>{tipDeck[activeTip]?.label}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => changeTip(-1, "button")}
                    className="rounded-full bg-white/15 p-1.5 text-white/80 transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label="Previous tip"
                    disabled={tipDeck.length <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <span>
                    {tipDeck.length > 0 ? activeTip + 1 : 0}/{tipDeck.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeTip(1, "button")}
                    className="rounded-full bg-white/15 p-1.5 text-white/80 transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label="Next tip"
                    disabled={tipDeck.length <= 1}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="mt-3 min-h-[72px]" aria-live="polite">
                {shouldReduceMotion ? (
                  <div className="text-sm text-white/90">
                    {tipDeck[activeTip]?.body ?? "No coaching tips yet."}
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tipDeck[activeTip]?.id ?? "empty-tip"}
                      initial={{ x: 24, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -24, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="text-sm text-white/90"
                    >
                      {tipDeck[activeTip]?.body ?? "No coaching tips yet."}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </>
          ) : (
            <div className="mt-3 flex flex-col gap-3 text-sm text-white/80">
              <p>Tips are hidden for now. Bring them back when you need a quick coaching cue.</p>
              <button
                type="button"
                onClick={handleRestoreTips}
                className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Show tips
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/70">
            <span>Readiness timeline</span>
            {timelineEntries.length > 0 && (
              <span>
                {clampedEntryIndex + 1}/{timelineEntries.length}
              </span>
            )}
          </div>

          {timelineEntries.length === 0 ? (
            <p className="mt-3 text-sm text-white/75">
              Connect Whoop or log readiness data to unlock your recovery timeline.
            </p>
          ) : (
            <>
              {sparklineData && (
                <svg
                  viewBox={`0 0 ${sparklineData.width} ${sparklineData.height}`}
                  className="mt-3 w-full"
                  preserveAspectRatio="none"
                >
                  <polyline
                    fill="none"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={sparklineData.path}
                  />
                  {sparklineData.coords.map((point, index) => {
                    const isActive = index === clampedEntryIndex;
                    return (
                      <circle
                        key={`spark-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={isActive ? 4.5 : 3}
                        fill={isActive ? "white" : "rgba(255,255,255,0.6)"}
                        stroke={isActive ? "rgba(0,0,0,0.25)" : "none"}
                      />
                    );
                  })}
                </svg>
              )}
              <input
                type="range"
                min={0}
                max={Math.max(timelineEntries.length - 1, 0)}
                step={1}
                value={clampedEntryIndex}
                onChange={(event) => {
                  const nextIndex = Number(event.target.value);
                  setSelectedEntryIndex(nextIndex);
                  const entry = timelineEntries[nextIndex];
                  if (entry) {
                    analytics.event("readiness_timeline_scrubbed", {
                      entryDate: entry.date?.toISOString() ?? null,
                      readinessScore: entry.readinessPercent,
                      tone: summary.tone,
                    });
                  }
                }}
                className="mt-3 w-full accent-white"
                aria-label="Scrub readiness timeline"
                disabled={timelineEntries.length <= 1}
              />
              <div className="mt-3 rounded-lg bg-white/12 p-3 text-sm text-white/85 shadow-sm backdrop-blur">
                <p className="font-semibold">
                  {selectedEntry?.date
                    ? selectedEntry.date.toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )
                    : "Unknown day"}
                  {" • "}
                  {selectedEntry?.readinessPercent ?? "--"}/
                  100
                </p>
                <p className="mt-1 text-white/80">
                  {selectedEntry?.summary ??
                    "No coaching summary recorded for this entry."}
                </p>
              </div>
              <div className="sr-only" aria-live="polite">
                {selectedEntry?.date
                  ? `Selected readiness for ${
                      selectedEntry.date.toLocaleDateString()
                    } is ${
                      selectedEntry.readinessPercent ?? "unknown"
                    } out of 100.`
                  : "No readiness data selected."}
              </div>
            </>
          )}
        </section>

        <footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-sm text-white/80">
            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 shadow-sm">
              <Dumbbell className="h-3.5 w-3.5" aria-hidden />
            </span>
            <p>{summary.message}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/progress"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              onClick={() => handleCta("view_coaching")}
            >
              View coaching
            </Link>
            <Link
              href="/workout/start"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black shadow-md transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              onClick={() => handleCta("start_session")}
            >
              Start session
            </Link>
          </div>
        </footer>
      </div>
    </Card>
  );
}
