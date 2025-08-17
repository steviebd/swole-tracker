"use client";

import React from "react";

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

// Main content wrapper with template design layout
export function HomePageContent({ children }: HomePageContentProps) {
  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Container with template spacing and layout */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {children}
      </div>
    </div>
  );
}

// Section wrapper for different content areas with mobile-first spacing
export function Section({ children, spacing = "default" }: SectionProps) {
  const spacingClasses = {
    compact: "space-y-3 sm:space-y-4",
    default: "space-y-4 sm:space-y-6", 
    loose: "space-y-6 sm:space-y-8"
  };

  return (
    <section className={spacingClasses[spacing]}>
      {children}
    </section>
  );
}

// Mobile-first responsive grid system
export function Grid({ children, cols = 3, gap = "md" }: GridProps) {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3", 
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
  };

  const gapClasses = {
    sm: "gap-3 sm:gap-4",
    md: "gap-4 sm:gap-6",
    lg: "gap-6 sm:gap-8"
  };

  return (
    <div className={`grid ${colClasses[cols]} ${gapClasses[gap]}`}>
      {children}
    </div>
  );
}

// Stats cards grid with mobile-first design
export function StatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {children}
    </div>
  );
}

// Quick actions grid with mobile-first single-column priority
export function QuickActionsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {children}
    </div>
  );
}

// Recent workouts section with mobile-first spacing
export function RecentWorkoutsSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-foreground transition-colors duration-300">
          Recent Workouts
        </h2>
        <button className="font-medium text-blue-500 hover:text-blue-600 transition-colors duration-300 text-sm sm:text-base">
          View all workouts →
        </button>
      </div>
      
      <div className="transition-colors duration-300 rounded-xl p-4 sm:p-6 bg-card border border-border shadow-lg">
        {children}
      </div>
    </section>
  );
}