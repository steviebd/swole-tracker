/**
 * Theme-aware component variant system for Swole Tracker
 * 
 * Provides systematic approach to component theming with:
 * - Semantic variant naming (surface, interactive, status)
 * - Intent-based styling (default, primary, critical, success)
 * - Consistent component APIs
 * - WCAG 2.2 AA compliance
 */

export type ComponentVariant = 'surface' | 'elevated' | 'overlay' | 'interactive';
export type ComponentIntent = 'default' | 'primary' | 'secondary' | 'critical' | 'success' | 'warning';
export type ComponentSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Surface variants for backgrounds and containers
 */
export const surfaceVariants = {
  surface: {
    default: 'bg-surface-primary text-content-primary border-default',
    primary: 'bg-interactive-primary text-white border-interactive-primary',
    secondary: 'bg-surface-secondary text-content-secondary border-muted',
    critical: 'bg-status-danger text-white border-status-danger',
    success: 'bg-status-success text-white border-status-success',
    warning: 'bg-status-warning text-white border-status-warning',
  },
  elevated: {
    default: 'bg-surface-elevated text-content-primary border-default shadow-sm',
    primary: 'bg-interactive-primary text-white border-interactive-primary shadow-md',
    secondary: 'bg-surface-secondary text-content-secondary border-muted shadow-sm',
    critical: 'bg-status-danger text-white border-status-danger shadow-md',
    success: 'bg-status-success text-white border-status-success shadow-md',
    warning: 'bg-status-warning text-white border-status-warning shadow-md',
  },
  overlay: {
    default: 'glass-surface-medium text-content-primary border-default',
    primary: 'glass-surface-strong bg-interactive-primary/90 text-white border-interactive-primary',
    secondary: 'glass-surface-subtle text-content-secondary border-muted',
    critical: 'glass-surface-strong bg-status-danger/90 text-white border-status-danger',
    success: 'glass-surface-strong bg-status-success/90 text-white border-status-success',
    warning: 'glass-surface-strong bg-status-warning/90 text-white border-status-warning',
  },
  interactive: {
    default: 'bg-surface-primary hover:bg-surface-secondary text-content-primary border-default',
    primary: 'bg-interactive-primary hover:bg-interactive-primary/90 text-white border-interactive-primary',
    secondary: 'bg-interactive-secondary hover:bg-interactive-secondary/90 text-content-inverse border-interactive-secondary',
    critical: 'bg-status-danger hover:bg-status-danger/90 text-white border-status-danger',
    success: 'bg-status-success hover:bg-status-success/90 text-white border-status-success',
    warning: 'bg-status-warning hover:bg-status-warning/90 text-white border-status-warning',
  },
} as const;

/**
 * Text variants for content hierarchy
 */
export const textVariants = {
  default: 'text-content-primary',
  secondary: 'text-content-secondary',
  muted: 'text-content-muted',
  inverse: 'text-content-inverse',
  primary: 'text-interactive-primary',
  accent: 'text-interactive-accent',
  success: 'text-status-success',
  warning: 'text-status-warning',
  danger: 'text-status-danger',
} as const;

/**
 * Button variants following design system
 */
export const buttonVariants = {
  primary: 'btn-primary touch-target animate-button-press',
  secondary: 'btn-secondary touch-target animate-button-press',
  ghost: 'btn-ghost touch-target',
  destructive: 'btn-destructive touch-target animate-button-press',
  success: 'btn-success touch-target animate-button-press',
} as const;

/**
 * Size variants for consistent scaling
 */
export const sizeVariants = {
  sm: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    touch: 'touch-target',
  },
  md: {
    padding: 'px-4 py-2',
    text: 'text-base',
    touch: 'touch-target',
  },
  lg: {
    padding: 'px-6 py-3',
    text: 'text-lg',
    touch: 'touch-target-large',
  },
  xl: {
    padding: 'px-8 py-4',
    text: 'text-xl',
    touch: 'touch-target-xl',
  },
} as const;

/**
 * Glass morphism variants for elevated surfaces
 */
export const glassVariants = {
  subtle: 'glass-surface-subtle',
  medium: 'glass-surface-medium',
  strong: 'glass-surface-strong',
} as const;

/**
 * Animation variants for micro-interactions
 */
export const animationVariants = {
  none: '',
  hover: 'hover-lift',
  scale: 'hover-scale',
  press: 'animate-button-press',
  fade: 'animate-fade-in',
  stagger: 'animate-fade-in-up',
} as const;

/**
 * Helper function to get variant classes
 */
export function getVariantClasses(
  component: ComponentVariant,
  intent: ComponentIntent = 'default'
): string {
  return surfaceVariants[component][intent] || surfaceVariants[component].default;
}

/**
 * Helper function to combine variant, size, and animation classes
 */
export function combineVariants({
  variant,
  intent = 'default',
  size,
  glass,
  animation,
  className,
}: {
  variant?: ComponentVariant;
  intent?: ComponentIntent;
  size?: ComponentSize;
  glass?: keyof typeof glassVariants;
  animation?: keyof typeof animationVariants;
  className?: string;
}): string {
  const classes = [
    variant && getVariantClasses(variant, intent),
    size && `${sizeVariants[size].padding} ${sizeVariants[size].text} ${sizeVariants[size].touch}`,
    glass && glassVariants[glass],
    animation && animationVariants[animation],
    className,
  ].filter(Boolean);

  return classes.join(' ');
}

/**
 * Component props interface for theme-aware components
 */
export interface ThemeAwareProps {
  variant?: ComponentVariant;
  intent?: ComponentIntent;
  size?: ComponentSize;
  glass?: keyof typeof glassVariants;
  animation?: keyof typeof animationVariants;
  className?: string;
}