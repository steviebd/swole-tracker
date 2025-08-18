import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { cn } from '../../lib/utils';
import { useTheme } from '../providers/ThemeProvider';

/**
 * Text variants for semantic hierarchy
 */
type TextVariant = 'primary' | 'secondary' | 'muted' | 'accent' | 'inverse';

/**
 * Text sizes using design tokens
 */
type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';

/**
 * Text weights using design tokens
 */
type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

/**
 * Text semantic roles for proper hierarchy
 */
type TextRole = 'heading' | 'subheading' | 'body' | 'caption' | 'label' | 'code';

/**
 * Text visual styles for status indication
 */
type TextVisualStyle = 'default' | 'success' | 'warning' | 'danger' | 'info';

/**
 * Enhanced Text component props with dark-first typography
 */
interface TextProps extends RNTextProps {
  /** Text content */
  children: React.ReactNode;
  /** Semantic variant for color hierarchy */
  variant?: TextVariant;
  /** Text size using design tokens */
  size?: TextSize;
  /** Text weight using design tokens */
  weight?: TextWeight;
  /** Semantic role for accessibility and styling */
  role?: TextRole;
  /** Visual style for status indication */
  visualStyle?: TextVisualStyle;
  /** Center align text */
  center?: boolean;
  /** Truncate text with ellipsis */
  truncate?: boolean;
  /** Custom class names */
  className?: string;
}

/**
 * Dark-first Text component with semantic typography hierarchy
 * 
 * Features:
 * - Dark theme optimized with semantic color tokens
 * - Proper contrast ratios for accessibility
 * - Semantic hierarchy with role-based styling
 * - Status-aware coloring (success, warning, danger, info)
 * - Consistent size and weight tokens
 * - Typography patterns for headings, body, captions
 * - Accessibility-first design
 */
export function Text({
  children,
  variant = 'primary',
  size = 'base',
  weight = 'normal',
  role = 'body',
  visualStyle = 'default',
  center = false,
  truncate = false,
  className,
  ...props
}: TextProps) {
  const { activeTheme } = useTheme();
  
  // Base classes with typography tokens
  const baseClasses = cn(
    'font-sans',
    center && 'text-center',
    truncate && 'overflow-hidden',
    truncate && 'truncate'
  );
  
  // Size classes using design tokens
  const sizeClasses = {
    xs: 'text-token-xs',
    sm: 'text-token-sm',
    base: 'text-token-base',
    lg: 'text-token-lg',
    xl: 'text-token-xl',
    '2xl': 'text-token-2xl',
    '3xl': 'text-token-3xl',
  };
  
  // Weight classes using design tokens
  const weightClasses = {
    normal: 'font-token-normal',
    medium: 'font-token-medium',
    semibold: 'font-token-semibold',
    bold: 'font-token-bold',
  };
  
  // Role-based styling for semantic hierarchy
  const roleClasses = {
    heading: cn(
      'font-token-bold leading-tight',
      size === 'base' && 'text-token-2xl', // Default heading size
    ),
    subheading: cn(
      'font-token-semibold leading-snug',
      size === 'base' && 'text-token-lg', // Default subheading size
    ),
    body: cn(
      'font-token-normal leading-relaxed',
      size === 'base' && 'text-token-base', // Default body size
    ),
    caption: cn(
      'font-token-normal leading-tight',
      size === 'base' && 'text-token-sm', // Default caption size
    ),
    label: cn(
      'font-token-medium leading-none',
      size === 'base' && 'text-token-sm', // Default label size
    ),
    code: cn(
      'font-mono leading-tight',
      size === 'base' && 'text-token-sm', // Default code size
    ),
  };
  
  // Variant classes with semantic colors
  const variantClasses = {
    primary: 'text-text-primary',
    secondary: 'text-text-secondary',
    muted: 'text-text-muted',
    accent: 'text-primary',
    inverse: activeTheme === 'dark' ? 'text-background' : 'text-foreground',
  };
  
  // Visual style classes for status indication
  const visualStyleClasses = {
    default: '',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-info',
  };
  
  return (
    <RNText
      className={cn(
        baseClasses,
        sizeClasses[size],
        role !== 'body' ? roleClasses[role] : weightClasses[weight], // Role overrides weight
        visualStyle === 'default' ? variantClasses[variant] : visualStyleClasses[visualStyle],
        className
      )}
      {...props}
    >
      {children}
    </RNText>
  );
}

