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
export interface CardProps {
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
  /** Additional CSS classes */
  className?: string;
  /** Children content */
  children?: React.ReactNode;
  /** Additional props spread to element */
  [key: string]: any;
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
    'card',
    // Interactive states with scale animation
    interactive && 'transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer',
    // Focus states for accessibility
    interactive && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  );
  
  // Surface-based background classes
  const surfaceClasses = {
    app: 'bg-app',
    surface: 'bg-surface',
    card: 'bg-card',
    elevated: 'bg-card',
  };
  
  // Variant classes with glass effects and shadows
  const variantClasses = {
    default: cx(
      'border-border',
      surface === 'elevated' && 'shadow-sm',
      // Status-aware styling
      visualStyle === 'success' && 'bg-success-muted',
      visualStyle === 'warning' && 'bg-warning-muted',
      visualStyle === 'danger' && 'bg-danger-muted',
      visualStyle === 'info' && 'bg-info-muted'
    ),
    elevated: cx(
      'border-border shadow-md',
      visualStyle === 'success' && 'bg-success-muted',
      visualStyle === 'warning' && 'bg-warning-muted',
      visualStyle === 'danger' && 'bg-danger-muted',
      visualStyle === 'info' && 'bg-info-muted'
    ),
    glass: cx(
      'glass-card backdrop-blur-sm shadow-lg',
      'relative overflow-hidden',
      visualStyle === 'success' && 'bg-success-muted',
      visualStyle === 'warning' && 'bg-warning-muted',
      visualStyle === 'danger' && 'bg-danger-muted',
      visualStyle === 'info' && 'bg-info-muted'
    ),
    outline: cx(
      'bg-transparent border-2',
      visualStyle === 'default' && 'border-border',
      visualStyle === 'success' && 'text-success',
      visualStyle === 'warning' && 'text-warning',
      visualStyle === 'danger' && 'text-danger',
      visualStyle === 'info' && 'text-info'
    ),
    interactive: cx(
      'card-interactive',
      'cursor-pointer',
      visualStyle === 'success' && 'hover:bg-success-muted',
      visualStyle === 'warning' && 'hover:bg-warning-muted',
      visualStyle === 'danger' && 'hover:bg-danger-muted',
      visualStyle === 'info' && 'hover:bg-info-muted'
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
      style={{
        padding: padding !== 'none' 
          ? `var(--spacing-component-${padding})`
          : undefined,
        ...rest.style
      }}
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
        'border-b border-muted',
        className
      )}
      style={{
        paddingBottom: 'var(--spacing-component-sm)',
        ...props.style
      }}
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
        className
      )}
      style={{
        paddingTop: 'var(--spacing-component-md)',
        paddingBottom: 'var(--spacing-component-md)',
        ...props.style
      }}
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
        'border-t border-muted',
        className
      )}
      style={{
        paddingTop: 'var(--spacing-component-sm)',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
