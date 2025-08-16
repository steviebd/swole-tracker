
/**
 * Design tokens for React Native mobile app
 * Synchronized with web theme system using OKLCH color space
 * Dark-first approach with full theme token support
 */

/**
 * Dark theme color palette using OKLCH for better perceptual uniformity
 */
export const DarkTheme = {
  // Semantic base colors
  foreground: 'oklch(1 0 0)', // Pure white
  background: 'oklch(0.145 0 0)', // True black
  
  // Text hierarchy
  text: {
    primary: 'oklch(1 0 0)', // White text
    secondary: 'oklch(0.708 0 0)', // Secondary gray
    muted: 'oklch(0.65 0 0)', // Muted gray
  },
  
  // Background variants
  bg: {
    app: 'oklch(0.145 0 0)', // Main app background
    surface: 'oklch(0.205 0 0)', // Surface for cards
    card: 'oklch(0.205 0 0)', // Card background
  },
  
  // Border colors
  border: {
    default: 'oklch(0.269 0 0)', // Default border
    muted: 'oklch(0.269 0 0)', // Muted border
  },
  
  // Primary brand colors
  primary: {
    default: 'oklch(0.985 0 0)', // Primary brand
    hover: 'oklch(0.9 0 0)', // Primary hover
    active: 'oklch(0.85 0 0)', // Primary active
    foreground: 'oklch(0.145 0 0)', // Text on primary
  },
  
  // Secondary colors
  secondary: {
    default: 'oklch(0.269 0 0)', // Secondary
    hover: 'oklch(0.32 0 0)', // Secondary hover
    foreground: 'oklch(1 0 0)', // Text on secondary
  },
  
  // Status colors
  status: {
    success: {
      default: 'oklch(0.696 0.17 162.48)', // Success green
      muted: 'oklch(0.25 0.08 142.5)', // Muted success background
      foreground: 'oklch(1 0 0)', // Text on success
    },
    warning: {
      default: 'oklch(0.769 0.188 70.08)', // Warning yellow
      muted: 'oklch(0.25 0.08 70.08)', // Muted warning background
      foreground: 'oklch(0.145 0 0)', // Text on warning
    },
    danger: {
      default: 'oklch(0.637 0.237 25.331)', // Danger red
      muted: 'oklch(0.25 0.08 25.331)', // Muted danger background
      foreground: 'oklch(1 0 0)', // Text on danger
    },
    info: {
      default: 'oklch(0.488 0.243 264.376)', // Info blue
      muted: 'oklch(0.25 0.08 264.376)', // Muted info background
      foreground: 'oklch(1 0 0)', // Text on info
    },
  },
  
  // Chart colors
  chart: {
    1: 'oklch(0.488 0.243 264.376)', // Blue
    2: 'oklch(0.696 0.17 162.48)', // Green
    3: 'oklch(0.769 0.188 70.08)', // Yellow
    4: 'oklch(0.627 0.265 303.9)', // Purple
    5: 'oklch(0.645 0.246 16.439)', // Orange
  },
  
  // Glass effects
  glass: {
    highlight: 'oklch(0.985 0 0 / 0.05)', // Glass highlight
    accent: 'oklch(0.488 0.243 264.376 / 0.1)', // Glass accent
    border: 'oklch(0.985 0 0 / 0.3)', // Glass border
    card: 'oklch(0.205 0 0 / 0.8)', // Glass card background
    modal: 'oklch(0.145 0 0 / 0.95)', // Glass modal background
  },
} as const;

/**
 * Light theme color palette (placeholder for future implementation)
 * For Phase 1, we'll use dark theme colors to maintain consistency
 */
