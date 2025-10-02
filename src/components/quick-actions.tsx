import Link from "next/link";
import { memo } from "react";
import { BarChart3, Dumbbell, Play } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const actions = [
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
];

function MobileActionCard({
  action,
}: {
  action: (typeof actions)[number];
}) {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      className={cn(
        "flex min-w-[220px] snap-start flex-col rounded-2xl border border-border/40 bg-card/80 p-4 text-left shadow-sm",
        "transition-transform duration-300 hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl text-primary-foreground",
            "bg-gradient-to-br",
            action.gradient,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{action.title}</p>
          <p className="text-xs text-muted-foreground">{action.description}</p>
        </div>
      </div>
      <span className="mt-4 inline-flex items-center text-xs font-semibold uppercase tracking-wide text-primary">
        Open
      </span>
    </Link>
  );
}

function DesktopActionCard({
  action,
}: {
  action: (typeof actions)[number];
}) {
  const Icon = action.icon;

  return (
    <Link href={action.href} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden border-0 bg-card/90 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className={cn("h-1 bg-gradient-to-r", action.gradient)} />
        <CardContent className="flex flex-1 flex-col gap-5 p-6">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "grid h-12 w-12 place-items-center rounded-2xl text-primary-foreground transition-transform duration-300",
                "bg-gradient-to-br",
                action.gradient,
                "group-hover:scale-110",
              )}
            >
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-foreground">{action.title}</h3>
              <p className="text-sm text-muted-foreground">{action.description}</p>
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
    <div className="space-y-4">
      <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2 md:hidden" aria-label="Quick actions">
        <div className="flex snap-x snap-mandatory gap-3">
          {actions.map((action) => (
            <MobileActionCard key={action.href} action={action} />
          ))}
        </div>
      </div>

      <div className="hidden gap-6 md:grid md:grid-cols-3" aria-hidden>
        {actions.map((action) => (
          <DesktopActionCard key={action.href} action={action} />
        ))}
      </div>
    </div>
  );
});
