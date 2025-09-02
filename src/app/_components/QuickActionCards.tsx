"use client";

import Link from "next/link";
import { Card } from "~/components/ui/card";

export function QuickActionCards() {
  // Card definitions matching template design
  const cards = [
    {
      id: "start-workout", 
      title: "💪 Let's Get Swole!",
      description: "Time to crush your next workout and dominate your goals",
      href: "/workout/start",
      gradient: "bg-gradient-to-r from-orange-500 to-red-500",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "view-progress",
      title: "🔥 Track Your Gains",
      description: "Celebrate every PR and see how strong you're becoming",
      href: "/progress",
      gradient: "bg-gradient-to-r from-pink-500 to-red-500",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: "manage-templates", 
      title: "⚡ Build Your Arsenal",
      description: "Craft the perfect workout templates for maximum gains",
      href: "/templates",
      gradient: "bg-gradient-to-r from-amber-500 to-orange-500",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((card) => (
        <Link key={card.id} href={card.href} className="block">
          <Card
            surface="card"
            variant="elevated"
            padding="md"
            interactive={true}
            className={`${card.gradient} text-white hover:shadow-lg transition-all group relative overflow-hidden`} // eslint-disable-line no-restricted-syntax
          >
          {/* Icon and arrow row */}
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              {card.icon}
            </div>
            <svg 
              className="h-5 w-5 text-white/80 transition-transform duration-300 group-hover:translate-x-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {card.title}
            </h3>
            <p className="text-sm text-white/90">
              {card.description}
            </p>
          </div>

          {/* Button */}
          <div className="mt-4">
            <div className="inline-flex items-center text-sm font-medium">
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
          </Card>
        </Link>
      ))}
    </div>
  );
}