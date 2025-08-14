"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "~/providers/ThemeProvider";

const THEME_LABELS: Record<string, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const THEME_OPTIONS = [
  "system",
  "light",
  "dark",
] as const;

export function ThemeToggleDropdown() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentThemeLabel = THEME_LABELS[theme] || "Bold Dark";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-300"
        style={{
          color: 'var(--color-text-secondary)',
          backgroundColor: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--color-text)';
          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-bg-surface) 60%, transparent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--color-text-secondary)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span>Theme</span>
        <span className="transition-colors duration-300" style={{ color: 'var(--color-text)' }}>
          {currentThemeLabel}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 py-2 rounded-lg shadow-lg border z-50 transition-colors duration-300"
             style={{
               backgroundColor: 'var(--color-bg-surface)',
               borderColor: 'var(--color-border)',
             }}>
          {THEME_OPTIONS.map((themeOption) => (
            <button
              key={themeOption}
              onClick={() => {
                setTheme(themeOption);
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm transition-colors duration-300"
              style={{
                backgroundColor: theme === themeOption ? 'var(--color-primary)' : 'transparent',
                color: theme === themeOption ? 'white' : 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (theme !== themeOption) {
                  e.currentTarget.style.color = 'var(--color-text)';
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-bg-surface) 60%, transparent)';
                }
              }}
              onMouseLeave={(e) => {
                if (theme !== themeOption) {
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {THEME_LABELS[themeOption]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
