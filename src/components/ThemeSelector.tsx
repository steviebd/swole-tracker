"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "~/providers/ThemeProvider";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

const themes = [
  {
    value: "system" as const,
    label: "System",
    description: "Follows your device settings",
    preview: "🖥️",
    colors: { bg: "var(--background)", accent: "var(--primary)" }
  },
  {
    value: "light" as const,
    label: "Light",
    description: "Classic bright theme",
    preview: "☀️",
    colors: { bg: "var(--background)", accent: "var(--primary)" }
  },
  {
    value: "dark" as const,
    label: "Dark",
    description: "Easy on the eyes",
    preview: "🌙",
    colors: { bg: "var(--background)", accent: "var(--primary)" }
  },
  {
    value: "cool" as const,
    label: "Cool",
    description: "Apple-inspired blues",
    preview: "❄️",
    colors: { bg: "var(--background)", accent: "var(--primary)" }
  },
  {
    value: "warm" as const,
    label: "Warm",
    description: "Earth tones and beiges",
    preview: "🌾",
    colors: { bg: "var(--background)", accent: "var(--primary)" }
  },
  {
    value: "neutral" as const,
    label: "Neutral",
    description: "Clean and minimal grays",
    preview: "⚪",
    colors: { bg: "var(--background)", accent: "var(--primary)" }
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
  showDescription = true 
}: ThemeSelectorProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();

  const gridColumns = variant === "grid" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1";

  return (
    <div 
      className={cn("space-y-3", className)}
      role="radiogroup" 
      aria-labelledby="theme-selector-label"
    >
      <div className="space-y-1">
        <div id="theme-selector-label" className="font-medium text-foreground leading-none">
          Appearance
        </div>
        {showDescription && (
          <div className="text-sm text-muted-foreground leading-relaxed">
            Choose your preferred color theme for the app
          </div>
        )}
      </div>
      
      <div className={cn("grid gap-2", gridColumns)}>
        {themes.map((themeOption) => {
          const isSelected = theme === themeOption.value;
          const isSystemSelected = theme === "system" && themeOption.value === "system";
          
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
                onClick={() => setTheme(themeOption.value)}
                className={cn(
                  "flex flex-col gap-2 h-auto py-3 text-xs font-medium transition-all w-full",
                  "hover:shadow-md active:scale-95 relative overflow-hidden",
                  "border-2",
                  isSelected 
                    ? "border-primary/50 shadow-lg ring-1 ring-primary/20" 
                    : "border-border/50 hover:border-border"
                )}
                role="radio"
                aria-checked={isSelected}
                haptic
              >
                {/* Theme preview background */}
                <div 
                  className="absolute inset-0 opacity-10 rounded-md"
                  style={{ backgroundColor: themeOption.colors.bg }}
                />
                
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none" aria-hidden="true">
                      {themeOption.preview}
                    </span>
                    <div 
                      className="w-3 h-3 rounded-full border border-border/30"
                      style={{ backgroundColor: themeOption.colors.accent }}
                      aria-hidden="true"
                    />
                  </div>
                  
                  <div className="text-center">
                    <span className="font-medium leading-none">
                      {themeOption.label}
                    </span>
                    
                    {/* Show resolved theme for system */}
                    {isSystemSelected && (
                      <span className="block text-xs opacity-70 mt-0.5 capitalize">
                        ({resolvedTheme})
                      </span>
                    )}
                    
                    {/* Show description on larger screens or when explicitly enabled */}
                    {showDescription && variant === "list" && (
                      <span className="block text-xs opacity-70 mt-1">
                        {themeOption.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                      duration: prefersReducedMotion ? 0 : 0.2,
                      ease: [0.4, 0, 0.2, 1] 
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
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