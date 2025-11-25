"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Target, CheckCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import { GlassSurface } from "../ui/glass-surface";

/**
 * Goal progress component with circular/linear progress indicators
 *
 * Features:
 * - Circular and linear progress bar variants
 * - Animated progress fills with gradient colors
 * - Goal achievement celebration animations
 * - Over-achievement visual indicators
 * - Touch-optimized design for mobile
 * - Accessible with proper ARIA labels and screen reader support
 */

export interface GoalProgressProps {
  /** Title of the goal */
  title: string;
  /** Current progress value */
  current: number;
  /** Target goal value */
  target: number;
  /** Unit of measurement */
  unit: string;
  /** Display variant - circular or linear */
  variant?: "circular" | "linear";
  /** Size for circular variant */
  size?: "sm" | "md" | "lg";
  /** Color theme */
  theme?: "primary" | "success" | "warning";
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

const GoalProgress = React.forwardRef<HTMLDivElement, GoalProgressProps>(
  (
    {
      title,
      current,
      target,
      unit,
      variant = "linear",
      size = "md",
      theme = "primary",
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const isInteractive = !!onClick;
    const progressPercentage = Math.min((current / target) * 100, 100);
    const isGoalReached = current >= target;
    const isOverAchieved = current > target;

    // Size configurations for circular variant
    const sizeConfig = {
      sm: { size: 80, strokeWidth: 6, textSize: "text-sm" },
      md: { size: 120, strokeWidth: 8, textSize: "text-base" },
      lg: { size: 160, strokeWidth: 10, textSize: "text-lg" },
    };

    const palette = {
      primary: "var(--chart-1, #1f78b4)",
      success: "var(--chart-3, #33a02c)",
      warning: "var(--chart-2, #ff7f0e)",
    } as const;

    const strokeColor = palette[theme] ?? palette.primary;
    const gradientFill = `linear-gradient(90deg, ${strokeColor} 0%, color-mix(in srgb, ${strokeColor} 65%, currentColor 35%) 100%)`;

    if (variant === "circular") {
      const { size: circleSize, strokeWidth, textSize } = sizeConfig[size];
      const radius = (circleSize - strokeWidth) / 2;
      const circumference = radius * 2 * Math.PI;
      const offset = circumference - (progressPercentage / 100) * circumference;

      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "flex flex-col items-center justify-center",
            isInteractive && "cursor-pointer",
            className,
          )}
          onClick={onClick}
          role={isInteractive ? "button" : undefined}
          tabIndex={isInteractive ? 0 : undefined}
          {...props}
        >
          <GlassSurface className="flex flex-col items-center p-6">
            {/* Circular progress */}
            <div
              className="relative"
              style={{ width: circleSize, height: circleSize }}
            >
              {/* Background circle */}
              <svg
                className="-rotate-90 transform"
                width={circleSize}
                height={circleSize}
              >
                <circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />

                {/* Progress circle */}
                <motion.circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                />
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isGoalReached ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 1.7, type: "spring", stiffness: 300 }}
                    className="mb-2"
                    style={{
                      color: isOverAchieved ? palette.success : palette.primary,
                    }}
                  >
                    <CheckCircle className="h-6 w-6" />
                  </motion.div>
                ) : (
                  <Target className="text-muted-foreground mb-2 h-6 w-6" />
                )}

                <div className={cn("text-center font-bold", textSize)}>
                  {Math.round(progressPercentage)}%
                </div>
              </div>
            </div>

            {/* Title and stats */}
            <div className="mt-4 text-center">
              <h4 className="text-foreground mb-2 font-semibold">{title}</h4>
              <div className="text-muted-foreground text-sm">
                {current.toLocaleString()} / {target.toLocaleString()} {unit}
              </div>
            </div>
          </GlassSurface>
        </motion.div>
      );
    }

    // Linear variant
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn("w-full", isInteractive && "cursor-pointer", className)}
        onClick={onClick}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        {...props}
      >
        <GlassSurface className="p-6">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="text-foreground font-semibold">{title}</h4>
              <p className="text-muted-foreground text-sm">
                {current.toLocaleString()} / {target.toLocaleString()} {unit}
              </p>
            </div>

            {/* Achievement icon */}
            {isGoalReached && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.8,
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${
                    isOverAchieved ? palette.success : palette.primary
                  } 18%, transparent 82%)`,
                  color: isOverAchieved ? palette.success : palette.primary,
                }}
              >
                <CheckCircle className="h-5 w-5" />
              </motion.div>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span
                className="font-semibold"
                style={{
                  color: isOverAchieved ? palette.success : palette.primary,
                }}
              >
                {Math.round(progressPercentage)}%
              </span>
            </div>

            <div
              className="bg-surface-secondary h-4 w-full overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={current}
              aria-valuemin={0}
              aria-valuemax={target}
              aria-label={`${title}: ${current} of ${target} ${unit}`}
            >
              <motion.div
                className="relative h-full rounded-full"
                style={{ backgroundImage: gradientFill }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{
                  duration: 1.2,
                  ease: [0.4, 0, 0.2, 1],
                  delay: 0.3,
                }}
              >
                {/* Shine effect for achieved goals */}
                {isOverAchieved && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                      duration: 1.5,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatDelay: 2,
                      delay: 1.5,
                    }}
                    aria-hidden="true"
                  />
                )}
              </motion.div>
            </div>

            {/* Over-achievement message */}
            {isOverAchieved && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="text-center text-sm font-medium"
                style={{ color: palette.success }}
              >
                🎉 Goal exceeded by {((current / target - 1) * 100).toFixed(1)}
                %!
              </motion.div>
            )}
          </div>
        </GlassSurface>
      </motion.div>
    );
  },
);

GoalProgress.displayName = "GoalProgress";

export { GoalProgress };
