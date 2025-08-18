/**
 * Theme utility functions for React Native mobile app
 * Provides dark-first theme utilities, status bar configuration, and color helpers
 */

import { Platform, StatusBar as RNStatusBar, Appearance } from 'react-native';
import { DarkTheme, LightTheme, getThemeColors } from './design-tokens';
import type { ActiveTheme, ThemeMode } from '../components/providers/ThemeProvider';

/**
 * Configure status bar for dark theme
 */
export function configureStatusBar(activeTheme: ActiveTheme) {
  if (Platform.OS === 'android') {
    // For Android, set the status bar to be transparent with light content on dark backgrounds
    RNStatusBar.setBackgroundColor('transparent', true);
    RNStatusBar.setBarStyle(
      activeTheme === 'dark' ? 'light-content' : 'dark-content',
      true
    );
    RNStatusBar.setTranslucent(true);
  } else {
    // For iOS, just set the bar style
    RNStatusBar.setBarStyle(
      activeTheme === 'dark' ? 'light-content' : 'dark-content',
      true
    );
  }
}

/**
 * Get system theme preference (for future use)
 */
export function getSystemTheme(): ActiveTheme {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'light' ? 'light' : 'dark';
}

/**
 * Utility to get theme-aware color with fallback
 */
export function getThemeColor(
  colorPath: string,
  activeTheme: ActiveTheme = 'dark',
  fallback: string = '#ffffff'
): string {
  try {
    const colors = getThemeColors(activeTheme === 'dark');
    const pathArray = colorPath.split('.');
    
    let color: any = colors;
    for (const key of pathArray) {
      color = color?.[key];
      if (color === undefined) break;
    }
    
    return typeof color === 'string' ? color : fallback;
  } catch (error) {
    console.warn(`Failed to get theme color for path: ${colorPath}`, error);
    return fallback;
  }
}

/**
 * Generate dynamic colors based on theme
 */
export function getDynamicColors(activeTheme: ActiveTheme = 'dark') {
  const colors = getThemeColors(activeTheme === 'dark');
  
  return {
    // Background colors
    background: colors.background,
    surface: colors.bg.surface,
    card: colors.bg.card,
    
    // Text colors
    textPrimary: colors.text.primary,
    textSecondary: colors.text.secondary,
    textMuted: colors.text.muted,
    
    // Border colors
    border: colors.border.default,
    borderMuted: colors.border.muted,
    
    // Brand colors
    primary: colors.primary.default,
    primaryHover: colors.primary.hover,
    primaryActive: colors.primary.active,
    primaryForeground: colors.primary.foreground,
    
    secondary: colors.secondary.default,
    secondaryHover: colors.secondary.hover,
    secondaryForeground: colors.secondary.foreground,
    
    // Status colors
    success: colors.status.success.default,
    successMuted: colors.status.success.muted,
    successForeground: colors.status.success.foreground,
    
    warning: colors.status.warning.default,
    warningMuted: colors.status.warning.muted,
    warningForeground: colors.status.warning.foreground,
    
    danger: colors.status.danger.default,
    dangerMuted: colors.status.danger.muted,
    dangerForeground: colors.status.danger.foreground,
    
    info: colors.status.info.default,
    infoMuted: colors.status.info.muted,
    infoForeground: colors.status.info.foreground,
    
    // Glass effects
    glassHighlight: colors.glass.highlight,
    glassAccent: colors.glass.accent,
    glassBorder: colors.glass.border,
    glassCard: colors.glass.card,
    glassModal: colors.glass.modal,
  };
}

/**
 * Get contrasting text color for a given background
 */
export function getContrastingTextColor(
  backgroundColor: string,
  activeTheme: ActiveTheme = 'dark'
): string {
  const colors = getThemeColors(activeTheme === 'dark');
  
  // Simple contrast logic - in practice, you might want more sophisticated color analysis
  const darkColors = ['#000000', '#252525', '#343434', '#454545'];
  const isLightBackground = !darkColors.some(dark => 
    backgroundColor.toLowerCase().includes(dark)
  );
  
  return isLightBackground ? colors.text.primary : colors.text.primary;
}

