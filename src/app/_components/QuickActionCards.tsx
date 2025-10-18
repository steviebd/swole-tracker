"use client";

import Link from "next/link";
import { History, ArrowUpRight, ArrowDownLeft, BarChart3 } from "lucide-react";

import { Card } from "~/components/ui/card";
import { analytics } from "~/lib/analytics";

export function QuickActionCards() {
  // Card definitions matching template design
  const cards = [
    {
      id: "resume",
      title: "Resume last session",
      description: "Jump back into the workout you logged most recently.",
      href: "/workouts",
      background:
        "linear-gradient(135deg, color-mix(in oklab, var(--md-ref-palette-primary-40) 75%, black 20%) 0%, color-mix(in oklab, var(--md-ref-palette-primary-30) 60%, black 10%) 100%)",
      icon: <History className="h-6 w-6" aria-hidden />,
    },
    {
      id: "start-upper",
      title: "Start upper",
      description: "Heavy presses, vertical pulls, and arm finishers.",
      href: "/workout/start?focus=upper",
      background:
        "linear-gradient(135deg, color-mix(in oklab, var(--md-ref-palette-secondary-40) 70%, black 20%) 0%, color-mix(in oklab, var(--md-ref-palette-secondary-30) 55%, black 10%) 100%)",
      icon: <ArrowUpRight className="h-6 w-6" aria-hidden />,
    },
    {
      id: "start-lower",
      title: "Start lower",
      description: "Squats, pulls, and posterior-chain accessories.",
      href: "/workout/start?focus=lower",
      background:
        "linear-gradient(135deg, color-mix(in oklab, var(--md-ref-palette-tertiary-40) 70%, black 20%) 0%, color-mix(in oklab, var(--md-ref-palette-tertiary-30) 55%, black 10%) 100%)",
      icon: <ArrowDownLeft className="h-6 w-6" aria-hidden />,
    },
    {
      id: "view-progress",
      title: "View progress",
      description: "Track volume, PRs, and readiness trends.",
      href: "/progress",
      background:
        "linear-gradient(135deg, color-mix(in oklab, var(--md-ref-palette-secondary-30) 65%, black 20%) 0%, color-mix(in oklab, var(--md-ref-palette-secondary-40) 70%, black 15%) 100%)",
      icon: <BarChart3 className="h-6 w-6" aria-hidden />,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Link
          key={card.id}
          href={card.href}
          className="group block focus-visible:outline-none focus-visible:ring-0"
          onClick={() =>
            analytics.event("quick_action_selected", { action: card.id })
          }
        >
          <Card
            surface="card"
            variant="elevated"
            padding="md"
            interactive
            className="relative flex h-full flex-col justify-between overflow-hidden text-white shadow-xl transition-all hover:shadow-2xl group-focus-visible:shadow-2xl group-focus-visible:ring-2 group-focus-visible:ring-white/70 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background"
            style={{ background: card.background }}
          >
            <div className="pointer-events-none absolute inset-0 bg-black/10" />
            <div className="relative flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 shadow-inner backdrop-blur">
                {card.icon}
              </div>
              <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
                Go
              </span>
            </div>
            <div className="relative mt-4 space-y-2">
              <h3 className="text-lg font-semibold leading-tight">
                {card.title}
              </h3>
              <p className="text-sm text-white/85">{card.description}</p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
