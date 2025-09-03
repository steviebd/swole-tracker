"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Clock, Calendar } from "lucide-react"

function formatRelativeDate(date: Date) {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

export function RecentWorkouts() {
  // Get recent workouts from tRPC
  const {
    data: workouts,
    isLoading,
    error,
  } = api.workouts.getRecent.useQuery({ limit: 3 });

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-serif font-black">Recent Workouts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="p-4 rounded-xl bg-muted/30">
              <div className="space-y-2">
                <div className="skeleton skeleton-text h-6 w-32"></div>
                <div className="skeleton skeleton-text h-4 w-48"></div>
                <div className="skeleton skeleton-text h-4 w-56"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !workouts?.length) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-serif font-black">Recent Workouts</CardTitle>
            <Link href="/workouts">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No recent workouts found.</p>
          <Link href="/templates">
            <Button className="mt-4" variant="outline">
              Start Your First Workout
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-serif font-black">Recent Workouts</CardTitle>
          <Link href="/workouts">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {workouts.map((workout) => {
          const workoutDate = new Date(workout.workoutDate);
          const exerciseCount = workout.exercises?.length || 0;
          const totalSets = workout.exercises?.reduce((sum, ex) => sum + (ex.sets || 0), 0) || 0;
          const totalVolume = workout.exercises?.reduce((sum, ex) => 
            sum + ((parseFloat(ex.weight?.toString() || '0') || 0) * (ex.reps || 0) * (ex.sets || 0)), 0
          ) || 0;
          
          return (
            <div
              key={workout.id}
              className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-foreground">
                    {workout.template?.name || "Workout"}
                  </h4>
                  <Badge
                    variant="secondary"
                    className="bg-gradient-to-r from-chart-1 to-chart-3 text-primary-foreground"
                  >
                    completed
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatRelativeDate(workoutDate)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    -- min
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {exerciseCount} exercises • {totalSets} sets • {(totalVolume / 1000).toFixed(1)}k kg
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/workout/session/${workout.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
                <Link href={`/templates/${workout.template?.id || workout.templateId}`}>
                  <Button variant="outline" size="sm">
                    Repeat
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  )
}