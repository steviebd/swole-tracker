"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
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
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { cn } from "~/lib/utils";

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
  const [showAlgorithmicPlan, setShowAlgorithmicPlan] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  const completedSessions = week.sessions.filter((s) => s.isCompleted).length;
  const totalSessions = week.sessions.length;
  const adherencePercent =
    totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  // Use AI plan by default, fall back to algorithmic plan
  const activePlan = showAlgorithmicPlan ? week.algorithmicPlan : week.aiPlan;
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
        isPrWeek && "border-2 border-primary bg-gradient-to-br from-primary/5 to-secondary/5"
      )}
    >
      <CardHeader
        className="cursor-pointer touch-target transition-colors hover:bg-muted/30 active:bg-muted/50"
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
            <Badge variant={week.status === "completed" ? "secondary" : "outline"}>
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
              <span className="text-sm text-muted-foreground">
                {completedSessions}/{totalSessions} sessions
              </span>
            )}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <TrendingUp className="size-5 text-muted-foreground" />
            </motion.div>
          </div>
        </div>

        {/* Volume Target */}
        {week.volumeTarget && (
          <div className="mt-2 text-sm text-muted-foreground">
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
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full transition-all",
                  adherencePercent >= 80
                    ? "bg-gradient-to-r from-tertiary to-tertiary/80"
                    : adherencePercent >= 50
                      ? "bg-gradient-to-r from-secondary to-secondary/80"
                      : "bg-gradient-to-r from-destructive to-destructive/80"
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
          {week.aiPlan && (week.aiPlan.coachingCues || week.aiPlan.focusAreas) && (
            <div className="glass-surface glass-hairline rounded-lg p-4">
              {week.aiPlan.focusAreas && week.aiPlan.focusAreas.length > 0 && (
                <div className="mb-3">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Coaching Notes
                  </h4>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {week.aiPlan.coachingCues}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PR Attempt Exercises */}
          {week.aiPlan?.prAttemptExercises && week.aiPlan.prAttemptExercises.length > 0 && (
            <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Target className="size-4 text-primary" />
                PR Attempt Targets
              </h4>
              <div className="space-y-2">
                {week.aiPlan.prAttemptExercises.map((pr, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md bg-background/50 px-3 py-2"
                  >
                    <span className="font-medium">{pr.exerciseName}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-bold text-primary">{pr.targetWeight}kg</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(pr.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plan Toggle (if both plans exist) */}
          {hasAiPlan && hasAlgorithmicPlan && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant={!showAlgorithmicPlan ? "default" : "outline"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAlgorithmicPlan(false);
                }}
              >
                AI Plan
              </Button>
              <Button
                variant={showAlgorithmicPlan ? "default" : "outline"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAlgorithmicPlan(true);
                }}
              >
                Algorithmic Plan
              </Button>
            </div>
          )}

          {/* Sessions List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sessions
            </h4>
            {week.sessions.map((session) => {
              // Get the prescription from the active plan or from the session itself
              const prescription =
                (activePlan?.sessions.find(
                  (s) => s.sessionNumber === session.sessionNumber
                ) as SessionPrescription | undefined) ||
                (session.prescribedWorkout as SessionPrescription | undefined);

              if (!prescription) {
                // Fallback to simple display if no prescription found
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      {session.isCompleted ? (
                        <CheckCircle2 className="size-5 text-tertiary" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">Session {session.sessionNumber}</p>
                        {session.isCompleted && session.rpe && (
                          <p className="text-xs text-muted-foreground">RPE: {session.rpe}/10</p>
                        )}
                      </div>
                    </div>
                    {session.adherenceScore !== null && (
                      <Badge variant="secondary">{session.adherenceScore}% match</Badge>
                    )}
                  </div>
                );
              }

              return (
                <SessionDetailCard
                  key={session.id}
                  session={session}
                  prescription={prescription}
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

  const { data: playbook, isLoading } = api.playbooks.getById.useQuery({ id: playbookId });

  // Initialize with current week expanded
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const { data: adherenceMetrics } = api.playbooks.getAdherenceMetrics.useQuery({
    playbookId,
  });

  const acceptPlaybookMutation = api.playbooks.acceptPlaybook.useMutation({
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
        playbook.weeks.find((w) => w.status === "active" || w.status === "in_progress") ||
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

  if (!playbook) {
    return (
      <PageShell title="Not Found">
        <Alert variant="destructive">
          <p>Playbook not found</p>
        </Alert>
      </PageShell>
    );
  }

  const currentWeek = playbook.weeks.find((w) => w.status === "active")?.weekNumber || 1;
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
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-2xl font-bold">{playbook.duration} weeks</p>
            </div>
            <Calendar className="size-8 text-primary" />
          </CardContent>
        </Card>

        {adherenceMetrics ? (
          <>
            <Card variant="glass">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Adherence</p>
                  <p className="text-2xl font-bold">{adherenceMetrics.adherencePercentage}%</p>
                </div>
                <TrendingUp className="size-8 text-tertiary" />
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Avg RPE</p>
                  <p className="text-2xl font-bold">
                    {adherenceMetrics.averageRpe?.toFixed(1) || "N/A"}
                  </p>
                </div>
                <Zap className="size-8 text-secondary" />
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
              <p className="text-sm text-muted-foreground">
                Accept this plan to begin tracking your progress
              </p>
            </div>
            <Button
              onClick={handleAcceptPlaybook}
              disabled={acceptPlaybookMutation.isPending}
              haptic
            >
              {acceptPlaybookMutation.isPending ? "Activating..." : "Accept & Start"}
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
          <Button variant="outline" size="lg" className="gap-2">
            <RefreshCw className="size-4" />
            Regenerate from Week {currentWeek}
          </Button>
        </div>
      ) : null}
    </PageShell>
  );
}
