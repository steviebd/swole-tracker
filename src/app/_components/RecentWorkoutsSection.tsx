"use client";

import Link from "next/link";
import { api, type RouterOutputs } from "~/trpc/react";
import { useMockFeed, type MockWorkoutSession } from "~/hooks/useMockData";
import { Card } from "~/components/ui/card";

interface WorkoutCardProps {
  id: number;
  templateName: string;
  date: string;
  exerciseCount: number;
}

function WorkoutCard({ id, templateName, date, exerciseCount }: WorkoutCardProps) {
  return (
    <Card
      surface="card"
      variant="elevated"
      padding="sm"
      interactive={true}
      className="bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg transition-all group relative overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-black/20 backdrop-blur-sm flex items-center justify-center">
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
    </Card>
  );
}

type TRPCRecentWorkout = RouterOutputs["workouts"]["getRecent"][number];

type NormalizedWorkout = {
  id: number;
  templateName: string;
  workoutDate: Date;
  exerciseCount: number;
};

function normalizeWorkout(workout: TRPCRecentWorkout | MockWorkoutSession): NormalizedWorkout {
  const template = (workout as { template?: unknown }).template;
  const resolvedTemplateName =
    template &&
    typeof template === "object" &&
    !Array.isArray(template) &&
    typeof (template as { name?: unknown }).name === "string"
      ? ((template as { name: string }).name ?? "").trim()
      : "";

  const templateName = resolvedTemplateName.length > 0 ? resolvedTemplateName : "Workout";

  const workoutDateRaw = (workout as { workoutDate: Date | string | number | undefined }).workoutDate;
  const workoutDate =
    workoutDateRaw instanceof Date
      ? workoutDateRaw
      : new Date(workoutDateRaw ?? Date.now());

  const exerciseCount = Array.isArray(workout.exercises)
    ? workout.exercises.length
    : 0;

  return {
    id: workout.id,
    templateName,
    workoutDate,
    exerciseCount,
  };
}

export function RecentWorkoutsSection() {
  // Try to use real tRPC data first, fallback to mock data
  const {
    data: trpcWorkouts,
    isLoading: trpcLoading,
    error: trpcError,
    refetch,
  } = api.workouts.getRecent.useQuery({ limit: 3 }, {
    onSuccess: (data) => {
      console.info(`[RECENT_WORKOUTS_SECTION] Fetched ${data?.length || 0} workouts at ${new Date().toISOString()}`, data);
    },
    onSettled: (data, error) => {
      console.info(`[RECENT_WORKOUTS_SECTION] Query settled at ${new Date().toISOString()}`, { dataCount: data?.length || 0, hasError: !!error });
    }
  });
  
  const { data: mockWorkouts } = useMockFeed(3);


  // Use tRPC data if available and not loading/error, otherwise use mock data
  const workoutsSource: Array<TRPCRecentWorkout | MockWorkoutSession> | undefined =
    !trpcLoading && !trpcError && trpcWorkouts?.length ? trpcWorkouts : mockWorkouts;
  const isLoading = trpcLoading && !mockWorkouts?.length;

  const normalizedWorkouts: NormalizedWorkout[] = (workoutsSource ?? []).map(normalizeWorkout);

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
            <Card key={i} surface="card" variant="default" padding="sm" className="h-16 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-3 w-24" />
                </div>
              </div>
            </Card>
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
        {normalizedWorkouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            id={workout.id}
            templateName={workout.templateName}
            date={workout.workoutDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
            exerciseCount={workout.exerciseCount}
          />
        ))}
      </div>
    </div>
  );
}
