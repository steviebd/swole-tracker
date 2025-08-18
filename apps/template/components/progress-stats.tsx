import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Zap, Target, Award } from "lucide-react"

const stats = [
  {
    title: "Total Volume",
    value: "73,575 kg",
    change: "+12.5%",
    icon: TrendingUp,
    gradient: "from-chart-1 to-chart-3",
  },
  {
    title: "Workouts",
    value: "14",
    change: "+3 this week",
    icon: Zap,
    gradient: "from-chart-2 to-chart-1",
  },
  {
    title: "Weekly Frequency",
    value: "3.2x",
    change: "Above target",
    icon: Target,
    gradient: "from-chart-3 to-chart-4",
  },
  {
    title: "Current Streak",
    value: "14 days",
    change: "Personal best!",
    icon: Award,
    gradient: "from-chart-4 to-chart-2",
  },
]

export function ProgressStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card
            key={index}
            className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-10`} />
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-serif font-black text-foreground">{stat.value}</p>
                <p className="text-sm text-chart-1 font-medium">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
