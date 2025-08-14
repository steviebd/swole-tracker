"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme =
  | "system"
  | "light"
  | "dark"
  | "CalmDark"
  | "BoldDark"
  | "PlayfulDark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

const THEME_STORAGE_KEY = "theme";

function applyThemeClass(theme: Theme, systemDark: boolean) {
  const root = document.documentElement;

  // For system theme, use the actual light/dark theme based on system preference
  let effectiveTheme = theme;
  if (theme === "system") {
    effectiveTheme = systemDark ? "dark" : "light";
  }

  // Determine dark mode for class toggling
  // All themes are dark-first except light which is always light
  const shouldDark = effectiveTheme !== "light";

  // data-theme is the source of truth for CSS variables/themes
  root.dataset.theme = effectiveTheme;

  // Toggle Tailwind's dark class for components that rely on it
  root.classList.toggle("dark", shouldDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  // track system dark mode separately so consumers re-render when it changes
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false
    );
  });

  const resolvedTheme: "light" | "dark" = useMemo(() => {
    if (typeof window === "undefined") return "dark";
    const prefersDark = systemDark;
    // light theme is always light, system theme follows system preference, all others are dark
    if (theme === "light") return "light";
    if (theme === "system") return prefersDark ? "dark" : "light";
    return "dark";
  }, [theme, systemDark]);

  // initial load from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored =
      (localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) ?? "system";
    setThemeState(stored);
    
    // Get initial system preference
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const initialSystemDark = mq.matches;
    setSystemDark(initialSystemDark);
    applyThemeClass(stored, initialSystemDark);

    // respond to system changes; update state so consumers re-render
    const handler = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
    };
    
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // Apply theme changes whenever theme or systemDark changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    applyThemeClass(theme, systemDark);
  }, [theme, systemDark]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {}
    applyThemeClass(t, systemDark);
  }, [systemDark]);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggle }),
    [theme, resolvedTheme, setTheme, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
