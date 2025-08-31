"use client";

import { PreferencesStatusBar } from "~/app/_components/PreferencesStatusBar";
import { DashboardContent } from "~/app/_components/DashboardContent";

// Main dashboard - now always accessible
function MainDashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Preferences status bar */}
      <PreferencesStatusBar />
      
      {/* Main content with template design layout */}
      <DashboardContent />
    </div>
  );
}

export default function Home() {
  return <MainDashboard />;
}