/**
 * Heading component for consistent heading hierarchy
 */
interface HeadingProps extends Omit<TextProps, 'role' | 'size'> {
  /** Heading level for semantic HTML and sizing */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function Heading({ 
  level = 1, 
  weight = 'bold',
  variant = 'primary',
  ...props 
}: HeadingProps) {
  const sizeMap = {
    1: '3xl' as const,
    2: '2xl' as const,
    3: 'xl' as const,
    4: 'lg' as const,
    5: 'base' as const,
    6: 'sm' as const,
  };
  
  return (
    <Text
      role="heading"
      size={sizeMap[level]}
      weight={weight}
      variant={variant}
      {...props}
    />
  );
}

/**
 * Subtitle component for subheadings
 */
interface SubtitleProps extends Omit<TextProps, 'role' | 'size' | 'weight'> {
  /** Subtitle size */
  size?: 'sm' | 'base' | 'lg';
}

export function Subtitle({ 
  size = 'base',
  variant = 'secondary',
  ...props 
}: SubtitleProps) {
  return (
    <Text
      role="subheading"
      size={size}
      variant={variant}
      {...props}
    />
  );
}

/**
 * Body component for regular text content
 */
interface BodyProps extends Omit<TextProps, 'role'> {}

export function Body({ 
  variant = 'primary',
  size = 'base',
  weight = 'normal',
  ...props 
}: BodyProps) {
  return (
    <Text
      role="body"
      variant={variant}
      size={size}
      weight={weight}
      {...props}
    />
  );
}

/**
 * Caption component for secondary text
 */
interface CaptionProps extends Omit<TextProps, 'role' | 'size'> {}

export function Caption({ 
  variant = 'muted',
  weight = 'normal',
  ...props 
}: CaptionProps) {
  return (
    <Text
      role="caption"
      size="sm"
      variant={variant}
      weight={weight}
      {...props}
    />
  );
}

/**
 * Label component for form labels and UI labels
 */
interface LabelProps extends Omit<TextProps, 'role' | 'size' | 'weight'> {}

export function Label({ 
  variant = 'primary',
  ...props 
}: LabelProps) {
  return (
    <Text
      role="label"
      size="sm"
      weight="medium"
      variant={variant}
      {...props}
    />
  );
}

/**
 * Code component for inline code
 */
interface CodeProps extends Omit<TextProps, 'role'> {}

export function Code({ 
  variant = 'accent',
  size = 'sm',
  className,
  ...props 
}: CodeProps) {
  return (
    <Text
      role="code"
      variant={variant}
      size={size}
      className={cn(
        'bg-bg-surface px-1 py-0.5 rounded-token-sm border border-border-muted',
        className
      )}
      {...props}
    />
  );
}

/**
 * Link component for clickable text
 */
interface LinkProps extends TextProps {
  /** Link pressed state */
  pressed?: boolean;
  /** Link disabled state */
  disabled?: boolean;
}

export function Link({ 
  variant = 'accent',
  weight = 'medium',
  pressed = false,
  disabled = false,
  className,
  ...props 
}: LinkProps) {
  return (
    <Text
      variant={variant}
      weight={weight}
      className={cn(
        'transition-opacity duration-base',
        !disabled && 'hover:opacity-80',
        pressed && 'opacity-60',
        disabled && 'opacity-40',
        className
      )}
      {...props}
    />
  );
}