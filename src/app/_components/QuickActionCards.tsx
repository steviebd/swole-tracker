"use client";

import { Card } from "~/app/_components/ui/Card";

export function QuickActionCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gap-md">
      {/* Start Workout Card */}
      <Card 
        as="a" 
        href="/workout/start"
        surface="card" 
        interactive 
        padding="lg"
        className="block group"
      >
        <div className="h-1 bg-chart-1 rounded-t-token-card" />
        <div className="space-y-gap-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-token-card bg-chart-1/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-chart-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-text-secondary group-hover:text-chart-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">Start Workout</h3>
            <p className="text-sm text-text-secondary">Begin a new workout session</p>
          </div>
        </div>
      </Card>

      {/* Progress Dashboard Card */}
      <Card 
        as="a" 
        href="/progress"
        surface="card" 
        interactive 
        padding="lg"
        className="block group"
      >
        <div className="h-1 bg-chart-2 rounded-t-token-card" />
        <div className="space-y-gap-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-token-card bg-chart-2/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-chart-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-text-secondary group-hover:text-chart-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">View Progress</h3>
            <p className="text-sm text-text-secondary">Track your strength gains and consistency</p>
          </div>
        </div>
      </Card>

      {/* Manage Templates Card */}
      <Card 
        as="a" 
        href="/templates"
        surface="card" 
        interactive 
        padding="lg"
        className="block group"
      >
        <div className="h-1 bg-chart-3 rounded-t-token-card" />
        <div className="space-y-gap-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-token-card bg-chart-3/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-chart-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-text-secondary group-hover:text-chart-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">Manage Templates</h3>
            <p className="text-sm text-text-secondary">Create and edit workout templates</p>
          </div>
        </div>
      </Card>
    </div>
  );
}