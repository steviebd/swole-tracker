import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Target } from "lucide-react";
import { cn } from "~/lib/utils";
import { GlassSurface } from "./glass-surface";

/**
 * Progress card component for goal tracking with visual progress bars
 * 
 * Features:
 * - Progress bars with gradient fills from design tokens
 * - Goal achievement indicators with celebration animations
 * - Over-achievement visual celebration (>100% progress)
 * - Accessible progress indication with proper ARIA labels
 * - Touch-optimized design for mobile interaction
 * - Smooth animations for progress changes
 */

export interface ProgressCardProps {
  /** Title of the progress goal */
  title: string;
  /** Current progress value */
  value: number;
  /** Target goal value */
  goal: number;
  /** Unit of measurement (e.g., "lbs", "reps", "min") */
  unit: string;
  /** Additional CSS classes */
  className?: string;
  /** Click handler for interactive progress cards */
  onClick?: () => void;
}

const ProgressCard = React.forwardRef<HTMLDivElement, ProgressCardProps>(
  ({ title, value, goal, unit, className, onClick, ...props }, ref) => {
    const isInteractive = !!onClick;
    const progressPercentage = Math.min((value / goal) * 100, 100);
    const isOverAchieved = value > goal;
    const isGoalReached = value >= goal;
    
    // Calculate display percentage (can exceed 100% for over-achievement)
    const displayPercentage = (value / goal) * 100;
    
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={isInteractive ? { 
          scale: 1.01,
          y: -2,
        } : undefined}
        whileTap={isInteractive ? { scale: 0.99 } : undefined}
        transition={{
          duration: 0.2,
          ease: [0.4, 0, 0.2, 1]
        }}
        className={cn(
          "group relative",
          isInteractive && "cursor-pointer",
          className
        )}
        onClick={onClick}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={isInteractive ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        } : undefined}
        {...props}
      >
        <GlassSurface className="p-6">
          {/* Achievement celebration overlay */}
          {isOverAchieved && (
            <motion.div 
              className="absolute inset-0 opacity-10 rounded-lg"
              style={{
                background: 'var(--gradient-universal-success)'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              transition={{ duration: 0.5 }}
              aria-hidden="true"
            />
          )}
          
          {/* Content container */}
          <div className="relative z-10 space-y-4">
            {/* Header with title and achievement icon */}
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-foreground leading-tight">
                {title}
              </h3>
              
              {/* Achievement indicator */}
              {isGoalReached && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.2
                  }}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full",
                    isOverAchieved ? "text-success" : "text-primary"
                  )}
                >
                  {isOverAchieved ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <Target className="w-6 h-6" />
                  )}
                </motion.div>
              )}
            </div>
            
            {/* Progress values */}
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-2">
                <span 
                  className="text-2xl font-bold bg-clip-text text-transparent"
                  style={{
                    background: isOverAchieved 
                      ? 'var(--gradient-universal-success)'
                      : 'var(--gradient-universal-action-primary)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    // Fallback for browsers that don't support background-clip: text
                    color: isOverAchieved 
                      ? 'var(--color-status-success-default)'
                      : 'var(--color-primary-default)'
                  }}
                >
                  {value.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground font-medium">
                  {unit}
                </span>
              </div>
              
              <div className="text-right">
                <div className={cn(
                  "text-sm font-semibold",
                  isOverAchieved ? "text-success" : "text-primary"
                )}>
                  {displayPercentage.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  of {goal.toLocaleString()} {unit}
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="space-y-2">
              <div 
                className="w-full bg-muted rounded-full h-3 overflow-hidden"
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={goal}
                aria-label={`Progress: ${value} of ${goal} ${unit}`}
              >
                <motion.div
                  className="h-full rounded-full relative overflow-hidden"
                  style={{
                    background: isOverAchieved 
                      ? 'var(--gradient-universal-success)'
                      : 'var(--gradient-universal-action-primary)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{
                    duration: 1,
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0.1
                  }}
                >
                  {/* Animated shine effect for celebration */}
                  {isOverAchieved && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{
                        duration: 1.5,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatDelay: 2
                      }}
                      aria-hidden="true"
                    />
                  )}
                </motion.div>
              </div>
              
              {/* Over-achievement indicator */}
              {isOverAchieved && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2, duration: 0.3 }}
                  className="text-xs text-success font-medium text-center"
                >
                  🎉 Goal exceeded! Great work!
                </motion.div>
              )}
            </div>
          </div>
        </GlassSurface>
      </motion.div>
    );
  }
);

ProgressCard.displayName = "ProgressCard";

export { ProgressCard };