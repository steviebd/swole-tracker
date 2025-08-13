"use client";

import React from "react";
import { useTheme } from "~/providers/ThemeProvider";

interface HomePageContentProps {
  children: React.ReactNode;
}

interface SectionProps {
  children: React.ReactNode;
  spacing?: "default" | "compact" | "loose";
}

interface GridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
}

// Main content wrapper with proper spacing
export function HomePageContent({ children }: HomePageContentProps) {
  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 space-y-6 sm:space-y-8 md:space-y-12">
      {children}
    </div>
  );
}

// Section wrapper for different content areas
export function Section({ children, spacing = "default" }: SectionProps) {
  const spacingClasses = {
    compact: "space-y-4",
    default: "space-y-6", 
    loose: "space-y-8"
  };

  return (
    <section className={spacingClasses[spacing]}>
      {children}
    </section>
  );
}

// Responsive grid system matching mockup
export function Grid({ children, cols = 3, gap = "md" }: GridProps) {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3", 
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
  };

  const gapClasses = {
    sm: "gap-4",
    md: "gap-6",
    lg: "gap-8"
  };

  return (
    <div className={`grid ${colClasses[cols]} ${gapClasses[gap]}`}>
      {children}
    </div>
  );
}

// Stats cards grid (will be used for dashboard metrics)
export function StatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {children}
    </div>
  );
}

// Quick actions grid (3-column for main action cards)
export function QuickActionsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {children}
    </div>
  );
}

// Recent workouts section with proper spacing
export function RecentWorkoutsSection({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme } = useTheme();
  
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-bold transition-colors duration-300 ${
          theme !== "system" || (theme === "system" && resolvedTheme === "dark")
            ? "text-white" 
            : "text-gray-900 dark:text-white"
        }`}>
          Recent Workouts
        </h2>
        <button className={`font-medium transition-colors duration-300 ${
          theme !== "system" || (theme === "system" && resolvedTheme === "dark")
            ? "text-blue-400 hover:text-blue-300" 
            : "text-blue-500 hover:text-blue-600 dark:text-blue-400"
        }`}>
          View all workouts →
        </button>
      </div>
      
      <div className={`transition-colors duration-300 rounded-xl p-6 ${
        theme !== "system" || (theme === "system" && resolvedTheme === "dark")
          ? "bg-gray-900 border-gray-800 shadow-lg" 
          : "bg-white border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-800"
      } border`}>
        {children}
      </div>
    </section>
  );
}