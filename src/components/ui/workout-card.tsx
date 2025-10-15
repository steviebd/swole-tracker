"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Repeat, Eye, Sparkles } from "lucide-react";
import { cn } from "~/lib/utils";
import { GlassSurface } from "./glass-surface";

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
  /** Whether this workout is recent (within 24 hours) */
  isRecent?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const WorkoutCard = React.forwardRef<HTMLDivElement, WorkoutCardProps>(
  ({ 
    workoutName, 
    date, 
    metrics, 
    onRepeat, 
    onViewDetails, 
    isRecent = false,
    className, 
    ...props 
  }, ref) => {
    const formatDate = (dateString: string) => {
      try {
        const workoutDate = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - workoutDate.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        
        if (diffInDays === 0) {
          return "Today";
        } else if (diffInDays === 1) {
          return "Yesterday";
        } else if (diffInDays < 7) {
          return `${diffInDays} days ago`;
        } else {
          return workoutDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: workoutDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
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
          ease: [0.4, 0, 0.2, 1]
        }}
        className={cn("group relative", className)}
        {...props}
      >
        <GlassSurface className="p-6">
          {/* Content container */}
          <div className="relative z-10 space-y-4">
            {/* Header with workout name and new badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground leading-tight truncate">
                  {workoutName}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(date)}
                </p>
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
                    delay: 0.1
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: 'var(--gradient-universal-action-primary)',
                    color: 'white'
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  New!
                </motion.div>
              )}
            </div>
            
            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-4">
              {metrics.map((metric, index) => (
                <div key={`${metric.label}-${index}`} className="text-center">
                  <motion.div 
                    className="text-xl font-bold text-foreground"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + (index * 0.05) }}
                  >
                    {metric.value}
                  </motion.div>
                  <div className="text-xs text-muted-foreground font-medium mt-1">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              {/* Repeat workout button */}
              <motion.button
                onClick={onRepeat}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
                  "text-sm font-medium transition-all duration-200",
                  "border border-default bg-surface-secondary text-content-primary",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "min-h-[44px]" // Touch target size
                )}
                data-state-layer="surface"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
                aria-label={`Repeat ${workoutName} workout`}
              >
                <Repeat className="w-4 h-4" />
                Repeat
              </motion.button>
              
              {/* View details button - redesigned to be more subtle and match design aesthetic */}
              <motion.button
                onClick={onViewDetails}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
                  "text-sm font-medium transition-all duration-200",
                  "border border-[color:color-mix(in srgb, var(--md-sys-color-primary) 28%, transparent 72%)]",
                  "bg-[color:color-mix(in srgb, var(--md-sys-color-primary) 16%, transparent 84%)] text-interactive-primary",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "min-h-[44px]" // Touch target size
                )}
                data-state-layer="primary"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
                aria-label={`View details for ${workoutName} workout`}
              >
                <Eye className="w-4 h-4" />
                Details
              </motion.button>
            </div>
          </div>
          
          {/* Subtle hover glow effect */}
          <div 
            className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
            style={{
              boxShadow: '0 10px 25px -5px rgba(255, 138, 76, 0.1)'
            }}
            aria-hidden="true"
          />
        </GlassSurface>
      </motion.div>
    );
  }
);

WorkoutCard.displayName = "WorkoutCard";

export { WorkoutCard, type WorkoutMetric };
