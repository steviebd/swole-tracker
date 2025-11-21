"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Clock, Dumbbell, CheckCircle2, Circle, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { SessionExerciseList } from "./SessionExerciseList";
import { api } from "~/trpc/react";
import type { SessionPrescription } from "~/server/api/schemas/playbook";

interface SessionDetailCardProps {
  session: {
    id: number;
    sessionNumber: number;
    isCompleted: boolean;
    rpe: number | null;
    adherenceScore: number | null;
  };
  prescription: SessionPrescription;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function SessionDetailCard({
  session,
  prescription,
  isExpanded = false,
  onToggle,
}: SessionDetailCardProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [localExpanded, setLocalExpanded] = useState(isExpanded);

  const expanded = onToggle ? isExpanded : localExpanded;
  const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded));

  const startWorkoutMutation = api.playbooks.startSessionWorkout.useMutation({
    onSuccess: (data) => {
      // Navigate to the workout session page
      router.push(`/workout/session/${data.workoutId}`);
    },
  });

  const handleStartWorkout = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding/collapsing when clicking button
    startWorkoutMutation.mutate({ playbookSessionId: session.id });
  };

  const totalVolume = prescription.exercises.reduce((sum, ex) => {
    const exerciseVolume = ex.sets * ex.reps * (ex.weight || 0);
    return sum + exerciseVolume;
  }, 0);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border transition-all",
        session.isCompleted
          ? "bg-gradient-to-br from-tertiary/5 to-tertiary/10"
          : "bg-muted/30"
      )}
    >
      {/* Session Header - Clickable */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 touch-target"
        aria-expanded={expanded}
        aria-controls={`session-${session.id}-content`}
      >
        <div className="flex items-center gap-3">
          {/* Completion Icon */}
          {session.isCompleted ? (
            <CheckCircle2 className="size-5 shrink-0 text-tertiary" />
          ) : (
            <Circle className="size-5 shrink-0 text-muted-foreground" />
          )}

          {/* Session Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold">Session {session.sessionNumber}</p>
              {prescription.dayOfWeek && (
                <span className="text-xs text-muted-foreground">
                  • {prescription.dayOfWeek}
                </span>
              )}
            </div>

            {/* Metadata Row */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Dumbbell className="size-3" />
                {prescription.exercises.length} exercise
                {prescription.exercises.length !== 1 ? "s" : ""}
              </span>
              {prescription.estimatedDurationMinutes && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  ~{prescription.estimatedDurationMinutes} min
                </span>
              )}
            </div>

            {/* Completion Info */}
            {session.isCompleted && (
              <div className="mt-1 flex items-center gap-2">
                {session.rpe && (
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    aria-label={`RPE ${session.rpe} out of 10`}
                  >
                    RPE: {session.rpe}/10
                  </Badge>
                )}
                {session.adherenceScore !== null && (
                  <Badge
                    variant={session.adherenceScore >= 80 ? "default" : "outline"}
                    className="text-xs"
                  >
                    {session.adherenceScore}% match
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
        >
          <ChevronDown className="size-5 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`session-${session.id}-content`}
            {...(!prefersReducedMotion && {
              initial: { height: 0, opacity: 0 },
              exit: { height: 0, opacity: 0 },
            })}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="space-y-4 border-t border-border/50 p-4">
              {/* Session Metadata */}
              {(prescription.totalVolumeTarget || totalVolume > 0 || prescription.notes) && (
                <div className="glass-surface glass-hairline rounded-lg p-3">
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {prescription.totalVolumeTarget && (
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Target Volume
                        </span>
                        <p className="mt-0.5 font-semibold">
                          {prescription.totalVolumeTarget.toLocaleString()} kg
                        </p>
                      </div>
                    )}
                    {totalVolume > 0 && (
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Calculated Volume
                        </span>
                        <p className="mt-0.5 font-semibold">
                          {totalVolume.toLocaleString()} kg
                        </p>
                      </div>
                    )}
                  </div>
                  {prescription.notes && (
                    <p className="mt-2 text-xs italic text-muted-foreground">
                      {prescription.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Start Workout Button */}
              {!session.isCompleted && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleStartWorkout}
                    disabled={startWorkoutMutation.isPending}
                    size="lg"
                    className="gap-2"
                    haptic
                  >
                    <Play className="size-4" />
                    {startWorkoutMutation.isPending
                      ? "Starting..."
                      : "Start Workout"}
                  </Button>
                </div>
              )}

              {/* Exercise List */}
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Exercises
                </h4>
                <SessionExerciseList exercises={prescription.exercises} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
