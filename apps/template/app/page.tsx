import { DashboardHeader } from "@/components/dashboard-header"
import { StatsCards } from "@/components/stats-cards"
import { QuickActions } from "@/components/quick-actions"
import { WeeklyProgress } from "@/components/weekly-progress"
import { RecentWorkouts } from "@/components/recent-workouts"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 space-y-8">
        <StatsCards />
        <QuickActions />
        <div className="grid lg:grid-cols-2 gap-8">
          <WeeklyProgress />
          <RecentWorkouts />
        </div>
      </main>
    </div>
  )
}
