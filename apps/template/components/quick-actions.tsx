import { Play, BarChart3, Dumbbell } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const actions = [
  {
    title: "Start Workout",
    description: "Begin a new workout session",
    icon: Play,
    gradient: "from-primary to-accent",
    href: "/workout",
  },
  {
    title: "View Progress",
    description: "Track your strength gains and consistency",
    icon: BarChart3,
    gradient: "from-chart-2 to-chart-1",
    href: "/progress",
  },
  {
    title: "Manage Templates",
    description: "Create and edit workout templates",
    icon: Dumbbell,
    gradient: "from-chart-3 to-chart-4",
    href: "/templates",
  },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {actions.map((action, index) => {
        const Icon = action.icon
        return (
          <Card
            key={index}
            className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            <div className={`h-2 bg-gradient-to-r ${action.gradient}`} />
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`p-4 rounded-2xl bg-gradient-to-br ${action.gradient} group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-serif font-black text-foreground mb-1">{action.title}</h3>
                  <p className="text-muted-foreground text-sm">{action.description}</p>
                </div>
              </div>
              <Button className={`w-full bg-gradient-to-r ${action.gradient} hover:opacity-90 text-white border-0`}>
                Open
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
