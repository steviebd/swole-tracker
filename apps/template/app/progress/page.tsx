import { DashboardHeader } from "@/components/dashboard-header"
import { ProgressStats } from "@/components/progress-stats"
import { StrengthChart } from "@/components/strength-chart"
import { ConsistencyTracker } from "@/components/consistency-tracker"
import { AchievementsBadges } from "@/components/achievements-badges"
import { YourExercises } from "@/components/your-exercises"
import { PersonalRecords } from "@/components/personal-records"
import { VolumeAnalysis } from "@/components/volume-analysis"
import { TrainingAnalytics } from "@/components/training-analytics"

export default function ProgressPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-serif font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Progress Dashboard
          </h1>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold">Week</button>
            <button className="px-4 py-2 bg-muted text-muted-foreground rounded-lg">Month</button>
            <button className="px-4 py-2 bg-muted text-muted-foreground rounded-lg">Year</button>
          </div>
        </div>

        <ProgressStats />
        <YourExercises />
        <PersonalRecords />
        <AchievementsBadges />
        <VolumeAnalysis />

        <div className="grid lg:grid-cols-2 gap-8">
          <StrengthChart />
          <ConsistencyTracker />
        </div>

        <TrainingAnalytics />
      </main>
    </div>
  )
}
