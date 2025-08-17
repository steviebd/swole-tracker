"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { useMockFeed } from "~/hooks/useMockData";

interface WorkoutCardProps {
  id: number;
  templateName: string;
  date: string;
  exerciseCount: number;
}

function WorkoutCard({ id, templateName, date, exerciseCount }: WorkoutCardProps) {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white hover:shadow-lg transition-shadow group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-lg">{templateName}</h4>
            <div className="flex items-center gap-1 text-sm text-white/90">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {date}
            </div>
            <p className="text-sm text-white/80">{exerciseCount} exercises logged</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href={`/workout/session/${id}`}
            className="text-sm font-medium text-white hover:text-white/80 transition-colors"
          >
            View
          </Link>
          <button className="text-sm font-medium text-white hover:text-white/80 transition-colors">
            Repeat
          </button>
          <svg className="w-5 h-5 text-white/80 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function RecentWorkoutsSection() {
  // Try to use real tRPC data first, fallback to mock data
  const {
    data: trpcWorkouts,
    isLoading: trpcLoading,
    error: trpcError,
  } = api.workouts.getRecent.useQuery({ limit: 3 });
  
  const { data: mockWorkouts } = useMockFeed(3);

  const titleClass = "text-xl font-bold text-theme-primary";

  const linkClass = "link-primary font-medium";

  const containerClass = "card-interactive p-6 animate-smooth-scale";

  // Use tRPC data if available and not loading/error, otherwise use mock data
  const workouts = (!trpcLoading && !trpcError && trpcWorkouts?.length) ? trpcWorkouts : mockWorkouts;
  const isLoading = trpcLoading && !mockWorkouts?.length;

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Recent Workouts</h2>
          <button className="text-sm font-medium text-muted-foreground hover:text-foreground">
            View all workouts →
          </button>
        </div>
        
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-muted rounded-xl p-4 h-16"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Recent Workouts</h2>
        <Link href="/workouts" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          View all workouts →
        </Link>
      </div>
      
      <div className="space-y-3">
        {workouts?.map((workout) => (
          <WorkoutCard
            key={workout.id}
            id={workout.id}
            templateName={workout.template?.name ?? "Push Day"}
            date={new Date(workout.workoutDate).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
            exerciseCount={workout.exercises?.length ?? 4}
          />
        ))}
      </div>
    </div>
  );
}