"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Dumbbell,
  RefreshCw,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

import { api } from "~/trpc/react";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert } from "~/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { cn } from "~/lib/utils";
import { Sparkles } from "lucide-react";

import type { PlaybookWeekWithSessions } from "~/server/api/types/playbook";
import type { SessionPrescription } from "~/server/api/schemas/playbook";
import { SessionDetailCard } from "./SessionDetailCard";

type WeekCardProps = {
  week: PlaybookWeekWithSessions;
  isExpanded: boolean;
  onToggle: () => void;
  isPrWeek: boolean;
};

function WeekCard({ week, isExpanded, onToggle, isPrWeek }: WeekCardProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(
    new Set(),
  );

  const completedSessions = week.sessions.filter((s) => s.isCompleted).length;
  const totalSessions = week.sessions.length;
  const adherencePercent =
    totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;

  const hasAiPlan = week.aiPlan !== null;
  const hasAlgorithmicPlan = week.algorithmicPlan !== null;

  const handleToggleSession = (sessionId: number) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  return (
    <Card
      variant={isPrWeek ? "elevated" : "glass"}
      className={cn(
        "transition-all",
        isPrWeek &&
          "border-primary from-primary/5 to-secondary/5 border-2 bg-gradient-to-br",
      )}
    >
      <CardHeader
        className="touch-target hover:bg-muted/30 active:bg-muted/50 cursor-pointer transition-colors"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`Week ${week.weekNumber}, ${isExpanded ? "collapse" : "expand"}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Week {week.weekNumber}</CardTitle>
            {isPrWeek && (
              <Badge variant="default" className="gap-1">
                <Target className="size-3" />
                PR Attempt
              </Badge>
            )}
            <Badge
              variant={week.status === "completed" ? "secondary" : "outline"}
            >
              {week.status}
            </Badge>
            {/* Week Type Badge */}
            {week.weekType && week.weekType !== "training" && (
              <Badge variant="outline" className="capitalize">
                {week.weekType.replace("_", " ")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {week.status !== "pending" && (
              <span className="text-muted-foreground text-sm">
                {completedSessions}/{totalSessions} sessions
              </span>
            )}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <TrendingUp className="text-muted-foreground size-5" />
            </motion.div>
          </div>
        </div>

        {/* Volume Target */}
        {week.volumeTarget && (
          <div className="text-muted-foreground mt-2 text-sm">
            Target Volume: {week.volumeTarget.toLocaleString()} kg
          </div>
        )}

        {/* Progress Bar (if started) */}
        {week.status !== "pending" && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Adherence</span>
              <span className="font-medium">{adherencePercent}%</span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full transition-all",
                  adherencePercent >= 80
                    ? "from-tertiary to-tertiary/80 bg-gradient-to-r"
                    : adherencePercent >= 50
                      ? "from-secondary to-secondary/80 bg-gradient-to-r"
                      : "from-destructive to-destructive/80 bg-gradient-to-r",
                )}
                style={{ width: `${adherencePercent}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      {/* Expandable Content */}
      {isExpanded && (
        <CardContent className="space-y-4 border-t pt-4">
          {/* Coaching Cues & Focus Areas (AI Plan only) */}
          {week.aiPlan &&
            (week.aiPlan.coachingCues || week.aiPlan.focusAreas) && (
              <div className="glass-surface glass-hairline rounded-lg p-4">
                {week.aiPlan.focusAreas &&
                  week.aiPlan.focusAreas.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                        Focus Areas
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {week.aiPlan.focusAreas.map((area, index) => (
                          <Badge key={index} variant="secondary">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                {week.aiPlan.coachingCues && (
                  <div>
                    <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                      Coaching Notes
                    </h4>
                    <p className="text-foreground/90 text-sm leading-relaxed">
                      {week.aiPlan.coachingCues}
                    </p>
                  </div>
                )}
              </div>
            )}

          {/* PR Attempt Exercises */}
          {week.aiPlan?.prAttemptExercises &&
            week.aiPlan.prAttemptExercises.length > 0 && (
              <div className="border-primary/20 from-primary/10 to-secondary/10 rounded-lg border-2 bg-gradient-to-br p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Target className="text-primary size-4" />
                  PR Attempt Targets
                </h4>
                <div className="space-y-2">
                  {week.aiPlan.prAttemptExercises.map((pr, index) => (
                    <div
                      key={index}
                      className="bg-background/50 flex items-center justify-between rounded-md px-3 py-2"
                    >
                      <span className="font-medium">{pr.exerciseName}</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-primary font-bold">
                          {pr.targetWeight}kg
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(pr.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Sessions List */}
          <div className="space-y-3">
            <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Sessions
            </h4>
            {week.sessions.map((session) => {
              // Get the prescription from the session's active plan
              const prescription = session.prescribedWorkout as
                | SessionPrescription
                | undefined;

              if (!prescription) {
                // Fallback to simple display if no prescription found
                return (
                  <div
                    key={session.id}
                    className="border-border flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Dumbbell className="text-muted-foreground size-4" />
                      <span className="text-muted-foreground text-sm">
                        Session {session.sessionNumber}
                      </span>
                      {session.isCompleted && (
                        <CheckCircle2 className="text-tertiary size-4" />
                      )}
                    </div>
                    {session.adherenceScore !== null && (
                      <Badge variant="secondary">
                        {session.adherenceScore}% match
                      </Badge>
                    )}
                  </div>
                );
              }

              return (
                <SessionDetailCard
                  key={session.id}
                  session={session}
                  prescription={prescription as any}
                  aiPlan={week.aiPlan as any}
                  algorithmicPlan={week.algorithmicPlan as any}
                  isExpanded={expandedSessions.has(session.id)}
                  onToggle={() => handleToggleSession(session.id)}
                />
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function PlaybookDetailView({ playbookId }: { playbookId: number }) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [showAddAiPrompt, setShowAddAiPrompt] = useState(false);

  const {
    data: playbook,
    isLoading,
    error,
  } = api.playbooks.getById.useQuery({
    id: playbookId,
  });

  // Initialize with current week expanded
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const { data: adherenceMetrics } = api.playbooks.getAdherenceMetrics.useQuery(
    {
      playbookId,
    },
    {
      enabled: !!playbook && !error, // Only run adherence query if playbook exists and no error
    },
  );

  const acceptPlaybookMutation = api.playbooks.acceptPlaybook.useMutation({
    onSuccess: () => {
      // Refetch playbook data
      window.location.reload();
    },
  });

  const regenerateMutation =
    api.playbooks.regenerateFromLatestSession.useMutation({
      onSuccess: () => {
        // Refetch playbook data
        window.location.reload();
      },
    });

  // Expand the current week when playbook loads
  useEffect(() => {
    if (playbook && expandedWeeks.size === 0) {
      // Find the current week (active week or first pending week)
      const currentWeek =
        playbook.weeks.find(
          (w) => w.status === "active" || w.status === "in_progress",
        ) ||
        playbook.weeks.find((w) => w.status === "pending") ||
        playbook.weeks[0];

      if (currentWeek) {
        setExpandedWeeks(new Set([currentWeek.id]));
      }
    }
  }, [playbook, expandedWeeks.size]);

  const handleToggleWeek = (weekId: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) {
        next.delete(weekId);
      } else {
        next.add(weekId);
      }
      return next;
    });
  };

  const handleAcceptPlaybook = async () => {
    await acceptPlaybookMutation.mutateAsync({ id: playbookId });
  };

  if (isLoading) {
    return (
      <PageShell title="Loading...">
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </PageShell>
    );
  }

  if (error || !playbook) {
    return (
      <PageShell title="Not Found">
        <Alert variant="destructive">
          <p>{error?.message || "Playbook not found"}</p>
        </Alert>
      </PageShell>
    );
  }

  const currentWeek =
    playbook.weeks.find((w) => w.status === "active")?.weekNumber || 1;
  const prWeeks = playbook.weeks.filter((w) => w.weekType === "pr_attempt");

  const pageShellProps = {
    title: playbook.name,
    ...(playbook.goalText ? { description: playbook.goalText } : {}),
    headerActions: (
      <Button variant="outline" onClick={() => router.back()} size="sm">
        <ArrowLeft className="size-4" />
        Back
      </Button>
    ),
  };

  return (
    <PageShell {...pageShellProps}>
      {/* Summary Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card variant="glass">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-muted-foreground text-sm">Duration</p>
              <p className="text-2xl font-bold">{playbook.duration} weeks</p>
            </div>
            <Calendar className="text-primary size-8" />
          </CardContent>
        </Card>

        {adherenceMetrics ? (
          <>
            <Card variant="glass">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-muted-foreground text-sm">Adherence</p>
                  <p className="text-2xl font-bold">
                    {adherenceMetrics.adherencePercentage}%
                  </p>
                </div>
                <TrendingUp className="text-tertiary size-8" />
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-muted-foreground text-sm">Avg RPE</p>
                  <p className="text-2xl font-bold">
                    {adherenceMetrics.averageRpe?.toFixed(1) || "N/A"}
                  </p>
                </div>
                <Zap className="text-secondary size-8" />
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Draft State Actions */}
      {playbook.status === "draft" ? (
        <Alert variant="default" className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Ready to start your playbook?</p>
              <p className="text-muted-foreground text-sm">
                Accept this plan to begin tracking your progress
              </p>
            </div>
            <Button
              onClick={handleAcceptPlaybook}
              disabled={acceptPlaybookMutation.isPending}
              haptic
            >
              {acceptPlaybookMutation.isPending
                ? "Activating..."
                : "Accept & Start"}
            </Button>
          </div>
        </Alert>
      ) : null}

      {/* Weekly Timeline */}
      <div className="space-y-4">
        {playbook.weeks.map((week, index) => {
          const isPrWeek = prWeeks.some((pr) => pr.id === week.id);
          const MotionCard = prefersReducedMotion ? "div" : motion.div;
          const motionProps = prefersReducedMotion
            ? {}
            : {
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
                transition: { delay: index * 0.05, duration: 0.3 },
              };

          return (
            <MotionCard key={week.id} {...motionProps}>
              <WeekCard
                week={week as PlaybookWeekWithSessions}
                isExpanded={expandedWeeks.has(week.id)}
                onToggle={() => handleToggleWeek(week.id)}
                isPrWeek={isPrWeek}
              />
            </MotionCard>
          );
        })}
      </div>

      {/* Regeneration Option (if active) */}
      {playbook.status === "active" ? (
        <div className="mt-8 flex justify-center">
          {!playbook.hasAiPlan ? (
            <Dialog open={showAddAiPrompt} onOpenChange={setShowAddAiPrompt}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2">
                  <RefreshCw className="size-4" />
                  Regenerate from Week {currentWeek}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add AI Plan & Regenerate</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p>
                    This will add an AI-generated plan to your playbook and
                    regenerate all future weeks. The AI plan will provide
                    personalized coaching cues and adaptations.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddAiPrompt(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        await regenerateMutation.mutateAsync({
                          playbookId,
                          addAiPlan: true,
                        });
                      }}
                      disabled={regenerateMutation.isPending}
                    >
                      {regenerateMutation.isPending ? (
                        <RefreshCw className="mr-2 size-4 animate-spin" />
                      ) : null}
                      Add AI Plan & Regenerate
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={async () => {
                await regenerateMutation.mutateAsync({
                  playbookId,
                });
              }}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Regenerate from Week {currentWeek}
            </Button>
          )}
        </div>
      ) : null}
    </PageShell>
  );
}
