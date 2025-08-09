"use client";

import { HomePageContent } from "./HomePageContent";
import { StatsCards } from "./StatsCards";
import { QuickActionCards } from "./QuickActionCards";
import { WeeklyProgressSection } from "./WeeklyProgressSection";
import { RecentWorkoutsSection } from "./RecentWorkoutsSection";
import { HomePageFooter } from "./HomePageFooter";

export function DashboardContent() {
  return (
    <HomePageContent>
      {/* Quick Stats - 3 cards showing this week's metrics */}
      <StatsCards />

      {/* Quick Actions - Start Workout, Joke of Day, Manage Templates */}
      <QuickActionCards />

      {/* Weekly Progress - Progress bars for goals */}
      <WeeklyProgressSection />

      {/* Recent Workouts - List of recent workout sessions */}
      <RecentWorkoutsSection />

      {/* Homepage Footer */}
      <HomePageFooter />
    </HomePageContent>
  );
}