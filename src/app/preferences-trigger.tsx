"use client";

import React, { useState } from "react";
import { PreferencesModal } from "./_components/PreferencesModal";
import { useTheme } from "~/providers/ThemeProvider";

/**
 * ClientPreferencesTrigger
 * Renders a small button in the home page header area (absolute overlay) to open PreferencesModal.
 * Mobile-first: shows an icon button. Desktop could be integrated elsewhere later.
 */
export default function ClientPreferencesTrigger({
  inline = false,
  label = "Preferences",
}: {
  inline?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  // Ensure ThemeProvider context is present
  useTheme();

  const btnClass = inline
    ? "text-sm link-primary"
    : "fixed bottom-24 right-4 z-40 rounded-full btn-primary p-3 shadow-lg md:static md:ml-2 md:rounded-lg md:px-3 md:py-2";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={btnClass}
        aria-label="Open Preferences"
        title="Preferences"
      >
        {inline ? (
          <span>{label}</span>
        ) : (
          <>
            <span className="inline-block md:hidden">⚙️</span>
            <span className="hidden md:inline">Preferences</span>
          </>
        )}
      </button>

      <PreferencesModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
