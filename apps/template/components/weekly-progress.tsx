import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

const goals = [
  {
    label: "Workout Goal",
    current: 14,
    target: 3,
    unit: "sessions",
    progress: 100,
    status: "exceeded",
  },
  {
    label: "Volume Goal",
    current: 73.6,
    target: 15,
    unit: "k kg",
    progress: 100,
    status: "exceeded",
  },
  {
    label: "Consistency",
    current: 100,
    target: 100,
    unit: "%",
    progress: 100,
    status: "perfect",
  },
]

export function WeeklyProgress() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-serif font-black">Weekly Progress</CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              Week
            </Badge>
            <Badge variant="outline">Month</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {goals.map((goal, index) => (
          <div key={index} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{goal.label}</p>
                <p className="text-2xl font-serif font-black text-foreground">
                  {goal.current}
                  {goal.unit} / {goal.target}
                  {goal.unit}
                </p>
              </div>
              <Badge
                className={`${
                  goal.status === "exceeded"
                    ? "bg-gradient-to-r from-chart-1 to-chart-3 text-white"
                    : goal.status === "perfect"
                      ? "bg-gradient-to-r from-chart-3 to-chart-4 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {goal.status === "exceeded" ? "Exceeded!" : goal.status === "perfect" ? "Perfect!" : "In Progress"}
              </Badge>
            </div>
            <Progress value={goal.progress} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {goal.status === "exceeded"
                ? `${goal.current - goal.target}${goal.unit} over target`
                : goal.status === "perfect"
                  ? "Great consistency!"
                  : `${goal.target - goal.current}${goal.unit} remaining`}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
