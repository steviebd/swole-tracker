"use client";

import React from "react";

/**
 * Props for the GlassHeader component
 */
export interface GlassHeaderProps {
  /** Main header title */
  title: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Action buttons to display on the right side */
  actions?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * GlassHeader - Reusable header component with glass effects and mobile patterns
 *
 * Features:
 * - Glass effect with gradient backgrounds and subtle borders
 * - Horizontal layout with title on left, actions on right
 * - Optional subtitle support
 * - Design token integration for consistent spacing/colors
 * - Responsive behavior with proper mobile-first design
 * - Accessibility with proper semantic structure and heading roles
 *
 * Based on mobile app pattern from apps/mobile/app/(tabs)/index.tsx
 */
export function GlassHeader({
  title: _title,
  subtitle,
  actions,
  className = "",
}: GlassHeaderProps) {
  return (
    <header
      className={`bg-card/95 border-border/50 sticky top-0 z-40 border-b backdrop-blur-sm ${className}`}
    >
      <div className="mx-auto max-w-7xl px-6 py-4">
        {/* Main horizontal layout */}
        <div className="flex items-center justify-between">
          {/* Left side - Logo and Title */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <h1
              className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-2xl font-bold text-transparent"
              role="heading"
              aria-level={1}
            >
              Swole Tracker
            </h1>
          </div>

          {/* Right side - Action buttons */}
          {actions && (
            <div className="flex flex-shrink-0 items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p
            className="text-muted-foreground mt-1 ml-11 text-sm"
            role="doc-subtitle"
          >
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
