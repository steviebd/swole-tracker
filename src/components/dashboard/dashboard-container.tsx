"use client";

import * as React from "react";
import { useAuth } from "~/providers/AuthProvider";
import { cn } from "~/lib/utils";
import { StatsGrid } from "./stats-grid";
import { ProgressSection } from "./progress-section";
import { RecentWorkouts } from "./recent-workouts";

/**
 * Main dashboard container component that orchestrates the new dashboard layout
 * 
 * Layout structure:
 * ├── Glass Header (handled by parent DashboardContent) ✅
 * ├── Stats Grid (4 key metrics in gradient cards) 🆕
 * ├── Quick Actions (handled by parent QuickActionCards) ✅
 * ├── Progress Section (Weekly/Monthly toggle with goals) 🆕
 * └── Recent Workouts (list with repeat functionality) 🆕
 * 
 * Features:
 * - Mobile-first responsive design
 * - Error boundaries for component failures
 * - Loading states coordination
 * - Accessibility compliance
 * - Performance optimized with proper memoization
 */

export interface DashboardContainerProps {
  /** Additional CSS classes */
  className?: string;
  /** Children to render (e.g., QuickActionCards from parent) */
  children?: React.ReactNode;
}

const DashboardContainer = React.forwardRef<HTMLDivElement, DashboardContainerProps>(
  ({ className, children }, ref) => {
    const { user } = useAuth();

    // Don't render if no user (handled by parent but defensive)
    if (!user) {
      return null;
    }

    return (
      <div 
        ref={ref} 
        className={cn(
          "space-y-8 pb-24", // Bottom padding for mobile FAB
          className
        )}
      >
        {/* Statistics Grid - 4 key metrics */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">
            Workout Statistics
          </h2>
          <StatsGrid />
        </section>

        {/* Quick Actions (passed as children from parent) */}
        {children && (
          <section aria-labelledby="actions-heading">
            <h2 id="actions-heading" className="sr-only">
              Quick Actions
            </h2>
            {children}
          </section>
        )}

        {/* Progress Tracking Section */}
        <section aria-labelledby="progress-heading">
          <h2 id="progress-heading" className="sr-only">
            Progress Tracking and Goals
          </h2>
          <ProgressSection />
        </section>

        {/* Recent Workouts List */}
        <section aria-labelledby="recent-workouts-heading">
          <h2 id="recent-workouts-heading" className="sr-only">
            Recent Workout Sessions
          </h2>
          <RecentWorkouts limit={5} />
        </section>
      </div>
    );
  }
);

DashboardContainer.displayName = "DashboardContainer";

export { DashboardContainer };