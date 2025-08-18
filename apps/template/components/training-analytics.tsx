import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function TrainingAnalytics() {
  const trainingDistribution = [
    { type: "1-5 reps (Strength)", percentage: 52.6 },
    { type: "6+ reps (Endurance)", percentage: 47.4 },
  ]

  const setRepCombinations = [
    { combination: "1 x 5", percentage: 47.4 },
    { combination: "1 x 60", percentage: 15.8 },
    { combination: "1 x 80", percentage: 15.8 },
    { combination: "1 x 120", percentage: 15.8 },
    { combination: "1 x 0", percentage: 5.3 },
  ]

  const repCounts = [
    { reps: "5 reps", percentage: 47.4 },
    { reps: "60 reps", percentage: 15.8 },
    { reps: "80 reps", percentage: 15.8 },
    { reps: "120 reps", percentage: 15.8 },
    { reps: "0 reps", percentage: 5.3 },
  ]

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-serif font-bold">Set/Rep Distribution Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Training Style Distribution */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Training Style Distribution</h3>
            <div className="space-y-3">
              {trainingDistribution.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <span className="text-sm">{item.type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary to-accent h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Common Set x Rep Combinations */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Most Common Set x Rep Combinations</h3>
            <div className="space-y-3">
              {setRepCombinations.map((item) => (
                <div key={item.combination} className="flex items-center justify-between">
                  <span className="text-sm">{item.combination}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-accent to-primary h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Sets per Exercise Distribution */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Sets per Exercise Distribution</h3>
            <div className="h-32 bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
              <div className="text-center">
                <div className="text-lg font-bold">100%</div>
                <div className="text-sm text-muted-foreground">1 Set Distribution</div>
              </div>
            </div>
          </div>

          {/* Most Common Rep Counts */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Most Common Rep Counts</h3>
            <div className="space-y-2">
              {repCounts.map((item) => (
                <div key={item.reps} className="flex items-center justify-between text-sm">
                  <span>{item.reps}</span>
                  <span className="font-medium">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
