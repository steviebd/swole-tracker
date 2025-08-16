/**
 * Design tokens for semantic styling across the Swole Tracker web application
 * 
 * Provides a centralized token system for:
 * - Color semantics with surface hierarchy
 * - Spacing and layout tokens
 * - Typography scales
 * - Border radius tokens
 * - Shadow and elevation tokens
 * - Motion and timing tokens
 * 
 * These tokens are mapped to CSS custom properties in globals.css
 * and used throughout the component system for consistent theming.
 */

/**
 * Surface hierarchy levels for dark-first design
 * Each level represents a different elevation in the UI
 */
export type SurfaceLevel = 'app' | 'surface' | 'card' | 'elevated';

/**
 * Visual styles for status-aware components
 */
export type VisualStyle = 'default' | 'success' | 'warning' | 'danger' | 'info';

/**
 * Component spacing sizes
 */
export type SpacingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Typography sizes
 */
export type TypographySize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';

/**
 * Shadow levels for elevation
 */
export type ShadowLevel = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Design tokens object with semantic naming
 * Maps to CSS custom properties defined in globals.css
 */
export const DesignTokens = {
  /**
   * Color tokens using semantic naming
   */
  colors: {
    // Primary brand colors
    primary: {
      default: 'var(--color-primary-default)',
      hover: 'var(--color-primary-hover)',
      active: 'var(--color-primary-active)',
    },
    
    // Secondary brand colors
    secondary: {
      default: 'var(--color-secondary-default)',
      hover: 'var(--color-secondary-hover)',
    },
    
    // Accent colors
    accent: {
      default: 'var(--color-accent-default)',
      hover: 'var(--color-accent-hover)',
    },
    
    // Background surface hierarchy
    background: {
      app: 'var(--color-background-app)',
      surface: 'var(--color-background-surface)',
      card: 'var(--color-background-card)',
    },
    
    // Text colors
    text: {
      primary: 'var(--color-text-primary)',
      secondary: 'var(--color-text-secondary)',
      muted: 'var(--color-text-muted)',
    },
    
    // Border colors
    border: {
      default: 'var(--color-border-default)',
      muted: 'var(--color-border-muted)',
    },
    
    // Status colors for semantic states
    status: {
      success: {
        default: 'var(--color-status-success-default)',
        muted: 'var(--color-status-success-muted)',
      },
      warning: {
        default: 'var(--color-status-warning-default)',
        muted: 'var(--color-status-warning-muted)',
      },
      danger: {
        default: 'var(--color-status-danger-default)',
        muted: 'var(--color-status-danger-muted)',
      },
      info: {
        default: 'var(--color-status-info-default)',
        muted: 'var(--color-status-info-muted)',
      },
    },
    
    // Glass effect colors
    glass: {
      highlight: 'var(--color-glass-highlight)',
      accent: 'var(--color-glass-accent)',
      border: 'var(--color-glass-border)',
      card: 'var(--color-glass-card)',
      modal: 'var(--color-glass-modal)',
    },
    
    // Chart colors for data visualization
    chart: {
      1: 'var(--color-chart-1)',
      2: 'var(--color-chart-2)',
      3: 'var(--color-chart-3)',
      4: 'var(--color-chart-4)',
      5: 'var(--color-chart-5)',
    },
  },
  
  /**
   * Spacing tokens for consistent layouts
   */
  spacing: {
    // Component padding
    component: {
      xs: 'var(--spacing-component-padding-xs)',
      sm: 'var(--spacing-component-padding-sm)',
      md: 'var(--spacing-component-padding-md)',
      lg: 'var(--spacing-component-padding-lg)',
      xl: 'var(--spacing-component-padding-xl)',
    },
    
    // Component gaps
    gap: {
      xs: 'var(--spacing-component-gap-xs)',
      sm: 'var(--spacing-component-gap-sm)',
      md: 'var(--spacing-component-gap-md)',
      lg: 'var(--spacing-component-gap-lg)',
      xl: 'var(--spacing-component-gap-xl)',
    },
    
    // Layout spacing
    layout: {
      section: {
        mobile: 'var(--spacing-layout-section-y-mobile)',
        desktop: 'var(--spacing-layout-section-y-desktop)',
      },
      container: {
        mobile: 'var(--spacing-layout-container-x-mobile)',
        tablet: 'var(--spacing-layout-container-x-tablet)',
        desktop: 'var(--spacing-layout-container-x-desktop)',
      },
    },
  },
  
  /**
   * Border radius tokens
   */
  borderRadius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    card: 'var(--radius-card)',
    full: 'var(--radius-full)',
  },
  
  /**
   * Typography tokens
   */
  typography: {
    fontFamily: {
      sans: 'var(--font-fontFamily-sans)',
      serif: 'var(--font-fontFamily-serif)',
      display: 'var(--font-fontFamily-display)',
    },
    
    fontSize: {
      xs: 'var(--font-fontSize-xs)',
      sm: 'var(--font-fontSize-sm)',
      base: 'var(--font-fontSize-base)',
      lg: 'var(--font-fontSize-lg)',
      xl: 'var(--font-fontSize-xl)',
      '2xl': 'var(--font-fontSize-2xl)',
      '3xl': 'var(--font-fontSize-3xl)',
    },
    
    fontWeight: {
      normal: 'var(--font-fontWeight-normal)',
      medium: 'var(--font-fontWeight-medium)',
      semibold: 'var(--font-fontWeight-semibold)',
      bold: 'var(--font-fontWeight-bold)',
      black: 'var(--font-fontWeight-black)',
    },
    
    lineHeight: {
      tight: 'var(--font-lineHeight-tight)',
      normal: 'var(--font-lineHeight-normal)',
      relaxed: 'var(--font-lineHeight-relaxed)',
    },
  },
  
  /**
   * Shadow tokens for elevation
   */
  shadow: {
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    focus: 'var(--shadow-focus)',
  },
  
  /**
   * Motion tokens for animations
   */
  motion: {
    duration: {
      fast: 'var(--motion-duration-fast)',
      base: 'var(--motion-duration-base)',
      slow: 'var(--motion-duration-slow)',
    },
    
    easing: {
      ease: 'var(--motion-easing-ease)',
      spring: 'var(--motion-easing-spring)',
    },
  },
  
  /**
   * Component-specific tokens
   */
  component: {
    button: {
      paddingX: 'var(--component-button-padding-x)',
      paddingY: 'var(--component-button-padding-y)',
      borderRadius: 'var(--component-button-borderRadius)',
      fontSize: 'var(--component-button-fontSize)',
      fontWeight: 'var(--component-button-fontWeight)',
    },
    
    card: {
      padding: 'var(--component-card-padding)',
      borderRadius: 'var(--component-card-borderRadius)',
      shadow: 'var(--component-card-shadow)',
    },
    
    input: {
      paddingX: 'var(--component-input-padding-x)',
      paddingY: 'var(--component-input-padding-y)',
      borderRadius: 'var(--component-input-borderRadius)',
      fontSize: 'var(--component-input-fontSize)',
    },
  },
} as const;

