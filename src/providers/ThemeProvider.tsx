"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  persistThemePreference,
  parseThemeCookie,
  readThemeCookieFromDocument,
  THEME_STORAGE_KEY,
  type ThemeMode,
  type ThemePreference,
  type ThemeVariant,
} from "~/lib/theme-prefs";

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ThemeVariant;
  setTheme: (t: ThemeMode) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme: ThemeMode;
  initialResolvedTheme: ThemeVariant;
}

function resolveThemeVariant(mode: ThemeMode, systemDark: boolean): ThemeVariant {
  if (mode === "system") {
    return systemDark ? "dark" : "light";
  }
  return mode;
}

function applyThemeAttributes(mode: ThemeMode, resolved: ThemeVariant) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themeMode = mode;
  root.classList.toggle("dark", resolved === "dark");
}

function persistAll(mode: ThemeMode, resolved: ThemeVariant) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage write failures (privacy mode, etc.)
  }
  persistThemePreference({ mode, resolved });
}

function readClientPreference(): ThemePreference | null {
  const fromCookie = readThemeCookieFromDocument();
  if (fromCookie) return fromCookie;

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (!stored) return null;
    return parseThemeCookie(stored);
  } catch {
    return null;
  }
}

export function ThemeProvider({
  children,
  initialTheme,
  initialResolvedTheme,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ThemeVariant>(
    initialResolvedTheme,
  );
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    initialTheme === "system"
      ? initialResolvedTheme === "dark"
      : initialTheme === "dark",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const prefersDark = mq.matches;
    setSystemDark(prefersDark);

    const stored = readClientPreference();
    if (stored) {
      const nextResolved =
        stored.mode === "system"
          ? resolveThemeVariant(stored.mode, prefersDark)
          : stored.resolved;
      setThemeState(stored.mode);
      setResolvedTheme(nextResolved);
      applyThemeAttributes(stored.mode, nextResolved);
      persistAll(stored.mode, nextResolved);
    } else {
      const derived = resolveThemeVariant(initialTheme, prefersDark);
      setResolvedTheme(derived);
      applyThemeAttributes(initialTheme, derived);
      persistAll(initialTheme, derived);
    }

    const handler = (event: MediaQueryListEvent) => {
      setSystemDark(event.matches);
    };

    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [initialTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (theme !== "system") return;
    const nextResolved = resolveThemeVariant(theme, systemDark);
    setResolvedTheme(nextResolved);
    applyThemeAttributes(theme, nextResolved);
    persistAll(theme, nextResolved);
  }, [theme, systemDark]);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      const nextResolved = resolveThemeVariant(mode, systemDark);
      setThemeState(mode);
      setResolvedTheme(nextResolved);
      applyThemeAttributes(mode, nextResolved);
      persistAll(mode, nextResolved);
    },
    [systemDark],
  );

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
