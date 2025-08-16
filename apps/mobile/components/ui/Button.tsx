import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { cn } from '../../lib/utils';
import { useTheme } from '../providers/ThemeProvider';

/**
 * Button variants optimized for dark theme with glass effects
 */
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass';

/**
 * Button sizes with consistent spacing tokens
 */
type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Visual styles for button states
 */
type ButtonVisualStyle = 'default' | 'success' | 'warning' | 'danger';

/**
 * BREAKING: Enhanced Button component props with dark-first design
 */
interface ButtonProps extends TouchableOpacityProps {
  /** Button text content */
  children: React.ReactNode;
  /** Visual variant - BREAKING: removed 'title' prop in favor of children */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Visual style for status indication */
  visualStyle?: ButtonVisualStyle;
  /** Loading state with spinner */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class names */
  className?: string;
}

/**
 * Dark-first Button component with glass effects and semantic tokens
 * 
 * BREAKING CHANGES from v1:
 * - Removed 'title' prop - use children instead
 * - Added 'glass' and 'ghost' variants  
 * - Added 'visualStyle' prop for status colors
 * - Enhanced focus states with glass effects
 * - All colors now use semantic design tokens
 * 
 * Features:
 * - Dark theme optimized with glass effects
 * - Semantic color tokens for accessibility
 * - Enhanced focus states and interactions
 * - Consistent spacing and typography tokens
 * - Loading states with proper contrast
 * - Status-aware styling (success, warning, danger)
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  visualStyle = 'default',
  loading = false,
  disabled = false,
  className,
  ...props
}: ButtonProps) {
  const { activeTheme } = useTheme();
  
  // Base classes with enhanced focus states
  const baseClasses = cn(
    'items-center justify-center rounded-token-lg border transition-all duration-base',
    'focus:shadow-token-focus focus:scale-[1.02] active:scale-[0.98]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100'
  );
  
  // Variant classes with glass effects and semantic tokens
  const variantClasses = {
    primary: cn(
      'bg-primary border-primary shadow-token-sm',
      'active:bg-primary-active hover:bg-primary-hover',
      visualStyle === 'success' && 'bg-success border-success hover:bg-success/90',
      visualStyle === 'warning' && 'bg-warning border-warning hover:bg-warning/90',
      visualStyle === 'danger' && 'bg-danger border-danger hover:bg-danger/90'
    ),
    secondary: cn(
      'bg-bg-surface border-border-default shadow-token-xs',
      'active:bg-secondary-hover hover:bg-secondary-hover',
      visualStyle === 'success' && 'bg-success-muted border-success/30 hover:bg-success-muted/80',
      visualStyle === 'warning' && 'bg-warning-muted border-warning/30 hover:bg-warning-muted/80',
      visualStyle === 'danger' && 'bg-danger-muted border-danger/30 hover:bg-danger-muted/80'
    ),
    outline: cn(
      'bg-transparent border-primary',
      'active:bg-primary/10 hover:bg-primary/5',
      visualStyle === 'success' && 'border-success hover:bg-success/5',
      visualStyle === 'warning' && 'border-warning hover:bg-warning/5',
      visualStyle === 'danger' && 'border-danger hover:bg-danger/5'
    ),
    ghost: cn(
      'bg-transparent border-transparent',
      'active:bg-bg-surface hover:bg-bg-surface/50',
      visualStyle === 'success' && 'hover:bg-success/10',
      visualStyle === 'warning' && 'hover:bg-warning/10',
      visualStyle === 'danger' && 'hover:bg-danger/10'
    ),
    glass: cn(
      'bg-glass-card border-glass-border backdrop-blur-sm shadow-token-md',
      'active:bg-glass-card/90 hover:bg-glass-card/95',
      visualStyle === 'success' && 'bg-success/20 border-success/30',
      visualStyle === 'warning' && 'bg-warning/20 border-warning/30',
      visualStyle === 'danger' && 'bg-danger/20 border-danger/30'
    ),
  };
  
  // Size classes using design tokens
  const sizeClasses = {
    sm: 'px-component-sm py-component-xs min-h-[32px]',
    md: 'px-component-md py-component-sm min-h-[40px]',
    lg: 'px-component-lg py-component-md min-h-[48px]',
  };
  
  // Text variant classes with semantic colors
  const textVariantClasses = {
    primary: cn(
      'font-token-medium',
      variant === 'primary' && visualStyle === 'default' && 'text-primary-foreground',
      variant === 'primary' && visualStyle === 'success' && 'text-success-foreground',
      variant === 'primary' && visualStyle === 'warning' && 'text-warning-foreground',
      variant === 'primary' && visualStyle === 'danger' && 'text-danger-foreground',
      variant === 'secondary' && 'text-text-primary',
      variant === 'outline' && visualStyle === 'default' && 'text-primary',
      variant === 'outline' && visualStyle === 'success' && 'text-success',
      variant === 'outline' && visualStyle === 'warning' && 'text-warning',
      variant === 'outline' && visualStyle === 'danger' && 'text-danger',
      variant === 'ghost' && 'text-text-primary',
      variant === 'glass' && 'text-text-primary'
    ),
    secondary: 'text-text-primary font-token-medium',
    outline: cn(
      'font-token-medium',
      visualStyle === 'default' && 'text-primary',
      visualStyle === 'success' && 'text-success',
      visualStyle === 'warning' && 'text-warning',
      visualStyle === 'danger' && 'text-danger'
    ),
    ghost: 'text-text-primary font-token-medium',
    glass: 'text-text-primary font-token-medium',
  };
  
  // Text size classes using typography tokens
  const textSizeClasses = {
    sm: 'text-token-sm',
    md: 'text-token-base',
    lg: 'text-token-lg',
  };
  
  // Loading spinner color based on variant and visual style
  const getSpinnerColor = () => {
    if (variant === 'primary') {
      switch (visualStyle) {
        case 'success': return '#ffffff';
        case 'warning': return '#000000';
        case 'danger': return '#ffffff';
        default: return '#000000';
      }
    }
    
    if (variant === 'outline' || variant === 'ghost' || variant === 'glass') {
      switch (visualStyle) {
        case 'success': return activeTheme === 'dark' ? '#22c55e' : '#16a34a';
        case 'warning': return activeTheme === 'dark' ? '#eab308' : '#ca8a04';
        case 'danger': return activeTheme === 'dark' ? '#ef4444' : '#dc2626';
        default: return activeTheme === 'dark' ? '#ffffff' : '#000000';
      }
    }
    
    return activeTheme === 'dark' ? '#ffffff' : '#000000';
  };
  
  return (
    <TouchableOpacity
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getSpinnerColor()}
        />
      ) : (
        <Text
          className={cn(
            textVariantClasses[variant],
            textSizeClasses[size]
          )}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}