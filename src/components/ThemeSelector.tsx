"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "~/providers/ThemeProvider";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { getSemanticTokens, type ThemeId } from "~/lib/design-tokens";

type ThemeOptionValue = ThemeId | "system";

const themePreviewMap: Record<
  ThemeId,
  {
    surface: string;
    surfaceContainer: string;
    outline: string;
    primary: string;
    secondary: string;
    tertiary: string;
    onSurface: string;
  }
> = (
  Array.from(["light", "dark", "cool", "warm", "neutral"]) as ThemeId[]
).reduce(
  (acc, themeId) => {
    const tokens = getSemanticTokens(themeId);
    acc[themeId] = {
      surface: tokens.surfaces.surface!,
      surfaceContainer: tokens.surfaces.surfaceContainer!,
      outline: tokens.surfaces.outline!,
      primary: tokens.scheme.primary!,
      secondary: tokens.scheme.secondary!,
      tertiary: tokens.scheme.tertiary!,
      onSurface: tokens.scheme.onSurface!,
    };
    return acc;
  },
  {} as Record<
    ThemeId,
    {
      surface: string;
      surfaceContainer: string;
      outline: string;
      primary: string;
      secondary: string;
      tertiary: string;
      onSurface: string;
    }
  >,
);

const themes: Array<{
  value: ThemeOptionValue;
  label: string;
  description: string;
  preview: string;
}> = [
  {
    value: "system" as const,
    label: "System",
    description: "Follows your device settings",
    preview: "🖥️",
  },
  {
    value: "light" as const,
    label: "Light",
    description: "Classic bright theme",
    preview: "☀️",
  },
  {
    value: "dark" as const,
    label: "Dark",
    description: "Easy on the eyes",
    preview: "🌙",
  },
  {
    value: "cool" as const,
    label: "Cool",
    description: "Warm coffee-inspired dark",
    preview: "☕",
  },
  {
    value: "warm" as const,
    label: "Warm",
    description: "Earth tones and beiges",
    preview: "🌾",
  },
  {
    value: "neutral" as const,
    label: "Neutral",
    description: "Clean and minimal grays",
    preview: "⚪",
  },
];

interface ThemeSelectorProps {
  className?: string;
  variant?: "grid" | "list";
  showDescription?: boolean;
}

