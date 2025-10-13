"use client";

import Link from "next/link";
import { Activity, AlertTriangle, Flame, Sparkles } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { getReadinessSummary } from "~/lib/readiness";
import { cn } from "~/lib/utils";
import { useAuth } from "~/providers/AuthProvider";
import { api } from "~/trpc/react";
import type { HealthAdviceResponse } from "~/server/api/schemas/health-advice";

const toneBorder: Record<string, string> = {
  success: "border-emerald-400/50",
  info: "border-sky-400/50",
  warning: "border-amber-400/40",
  danger: "border-rose-400/50",
};

const toneBackground: Record<string, string> = {
  success: "bg-emerald-500/10",
  info: "bg-sky-500/10",
  warning: "bg-amber-500/10",
  danger: "bg-rose-500/10",
};

const toneText: Record<string, string> = {
  success: "text-emerald-200",
  info: "text-sky-200",
  warning: "text-amber-200",
  danger: "text-rose-200",
};

function formatScore(score: number | null | undefined) {
  if (score == null || Number.isNaN(score)) return "--";
  return `${Math.round(score * 100)}`;
}

export function ReadinessHighlight() {
  const { user } = useAuth();
  const { data, isLoading } = api.healthAdvice.getHistory.useQuery(
    { limit: 1 },
    { enabled: Boolean(user) },
  );

  if (!user) return null;

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden border border-border/40 bg-card/80 p-5 shadow-sm">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-4/6" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </Card>
    );
  }

  const latestAdvice = data?.[0];
  const response = latestAdvice?.response as HealthAdviceResponse | undefined;
  const readinessScore = latestAdvice?.readiness_rho
    ? Number(latestAdvice.readiness_rho)
    : response?.readiness?.rho ?? null;

  const summary = getReadinessSummary(
    Number.isFinite(readinessScore) ? readinessScore : null,
  );

  const headline = response?.summary ?? "Get personalised coaching based on your recovery.";
  const flags = Array.isArray(response?.readiness?.flags)
    ? (response?.readiness?.flags as string[]).slice(0, 3)
    : [];
  const predictedChance = response?.session_predicted_chance ?? null;

  return (
    <Card
      className={cn(
        "glass-card glass-hairline relative flex flex-col gap-4 overflow-hidden border border-white/10 bg-card/90 p-5 shadow-xl transition-shadow",
        toneBorder[summary.tone],
      )}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className={cn("absolute inset-0 blur-3xl", toneBackground[summary.tone])} />
      </div>
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            className={cn(
              "flex items-center gap-1 border-transparent bg-white/10 text-xs font-semibold uppercase tracking-wide",
              toneBackground[summary.tone],
              toneText[summary.tone],
            )}
          >
            <Activity className="h-3.5 w-3.5" aria-hidden />
            Readiness
          </Badge>
          <p className="text-xs text-muted-foreground">Updated {new Date(latestAdvice?.createdAt ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              {summary.tone === "danger" || summary.tone === "warning" ? (
                <AlertTriangle className={cn("h-5 w-5", toneText[summary.tone])} aria-hidden />
              ) : (
                <Sparkles className={cn("h-5 w-5", toneText[summary.tone])} aria-hidden />
              )}
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                {summary.label}
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground sm:max-w-xl">{headline}</p>
          </div>
          <div className="flex flex-col items-end justify-center text-right">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Score
            </span>
            <span className="text-3xl font-semibold text-foreground">
              {formatScore(readinessScore)}
              <span className="ml-1 text-base text-muted-foreground">/100</span>
            </span>
            {predictedChance != null && (
              <span className="mt-1 text-xs text-muted-foreground">
                {Math.round(predictedChance * 100)}% chance to beat last session
              </span>
            )}
          </div>
        </div>

        {flags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {flags.map((flag) => (
              <Badge key={flag} variant="secondary" className="bg-white/10 text-xs uppercase tracking-wide">
                {flag.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {summary.message}
          </p>
          <div className="flex gap-2">
            <Link
              href="/progress"
              className="inline-flex items-center gap-2 rounded-full border border-border/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:border-primary/40 hover:text-primary"
            >
              <Flame className="h-3.5 w-3.5" aria-hidden />
              View coaching
            </Link>
            <Link
              href="/workout/start"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Start session
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
