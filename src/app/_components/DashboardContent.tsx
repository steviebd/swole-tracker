"use client";

import { HomePageContent } from "./HomePageContent";
import { StatsCards } from "./StatsCards";
import { QuickActionCards } from "./QuickActionCards";
import { WeeklyProgressSection } from "./WeeklyProgressSection";
import { RecentWorkoutsSection } from "./RecentWorkoutsSection";
import { HomePageFooter } from "./HomePageFooter";
import { MotivationCard } from "./MotivationCard";
import { JokeOfTheDay } from "./joke-of-the-day";

export function DashboardContent() {
  return (
    <HomePageContent>
      {/* Quick Stats - 3 cards showing this week's metrics, with lead spanning full width */}
      <StatsCards
        lead={
          <div className="rounded-2xl overflow-hidden md:mb-0">
            <JokeOfTheDay />
          </div>
        }
      />

      {/* Quick Actions - Start Workout, Joke of Day, Manage Templates */}
      <QuickActionCards />

      {/* Weekly Progress - Progress bars for goals */}
      <WeeklyProgressSection />

      {/* Recent Workouts - List of recent workout sessions */}
      <RecentWorkoutsSection />

      {/* Motivation/CTA */}
      <MotivationCard />

      {/* Homepage Footer */}
      <HomePageFooter />
    </HomePageContent>
  );
}