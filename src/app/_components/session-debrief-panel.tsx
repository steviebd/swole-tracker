"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "~/trpc/react";
import {
  sessionDebriefContentSchema,
  type SessionDebriefContent,
} from "~/server/api/schemas/health-advice-debrief";
import { analytics } from "~/lib/analytics";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

interface SessionDebriefPanelProps {
  sessionId: number;
  templateName: string;
  sessionDate: string;
}

function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}

type ParsedDebrief = {
  record: any;
  content: SessionDebriefContent;
};

function mapRecords(records: Array<any>): ParsedDebrief[] {
  return records.map((record) => {
    const parsed = sessionDebriefContentSchema.safeParse({
      summary: record.summary,
      prHighlights: record.prHighlights ?? undefined,
      adherenceScore: record.adherenceScore ?? undefined,
      focusAreas: record.focusAreas ?? undefined,
      streakContext: record.streakContext ?? undefined,
      overloadDigest: record.overloadDigest ?? undefined,
      metadata: record.metadata ?? undefined,
    });

    const content = parsed.success
      ? parsed.data
      : {
          summary: record.summary ?? "",
          prHighlights: [],
          focusAreas: [],
          metadata: {},
        };

    return { record, content };
  });
}

function formatDate(dateIso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateIso));
  } catch {
    return dateIso;
  }
}

