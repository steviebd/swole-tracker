"use client";

import Link from "next/link";
import { History, ArrowUpRight, ArrowDownLeft, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "~/components/ui/card";
import { GlassSurface } from "~/components/ui/glass-surface";
import { analytics } from "~/lib/analytics";

export function QuickActionCards() {
  // Card definitions matching template design
  const cards = [
    {
      id: "resume",
      title: "Resume last session",
      description: "Jump back into the workout you logged most recently.",
      href: "/workouts",
      background: "var(--gradient-universal-action-primary)",
      icon: <History className="h-6 w-6" aria-hidden />,
    },
    {
      id: "start-upper",
      title: "Start upper",
      description: "Heavy presses, vertical pulls, and arm finishers.",
      href: "/workout/start?focus=upper",
      background: "var(--gradient-universal-action-primary)",
      icon: <ArrowUpRight className="h-6 w-6" aria-hidden />,
    },
    {
      id: "start-lower",
      title: "Start lower",
      description: "Squats, pulls, and posterior-chain accessories.",
      href: "/workout/start?focus=lower",
      background: "var(--gradient-universal-success)",
      icon: <ArrowDownLeft className="h-6 w-6" aria-hidden />,
    },
    {
      id: "view-progress",
      title: "View progress",
      description: "Track volume, PRs, and readiness trends.",
      href: "/progress",
      background: "var(--gradient-universal-stats-orange)",
      icon: <BarChart3 className="h-6 w-6" aria-hidden />,
    },
  ];

  return (
    <motion.div
      className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.1 },
        },
      }}
    >
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Link
            key={card.id}
            href={card.href}
            className="group block focus-visible:ring-0 focus-visible:outline-none"
            onClick={() =>
              analytics.event("quick_action_selected", { action: card.id })
            }
          >
            <Card
              surface="card"
              variant="elevated"
              padding="md"
              interactive
              className="group-focus-visible:ring-offset-background relative flex h-full flex-col justify-between overflow-hidden text-white shadow-xl transition-all group-focus-visible:shadow-2xl group-focus-visible:ring-2 group-focus-visible:ring-white/70 group-focus-visible:ring-offset-2 hover:shadow-2xl"
              style={{ background: card.background }}
            >
              <div className="pointer-events-none absolute inset-0 bg-black/20" />
              <div className="relative flex items-center justify-between">
                <GlassSurface className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 shadow-inner">
                  {card.icon}
                </GlassSurface>
                <span className="text-sm font-semibold tracking-wide text-white/70 uppercase">
                  Go
                </span>
              </div>
              <div className="relative mt-4 space-y-2">
                <h3 className="text-heading">{card.title}</h3>
                <p className="text-sm text-white/85">{card.description}</p>
              </div>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
