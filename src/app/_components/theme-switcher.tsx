"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "~/providers/ThemeProvider";

type Theme =
  | "system"
  | "dark"
  | "CalmDark"
  | "BoldDark"
  | "PlayfulDark";

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Derive label directly from theme and resolvedTheme for stability in tests
  const label =
    theme === "system"
      ? `System (${resolvedTheme})`
      : theme === "dark"
        ? "Dark"
        : theme === "CalmDark"
          ? "Calm Dark"
          : theme === "BoldDark"
            ? "Bold Dark"
            : theme === "PlayfulDark"
              ? "Playful Dark"
              : String(theme);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className={`inline-flex items-center gap-2 rounded-md border border-gray-800 bg-gray-900 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-800 focus:ring-2 focus:ring-purple-600 focus:outline-none ${compact ? "px-2 py-1" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="hidden sm:inline">Theme</span>
        <span className="sm:hidden">Theme</span>
        <span className="opacity-70">{label}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="opacity-70"
        >
          <path fill="currentColor" d="M5.5 7.5L10 12l4.5-4.5h-9z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme options"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border border-gray-800 bg-gray-900 shadow-xl"
        >
          <MenuItem
            current={theme}
            value="system"
            onSelect={(t) => {
              setTheme(t);
              setOpen(false);
            }}
          >
            System
          </MenuItem>
          <MenuItem
            current={theme}
            value="dark"
            onSelect={(t) => {
              setTheme(t);
              setOpen(false);
            }}
          >
            Dark
          </MenuItem>
          <MenuItem
            current={theme}
            value="CalmDark"
            onSelect={(t) => {
              setTheme(t);
              setOpen(false);
            }}
          >
            Calm Dark
          </MenuItem>
          <MenuItem
            current={theme}
            value="BoldDark"
            onSelect={(t) => {
              setTheme(t);
              setOpen(false);
            }}
          >
            Bold Dark
          </MenuItem>
          <MenuItem
            current={theme}
            value="PlayfulDark"
            onSelect={(t) => {
              setTheme(t);
              setOpen(false);
            }}
          >
            Playful Dark
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  current,
  value,
  onSelect,
  children,
}: {
  current: Theme;
  value: Theme;
  onSelect: (t: Theme) => void;
  children: React.ReactNode;
}) {
  const selected = current === value;
  return (
    <button
      role="menuitemradio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-800 ${selected ? "text-purple-300" : "text-gray-200"}`}
    >
      <span>{children}</span>
      {selected ? (
        <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M7.667 14.5L3.5 10.333l1.414-1.414L7.667 11.67l7.419-7.419L16.5 5.667z"
          />
        </svg>
      ) : null}
    </button>
  );
}
