"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system" | "CalmDark" | "BoldDark" | "PlayfulDark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "theme";

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;

  // Determine dark mode for class toggling
  const shouldDark =
    theme === "dark" ||
    (theme === "system" && prefersDark) ||
    // All custom dark themes are dark-first
    theme === "CalmDark" ||
    theme === "BoldDark" ||
    theme === "PlayfulDark";

  // data-theme is the source of truth for CSS variables/themes
  root.dataset.theme = theme;

  // Toggle Tailwind's dark class for components that rely on it
  root.classList.toggle("dark", shouldDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  // track system dark mode separately so consumers re-render when it changes
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });

  const resolvedTheme: "light" | "dark" = useMemo(() => {
    if (typeof window === "undefined") return "dark";
    const prefersDark = systemDark;
    return theme === "dark" || (theme === "system" && prefersDark) ? "dark" : "light";
  }, [theme, systemDark]);

  // initial load from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = (localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) ?? "system";
    setThemeState(stored);
    applyThemeClass(stored);

    // respond to system changes; update state so consumers re-render
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
      // keep DOM in sync when in system mode
      if ((stored ?? "system") === "system") {
        applyThemeClass("system");
      }
    };
    // initialize state from current matches to be safe
    setSystemDark(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {}
    applyThemeClass(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggle }),
    [theme, resolvedTheme, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
