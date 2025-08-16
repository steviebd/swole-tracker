"use client";

import React from "react";
import { type SurfaceLevel, type VisualStyle, type SpacingSize } from "~/lib/design-tokens";

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

/**
 * Card surface levels for dark theme hierarchy
 */
type CardSurface = SurfaceLevel;

/**
 * Card variants with glass effects for dark theme
 */
type CardVariant = 'default' | 'elevated' | 'glass' | 'outline' | 'interactive';

/**
 * Visual styles for status-aware cards
 */
type CardVisualStyle = VisualStyle;

/**
 * Enhanced Card component props with mobile app patterns
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Surface level in dark theme hierarchy - controls background elevation */
  surface?: CardSurface;
  /** Visual variant with glass effects and elevation */
  variant?: CardVariant;
  /** Visual style for status indication */
  visualStyle?: CardVisualStyle;
  /** Interactive cards with hover/press states */
  interactive?: boolean;
  /** Custom padding - use 'none' to remove default padding */
  padding?: 'none' | SpacingSize;
  /** Legacy glass prop for backward compatibility */
  glass?: boolean;
  /** Legacy hairline prop for backward compatibility */
  hairline?: boolean;
  /** Element type to render as */
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Enhanced Card component with surface hierarchy and glass effects
 * 
 * Features:
 * - Dark theme surface hierarchy with semantic tokens
 * - Glass effects for elevated cards with backdrop blur
 * - Status-aware styling with proper contrast
 * - Interactive states for touchable cards
 * - Flexible padding system
 * - Enhanced shadow system for dark backgrounds
 * - Maintains backward compatibility with existing usage
 * 
 * Surface Hierarchy (dark-first):
 * - app: App background level
 * - surface: Primary surface level above app
 * - card: Card surface level above surface
 * - elevated: Elevated card with additional shadow
 * 
 * @param surface - Surface level in hierarchy (default: 'card')
 * @param variant - Visual variant with effects (default: 'default')
 * @param visualStyle - Status indication style (default: 'default')
 * @param interactive - Enable interactive hover/focus states
 * @param padding - Component padding size or 'none'
 * @param glass - Legacy glass effect (maps to variant: 'glass')
 * @param hairline - Legacy hairline border (maps to variant: 'outline')
 */
export function Card({ 
  surface = 'card',
  variant = 'default', 
  visualStyle = 'default',
  interactive = false,
  padding = 'md',
  glass = false,
  hairline = false,
  className,
  as = "div",
  children,
  ...rest 
}: CardProps) {
  const Comp = as as any;
  
  // Handle legacy props by mapping to new variant system
  const resolvedVariant = glass ? 'glass' : hairline ? 'outline' : variant;
  
  // Base classes with surface hierarchy and padding
  const baseClasses = cx(
    'rounded-token-card border',
    // Padding system
    padding === 'xs' && 'p-component-xs',
    padding === 'sm' && 'p-component-sm',
    padding === 'md' && 'p-component-md',
    padding === 'lg' && 'p-component-lg',
    padding === 'xl' && 'p-component-xl',
    // Interactive states with scale animation
    interactive && 'transition-all duration-base hover:scale-[1.02] active:scale-[0.98] cursor-pointer',
    // Focus states for accessibility
    interactive && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  );
  
  // Surface-based background classes
  const surfaceClasses = {
    app: 'bg-bg-app',
    surface: 'bg-bg-surface',
    card: 'bg-bg-card',
    elevated: 'bg-bg-card',
  };
  
  // Variant classes with glass effects and shadows
  const variantClasses = {
    default: cx(
      'border-border-default',
      surface === 'elevated' && 'shadow-token-sm',
      // Status-aware styling
      visualStyle === 'success' && 'border-success/20 bg-success-muted/50',
      visualStyle === 'warning' && 'border-warning/20 bg-warning-muted/50',
      visualStyle === 'danger' && 'border-danger/20 bg-danger-muted/50',
      visualStyle === 'info' && 'border-info/20 bg-info-muted/50'
    ),
    elevated: cx(
      'border-border-default shadow-token-md',
      visualStyle === 'success' && 'border-success/30 bg-success-muted/60 shadow-success/20',
      visualStyle === 'warning' && 'border-warning/30 bg-warning-muted/60 shadow-warning/20',
      visualStyle === 'danger' && 'border-danger/30 bg-danger-muted/60 shadow-danger/20',
      visualStyle === 'info' && 'border-info/30 bg-info-muted/60 shadow-info/20'
    ),
    glass: cx(
      'bg-glass-card border-glass-border backdrop-blur-sm shadow-token-lg',
      'before:absolute before:inset-0 before:rounded-token-card before:bg-glass-highlight before:pointer-events-none',
      visualStyle === 'success' && 'bg-success/10 border-success/30',
      visualStyle === 'warning' && 'bg-warning/10 border-warning/30',
      visualStyle === 'danger' && 'bg-danger/10 border-danger/30',
      visualStyle === 'info' && 'bg-info/10 border-info/30'
    ),
    outline: cx(
      'bg-transparent border-2',
      visualStyle === 'default' && 'border-border-default',
      visualStyle === 'success' && 'border-success',
      visualStyle === 'warning' && 'border-warning',
      visualStyle === 'danger' && 'border-danger',
      visualStyle === 'info' && 'border-info'
    ),
    interactive: cx(
      'border-border-default shadow-token-xs',
      'hover:shadow-token-sm hover:border-primary/20 hover:bg-bg-surface/80',
      'active:shadow-token-xs active:border-primary/30',
      'cursor-pointer',
      visualStyle === 'success' && 'hover:border-success/30 hover:bg-success-muted/30',
      visualStyle === 'warning' && 'hover:border-warning/30 hover:bg-warning-muted/30',
      visualStyle === 'danger' && 'hover:border-danger/30 hover:bg-danger-muted/30',
      visualStyle === 'info' && 'hover:border-info/30 hover:bg-info-muted/30'
    ),
  };
  
  // Glass effect positioning for glass variant
  const glassPositioning = resolvedVariant === 'glass' ? 'relative overflow-hidden' : '';
  
  // Apply interactive variant automatically if interactive prop is true
  const finalVariant = interactive && resolvedVariant === 'default' ? 'interactive' : resolvedVariant;
  
  return (
    <Comp 
      className={cx(
        baseClasses,
        surfaceClasses[surface],
        variantClasses[finalVariant],
        glassPositioning,
        className
      )}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/**
 * Card Header component for consistent card layouts
 * 
 * @param className - Additional CSS classes
 * @param children - Header content
 */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div 
      className={cx(
        'pb-component-sm border-b border-border-muted/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card Content component for consistent card layouts
 * 
 * @param className - Additional CSS classes 
 * @param children - Content
 */
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div 
      className={cx(
        'py-component-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card Footer component for consistent card layouts
 * 
 * @param className - Additional CSS classes
 * @param children - Footer content
 */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div 
      className={cx(
        'pt-component-sm border-t border-border-muted/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
