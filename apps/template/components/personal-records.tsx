import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Zap, BarChart3 } from "lucide-react"

export function PersonalRecords() {
  const prStats = [
    {
      icon: Trophy,
      label: "Total PRs",
      value: "4",
      subtitle: "this month",
      color: "text-amber-500",
    },
    {
      icon: Zap,
      label: "Weight PRs",
      value: "2",
      subtitle: "max weight",
      color: "text-orange-500",
    },
    {
      icon: BarChart3,
      label: "Volume PRs",
      value: "2",
      subtitle: "total volume",
      color: "text-green-500",
    },
  ]

  const recentPRs = [
    {
      exercise: "Bench",
      type: "Weight PR",
      value: "105kg x 5",
      estimate: "~122.5kg 1RM",
      date: "Aug 16, 2025",
      isNew: true,
    },
    {
      exercise: "Bench",
      type: "Volume PR",
      value: "1620kg total",
      estimate: "",
      date: "Aug 16, 2025",
      isNew: false,
    },
  ]

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl font-serif font-bold">Personal Records</CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline">All</Badge>
          <Badge variant="secondary">Weight</Badge>
          <Badge variant="secondary">Volume</Badge>
          <Badge variant="secondary">Week</Badge>
          <Badge variant="secondary">Month</Badge>
          <Badge variant="secondary">Year</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PR Stats */}
        <div className="grid grid-cols-3 gap-4">
          {prStats.map((stat) => (
            <div key={stat.label} className="text-center p-4 bg-muted/30 rounded-lg">
              <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
              <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.subtitle}</div>
            </div>
          ))}
        </div>

        {/* Recent Achievements Timeline */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Achievements Timeline</h3>
            <button className="text-sm text-primary hover:underline">View All History</button>
          </div>
          <div className="space-y-3">
            {recentPRs.map((pr, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border-l-4 border-primary"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{pr.exercise}</span>
                      <Badge variant="outline" className="text-xs">
                        {pr.type}
                      </Badge>
                      {pr.isNew && <Badge className="text-xs bg-green-500 text-white">New!</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pr.value} {pr.estimate && `• ${pr.estimate}`}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{pr.date}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
