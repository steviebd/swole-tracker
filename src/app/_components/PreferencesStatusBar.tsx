"use client";

import { useTheme } from "~/providers/ThemeProvider";

export function PreferencesStatusBar() {
  const { theme, resolvedTheme } = useTheme();

  return (
    <div className={`w-full py-2 px-6 transition-colors duration-300 ${
      theme !== "system" || (theme === "system" && resolvedTheme === "dark")
        ? "bg-gray-800" 
        : "bg-gray-100 dark:bg-gray-800"
    }`}>
      <div className="container mx-auto flex items-center justify-between">
        <span className={`text-sm font-medium transition-colors duration-300 ${
          theme !== "system" || (theme === "system" && resolvedTheme === "dark")
            ? "text-white" 
            : "text-gray-900 dark:text-white"
        }`}>
          Preferences
        </span>
        
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-white text-xs font-medium">Syncing...</span>
        </div>
      </div>
    </div>
  );
}