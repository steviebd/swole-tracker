import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';
import { useTheme } from '../providers/ThemeProvider';

/**
 * Card surface levels for dark theme hierarchy
 */
type CardSurface = 'app' | 'surface' | 'card' | 'elevated';

/**
 * Card variants with glass effects for dark theme
 */
type CardVariant = 'default' | 'elevated' | 'glass' | 'outline' | 'interactive';

/**
 * Visual styles for status-aware cards
 */
type CardVisualStyle = 'default' | 'success' | 'warning' | 'danger' | 'info';

/**
 * BREAKING: Enhanced Card component props with dark-first design
 */
interface CardProps extends ViewProps {
  /** Surface level in dark theme hierarchy - BREAKING: replaces simple variant */
  surface?: CardSurface;
  /** Visual variant with glass effects - BREAKING: enhanced variant system */
  variant?: CardVariant;
  /** Visual style for status indication */
  visualStyle?: CardVisualStyle;
  /** Interactive cards with hover/press states */
  interactive?: boolean;
  /** Custom padding - use 'none' to remove default padding */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Custom class names */
  className?: string;
}

/**
 * Dark-first Card component with surface hierarchy and glass effects
 * 
 * BREAKING CHANGES from v1:
 * - Removed hardcoded bg-white and gray borders
 * - Added surface hierarchy (app → surface → card → elevated)
 * - Enhanced variant system with glass effects
 * - Added visual styles for status indication
 * - Interactive variants with press states
 * - Configurable padding system
 * 
 * Features:
 * - Dark theme surface hierarchy with semantic tokens
 * - Glass effects for elevated cards
 * - Status-aware styling with proper contrast
 * - Interactive states for touchable cards
 * - Flexible padding system
 * - Enhanced shadow system for dark backgrounds
 */
export function Card({ 
  surface = 'card',
  variant = 'default', 
  visualStyle = 'default',
  interactive = false,
  padding = 'md',
  className, 
  children,
  ...props 
}: CardProps) {
  const { activeTheme } = useTheme();
  
  // Base classes with surface hierarchy
  const baseClasses = cn(
    'rounded-token-card border',
    padding !== 'none' && {
      'p-component-sm': padding === 'sm',
      'p-component-md': padding === 'md', 
      'p-component-lg': padding === 'lg',
      'p-component-xl': padding === 'xl',
    },
    interactive && 'transition-all duration-base active:scale-[0.98]'
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
    default: cn(
      'border-border-default',
      surface === 'elevated' && 'shadow-token-sm',
      visualStyle === 'success' && 'border-success/20 bg-success-muted/50',
      visualStyle === 'warning' && 'border-warning/20 bg-warning-muted/50',
      visualStyle === 'danger' && 'border-danger/20 bg-danger-muted/50',
      visualStyle === 'info' && 'border-info/20 bg-info-muted/50'
    ),
    elevated: cn(
      'border-border-default shadow-token-md',
      visualStyle === 'success' && 'border-success/30 bg-success-muted/60 shadow-success/20',
      visualStyle === 'warning' && 'border-warning/30 bg-warning-muted/60 shadow-warning/20',
      visualStyle === 'danger' && 'border-danger/30 bg-danger-muted/60 shadow-danger/20',
      visualStyle === 'info' && 'border-info/30 bg-info-muted/60 shadow-info/20'
    ),
    glass: cn(
      'bg-glass-card border-glass-border backdrop-blur-sm shadow-token-lg',
      'before:absolute before:inset-0 before:rounded-token-card before:bg-glass-highlight before:pointer-events-none',
      visualStyle === 'success' && 'bg-success/10 border-success/30',
      visualStyle === 'warning' && 'bg-warning/10 border-warning/30',
      visualStyle === 'danger' && 'bg-danger/10 border-danger/30',
      visualStyle === 'info' && 'bg-info/10 border-info/30'
    ),
    outline: cn(
      'bg-transparent border-2',
      visualStyle === 'default' && 'border-border-default',
      visualStyle === 'success' && 'border-success',
      visualStyle === 'warning' && 'border-warning',
      visualStyle === 'danger' && 'border-danger',
      visualStyle === 'info' && 'border-info'
    ),
    interactive: cn(
      'border-border-default shadow-token-xs',
      'hover:shadow-token-sm hover:border-primary/20 hover:bg-bg-surface/80',
      'active:shadow-token-xs active:border-primary/30',
      interactive && 'cursor-pointer',
      visualStyle === 'success' && 'hover:border-success/30 hover:bg-success-muted/30',
      visualStyle === 'warning' && 'hover:border-warning/30 hover:bg-warning-muted/30',
      visualStyle === 'danger' && 'hover:border-danger/30 hover:bg-danger-muted/30',
      visualStyle === 'info' && 'hover:border-info/30 hover:bg-info-muted/30'
    ),
  };
  
  // Glass effect positioning for glass variant
  const glassPositioning = variant === 'glass' ? 'relative overflow-hidden' : '';
  
  return (
    <View 
      className={cn(
        baseClasses,
        surfaceClasses[surface],
        variantClasses[variant],
        glassPositioning,
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}

/**
 * Card Header component for consistent card layouts
 */
interface CardHeaderProps extends ViewProps {
  className?: string;
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <View 
      className={cn(
        'pb-component-sm border-b border-border-muted/50',
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}

/**
 * Card Content component for consistent card layouts
 */
interface CardContentProps extends ViewProps {
  className?: string;
}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <View 
      className={cn(
        'py-component-md',
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}

/**
 * Card Footer component for consistent card layouts
 */
interface CardFooterProps extends ViewProps {
  className?: string;
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <View 
      className={cn(
        'pt-component-sm border-t border-border-muted/50',
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}