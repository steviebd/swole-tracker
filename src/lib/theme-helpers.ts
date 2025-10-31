/**
 * Theme helper utilities for consistent Material 3 token usage
 *
 * Provides centralized functions for:
 * - Status color mapping
 * - Readiness level classification
 * - Theme-aware class generation
 */

export type StatusType = "success" | "warning" | "error";

/**
 * Get semantic status classes for Material 3 theme integration
 *
 * @param status - Status type (success, warning, error)
 * @returns Object with background and text classes
 */
export function getStatusClasses(status: StatusType) {
  const statusMap = {
    success: {
      bg: "bg-status-success",
      text: "text-onTertiary",
      border: "border-status-success",
    },
    warning: {
      bg: "bg-status-warning",
      text: "text-onSecondary",
      border: "border-status-warning",
    },
    error: {
      bg: "bg-status-danger",
      text: "text-onError",
      border: "border-status-danger",
    },
  };

  return statusMap[status];
}

/**
 * Get readiness status type based on numeric value
 *
 * @param readiness - Readiness value between 0 and 1
 * @returns Status type for theme integration
 */
export function getReadinessStatus(readiness: number): StatusType {
  if (readiness >= 0.7) return "success";
  if (readiness >= 0.4) return "warning";
  return "error";
}

/**
 * Get readiness classes for direct styling
 *
 * @param readiness - Readiness value between 0 and 1
 * @returns Complete class string for readiness styling
 */
export function getReadinessClasses(readiness: number): string {
  const status = getReadinessStatus(readiness);
  const classes = getStatusClasses(status);
  return `${classes.bg} ${classes.text}`;
}

/**
 * Get surface hierarchy classes for consistent elevation
 *
 * @param level - Surface level (app, surface, card, elevated)
 * @returns CSS class for surface level
 */
export function getSurfaceClasses(
  level: "app" | "surface" | "card" | "elevated",
): string {
  const surfaceMap = {
    app: "bg-surface-app",
    surface: "bg-surface-base",
    card: "bg-surface-primary",
    elevated: "bg-surface-elevated",
  };

  return surfaceMap[level];
}

/**
 * Get interactive element classes with proper state layer support
 *
 * @param variant - Interactive variant (primary, secondary, tertiary)
 * @param stateLayer - Whether to include state layer attribute
 * @returns Props object for interactive elements
 */
export function getInteractiveProps(
  variant: "primary" | "secondary" | "tertiary" = "primary",
  stateLayer = true,
) {
  const variantMap = {
    primary: {
      className: "bg-interactive-primary text-primary-foreground",
      stateLayer: "primary" as const,
    },
    secondary: {
      className: "bg-interactive-secondary text-secondary-foreground",
      stateLayer: "secondary" as const,
    },
    tertiary: {
      className: "bg-interactive-accent text-accent-foreground",
      stateLayer: "tertiary" as const,
    },
  };

  const props = variantMap[variant];

  return {
    className: props.className,
    ...(stateLayer && { "data-state-layer": props.stateLayer }),
  };
}

/**
 * Get glass surface classes with proper theme awareness
 *
 * @param variant - Glass variant (subtle, medium, strong)
 * @returns CSS class for glass surface
 */
export function getGlassClasses(
  variant: "subtle" | "medium" | "strong" = "medium",
): string {
  const glassMap = {
    subtle: "glass-card-subtle",
    medium: "glass-card",
    strong: "glass-hero",
  };

  return glassMap[variant];
}

/**
 * Get typography classes for consistent text hierarchy
 *
 * @param level - Typography level (display, heading, subheading, body, ui)
 * @param responsive - Whether to include responsive variants
 * @returns CSS class for typography
 */
export function getTypographyClasses(
  level: "display" | "heading" | "subheading" | "body" | "ui",
  responsive = false,
): string {
  const typographyMap = {
    display: responsive
      ? "display sm:heading md:subheading lg:display"
      : "display",
    heading: responsive
      ? "heading sm:subheading md:heading lg:display"
      : "heading",
    subheading: responsive
      ? "subheading sm:body md:subheading lg:heading"
      : "subheading",
    body: "body-text",
    ui: "ui-text",
  };

  return typographyMap[level];
}
