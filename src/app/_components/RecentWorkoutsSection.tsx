"use client";

import Link from "next/link";
import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";
import { useMockFeed } from "~/hooks/useMockData";

interface WorkoutCardProps {
  id: number;
  templateName: string;
  date: string;
  exerciseCount: number;
  theme: string;
}

function WorkoutCard({ id, templateName, date, exerciseCount, theme }: WorkoutCardProps) {
  const { resolvedTheme } = useTheme();
  const cardClass = `flex items-center justify-between p-5 rounded-xl transition-all duration-300 cursor-pointer group border ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "bg-gray-800 hover:bg-gray-750 border-gray-700 hover:border-gray-600" 
      : "bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-750 dark:border-gray-700 dark:hover:border-gray-600"
  }`;

  const titleClass = `font-bold text-lg transition-colors duration-300 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "text-background" 
      : "text-gray-900 dark:text-background"
  }`;

  const metaClass = `flex items-center gap-4 text-sm mt-1 transition-colors duration-300 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "text-gray-400" 
      : "text-gray-600 dark:text-gray-400"
  }`;

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
            className={`transition-colors duration-300 ${
              theme !== "system" || (theme === "system" && resolvedTheme === "dark")
                ? "text-blue-400 hover:text-blue-300" 
                : "text-blue-500 hover:text-blue-600 dark:text-blue-400"
            }`}
          >
            View
          </Link>
          <span className={`transition-colors duration-300 ${
            theme !== "system" || (theme === "system" && resolvedTheme === "dark")
              ? "text-gray-400" 
              : "text-gray-600 dark:text-gray-400"
          }`}>
            Repeat
          </span>
        </div>
        <svg className={`w-5 h-5 transition-colors duration-300 ${
          theme !== "system" || (theme === "system" && resolvedTheme === "dark")
            ? "text-gray-500 group-hover:text-gray-300" 
            : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

export function RecentWorkoutsSection() {
  const { theme, resolvedTheme } = useTheme();
  
  // Try to use real tRPC data first, fallback to mock data
  const {
    data: trpcWorkouts,
    isLoading: trpcLoading,
    error: trpcError,
  } = api.workouts.getRecent.useQuery({ limit: 3 });
  
  const { data: mockWorkouts } = useMockFeed(3);

  const titleClass = `text-xl font-bold transition-colors duration-300 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "text-background" 
      : "text-gray-900 dark:text-background"
  }`;

  const linkClass = `font-medium transition-colors duration-300 ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "text-blue-400 hover:text-blue-300" 
      : "text-blue-500 hover:text-blue-600 dark:text-blue-400"
  }`;

  const containerClass = `transition-all duration-300 rounded-xl p-6 border hover:shadow-xl ${
    theme !== "system" || (theme === "system" && resolvedTheme === "dark")
      ? "bg-gray-900 border-gray-800 shadow-lg hover:shadow-2xl" 
      : "bg-white border-gray-200 shadow-sm hover:shadow-lg dark:bg-gray-900 dark:border-gray-800"
  }`;

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
              <div key={i} className="animate-pulse p-5 rounded-xl bg-gray-200 dark:bg-gray-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
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
              theme={theme}
            />
          ))}
        </div>
      </div>
    </section>
  );
}