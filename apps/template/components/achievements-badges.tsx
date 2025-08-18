import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Flame, Target, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const achievements = [
  {
    title: "4 New PRs",
    description: "Personal records this month",
    icon: Trophy,
    status: "completed",
    gradient: "from-yellow-400 to-orange-500",
  },
  {
    title: "14 Day Streak",
    description: "Consecutive workout days",
    icon: Flame,
    status: "completed",
    gradient: "from-orange-500 to-red-500",
  },
  {
    title: "Consistency Master",
    description: "3.2x per week average",
    icon: Target,
    status: "completed",
    gradient: "from-green-400 to-blue-500",
  },
  {
    title: "Volume Champion",
    description: "73,575kg total volume",
    icon: TrendingUp,
    status: "completed",
    gradient: "from-purple-400 to-pink-500",
  },
]

export function AchievementsBadges() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-serif font-black">This Month's Achievements</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <Badge className="bg-gradient-to-r from-chart-1 to-chart-3 text-white">On Fire!</Badge>
          </div>
        </div>
        <p className="text-muted-foreground">Your progress highlights for August 2025</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((achievement, index) => {
            const Icon = achievement.icon
            return (
              <div
                key={index}
                className="group p-4 rounded-xl border border-border hover:border-primary/20 hover:bg-muted/30 transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-br ${achievement.gradient} group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <Badge className={`bg-gradient-to-r ${achievement.gradient} text-white`}>✓</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{achievement.title}</h3>
                <p className="text-sm text-muted-foreground">{achievement.description}</p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
