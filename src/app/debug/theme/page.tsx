"use client";

import React from "react";
import Link from "next/link";
import { useTheme } from "~/providers/ThemeProvider";

export default function ThemeDebugPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themes: Array<"CalmDark" | "BoldDark" | "PlayfulDark"> = [
    "CalmDark",
    "BoldDark",
    "PlayfulDark",
  ];

  return (
    <div className="container-default py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Theme Debugger</h1>
        <Link href="/" className="btn-secondary px-3 py-2">Home</Link>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted">Current Theme</div>
            <div className="text-lg font-semibold">{theme}</div>
            <div className="text-xs text-muted mt-1">resolved: {resolvedTheme}</div>
          </div>
          <div className="flex gap-2">
            {themes.map((t) => (
              <button
                key={t}
                className={`px-3 py-2 rounded-md border text-sm ${theme === t ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setTheme(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Buttons preview */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-3">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary">Primary</button>
            <button className="btn-secondary">Secondary</button>
            <button className="btn-ghost">Ghost</button>
            <button className="btn-success">Success</button>
            <button className="btn-destructive">Destructive</button>
          </div>
        </div>

        {/* Inputs preview */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-3">Inputs</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-secondary">Weight</label>
              <input className="input" placeholder="e.g. 100" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-secondary">Reps</label>
              <input className="input" placeholder="e.g. 5" />
            </div>
          </div>
        </div>

        {/* Cards, glass and backdrop */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-3">Surfaces</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4">Card surface</div>
            <div className="p-4 glass-surface rounded-lg">Glass surface</div>
            <div className="p-4 rounded-lg" style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}>
              Raw surface
            </div>
          </div>
        </div>

        {/* Backdrop preview */}
        <div className="relative h-48 rounded-lg overflow-hidden">
          <div className="absolute inset-0 page-backdrop" />
          <div className="relative z-10 p-4">
            <div className="card p-3 inline-block">Backdrop preview</div>
          </div>
        </div>
      </div>
    </div>
  );
}
