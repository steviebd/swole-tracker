/**
 * Design Tokens Foundation
 * Centralized design system tokens based on the Swole Tracker Design Manifesto
 * 
 * This file provides a TypeScript interface for all design tokens, ensuring
 * consistency across components and making it easier to maintain the design system.
 */

// Color Tokens - Based on energetic fitness theme
export const colors = {
  // Primary brand colors
  primary: {
    50: '#fff7ed',
    100: '#ffedd5', 
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316', // Primary orange - energy, enthusiasm, motivation
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  
  // Secondary/Amber colors
  secondary: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Secondary amber - warmth, progress, achievement
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  
  // Accent colors
  accent: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa', 
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316', // Accent orange
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  
  // Neutral colors - cream and dark
  neutral: {
    50: '#fefce8', // Light cream backgrounds
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
    950: '#422006',
  },
  
  // Gray scale
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280', // Medium gray for muted text
    600: '#4b5563', // Dark gray for primary text
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  
  // Slate (for dark mode)
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155', // Medium slate for dark mode surfaces
    800: '#1e293b', // Dark slate for cards
    900: '#0f172a', // Deep dark for backgrounds
    950: '#020617',
  },
  
  // Semantic colors
  success: {
    500: '#10b981', // Success/positive color
    600: '#059669',
  },
  
  warning: {
    500: '#f59e0b', // Warning color (matches secondary)
    600: '#d97706',
  },
  
  danger: {
    500: '#dc2626', // Danger/error color (light mode)
    600: '#b91c1c',
    dark: '#ef4444', // Brighter danger for dark mode
  },
} as const;

// Typography Tokens - Montserrat & Open Sans hierarchy
export const typography = {
  fontFamily: {
    display: ['var(--font-montserrat)', 'Montserrat', 'ui-serif', 'Georgia', 'serif'],
    heading: ['var(--font-montserrat)', 'Montserrat', 'ui-serif', 'Georgia', 'serif'], 
    body: ['var(--font-open-sans)', 'Open Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    ui: ['var(--font-open-sans)', 'Open Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  },
  
  fontSize: {
    // Display sizes (Montserrat Black): Hero numbers, key achievements
    'display-sm': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '900' }], // 36px
    'display-md': ['3rem', { lineHeight: '3rem', fontWeight: '900' }], // 48px
    'display-lg': ['3.75rem', { lineHeight: '3.75rem', fontWeight: '900' }], // 60px
    'display-xl': ['4.5rem', { lineHeight: '4.5rem', fontWeight: '900' }], // 72px
    
    // Heading sizes (Montserrat Bold): Section titles, action buttons
    'heading-sm': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '700' }], // 20px
    'heading-md': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }], // 24px
    'heading-lg': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }], // 30px
    'heading-xl': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }], // 36px
    
    // Body sizes (Open Sans Regular): Content, descriptions, labels
    'body-xs': ['0.75rem', { lineHeight: '1.125rem', fontWeight: '400' }], // 12px
    'body-sm': ['0.875rem', { lineHeight: '1.3125rem', fontWeight: '400' }], // 14px
    'body-md': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }], // 16px
    'body-lg': ['1.125rem', { lineHeight: '1.6875rem', fontWeight: '400' }], // 18px
    
    // UI sizes (Open Sans Medium): Interface elements, navigation
    'ui-xs': ['0.75rem', { lineHeight: '1.125rem', fontWeight: '500' }], // 12px
    'ui-sm': ['0.875rem', { lineHeight: '1.3125rem', fontWeight: '500' }], // 14px
    'ui-md': ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }], // 16px
    'ui-lg': ['1.125rem', { lineHeight: '1.6875rem', fontWeight: '500' }], // 18px
  },
  
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
  
  lineHeight: {
    none: '1',
    tight: '1.25',
    normal: '1.5', // Optimal readability from design manifesto
    relaxed: '1.625',
    loose: '2',
  },
  
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
} as const;

// Spacing Tokens - 8px base unit system
export const spacing = {
  // Base 8px unit system
  0: '0px',
  1: '8px',   // 1 unit
  2: '16px',  // 2 units
  3: '24px',  // 3 units
  4: '32px',  // 4 units
  5: '40px',  // 5 units
  6: '48px',  // 6 units
  8: '64px',  // 8 units
  10: '80px', // 10 units
  12: '96px', // 12 units
  16: '128px', // 16 units
  20: '160px', // 20 units
  24: '192px', // 24 units
  32: '256px', // 32 units
  
  // Semantic spacing
  xs: '8px',
  sm: '16px', 
  md: '24px',
  lg: '32px',
  xl: '48px',
  '2xl': '64px',
  '3xl': '96px',
  
  // Component-specific spacing
  buttonPadding: {
    sm: { x: '12px', y: '8px' },
    md: { x: '16px', y: '8px' },
    lg: { x: '24px', y: '12px' },
    xl: { x: '32px', y: '16px' },
  },
  
  cardPadding: {
    sm: '16px',
    md: '24px',
    lg: '32px',
  },
} as const;

// Border Radius Tokens
export const borderRadius = {
  none: '0px',
  sm: '6px',
  md: '12px',   // 0.75rem - from CSS variables
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
} as const;

// Shadow Tokens
export const shadows = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  
  // Colored shadows for interactive elements
  primary: '0 4px 12px -2px rgb(217 119 6 / 0.25)', // Amber shadow for primary buttons
  secondary: '0 4px 12px -2px rgb(245 158 11 / 0.25)', // Orange shadow for secondary buttons
} as const;