export const LightTheme = {
  // For Phase 1, we use dark theme structure but will be expanded later
  foreground: 'oklch(1 0 0)', // Keep consistent with dark for now
  background: 'oklch(0.145 0 0)', // Keep consistent with dark for now
  
  text: {
    primary: 'oklch(1 0 0)', // Keep consistent with dark for now
    secondary: 'oklch(0.708 0 0)', // Keep consistent with dark for now
    muted: 'oklch(0.65 0 0)', // Keep consistent with dark for now
  },
  
  bg: {
    app: 'oklch(0.145 0 0)', // Keep consistent with dark for now
    surface: 'oklch(0.205 0 0)', // Keep consistent with dark for now
    card: 'oklch(0.205 0 0)', // Keep consistent with dark for now
  },
  
  border: {
    default: 'oklch(0.269 0 0)', // Keep consistent with dark for now
    muted: 'oklch(0.269 0 0)', // Keep consistent with dark for now
  },
  
  primary: DarkTheme.primary, // Keep same primary for consistency
  secondary: DarkTheme.secondary,
  status: DarkTheme.status,
  chart: DarkTheme.chart,
  glass: DarkTheme.glass,
} as const;

/**
 * Component spacing tokens
 */
export const Spacing = {
  component: {
    padding: {
      xs: 8, // 0.5rem
      sm: 12, // 0.75rem
      md: 16, // 1rem
      lg: 24, // 1.5rem
      xl: 32, // 2rem
    },
    gap: {
      xs: 4, // 0.25rem
      sm: 8, // 0.5rem
      md: 12, // 0.75rem
      lg: 16, // 1rem
      xl: 24, // 1.5rem
    },
  },
  layout: {
    section: {
      mobile: 24, // 1.5rem
      tablet: 32, // 2rem
    },
    container: {
      mobile: 16, // 1rem
      tablet: 24, // 1.5rem
    },
  },
} as const;

/**
 * Border radius tokens
 */
export const BorderRadius = {
  sm: 4, // 0.25rem
  md: 6, // 0.375rem
  lg: 8, // 0.5rem
  card: 12, // 0.75rem
  full: 9999, // Full radius for pills/circles
} as const;

/**
 * Typography tokens
 */
export const Typography = {
  fontSize: {
    xs: 12, // 0.75rem
    sm: 14, // 0.875rem
    base: 16, // 1rem
    lg: 18, // 1.125rem
    xl: 20, // 1.25rem
    '2xl': 24, // 1.5rem
    '3xl': 30, // 1.875rem
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
  fontFamily: {
    sans: 'System',
    mono: 'Courier New',
  },
} as const;

/**
 * Animation and motion tokens
 */
export const Motion = {
  duration: {
    fast: 160, // Fast animation
    base: 200, // Base animation
    slow: 240, // Slow animation
  },
  easing: {
    ease: [0.2, 0.8, 0.2, 1] as const, // Standard easing
    spring: [0.2, 0.8, 0.2, 1.2] as const, // Spring easing
  },
} as const;

/**
 * Shadow tokens optimized for dark theme
 */
export const Shadow = {
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 30,
    elevation: 12,
  },
} as const;

/**
 * Complete design token export
 */
export const DesignTokens = {
  theme: {
    dark: DarkTheme,
    light: LightTheme,
  },
  spacing: Spacing,
  borderRadius: BorderRadius,
  typography: Typography,
  motion: Motion,
  shadow: Shadow,
} as const;

export type DesignTokensType = typeof DesignTokens;
export type ThemeColors = typeof DarkTheme;
export type SpacingTokens = typeof Spacing;
export type TypographyTokens = typeof Typography;

/**
 * Utility function to get current theme colors
 */
export function getThemeColors(isDark: boolean = true): typeof DarkTheme {
  return isDark ? DarkTheme : LightTheme;
}

/**
 * Utility function to get spacing value
 */
export function getSpacing(
  category: keyof typeof Spacing,
  size: keyof typeof Spacing.component.padding | keyof typeof Spacing.layout
): number {
  if (category === 'component') {
    return Spacing.component.padding[size as keyof typeof Spacing.component.padding] || 
           Spacing.component.gap[size as keyof typeof Spacing.component.gap] || 16;
  }
  return (Spacing.layout as any)[size] || 16;
}

/**
 * Utility function to get typography styles
 */
export function getTypography(size: keyof typeof Typography.fontSize, weight?: keyof typeof Typography.fontWeight) {
  return {
    fontSize: Typography.fontSize[size],
    fontWeight: weight ? Typography.fontWeight[weight] : Typography.fontWeight.normal,
    lineHeight: Typography.lineHeight.normal,
    fontFamily: Typography.fontFamily.sans,
  };
}
