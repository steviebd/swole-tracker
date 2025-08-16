import { Calendar, Clock, TrendingUp, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const workouts = [
  {
    name: "Total",
    date: "Aug 16, 2025",
    duration: "45 min",
    exercises: 6,
    volume: "13.2k kg",
    isNew: true,
  },
  {
    name: "Total",
    date: "Aug 16, 2025",
    duration: "38 min",
    exercises: 0,
    volume: "0 kg",
    isNew: false,
  },
  {
    name: "Total",
    date: "Aug 16, 2025",
    duration: "42 min",
    exercises: 6,
    volume: "12.8k kg",
    isNew: false,
  },
]

export function RecentWorkouts() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-serif font-black">Recent Workouts</CardTitle>
          <Button variant="ghost" className="text-primary hover:text-primary/80">
            View all workouts
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {workouts.map((workout, index) => (
          <div
            key={index}
            className="group p-4 rounded-xl border border-border hover:border-primary/20 hover:bg-muted/30 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{workout.name}</h3>
                    {workout.isNew && (
                      <Badge className="bg-gradient-to-r from-chart-1 to-chart-3 text-white text-xs">New!</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {workout.date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {workout.duration}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">{workout.volume}</p>
                <p className="text-sm text-muted-foreground">{workout.exercises} exercises</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                View
              </Button>
              <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                Repeat
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
