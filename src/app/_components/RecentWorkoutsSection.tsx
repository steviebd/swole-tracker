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
  const cardClass = "flex items-center justify-between p-5 rounded-xl transition-all duration-300 cursor-pointer group border bg-card border-border hover:shadow-md";

  const titleClass = "font-bold text-lg text-theme-primary";

  const metaClass = "flex items-center gap-4 text-sm mt-1 text-theme-muted";

  return (
    <div className={cardClass}>
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-colors duration-300"
          style={{ 
            backgroundColor: "var(--color-info)"
          }}
        >
          <svg className="w-6 h-6 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h4 className={titleClass}>{templateName}</h4>
          <div className={metaClass}>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {date}
            </span>
            <span>{exerciseCount} exercises logged</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/workout/session/${id}`}
            className="link-primary"
          >
            View
          </Link>
          <span className="text-theme-muted">
            Repeat
          </span>
        </div>
        <svg className="w-5 h-5 text-theme-muted group-hover:text-theme-secondary transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
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

  const containerClass = "card-interactive p-6";

  // Use tRPC data if available and not loading/error, otherwise use mock data
  const workouts = (!trpcLoading && !trpcError && trpcWorkouts?.length) ? trpcWorkouts : mockWorkouts;
  const isLoading = trpcLoading && !mockWorkouts?.length;

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={titleClass}>Recent Workouts</h2>
          <button className={linkClass}>View all workouts →</button>
        </div>
        
        <div className={containerClass}>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton p-5 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 skeleton rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 skeleton w-1/3"></div>
                    <div className="h-3 skeleton rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={titleClass}>Recent Workouts</h2>
        <Link href="/workouts" className={linkClass}>
          View all workouts →
        </Link>
      </div>
      
      <div className={containerClass}>
        <div className="space-y-4">
          {workouts?.map((workout) => (
            <WorkoutCard
              key={workout.id}
              id={workout.id}
              templateName={workout.template?.name ?? "Total"}
              date={new Date(workout.workoutDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
              exerciseCount={workout.exercises?.length ?? 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}