import * as React from "react"
import { cn } from "~/lib/utils"
import { type SurfaceLevel, type VisualStyle, type SpacingSize } from "~/lib/design-tokens"

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
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
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
    style,
    ...props 
  }, ref) => {
    const Comp = as as any;
    
    // Handle legacy props by mapping to new variant system
    const resolvedVariant = glass ? 'glass' : hairline ? 'outline' : variant;
    
    // Base classes with surface hierarchy
    const baseClasses = cn(
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
      default: cn(
        'border-border',
        surface === 'elevated' && 'shadow-sm',
        // Status-aware styling
        visualStyle === 'success' && 'bg-success-muted',
        visualStyle === 'warning' && 'bg-warning-muted',
        visualStyle === 'danger' && 'bg-danger-muted',
        visualStyle === 'info' && 'bg-info-muted'
      ),
      elevated: cn(
        'border-border shadow-md',
        visualStyle === 'success' && 'bg-success-muted',
        visualStyle === 'warning' && 'bg-warning-muted',
        visualStyle === 'danger' && 'bg-danger-muted',
        visualStyle === 'info' && 'bg-info-muted'
      ),
      glass: cn(
        'glass-card backdrop-blur-sm shadow-lg',
        'relative overflow-hidden',
        visualStyle === 'success' && 'bg-success-muted',
        visualStyle === 'warning' && 'bg-warning-muted',
        visualStyle === 'danger' && 'bg-danger-muted',
        visualStyle === 'info' && 'bg-info-muted'
      ),
      outline: cn(
        'bg-transparent border-2',
        visualStyle === 'default' && 'border-border',
        visualStyle === 'success' && 'text-success border-success',
        visualStyle === 'warning' && 'text-warning border-warning',
        visualStyle === 'danger' && 'text-danger border-destructive',
        visualStyle === 'info' && 'text-info border-info'
      ),
      interactive: cn(
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
        ref={ref}
        className={cn(
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
          ...style
        }}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {children}
      </Comp>
    );
  }
)
Card.displayName = "Card"

/**
 * Card Header component for consistent card layouts
 */
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, style, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          'border-b border-muted',
          className
        )}
        style={{
          paddingBottom: 'var(--spacing-component-sm)',
          ...style
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
)
CardHeader.displayName = "CardHeader"

/**
 * Card Title component for semantic card headers
 */
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  )
)
CardTitle.displayName = "CardTitle"

/**
 * Card Description component for semantic card headers
 */
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)
CardDescription.displayName = "CardDescription"

/**
 * Card Content component for consistent card layouts
 */
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, style, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(className)}
        style={{
          paddingTop: 'var(--spacing-component-md)',
          paddingBottom: 'var(--spacing-component-md)',
          ...style
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
)
CardContent.displayName = "CardContent"

/**
 * Card Footer component for consistent card layouts
 */
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, style, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          'border-t border-muted',
          className
        )}
        style={{
          paddingTop: 'var(--spacing-component-sm)',
          ...style
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }