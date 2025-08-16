import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export function VolumeAnalysis() {
  const exerciseData = [
    { exercise: "Squat", volume: "71,100kg", sets: 12, reps: 795, sessions: 2, percentage: 96.6 },
    { exercise: "Bench", volume: "2,475kg", sets: 7, reps: 30, sessions: 2, percentage: 3.4 },
  ]

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl font-serif font-bold">Volume Analysis</CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline">Week</Badge>
          <Badge variant="secondary">Month</Badge>
          <Badge variant="secondary">Year</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Volume Metric Selector */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Volume Metric</label>
          <Select defaultValue="total-volume">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total-volume">Total Volume</SelectItem>
              <SelectItem value="average-volume">Average Volume</SelectItem>
              <SelectItem value="max-volume">Max Volume</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Volume Chart Placeholder */}
        <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">73,575kg</div>
            <div className="text-sm text-muted-foreground">Total Volume Over Time</div>
          </div>
        </div>

        {/* Volume Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Volume</div>
            <div className="text-2xl font-bold">73,575kg</div>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Average per Workout</div>
            <div className="text-2xl font-bold">36,787.5kg</div>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Workouts</div>
            <div className="text-2xl font-bold">2</div>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Trend</div>
            <div className="text-2xl font-bold text-muted-foreground">0.0%</div>
          </div>
        </div>

        {/* Volume by Exercise */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Volume by Exercise</h3>

          {/* Exercise Breakdown Table */}
          <div className="overflow-hidden rounded-lg border border-border/50">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold">Exercise</th>
                  <th className="text-left p-3 font-semibold">Volume</th>
                  <th className="text-left p-3 font-semibold">Sets</th>
                  <th className="text-left p-3 font-semibold">Reps</th>
                  <th className="text-left p-3 font-semibold">Sessions</th>
                  <th className="text-left p-3 font-semibold">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {exerciseData.map((exercise) => (
                  <tr key={exercise.exercise} className="border-t border-border/30 hover:bg-muted/20">
                    <td className="p-3 font-medium">{exercise.exercise}</td>
                    <td className="p-3">{exercise.volume}</td>
                    <td className="p-3">{exercise.sets}</td>
                    <td className="p-3">{exercise.reps}</td>
                    <td className="p-3">{exercise.sessions}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary to-accent h-2 rounded-full"
                            style={{ width: `${exercise.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{exercise.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
