"use client";

import { motion } from "framer-motion";
import { cn } from "~/lib/utils";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import type { ExercisePrescription } from "~/server/api/schemas/playbook";

interface SessionExerciseListProps {
  exercises: ExercisePrescription[];
  className?: string;
}

export function SessionExerciseList({ exercises, className }: SessionExerciseListProps) {
  const prefersReducedMotion = useReducedMotion();

  if (exercises.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">Rest day! Recovery is part of the plan 💪</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {exercises.map((exercise, index) => {
        const MotionDiv = prefersReducedMotion ? "div" : motion.div;
        const motionProps = prefersReducedMotion
          ? {}
          : {
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: index * 0.05, duration: 0.2 },
            };

        return (
          <MotionDiv key={`${exercise.exerciseName}-${index}`} {...motionProps}>
            <ExerciseRow exercise={exercise} index={index} />
          </MotionDiv>
        );
      })}
    </div>
  );
}

interface ExerciseRowProps {
  exercise: ExercisePrescription;
  index: number;
}

function ExerciseRow({ exercise, index }: ExerciseRowProps) {
  return (
    <div className="glass-surface glass-hairline relative overflow-hidden rounded-lg">
      {/* Exercise Header */}
      <div className="flex items-center gap-3 border-b border-border/50 bg-primary/[0.03] px-4 py-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          aria-label={`Exercise ${index + 1}`}
        >
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-base font-semibold">{exercise.exerciseName}</h4>
          {exercise.notes && (
            <p className="mt-0.5 text-xs text-muted-foreground">{exercise.notes}</p>
          )}
        </div>
      </div>

      {/* Exercise Details Grid */}
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 md:grid-cols-5">
        {/* Sets */}
        <div className="flex flex-col">
          <span className="mb-1 text-xs font-semibold text-muted-foreground">Sets</span>
          <span className="text-lg font-bold">{exercise.sets}</span>
        </div>

        {/* Reps */}
        <div className="flex flex-col">
          <span className="mb-1 text-xs font-semibold text-muted-foreground">Reps</span>
          <span className="text-lg font-bold">{exercise.reps}</span>
        </div>

        {/* Weight */}
        <div className="flex flex-col">
          <span className="mb-1 text-xs font-semibold text-muted-foreground">Weight</span>
          <span className="text-lg font-bold">
            {exercise.weight ? (
              <>
                {exercise.weight}
                <span className="ml-1 text-xs font-normal text-muted-foreground">kg</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Bodyweight</span>
            )}
          </span>
        </div>

        {/* RPE (if specified) */}
        {exercise.rpe !== undefined && (
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-semibold text-muted-foreground">RPE</span>
            <span className="text-lg font-bold">
              {exercise.rpe}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">/10</span>
            </span>
          </div>
        )}

        {/* Rest (if specified) */}
        {exercise.restSeconds !== undefined && (
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-semibold text-muted-foreground">Rest</span>
            <span className="text-lg font-bold">
              {exercise.restSeconds}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">s</span>
            </span>
          </div>
        )}
      </div>

      {/* Volume Display - Motivational */}
      <div className="border-t border-border/50 bg-gradient-to-r from-primary/5 to-secondary/5 px-4 py-2">
        <p className="text-xs text-foreground/90">
          <span className="font-medium">Total Volume:</span>{" "}
          <span className="font-bold text-primary">
            {exercise.weight
              ? `${(exercise.sets * exercise.reps * exercise.weight).toLocaleString()}kg moved!`
              : `${exercise.sets * exercise.reps} quality reps`}
          </span>
        </p>
      </div>
    </div>
  );
}