// Animation Tokens - Based on design manifesto standards
export const animation = {
  duration: {
    micro: '150ms',     // Micro-interactions
    fast: '200ms',      // Fast interactions 
    base: '300ms',      // Base duration for most animations
    slow: '400ms',      // Page transitions (lower end)
    slower: '600ms',    // Page transitions (upper end)
  },
  
  easing: {
    // Primary easing function from design manifesto
    energetic: 'cubic-bezier(0.4, 0, 0.2, 1)', // Natural, energetic feel
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // Animation presets
  hover: {
    lift: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    scale: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  button: {
    press: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  fade: {
    in: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    out: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Breakpoint Tokens - Mobile-first from design manifesto
export const breakpoints = {
  mobile: '320px',
  tablet: '768px', 
  desktop: '1024px',
  wide: '1440px',
} as const;

// Touch Target Tokens - Accessibility compliance
export const touchTargets = {
  minimum: '44px',  // WCAG minimum
  comfortable: '48px', // Comfortable size
  large: '56px',    // Large interactive elements
} as const;

// Z-Index Tokens
export const zIndex = {
  base: 1,
  elevated: 10,
  sticky: 100,
  dropdown: 1000,
  overlay: 10000,
  modal: 50000,
  toast: 100000,
} as const;

// Gradient Tokens - Energetic theme
export const gradients = {
  primary: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
  secondary: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  warning: 'linear-gradient(135deg, var(--secondary) 0%, var(--accent) 100%)',
  
  // Card gradients
  cardSubtle: 'linear-gradient(135deg, var(--card) 0%, color-mix(in srgb, var(--card) 98%, var(--primary) 2%) 100%)',
  cardHover: 'linear-gradient(135deg, var(--card) 0%, color-mix(in srgb, var(--card) 97%, var(--primary) 3%) 100%)',
  
  // Progress gradients
  progress: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
  progressSuccess: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
  progressWarning: 'linear-gradient(90deg, var(--secondary) 0%, var(--accent) 100%)',
  
  // Text gradients
  textPrimary: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
  textDisplay: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
  
  // Animated gradient
  animated: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 50%, var(--secondary) 100%)',
} as const;

// Component Tokens - Pre-configured component styles
export const components = {
  button: {
    variants: {
      primary: {
        backgroundColor: 'var(--primary)',
        color: 'var(--primary-foreground)',
        boxShadow: shadows.sm,
        '&:hover': {
          backgroundColor: 'color-mix(in srgb, var(--primary) 90%, black 10%)',
          boxShadow: shadows.md,
          transform: 'translateY(-1px)',
        },
      },
      secondary: {
        backgroundColor: 'var(--secondary)',
        color: 'var(--secondary-foreground)', 
        boxShadow: shadows.sm,
        '&:hover': {
          backgroundColor: 'color-mix(in srgb, var(--secondary) 80%, black 20%)',
          boxShadow: shadows.md,
          transform: 'translateY(-1px)',
        },
      },
    },
    sizes: {
      sm: {
        padding: `${spacing[1]} ${spacing[3]}`, // 8px 24px
        fontSize: typography.fontSize['ui-sm'][0],
        minHeight: touchTargets.minimum,
      },
      md: {
        padding: `${spacing[2]} ${spacing[4]}`, // 16px 32px
        fontSize: typography.fontSize['ui-md'][0],
        minHeight: touchTargets.comfortable,
      },
      lg: {
        padding: `${spacing[3]} ${spacing[6]}`, // 24px 48px
        fontSize: typography.fontSize['ui-lg'][0],
        minHeight: touchTargets.large,
      },
    },
  },
  
  card: {
    variants: {
      default: {
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        boxShadow: shadows.sm,
      },
      elevated: {
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        boxShadow: shadows.md,
      },
      glass: {
        background: 'color-mix(in srgb, var(--card) 90%, transparent 10%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid color-mix(in srgb, var(--border) 50%, transparent 50%)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
      },
    },
  },
} as const;

// Export all tokens as a single object for easy consumption
export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  breakpoints,
  touchTargets,
  zIndex,
  gradients,
  components,
} as const;

// Type definitions for TypeScript support
export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type TypographyToken = keyof typeof typography.fontSize;
export type AnimationToken = keyof typeof animation.duration;
export type BreakpointToken = keyof typeof breakpoints;

// Helper functions for accessing tokens
export const getColor = (_token: string) => colors;
export const getSpacing = (token: keyof typeof spacing) => spacing[token];
export const getTypography = (token: keyof typeof typography.fontSize) => typography.fontSize[token];
export const getAnimation = (token: keyof typeof animation.duration) => animation.duration[token];

// CSS variable mappings for runtime usage
export const cssVariables = {
  '--primary': 'var(--color-primary-default, #f97316)',
  '--secondary': 'var(--color-secondary, #f59e0b)', 
  '--accent': 'var(--color-accent, #fb923c)',
  '--background': 'var(--color-background, #fefce8)',
  '--foreground': 'var(--color-foreground, #4b5563)',
  '--card': 'var(--color-card, #ffffff)',
  '--border': 'var(--color-border-default, #e5e7eb)',
  '--success': 'var(--color-success, #10b981)',
  '--warning': 'var(--color-warning, #f59e0b)',
  '--danger': 'var(--color-danger, #dc2626)',
} as const;