"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "~/lib/utils";
import { GlassSurface } from "./glass-surface";

/**
 * Stat card component for displaying statistics with celebratory styling
 *
 * Features:
 * - Gradient backgrounds with amber/orange theme from design tokens
 * - Hover animations (transform, elevation, shadow)
 * - Icon gradient backgrounds with circular containers
 * - Change indicators with positive/negative styling
 * - Accessible design with proper contrast ratios
 * - Touch-optimized for mobile (44px+ targets)
 */

export interface StatCardProps {
  /** Display label for the statistic */
  label: string;
  /** Main value to display */
  value: string;
  /** Optional change indicator (e.g., "+5.2%" or "-2.1%") */
  change?: string;
  /** Icon element to display */
  icon: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Click handler for interactive stats */
  onClick?: () => void;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, change, icon, className, onClick, ...props }, ref) => {
    const isInteractive = !!onClick;
    const isPositiveChange = change && !change.startsWith("-");

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        {...(isInteractive && {
          whileHover: {
            scale: 1.02,
            y: -4,
          },
          whileTap: { scale: 0.98 },
        })}
        transition={{
          duration: 0.2,
          ease: [0.4, 0, 0.2, 1],
        }}
        className={cn(
          "group relative",
          isInteractive && "cursor-pointer",
          className,
        )}
        onClick={onClick}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={
          isInteractive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        {...props}
      >
        <GlassSurface className="h-full p-6">
          {/* Gradient background overlay for energy */}
          <div
            className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-20"
            style={{
              background: "var(--gradient-universal-stats-orange)",
            }}
            aria-hidden="true"
          />

          {/* Content container */}
          <div className="relative z-10 flex h-full flex-col">
            {/* Header with icon and change indicator */}
            <div className="mb-4 flex items-start justify-between">
              {/* Icon container with gradient background */}
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full shadow-sm"
                style={{
                  background: "var(--gradient-universal-stats-orange)",
                }}
              >
                <div className="text-xl text-white">{icon}</div>
              </div>

              {/* Change indicator */}
              {change && (
                <div
                  className={cn(
                    "rounded-full px-2 py-2 text-sm font-medium",
                    isPositiveChange
                      ? "text-success bg-success-muted"
                      : "text-danger bg-danger-muted",
                  )}
                >
                  {change}
                </div>
              )}
            </div>

            {/* Value and label */}
            <div className="flex flex-1 flex-col justify-end">
              <div
                className="mb-2 bg-clip-text text-3xl font-bold text-transparent"
                style={{
                  background: "var(--gradient-universal-stats-orange)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  // Fallback for browsers that don't support background-clip: text
                  color: "var(--color-primary-default)",
                }}
              >
                {value}
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                {label}
              </p>
            </div>
          </div>

          {/* Enhanced hover shadow */}
          <div
            className="absolute inset-0 -z-10 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              boxShadow: "0 20px 40px -10px rgba(255, 138, 76, 0.15)",
            }}
            aria-hidden="true"
          />
        </GlassSurface>
      </motion.div>
    );
  },
);

StatCard.displayName = "StatCard";

export { StatCard };
