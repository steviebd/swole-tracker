import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const calendar = [
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  [null, null, null, null, 1, 2, 3],
  [4, 5, 6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15, 16, 17],
  [18, 19, 20, 21, 22, 23, 24],
  [25, 26, 27, 28, 29, 30, 31],
]

const workoutDays = [1, 2, 4, 6, 8, 9, 12, 14, 16, 17, 20, 22, 24, 26]

export function ConsistencyTracker() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-serif font-black">Consistency Tracker</CardTitle>
        <div className="flex gap-2">
          <Badge variant="secondary">Week</Badge>
          <Badge variant="outline">Year</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl">🔥</span>
            </div>
            <p className="text-sm text-muted-foreground">Current Streak</p>
            <p className="text-2xl font-serif font-black text-foreground">14</p>
            <p className="text-xs text-muted-foreground">days</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl">🏆</span>
            </div>
            <p className="text-sm text-muted-foreground">Best Streak</p>
            <p className="text-2xl font-serif font-black text-foreground">14</p>
            <p className="text-xs text-muted-foreground">days</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-sm text-muted-foreground">Frequency</p>
            <p className="text-2xl font-serif font-black text-foreground">3.2</p>
            <p className="text-xs text-muted-foreground">per week</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl">⭐</span>
            </div>
            <p className="text-sm text-muted-foreground">Score</p>
            <p className="text-2xl font-serif font-black text-foreground">100</p>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Workout Calendar - August 2025</h3>
          <div className="grid grid-cols-7 gap-1">
            {calendar.map((week, weekIndex) =>
              week.map((day, dayIndex) => (
                <div key={`${weekIndex}-${dayIndex}`} className="aspect-square">
                  {weekIndex === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                  ) : day ? (
                    <div
                      className={`
                      flex items-center justify-center h-full text-sm rounded-lg border transition-all duration-200
                      ${
                        workoutDays.includes(day)
                          ? "bg-gradient-to-br from-chart-1 to-chart-3 text-white border-transparent shadow-sm"
                          : "border-border hover:border-primary/20 hover:bg-muted/30"
                      }
                      ${day === 17 ? "ring-2 ring-primary ring-offset-2" : ""}
                    `}
                    >
                      {day}
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              )),
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold">Consistency Insights</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Meeting weekly target</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-500">🔥</span>
              <span className="text-sm">Strong streak going!</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">⭐</span>
              <span className="text-sm">Excellent consistency!</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