/**
 * Apply theme-aware styles to React Native components
 */
export function applyThemeStyles(
  baseStyles: any,
  themeOverrides: {
    dark?: any;
    light?: any;
  },
  activeTheme: ActiveTheme = 'dark'
) {
  const themeSpecificStyles = activeTheme === 'dark' 
    ? themeOverrides.dark || {}
    : themeOverrides.light || {};
    
  return {
    ...baseStyles,
    ...themeSpecificStyles,
  };
}

/**
 * Create a style object with theme-aware colors
 */
export function createThemedStyle(
  styleCreator: (colors: ReturnType<typeof getDynamicColors>) => any,
  activeTheme: ActiveTheme = 'dark'
) {
  const colors = getDynamicColors(activeTheme);
  return styleCreator(colors);
}

/**
 * Interpolate color with opacity
 */
export function withOpacity(color: string, opacity: number): string {
  // Handle OKLCH colors
  if (color.startsWith('oklch(')) {
    // If color already has alpha, replace it
    if (color.includes('/')) {
      return color.replace(/\/[^)]+/, `/ ${opacity}`);
    }
    // Add alpha to OKLCH color
    return color.replace(')', ` / ${opacity})`);
  }
  
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const [r, g, b] = hex.split('').map(char => parseInt(char + char, 16));
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } else if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }
  
  // Fallback for other color formats
  return color;
}

/**
 * Theme transition animation helper
 */
export function createThemeTransition(duration: number = 200) {
  return {
    duration,
    useNativeDriver: false, // Color transitions require JS driver
    easing: 'ease-in-out' as const,
  };
}

/**
 * Validate theme mode
 */
export function isValidThemeMode(mode: string): mode is ThemeMode {
  return ['dark', 'light', 'system'].includes(mode);
}

/**
 * Get safe area background color for theme
 */
export function getSafeAreaColor(activeTheme: ActiveTheme = 'dark'): string {
  const colors = getDynamicColors(activeTheme);
  return colors.background;
}

/**
 * Get keyboard appearance for theme
 */
export function getKeyboardAppearance(activeTheme: ActiveTheme = 'dark'): 'dark' | 'light' {
  return activeTheme;
}

/**
 * Utility for glass morphism effects
 */
export function createGlassEffect(
  activeTheme: ActiveTheme = 'dark',
  variant: 'card' | 'modal' | 'highlight' | 'accent' = 'card'
) {
  const colors = getDynamicColors(activeTheme);
  
  const effects = {
    card: {
      backgroundColor: colors.glassCard,
      borderColor: colors.glassBorder,
      borderWidth: 1,
    },
    modal: {
      backgroundColor: colors.glassModal,
      borderColor: colors.glassBorder,
      borderWidth: 1,
    },
    highlight: {
      backgroundColor: colors.glassHighlight,
    },
    accent: {
      backgroundColor: colors.glassAccent,
    },
  };
  
  return effects[variant];
}

/**
 * Get elevation style for theme
 */
export function getElevationStyle(
  level: 'xs' | 'sm' | 'md' | 'lg' = 'sm',
  activeTheme: ActiveTheme = 'dark'
) {
  // Elevation styles are less prominent in dark theme
  const elevationMultiplier = activeTheme === 'dark' ? 0.7 : 1;
  
  const elevations = {
    xs: 2 * elevationMultiplier,
    sm: 4 * elevationMultiplier,
    md: 8 * elevationMultiplier,
    lg: 12 * elevationMultiplier,
  };
  
  return {
    elevation: elevations[level],
    shadowColor: activeTheme === 'dark' ? '#000000' : '#000000',
    shadowOffset: {
      width: 0,
      height: elevations[level] / 2,
    },
    shadowOpacity: activeTheme === 'dark' ? 0.45 : 0.25,
    shadowRadius: elevations[level],
  };
}