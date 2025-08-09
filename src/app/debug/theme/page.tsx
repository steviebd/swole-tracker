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
        <Link href="/" className="btn-secondary px-3 py-2">
          Home
        </Link>
      </div>

      <div className="card mb-6 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-muted text-sm">Current Theme</div>
            <div className="text-lg font-semibold">{theme}</div>
            <div className="text-muted mt-1 text-xs">
              resolved: {resolvedTheme}
            </div>
          </div>
          <div className="flex gap-2">
            {themes.map((t) => (
              <button
                key={t}
                className={`rounded-md border px-3 py-2 text-sm ${theme === t ? "btn-primary" : "btn-secondary"}`}
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
          <h2 className="mb-3 text-lg font-semibold">Buttons</h2>
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
          <h2 className="mb-3 text-lg font-semibold">Inputs</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-secondary mb-1 block text-xs">
                Weight
              </label>
              <input className="input" placeholder="e.g. 100" />
            </div>
            <div>
              <label className="text-secondary mb-1 block text-xs">Reps</label>
              <input className="input" placeholder="e.g. 5" />
            </div>
          </div>
        </div>

        {/* Cards, glass and backdrop */}
        <div className="card p-4">
          <h2 className="mb-3 text-lg font-semibold">Surfaces</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="card p-4">Card surface</div>
            <div className="glass-surface rounded-lg p-4">Glass surface</div>
            <div
              className="rounded-lg p-4"
              style={{
                background: "var(--color-bg-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              Raw surface
            </div>
          </div>
        </div>

        {/* Backdrop preview */}
        <div className="relative h-48 overflow-hidden rounded-lg">
          <div className="page-backdrop absolute inset-0" />
          <div className="relative z-10 p-4">
            <div className="card inline-block p-3">Backdrop preview</div>
          </div>
        </div>
      </div>
    </div>
  );
}
