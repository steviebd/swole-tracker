import { ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkoutIntelligence } from "@/components/workout-intelligence"
import { ExerciseLogger } from "@/components/exercise-logger"
import { WorkoutControls } from "@/components/workout-controls"

export default function WorkoutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-serif font-bold">Total</h1>
                <p className="text-sm text-muted-foreground">17/09/2025, 12:45:00 am</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <RefreshCw className="h-4 w-4" />
              Refresh Workout Intelligence
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        <WorkoutIntelligence />
        <ExerciseLogger />
        <WorkoutControls />
      </main>
    </div>
  )
}
