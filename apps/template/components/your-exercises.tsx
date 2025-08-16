import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function YourExercises() {
  const exercises = [
    {
      name: "Bench",
      lastUsed: "16/08/2025",
      sets: 7,
      trend: "up",
    },
    {
      name: "Squat",
      lastUsed: "16/08/2025",
      sets: 12,
      trend: "up",
    },
  ]

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-serif font-bold">Your Exercises</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {exercises.map((exercise) => (
          <div
            key={exercise.name}
            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div>
              <h3 className="font-semibold text-lg">{exercise.name}</h3>
              <p className="text-sm text-muted-foreground">Last used: {exercise.lastUsed}</p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {exercise.sets} sets
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
