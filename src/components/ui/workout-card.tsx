"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Repeat,
  Eye,
  Sparkles,
  FileText,
  BookOpen,
  LayoutTemplate,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { GlassSurface } from "./glass-surface";
import { Button } from "./button";

/**
 * Workout card component for displaying recent workout information
 *
 * Features:
 * - Key metrics display (duration, volume, exercise count)
 * - Action buttons with hover states for repeat and view details
 * - "New!" badges for recent sessions (within 24 hours)
 * - Touch-optimized buttons (44px+ targets) for mobile
 * - Accessible design with proper ARIA labels and keyboard navigation
 * - Gradient accents and smooth hover animations
 */

interface WorkoutMetric {
  /** Label for the metric (e.g., "Duration", "Volume", "Exercises") */
  label: string;
  /** Value to display for the metric */
  value: string;
}

export type WorkoutSource = {
  type: "template" | "playbook";
  name: string;
} | null;

export interface WorkoutCardProps {
  /** Name/title of the workout */
  workoutName: string;
  /** Date of the workout (will be formatted for display) */
  date: string;
  /** Array of key metrics to display */
  metrics: WorkoutMetric[];
  /** Handler for repeat workout action */
  onRepeat: () => void;
  /** Handler for view workout details action */
  onViewDetails: () => void;
  /** Handler for view workout debrief action */
  onDebrief: () => void;
  /** Whether this workout is recent (within 24 hours) */
  isRecent?: boolean;
  /** Source of the workout (template or playbook) */
  source?: WorkoutSource;
  /** Additional CSS classes */
  className?: string;
}

const WorkoutCard = React.forwardRef<HTMLDivElement, WorkoutCardProps>(
  (
    {
      workoutName,
      date,
      metrics,
      onRepeat,
      onViewDetails,
      onDebrief,
      isRecent = false,
      source,
      className,
      ...props
    },
    ref,
  ) => {
    const formatDate = (dateString: string) => {
      try {
        const workoutDate = new Date(dateString);
        // Use a consistent date for SSR to avoid hydration mismatches
        const now = typeof window !== "undefined" ? new Date() : new Date(0);
        const diffInMs = now.getTime() - workoutDate.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) {
          return "Today";
        } else if (diffInDays === 1) {
          return "Yesterday";
        } else if (diffInDays < 7) {
          return `${diffInDays} days ago`;
        } else {
          return workoutDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year:
              workoutDate.getFullYear() !== now.getFullYear()
                ? "numeric"
                : undefined,
          });
        }
      } catch {
        return dateString;
      }
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{
          scale: 1.01,
          y: -2,
        }}
        transition={{
          duration: 0.2,
          ease: [0.4, 0, 0.2, 1],
        }}
        className={cn("group relative", className)}
        {...props}
      >
        <GlassSurface className="p-6">
          {/* Content container */}
          <div className="relative z-10 space-y-4">
            {/* Header with workout name and new badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-foreground truncate text-lg leading-tight font-semibold">
                  {workoutName}
                </h3>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-muted-foreground text-sm">
                    {formatDate(date)}
                  </p>
                  {source && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        source.type === "playbook"
                          ? "bg-purple-500/15 text-purple-300"
                          : "bg-blue-500/15 text-blue-300",
                      )}
                    >
                      {source.type === "playbook" ? (
                        <BookOpen className="h-3 w-3" />
                      ) : (
                        <LayoutTemplate className="h-3 w-3" />
                      )}
                      {source.type === "playbook" ? "Playbook" : "Template"}
                    </span>
                  )}
                </div>
              </div>

              {/* New workout badge */}
              {isRecent && (
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.1,
                  }}
                  className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                  style={{
                    background: "var(--gradient-universal-action-primary)",
                    color: "white",
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  New!
                </motion.div>
              )}
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-4">
              {metrics.map((metric, index) => (
                <div key={`${metric.label}-${index}`} className="text-center">
                  <motion.div
                    className="text-foreground text-xl font-bold"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    {metric.value}
                  </motion.div>
                  <div className="text-muted-foreground mt-1 text-xs font-medium">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {/* Repeat workout button */}
              <motion.button
                onClick={onRepeat}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3",
                  "text-sm font-medium transition-all duration-200",
                  "border-default bg-surface-secondary text-content-primary border",
                  "focus-visible:ring-primary/40 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  "min-h-[44px]", // Touch target size
                )}
                data-state-layer="surface"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
                aria-label={`Repeat ${workoutName} workout`}
              >
                <Repeat className="h-4 w-4" />
                <span className="hidden sm:inline">Repeat</span>
              </motion.button>

              {/* Debrief button */}
              <motion.div
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
                className="flex-1"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onDebrief}
                  className="min-h-[44px] w-full gap-2"
                  aria-label={`View debrief for ${workoutName} workout`}
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Debrief</span>
                </Button>
              </motion.div>

              {/* View details button - redesigned to be more subtle and match design aesthetic */}
              <motion.button
                onClick={onViewDetails}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3",
                  "text-sm font-medium transition-all duration-200",
                  "border-interactive-primary/28 border",
                  "bg-interactive-primary/16 text-interactive-primary",
                  "focus-visible:ring-primary focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  "min-h-[44px]", // Touch target size
                )}
                data-state-layer="primary"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
                aria-label={`View details for ${workoutName} workout`}
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Details</span>
              </motion.button>
            </div>
          </div>

          {/* Subtle hover glow effect */}
          <div
            className="shadow-primary-active absolute inset-0 -z-10 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden="true"
          />
        </GlassSurface>
      </motion.div>
    );
  },
);

WorkoutCard.displayName = "WorkoutCard";

export { WorkoutCard, type WorkoutMetric };
