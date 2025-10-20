import Link from "next/link";
import { memo } from "react";
import { BarChart3, Dumbbell, Play } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const ACTIONS = [
  {
    title: "Start Workout",
    description: "Begin a new workout session",
    icon: Play,
    gradient: "from-primary to-accent",
    href: "/workout/start",
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
] as const;

type QuickAction = (typeof ACTIONS)[number];

function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      className="group focus-visible:outline-none focus-visible:ring-0"
    >
      <Card
        className={cn(
          "glass-card glass-hairline flex h-full flex-col overflow-hidden border border-white/8 bg-card/85 shadow-xl transition-all duration-300",
          "hover:-translate-y-1 hover:shadow-xl",
          "group-focus-visible:-translate-y-1 group-focus-visible:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-primary/45 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background",
        )}
      >
        <div className={cn("h-1 bg-gradient-to-r", action.gradient)} />
        <CardContent className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-primary-foreground transition-transform duration-300",
                action.gradient,
                "group-hover:scale-110",
              )}
            >
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-foreground">
                {action.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {action.description}
              </p>
            </div>
          </div>
          <Button
            className={cn(
              "mt-auto w-full border-0 text-primary-foreground",
              "bg-gradient-to-r",
              action.gradient,
              "hover:opacity-90",
            )}
          >
            Open
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}

export const QuickActions = memo(function QuickActions() {
  return (
    <section
      aria-label="Quick actions"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {ACTIONS.map((action) => (
        <QuickActionCard key={action.href} action={action} />
      ))}
    </section>
  );
});
