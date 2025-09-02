"use client";

import { PreferencesStatusBar } from "~/app/_components/PreferencesStatusBar";
import { DashboardContent } from "~/app/_components/DashboardContent";
import { AuthGuard } from "~/components/auth/AuthGuard";

// Main dashboard - now requires authentication
function MainDashboard() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Preferences status bar */}
        <PreferencesStatusBar />
        
        {/* Main content with template design layout */}
        <DashboardContent />
      </div>
    </AuthGuard>
  );
}

export default function Home() {
  return <MainDashboard />;
}
