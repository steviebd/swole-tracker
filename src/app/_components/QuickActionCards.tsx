"use client";

import { Card } from "~/app/_components/ui/Card";

export function QuickActionCards() {
  // Card definitions with gradient styling
  const cards = [
    {
      id: "start-workout",
      title: "Start Workout",
      description: "Begin a new workout session",
      href: "/workout/start",
      gradient: "gradient-action-primary",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "view-progress",
      title: "View Progress",
      description: "Track your strength gains and consistency",
      href: "/progress",
      gradient: "gradient-stats-red",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: "manage-templates",
      title: "Manage Templates",
      description: "Create and edit workout templates",
      href: "/templates",
      gradient: "gradient-stats-amber",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gap-md">
      {cards.map((card) => (
        <Card
          key={card.id}
          as="a"
          href={card.href}
          surface="card"
          interactive
          padding="lg"
          className="group relative block overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg"
        >
          {/* Gradient background overlay */}
          <div className={`absolute inset-0 ${card.gradient} opacity-90`} />

          {/* Card content */}
          <div className="relative z-10 space-y-gap-sm">
            {/* Icon and arrow row */}
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-token-card bg-white/20 text-white backdrop-blur-sm transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110">
                {card.icon}
              </div>
              <svg 
                className="h-5 w-5 text-white/60 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Content */}
            <div className="space-y-gap-xs">
              <h3 className="text-lg font-semibold text-white transition-all duration-300 group-hover:text-white">
                {card.title}
              </h3>
              <p className="text-sm text-white/80 transition-all duration-300 group-hover:text-white/90">
                {card.description}
              </p>
            </div>

            {/* Enhanced button styling */}
            <div className="mt-gap-md pt-gap-sm">
              <div className="inline-flex items-center justify-center rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all duration-300 group-hover:bg-white/20 group-hover:shadow-md">
                Get Started
                <svg 
                  className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}