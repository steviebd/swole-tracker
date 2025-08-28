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
    const isPositiveChange = change && !change.startsWith('-');
    
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={isInteractive ? { 
          scale: 1.02,
          y: -4,
        } : undefined}
        whileTap={isInteractive ? { scale: 0.98 } : undefined}
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
        <GlassSurface className="p-6 h-full">
          {/* Gradient background overlay for energy */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-lg"
            style={{
              background: 'var(--gradient-universal-stats-orange)'
            }}
            aria-hidden="true"
          />
          
          {/* Content container */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Header with icon and change indicator */}
            <div className="flex items-start justify-between mb-4">
              {/* Icon container with gradient background */}
              <div 
                className="flex items-center justify-center w-12 h-12 rounded-full shadow-sm"
                style={{
                  background: 'var(--gradient-universal-stats-orange)'
                }}
              >
                <div className="text-white text-xl">
                  {icon}
                </div>
              </div>
              
              {/* Change indicator */}
              {change && (
                <div className={cn(
                  "text-sm font-medium px-2 py-1 rounded-full",
                  isPositiveChange 
                    ? "text-success bg-success-muted" 
                    : "text-danger bg-danger-muted"
                )}>
                  {change}
                </div>
              )}
            </div>
            
            {/* Value and label */}
            <div className="flex-1 flex flex-col justify-end">
              <div 
                className="text-3xl font-bold mb-2 bg-clip-text text-transparent"
                style={{
                  background: 'var(--gradient-universal-stats-orange)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  // Fallback for browsers that don't support background-clip: text
                  color: 'var(--color-primary-default)'
                }}
              >
                {value}
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                {label}
              </p>
            </div>
          </div>
          
          {/* Enhanced hover shadow */}
          <div 
            className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
            style={{
              boxShadow: '0 20px 40px -10px rgba(255, 138, 76, 0.15)'
            }}
            aria-hidden="true"
          />
        </GlassSurface>
      </motion.div>
    );
  }
);

StatCard.displayName = "StatCard";

export { StatCard };