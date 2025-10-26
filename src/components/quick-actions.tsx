"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useState } from "react";
import { BarChart3, Dumbbell, Flame, Play } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import {
  WORKOUT_DRAFTS_STORAGE_KEY,
  WORKOUT_DRAFTS_UPDATED_EVENT,
  getMostRecentWorkoutDraft,
  removeWorkoutDraft,
  type WorkoutDraftRecord,
} from "~/lib/workout-drafts";

const ACTIONS = [
  {
    title: "Start Workout",
    description: "Begin a new workout session",
    icon: Play,
    gradient: "from-primary to-accent",
    href: "/workout/start",
  },
  {
    title: "View Progress",
    description: "Track your strength gains and consistency",
    icon: BarChart3,
    gradient: "from-chart-2 to-chart-1",
    href: "/progress",
  },
  {
    title: "Manage Templates",
    description: "Create and edit workout templates",
    icon: Dumbbell,
    gradient: "from-chart-3 to-chart-4",
    href: "/templates",
  },
] as const;

type QuickAction = (typeof ACTIONS)[number];

function ContinueSessionCard({
  draft,
  onDiscard,
}: {
  draft: WorkoutDraftRecord;
  onDiscard: () => void;
}) {
  const exerciseCount = draft.exercises.length;
  const setCount = draft.exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  );
  const updatedLabel = new Date(draft.updatedAt).toLocaleString();
  const sessionHref = `/workout/session/${draft.sessionId}`;

  return (
    <Card className="glass-card glass-hairline flex h-full flex-col justify-between overflow-hidden border border-white/8 bg-card/85 shadow-xl transition-all duration-300">
      <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
      <CardContent className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-primary-foreground">
            <Flame className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Continue session
            </h3>
            <p className="text-sm text-muted-foreground">
              Last updated {updatedLabel}
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {exerciseCount} exercises · {setCount} sets saved locally
        </div>
        <div className="mt-auto flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" asChild>
            <Link href={sessionHref}>Resume workout</Link>
          </Button>
          <Button
            variant="ghost"
            className="flex-1 text-destructive hover:text-destructive"
            type="button"
            onClick={onDiscard}
          >
            Discard session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      className="group focus-visible:outline-none focus-visible:ring-0"
    >
      <Card
        className={cn(
          "glass-card glass-hairline flex h-full flex-col overflow-hidden border border-white/8 bg-card/85 shadow-xl transition-all duration-300",
          "hover:-translate-y-1 hover:shadow-xl",
          "group-focus-visible:-translate-y-1 group-focus-visible:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-primary/45 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background",
        )}
      >
        <div className={cn("h-1 bg-gradient-to-r", action.gradient)} />
        <CardContent className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-primary-foreground transition-transform duration-300",
                action.gradient,
                "group-hover:scale-110",
              )}
            >
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-foreground">
                {action.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {action.description}
              </p>
            </div>
          </div>
          <Button
            className={cn(
              "mt-auto w-full border-0 text-primary-foreground",
              "bg-gradient-to-r",
              action.gradient,
              "hover:opacity-90",
            )}
          >
            Open
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}

export const QuickActions = memo(function QuickActions() {
  const [resumeDraft, setResumeDraft] = useState<WorkoutDraftRecord | null>(null);

  const refreshDraftState = useCallback(() => {
    setResumeDraft(getMostRecentWorkoutDraft());
  }, []);

  useEffect(() => {
    refreshDraftState();
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === WORKOUT_DRAFTS_STORAGE_KEY) {
        refreshDraftState();
      }
    };

    const handleDraftEvent = () => {
      refreshDraftState();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      WORKOUT_DRAFTS_UPDATED_EVENT,
      handleDraftEvent as EventListener,
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        WORKOUT_DRAFTS_UPDATED_EVENT,
        handleDraftEvent as EventListener,
      );
    };
  }, [refreshDraftState]);

  const handleDiscard = useCallback(() => {
    if (!resumeDraft) return;
    removeWorkoutDraft(resumeDraft.sessionId);
    refreshDraftState();
  }, [resumeDraft, refreshDraftState]);

  const actionsToRender = resumeDraft ? ACTIONS.slice(1) : ACTIONS;

  return (
    <section
      aria-label="Quick actions"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {resumeDraft && (
        <ContinueSessionCard draft={resumeDraft} onDiscard={handleDiscard} />
      )}
      {actionsToRender.map((action) => (
        <QuickActionCard key={action.href} action={action} />
      ))}
    </section>
  );
});
