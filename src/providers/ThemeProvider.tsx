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
  | "cool"
  | "warm"
  | "neutral";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark" | "cool" | "warm" | "neutral";
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

const THEME_STORAGE_KEY = "theme";

function applyThemeClass(theme: Theme, systemDark: boolean) {
  const root = document.documentElement;

  // Resolve which palette should be active for CSS variables
  const effectiveTheme =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Toggle Tailwind's dark class for components that rely on it
  const shouldDark = effectiveTheme === "dark";

  root.dataset.theme = effectiveTheme;
  root.dataset.themeMode = theme;
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

  const resolvedTheme: "light" | "dark" | "cool" | "warm" | "neutral" = useMemo(() => {
    if (typeof window === "undefined") return "dark";
    const prefersDark = systemDark;
    // Handle system theme
    if (theme === "system") return prefersDark ? "dark" : "light";
    // All other themes resolve to themselves
    return theme;
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
    // Simple toggle between light and dark for legacy compatibility
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
