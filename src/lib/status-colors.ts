/**
 * Theme-aware status colors
 * Maps semantic statuses to Material 3 color roles
 */

export type StatusTone = "success" | "warning" | "info" | "error";

export interface StatusColors {
  bg: string;
  text: string;
  border: string;
}

/**
 * Get theme-aware colors for status indicators
 * Uses Material 3 semantic tokens that adapt to all 5 themes
 *
 * @param tone - The semantic status tone
 * @returns CSS custom properties for background, text, and border
 *
 * @example
 * const colors = getStatusColors('success');
 * <div style={{ backgroundColor: colors.bg, color: colors.text }} />
 */
export function getStatusColors(tone: StatusTone): StatusColors {
  const colorMap: Record<StatusTone, StatusColors> = {
    success: {
      // Green in light/dark, purple in dark, blue in cool, orange in warm, teal in neutral
      bg: "color-mix(in srgb, var(--md-sys-color-tertiary) 15%, transparent 85%)",
      text: "var(--md-sys-color-tertiary)",
      border:
        "color-mix(in srgb, var(--md-sys-color-tertiary) 40%, transparent 60%)",
    },
    warning: {
      // Blue in light, cyan in dark, sky in cool, purple in warm, indigo in neutral
      bg: "color-mix(in srgb, var(--md-sys-color-secondary) 15%, transparent 85%)",
      text: "var(--md-sys-color-secondary)",
      border:
        "color-mix(in srgb, var(--md-sys-color-secondary) 50%, transparent 50%)",
    },
    info: {
      // Orange in light, peach in dark, coral in cool, brown in warm, slate in neutral
      bg: "color-mix(in srgb, var(--md-sys-color-primary) 15%, transparent 85%)",
      text: "var(--md-sys-color-primary)",
      border:
        "color-mix(in srgb, var(--md-sys-color-primary) 45%, transparent 55%)",
    },
    error: {
      // Red across all themes (but shade varies)
      bg: "color-mix(in srgb, var(--md-sys-color-error) 15%, transparent 85%)",
      text: "var(--md-sys-color-error)",
      border:
        "color-mix(in srgb, var(--md-sys-color-error) 45%, transparent 55%)",
    },
  };

  return colorMap[tone];
}

/**
 * Get inline styles object for status elements
 * Convenience wrapper around getStatusColors
 *
 * @param tone - The semantic status tone
 * @returns Inline styles object ready for React style prop
 *
 * @example
 * <span style={getStatusStyles('success')}>Success</span>
 */
export function getStatusStyles(tone: StatusTone): React.CSSProperties {
  const colors = getStatusColors(tone);
  return {
    backgroundColor: colors.bg,
    color: colors.text,
  };
}
