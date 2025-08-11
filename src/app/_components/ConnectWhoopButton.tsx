"use client";

import { useTheme } from "~/providers/ThemeProvider";

export function ConnectWhoopButton() {
  const { theme, resolvedTheme } = useTheme();

  const handleConnectWhoop = () => {
    // TODO: Implement Whoop connection logic
    console.log("Connect Whoop clicked");
  };

  return (
    <button
      onClick={handleConnectWhoop}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-300 ${
        theme !== "system" || (theme === "system" && resolvedTheme === "dark")
          ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10" 
          : "text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
      }`}
    >
      Connect Whoop
    </button>
  );
}