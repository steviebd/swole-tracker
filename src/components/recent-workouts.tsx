import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Clock, Calendar } from "lucide-react"

const workouts = [
  {
    name: "Push Day",
    date: "Today",
    duration: "45 min",
    exercises: 6,
    sets: 18,
    volume: "2.4k kg",
    status: "completed",
  },
  {
    name: "Pull Day",
    date: "Yesterday",
    duration: "38 min",
    exercises: 5,
    sets: 15,
    volume: "2.1k kg",
    status: "completed",
  },
  {
    name: "Leg Day",
    date: "2 days ago",
    duration: "52 min",
    exercises: 7,
    sets: 21,
    volume: "3.2k kg",
    status: "completed",
  },
]

export function RecentWorkouts() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-serif font-black">Recent Workouts</CardTitle>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {workouts.map((workout, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h4 className="font-semibold text-foreground">{workout.name}</h4>
                <Badge
                  variant="secondary"
                  className="bg-gradient-to-r from-chart-1 to-chart-3 text-primary-foreground"
                >
                  {workout.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {workout.date}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {workout.duration}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {workout.exercises} exercises • {workout.sets} sets • {workout.volume}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                View
              </Button>
              <Button variant="outline" size="sm">
                Repeat
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}