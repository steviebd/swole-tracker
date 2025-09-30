"use client";

import { useTheme } from "~/providers/ThemeProvider";
import { useWhoopConnect } from "~/hooks/use-whoop-connect";

export function ConnectWhoopButton() {
  const { theme, resolvedTheme } = useTheme();
  const { startConnect, isConnecting, error } = useWhoopConnect();

  return (
    <div className="inline-flex flex-col">
      <button
        onClick={() => {
          void startConnect();
        }}
        disabled={isConnecting}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-300 ${
          theme !== "system" || (theme === "system" && resolvedTheme === "dark")
            ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 disabled:text-blue-400/70 disabled:hover:bg-transparent" 
            : "text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 disabled:text-blue-500/60 disabled:hover:bg-transparent"
        }`}
      >
        {isConnecting ? "Connecting…" : "Connect Whoop"}
      </button>
      <span aria-live="assertive" className="sr-only">
        {error ?? ""}
      </span>
    </div>
  );
}
