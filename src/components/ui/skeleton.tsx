"use client";

/**
 * Enhanced skeleton loading components with shimmer effects
 *
 * Features:
 * - Smooth shimmer animations
 * - Respect reduced motion preferences
 * - Multiple skeleton variants for different content types
 * - Theme-aware colors
 * - GPU-accelerated animations
 */

import * as React from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { skeletonShimmerVariants } from "~/lib/micro-interactions";
import { cn } from "~/lib/utils";

const skeletonVariants = cva("relative rounded-md overflow-hidden", {
  variants: {
    variant: {
      default: "bg-surface-secondary",
      card: "bg-surface-secondary border border-border",
      text: "bg-surface-secondary",
      avatar: "rounded-full bg-surface-secondary",
      button: "border border-interactive-primary/35 bg-interactive-primary/18",
    },
    size: {
      sm: "h-3",
      default: "h-4",
      lg: "h-6",
      xl: "h-8",
      "2xl": "h-12",
      auto: "h-auto",
    },
    shimmer: {
      true: "overflow-hidden",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
    shimmer: true,
  },
});

interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string | number;
  height?: string | number;
  announce?: boolean;
  ariaLabel?: string;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant,
      size,
      shimmer,
      width,
      height,
      style,
      announce = true,
      ariaLabel = "Loading...",
      ...props
    },
    ref,
  ) => {
    const prefersReducedMotion = useReducedMotion();

    const skeletonStyle = {
      ...style,
      ...(width && { width: typeof width === "number" ? `${width}px` : width }),
      ...(height && {
        height: typeof height === "number" ? `${height}px` : height,
      }),
    };

    const accessibilityProps: React.HTMLAttributes<HTMLDivElement> = announce
      ? { role: "status", "aria-label": ariaLabel }
      : { "aria-hidden": true };

    return (
      <div
        ref={ref}
        data-slot="skeleton"
        className={cn(skeletonVariants({ variant, size, shimmer }), className)}
        style={skeletonStyle}
        {...accessibilityProps}
        {...props}
      >
        {/* Shimmer effect overlay */}
        {shimmer && !prefersReducedMotion && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundSize: "200% 100%",
              backgroundImage:
                "linear-gradient(90deg, transparent, color-mix(in srgb, currentColor 24%, transparent 76%), transparent)",
            }}
            variants={skeletonShimmerVariants}
            animate="animate"
          />
        )}

        {/* Pulse fallback for reduced motion */}
        {shimmer && prefersReducedMotion && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              backgroundColor:
                "color-mix(in srgb, currentColor 18%, transparent 82%)",
            }}
          />
        )}
      </div>
    );
  },
);

Skeleton.displayName = "Skeleton";

/**
 * Skeleton variants for common UI patterns
 */

const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}> = ({ lines = 3, className, lastLineWidth = "75%" }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        variant="text"
        className={cn(
          "w-full",
          index === lines - 1 && "transition-all duration-300",
        )}
        style={index === lines - 1 ? { width: lastLineWidth } : undefined}
      />
    ))}
  </div>
);

const SkeletonCard: React.FC<{
  showAvatar?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  className?: string;
}> = ({
  showAvatar = true,
  showTitle = true,
  showDescription = true,
  className,
}) => (
  <Skeleton variant="card" className={cn("space-y-3 p-4", className)}>
    {showAvatar && (
      <div className="flex items-center space-x-3">
        <Skeleton variant="avatar" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton variant="text" className="h-3 w-1/3" />
        </div>
      </div>
    )}

    {showTitle && <Skeleton className="h-6 w-3/4" />}

    {showDescription && <SkeletonText lines={2} lastLineWidth="60%" />}
  </Skeleton>
);

const SkeletonStats: React.FC<{
  columns?: number;
  className?: string;
}> = ({ columns = 4, className }) => (
  <div
    className={cn("grid gap-4", className)}
    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
  >
    {Array.from({ length: columns }).map((_, index) => (
      <Skeleton key={index} variant="card" className="space-y-2 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton variant="text" className="h-4 w-2/3" />
      </Skeleton>
    ))}
  </div>
);

const SkeletonWorkoutCard: React.FC<{ className?: string }> = ({
  className,
}) => (
  <Skeleton variant="card" className={cn("space-y-4 p-6", className)}>
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton variant="text" className="h-4 w-20" />
    </div>

    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>

    <div className="flex items-center space-x-2 pt-2">
      <Skeleton variant="button" className="h-8 w-20" />
      <Skeleton variant="button" className="h-8 w-16" />
    </div>
  </Skeleton>
);

const SkeletonChart: React.FC<{
  height?: number;
  showLegend?: boolean;
  className?: string;
}> = ({ height = 200, showLegend = true, className }) => (
  <Skeleton variant="card" className={cn("space-y-4 p-4", className)}>
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-1/4" />
      <Skeleton variant="text" className="h-4 w-16" />
    </div>

    <div className="relative" style={{ height }}>
      <Skeleton className="h-full w-full" />

      {/* Simulated chart bars */}
      <div className="absolute right-0 bottom-0 left-0 flex items-end justify-between px-4 pb-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton
            key={index}
            className="bg-interactive-primary/18 w-6"
            height={Math.random() * height * 0.6 + height * 0.2}
          />
        ))}
      </div>
    </div>

    {showLegend && (
      <div className="flex items-center space-x-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton variant="text" className="h-3 w-16" />
          </div>
        ))}
      </div>
    )}
  </Skeleton>
);

const SkeletonList: React.FC<{
  items?: number;
  showAvatar?: boolean;
  className?: string;
}> = ({ items = 5, showAvatar = true, className }) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: items }).map((_, index) => (
      <div
        key={index}
        className="border-border/50 flex items-center space-x-3 rounded-lg border p-3"
      >
        {showAvatar && <Skeleton variant="avatar" className="h-8 w-8" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton variant="text" className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);

/**
 * Loading screen component with branded skeleton
 */
const SkeletonScreen: React.FC<{
  title?: string;
  showStats?: boolean;
  showChart?: boolean;
  showWorkouts?: boolean;
}> = ({
  title: _title = "Loading your fitness data...",
  showStats = true,
  showChart = true,
  showWorkouts = true,
}) => (
  <div className="space-y-6 p-4">
    {/* Header */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton variant="text" className="h-4 w-1/2" />
    </div>

    {/* Stats grid */}
    {showStats && <SkeletonStats />}

    {/* Chart section */}
    {showChart && (
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/4" />
        <SkeletonChart />
      </div>
    )}

    {/* Workouts section */}
    {showWorkouts && (
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/4" />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonWorkoutCard />
          <SkeletonWorkoutCard />
        </div>
      </div>
    )}
  </div>
);

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonStats,
  SkeletonWorkoutCard,
  SkeletonChart,
  SkeletonList,
  SkeletonScreen,
  skeletonVariants,
  type SkeletonProps,
};
