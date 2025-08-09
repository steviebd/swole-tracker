"use client";

import React, { useState } from "react";
import { PreferencesModal } from "./_components/PreferencesModal";
import { useTheme } from "~/providers/ThemeProvider";

/**
 * ClientPreferencesTrigger
 * Renders a small button in the home page header area (absolute overlay) to open PreferencesModal.
 * Mobile-first: shows an icon button. Desktop could be integrated elsewhere later.
 */
export default function ClientPreferencesTrigger() {
  const [open, setOpen] = useState(false);
  // Ensure ThemeProvider context is present
  useTheme();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-[9000] rounded-full bg-purple-600 p-3 text-white shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 md:static md:ml-2 md:rounded-lg md:px-3 md:py-2 md:bg-gray-800 md:hover:bg-gray-700"
        aria-label="Open Preferences"
        title="Preferences"
      >
        <span className="inline-block md:hidden">⚙️</span>
        <span className="hidden md:inline">Preferences</span>
      </button>

      <PreferencesModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