export function ThemeSelector({
  className,
  variant = "grid",
  showDescription = true,
}: ThemeSelectorProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const [liveAnnouncement, setLiveAnnouncement] = React.useState<
    { id: number; message: string } | null
  >(null);

  const gridColumns =
    variant === "grid" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1";

  const getPreview = React.useCallback(
    (value: ThemeOptionValue) => {
      if (value === "system") {
        const resolved = (resolvedTheme ?? "light") as ThemeId;
        return themePreviewMap[resolved] ?? themePreviewMap.light;
      }
      return themePreviewMap[value] ?? themePreviewMap.light;
    },
    [resolvedTheme],
  );

  const handleThemeSelect = React.useCallback(
    (option: (typeof themes)[number]) => {
      setTheme(option.value);
      const timestamp = Date.now();
      const resolvedLabel = (() => {
        const current = resolvedTheme ?? "light";
        return current.charAt(0).toUpperCase() + current.slice(1);
      })();
      const message =
        option.value === "system"
          ? `System theme selected; currently following ${resolvedLabel} mode`
          : `${option.label} theme selected`;
      setLiveAnnouncement({
        id: timestamp,
        message,
      });
    },
    [resolvedTheme, setTheme],
  );

  React.useEffect(() => {
    if (!liveAnnouncement) return;
    const timeout = window.setTimeout(() => {
      setLiveAnnouncement(null);
    }, 750);
    return () => window.clearTimeout(timeout);
  }, [liveAnnouncement]);

  return (
    <div
      className={cn("space-y-3", className)}
      role="radiogroup"
      aria-labelledby="theme-selector-label"
    >
      {liveAnnouncement ? (
        <div
          key={liveAnnouncement.id}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {liveAnnouncement.message}
        </div>
      ) : null}
      <div className="space-y-1">
        <div
          id="theme-selector-label"
          className="text-foreground leading-none font-medium"
        >
          Appearance
        </div>
        {showDescription && (
          <div className="text-muted-foreground text-sm leading-relaxed">
            Choose your preferred color theme for the app
          </div>
        )}
      </div>

      <div className={cn("grid gap-2", gridColumns)}>
        {themes.map((themeOption) => {
          const isSelected = theme === themeOption.value;
          const isSystemSelected =
            theme === "system" && themeOption.value === "system";
          const previewTokens = getPreview(themeOption.value);

          return (
            <motion.div
              key={themeOption.value}
              whileTap={{ scale: prefersReducedMotion ? 1 : 0.98 }}
              whileHover={{ scale: prefersReducedMotion ? 1 : 1.02 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeSelect(themeOption)}
                className={cn(
                  "flex h-auto w-full flex-col gap-3 py-3 text-xs font-medium transition-all",
                  "relative overflow-hidden hover:shadow-md active:scale-95",
                  "border-2",
                  isSelected
                    ? "border-primary/50 ring-primary/20 shadow-lg ring-1"
                    : "border-border/50 hover:border-border",
                )}
                role="radio"
                aria-checked={isSelected}
                haptic
              >
                {/* Content */}
                <div className="relative z-10 flex w-full flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none" aria-hidden="true">
                      {themeOption.preview}
                    </span>
                    <div
                      className="border-border/30 h-3 w-3 rounded-full border"
                      style={{ backgroundColor: previewTokens.primary }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="text-center">
                    <span className="leading-none font-medium">
                      {themeOption.label}
                    </span>

                    {/* Show resolved theme for system */}
                    {isSystemSelected && (
                      <span className="mt-0.5 block text-xs capitalize opacity-70">
                        ({resolvedTheme})
                      </span>
                    )}

                    {/* Show description on larger screens or when explicitly enabled */}
                    {showDescription && variant === "list" && (
                      <span className="mt-1 block text-xs opacity-70">
                        {themeOption.description}
                      </span>
                    )}
                  </div>
                </div>

                {previewTokens && (
                  <div
                    className="relative z-10 flex w-full flex-col gap-2 rounded-md border px-2 py-2 text-left"
                    style={{
                      backgroundColor: previewTokens.surfaceContainer,
                      borderColor: previewTokens.outline,
                      color: previewTokens.onSurface,
                    }}
                    aria-hidden="true"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="h-2 flex-1 rounded-full"
                        style={{
                          background: `linear-gradient(135deg, ${previewTokens.primary} 0%, ${previewTokens.secondary} 100%)`,
                        }}
                      />
                      <div className="flex items-center gap-1">
                        {[
                          previewTokens.primary,
                          previewTokens.secondary,
                          previewTokens.tertiary,
                        ].map((color) => (
                          <span
                            key={color}
                            className="block h-3 w-3 rounded-sm shadow-sm"
                            style={{
                              backgroundColor: color,
                              boxShadow: `0 0 0 1px ${mixWithOutline(color, previewTokens.onSurface)}`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div
                      className="h-1 w-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${previewTokens.primary} 0%, ${previewTokens.tertiary} 100%)`,
                      }}
                    />
                  </div>
                )}

                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    className="bg-primary absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.2,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  >
                    <div className="bg-primary-foreground h-1.5 w-1.5 rounded-full" />
                  </motion.div>
                )}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function mixWithOutline(color: string, outline: string) {
  if (!color.startsWith("#") || !outline.startsWith("#")) {
    return color;
  }
  const mix = 0.2;
  const start = parseInt(color.replace("#", ""), 16);
  const outlineInt = parseInt(outline.replace("#", ""), 16);
  const r = Math.round(
    ((start >> 16) & 255) * (1 - mix) + ((outlineInt >> 16) & 255) * mix,
  );
  const g = Math.round(
    ((start >> 8) & 255) * (1 - mix) + ((outlineInt >> 8) & 255) * mix,
  );
  const b = Math.round((start & 255) * (1 - mix) + (outlineInt & 255) * mix);
  return `rgba(${r}, ${g}, ${b}, 0.65)`;
}
