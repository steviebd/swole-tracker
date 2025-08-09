"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "~/providers/ThemeProvider";

const THEME_LABELS: Record<string, string> = {
  system: "System",
  dark: "Dark",
  CalmDark: "Calm Dark",
  BoldDark: "Bold Dark",
  PlayfulDark: "Playful Dark",
};

const THEME_OPTIONS = [
  "system",
  "dark",
  "CalmDark",
  "BoldDark",
  "PlayfulDark",
] as const;

export function ThemeToggleDropdown() {
  const { theme, setTheme, resolvedTheme } = useTheme();
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
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-300 ${
          theme !== "system" || (theme === "system" && resolvedTheme === "dark")
            ? "text-gray-300 hover:text-white hover:bg-gray-800" 
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
        }`}
      >
        <span>Theme</span>
        <span className={`transition-colors duration-300 ${
          theme !== "system" || (theme === "system" && resolvedTheme === "dark")
            ? "text-white" 
            : "text-gray-900 dark:text-white"
        }`}>
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
        <div className={`absolute right-0 mt-2 w-48 py-2 rounded-lg shadow-lg border z-50 transition-colors duration-300 ${
          theme !== "system" || (theme === "system" && resolvedTheme === "dark")
            ? "bg-gray-900 border-gray-700" 
            : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700"
        }`}>
          {THEME_OPTIONS.map((themeOption) => (
            <button
              key={themeOption}
              onClick={() => {
                setTheme(themeOption);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm transition-colors duration-300 ${
                theme === themeOption
                  ? theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                  : theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                    ? "text-gray-300 hover:text-white hover:bg-gray-800"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
              }`}
            >
              {THEME_LABELS[themeOption]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}