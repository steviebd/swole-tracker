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
  title,
  subtitle,
  actions,
  className = "",
}: GlassHeaderProps) {
  return (
    <header 
      className={`glass-header sticky top-0 z-40 ${className}`}
      style={{ borderBottomColor: "var(--color-border)" }}
    >
      <div className="px-4 py-3 sm:px-6 sm:py-4">
        {/* Main horizontal layout */}
        <div className="flex items-center justify-between">
          {/* Left side - Title */}
          <div className="min-w-0 flex-1">
            <h1 
              className="text-xl sm:text-2xl font-bold text-foreground truncate"
              role="heading"
              aria-level={1}
            >
              {title}
            </h1>
          </div>
          
          {/* Right side - Action buttons */}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
        
        {/* Subtitle */}
        {subtitle && (
          <p 
            className="text-sm text-muted-foreground mt-1"
            role="doc-subtitle"
          >
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}