export function SessionDebriefPanel({
  sessionId,
  templateName,
  sessionDate,
}: SessionDebriefPanelProps) {
  const utils = api.useUtils();
  const isOnline = useOnlineStatus();
  const latestVersionTracked = useRef<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryKey = useMemo(
    () => ({ sessionId, includeInactive: false, limit: 10 }),
    [sessionId],
  );

  const { data, isLoading, refetch } =
    api.sessionDebriefs.listBySession.useQuery(queryKey);

  const parsed = useMemo(
    () => (data ? mapRecords(data) : []),
    [data],
  );

  const latest = parsed[0];

  const markViewed = api.sessionDebriefs.markViewed.useMutation({
    onMutate: async (variables) => {
      await utils.sessionDebriefs.listBySession.cancel(queryKey);
      const previous = utils.sessionDebriefs.listBySession.getData(queryKey);

      if (previous) {
        utils.sessionDebriefs.listBySession.setData(queryKey, (current) =>
          current?.map((record) =>
            record.id === (variables.debriefId ?? record.id)
              ? { ...record, viewedAt: new Date() }
              : record,
          ),
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        utils.sessionDebriefs.listBySession.setData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      void utils.sessionDebriefs.listBySession.invalidate(queryKey);
    },
  });

  const togglePinned = api.sessionDebriefs.togglePinned.useMutation({
    onMutate: async (variables) => {
      await utils.sessionDebriefs.listBySession.cancel(queryKey);
      setErrorMessage(null);
      const previous = utils.sessionDebriefs.listBySession.getData(queryKey);
      if (previous) {
        utils.sessionDebriefs.listBySession.setData(queryKey, (current) =>
          current?.map((record) =>
            record.id === (variables.debriefId ?? record.id)
              ? {
                  ...record,
                  pinnedAt: record.pinnedAt ? null : new Date(),
                }
              : record,
          ),
        );
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        utils.sessionDebriefs.listBySession.setData(queryKey, context.previous);
      }
      setErrorMessage(error.message ?? "Failed to update pin state.");
    },
    onSettled: () => {
      void utils.sessionDebriefs.listBySession.invalidate(queryKey);
    },
  });

  const dismiss = api.sessionDebriefs.dismiss.useMutation({
    onMutate: async (variables) => {
      await utils.sessionDebriefs.listBySession.cancel(queryKey);
      setErrorMessage(null);
      const previous = utils.sessionDebriefs.listBySession.getData(queryKey);
      if (previous) {
        utils.sessionDebriefs.listBySession.setData(queryKey, (current) =>
          current?.filter(
            (record) => record.id !== (variables.debriefId ?? record.id),
          ),
        );
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        utils.sessionDebriefs.listBySession.setData(queryKey, context.previous);
      }
      setErrorMessage(error.message ?? "Failed to dismiss debrief.");
    },
    onSuccess: (updated) => {
      if (!updated) {
        return;
      }
      analytics.aiDebriefDismissed(
        sessionId.toString(),
        updated.version,
        Boolean(updated.pinnedAt),
      );
      setErrorMessage(null);
    },
    onSettled: () => {
      void utils.sessionDebriefs.listBySession.invalidate(queryKey);
    },
  });

  const regenerate = api.sessionDebriefs.regenerate.useMutation({
    onMutate: async () => {
      await utils.sessionDebriefs.listBySession.cancel(queryKey);
      setErrorMessage(null);
    },
    onSuccess: ({ debrief }) => {
      if (debrief) {
        analytics.aiDebriefRegenerated(sessionId.toString(), debrief.version);
      }
    },
    onError: (error) => {
      setErrorMessage(error.message ?? "Failed to regenerate debrief.");
    },
    onSettled: async () => {
      await utils.sessionDebriefs.listBySession.invalidate(queryKey);
      void refetch();
    },
  });

  const manualGenerate = api.sessionDebriefs.generateAndSave.useMutation({
    onMutate: () => {
      setErrorMessage(null);
    },
    onSuccess: ({ debrief }) => {
      if (debrief) {
        analytics.aiDebriefRegenerated(
          sessionId.toString(),
          debrief.version,
          "initial",
        );
      }
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(error.message ?? "Failed to generate debrief.");
    },
    onSettled: async () => {
      await utils.sessionDebriefs.listBySession.invalidate(queryKey);
      void refetch();
    },
  });

  useEffect(() => {
    if (!latest) return;
    if (latest.record.viewedAt) {
      latestVersionTracked.current = latest.record.version;
      return;
    }
    if (latestVersionTracked.current === latest.record.version) return;
    latestVersionTracked.current = latest.record.version;
    markViewed.mutate({ sessionId, debriefId: latest.record.id });
    analytics.aiDebriefViewed(
      sessionId.toString(),
      latest.record.version,
      latest.content.streakContext?.current,
    );
  }, [latest, markViewed, sessionId]);

  const actionsDisabled = !isOnline;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!latest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Session Debrief</CardTitle>
          <CardDescription>
            No AI debrief is available for this session yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Generate a post-workout recap that highlights personal records,
            adherence trends, and focus areas for your next training block.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            disabled={manualGenerate.isPending || actionsDisabled}
            onClick={() =>
              manualGenerate.mutate({ sessionId, skipIfActive: false })
            }
          >
            {manualGenerate.isPending ? "Generating…" : "Generate Debrief"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const otherHistory = parsed.slice(1);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Session Debrief</CardTitle>
          <CardDescription>
            {templateName} · {new Date(sessionDate).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}
          <div>
            <h3 className="text-lg font-semibold">Summary</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {latest.content.summary}
            </p>
          </div>

          {latest.content.prHighlights?.length ? (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Highlights
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {latest.content.prHighlights.map((highlight, index) => (
                  <Badge key={`${highlight.exerciseName}-${index}`}>
                    {highlight.emoji ? `${highlight.emoji} ` : ""}
                    {highlight.exerciseName}
                    {highlight.delta !== undefined
                      ? ` (${highlight.delta > 0 ? "+" : ""}${highlight.delta}${highlight.unit ?? ""})`
                      : ""}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {latest.content.focusAreas?.length ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Focus Areas
              </h4>
              <div className="grid gap-3 md:grid-cols-2">
                {latest.content.focusAreas.map((focus, index) => (
                  <div
                    key={`${focus.title}-${index}`}
                    className="rounded-lg border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{focus.title}</span>
                      {focus.priority ? (
                        <Badge variant="outline">{focus.priority}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {focus.description}
                    </p>
                    {focus.actions?.length ? (
                      <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
                        {focus.actions.map((action, idx) => (
                          <li key={idx}>{action}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {latest.content.overloadDigest ? (
            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Overload & Readiness
              </h4>
              {latest.content.overloadDigest.recommendation ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {latest.content.overloadDigest.recommendation}
                </p>
              ) : null}
              {latest.content.overloadDigest.cautionFlags?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {latest.content.overloadDigest.cautionFlags.map((flag, index) => (
                    <Badge key={`${flag}-${index}`} variant="destructive">
                      {flag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            variant="default"
            disabled={regenerate.isPending || actionsDisabled}
            onClick={() => regenerate.mutate({ sessionId })}
          >
            {regenerate.isPending ? "Regenerating…" : "Regenerate"}
          </Button>
          <Button
            variant={latest.record.pinnedAt ? "secondary" : "outline"}
            disabled={togglePinned.isPending || actionsDisabled}
            onClick={() =>
              togglePinned.mutate({ sessionId, debriefId: latest.record.id })
            }
          >
            {togglePinned.isPending
              ? "Updating…"
              : latest.record.pinnedAt
                ? "Unpin"
                : "Pin"}
          </Button>
          <Button
            variant="ghost"
            disabled={dismiss.isPending || actionsDisabled}
            onClick={() =>
              dismiss.mutate({ sessionId, debriefId: latest.record.id })
            }
          >
            {dismiss.isPending ? "Dismissing…" : "Dismiss"}
          </Button>
          {!isOnline ? (
            <span className="text-xs text-muted-foreground">
              Offline mode – actions disabled
            </span>
          ) : null}
        </CardFooter>
      </Card>

      {otherHistory.length ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Previous Snapshots
            </h3>
            <Button variant="ghost" size="sm" onClick={() => void refetch()}>
              Refresh
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {otherHistory.map(({ record, content }) => (
              <Card key={record.id} className="border-border/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Version {record.version}
                  </CardTitle>
                  <CardDescription>
                    {record.pinnedAt ? "Pinned · " : ""}
                    {formatDate(record.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pb-2">
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {content.summary}
                  </p>
                  {content.prHighlights?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {content.prHighlights.slice(0, 3).map((highlight, index) => (
                        <Badge key={`${highlight.exerciseName}-${index}`} variant="outline">
                          {highlight.exerciseName}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={togglePinned.isPending || actionsDisabled}
                    onClick={() =>
                      togglePinned.mutate({
                        sessionId,
                        debriefId: record.id,
                      })
                    }
                  >
                    {record.pinnedAt ? "Unpin" : "Pin"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {!isOnline ? (
        <div className="rounded-lg border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
          You appear to be offline. Debrief actions will sync once your connection returns.
        </div>
      ) : null}
    </div>
  );
}
