import { Trophy, Brain } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export function WorkoutIntelligence() {
  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-serif font-bold">
          <Trophy className="h-6 w-6 text-primary" />
          Today's Workout Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Readiness Score</h3>
              <span className="text-2xl font-bold text-green-500">89%</span>
            </div>
            <Progress value={89} className="h-3 bg-muted">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                style={{ width: "89%" }}
              />
            </Progress>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Load Adjustment:</span>
              <span className="text-blue-500 font-medium">+10%</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Session Success Chance</h3>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="64, 100"
                    className="text-blue-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-500">64%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Probability to beat your previous bests</p>
                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 mt-1">Good</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">AI Coach Summary</h3>
          </div>
          <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary">
            <p className="text-sm leading-relaxed">
              You're set for a solid session with good readiness (rho 0.894); focus on progressive overload with slight
              weight increases where possible, based on WHOOP data showing strong sleep and recovery. Prioritize rest
              between sessions with at least 48 hours for muscle repair, and incorporate light activity tomorrow to
              maintain momentum.
            </p>
            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              ⚠️ This is not medical advice. These recommendations are based on your WHOOP data and workout history.
              Always listen to your body and consult healthcare professionals for medical concerns.
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Exercise Recommendations</h3>
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-lg">Squat</h4>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span>
                    Planned Volume: <span className="font-medium">39780kg</span>
                  </span>
                  <span>
                    Best Volume: <span className="font-medium">N/A</span>
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Beat Best Chance</div>
                <div className="text-2xl font-bold text-primary">64%</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