/**
 * Type-safe design tokens
 */
export type DesignTokensType = typeof DesignTokens;

/**
 * Utility functions for working with design tokens
 */
export const TokenUtils = {
  /**
   * Get surface background color based on hierarchy level
   */
  getSurfaceBackground: (surface: SurfaceLevel): string => {
    const surfaceMap: Record<SurfaceLevel, string> = {
      app: DesignTokens.colors.background.app,
      surface: DesignTokens.colors.background.surface,
      card: DesignTokens.colors.background.card,
      elevated: DesignTokens.colors.background.card,
    };
    return surfaceMap[surface];
  },
  
  /**
   * Get status color for visual styles
   */
  getStatusColor: (visualStyle: VisualStyle, variant: 'default' | 'muted' = 'default'): string => {
    if (visualStyle === 'default') return DesignTokens.colors.text.primary;
    
    const statusMap: Record<Exclude<VisualStyle, 'default'>, { default: string; muted: string }> = {
      success: DesignTokens.colors.status.success,
      warning: DesignTokens.colors.status.warning,
      danger: DesignTokens.colors.status.danger,
      info: DesignTokens.colors.status.info,
    };
    
    return statusMap[visualStyle][variant];
  },
  
  /**
   * Get component spacing value
   */
  getSpacing: (type: 'component' | 'gap', size: SpacingSize): string => {
    return type === 'component' 
      ? DesignTokens.spacing.component[size]
      : DesignTokens.spacing.gap[size];
  },
  
  /**
   * Get typography value
   */
  getTypography: (property: 'fontSize' | 'fontWeight', size: TypographySize | keyof typeof DesignTokens.typography.fontWeight): string => {
    if (property === 'fontSize') {
      return DesignTokens.typography.fontSize[size as TypographySize];
    }
    return DesignTokens.typography.fontWeight[size as keyof typeof DesignTokens.typography.fontWeight];
  },
  
  /**
   * Get shadow value for elevation
   */
  getShadow: (level: ShadowLevel): string => {
    return DesignTokens.shadow[level];
  },
} as const;

export default DesignTokens;