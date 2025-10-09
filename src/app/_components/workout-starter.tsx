"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { analytics } from "~/lib/analytics";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";

interface WorkoutStarterProps {
  initialTemplateId?: number;
}

export function WorkoutStarter({ initialTemplateId }: WorkoutStarterProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    initialTemplateId ?? null,
  );
  const [isStarting, setIsStarting] = useState(false);
  const [recentlyCreated, setRecentlyCreated] = useState<Set<number>>(
    new Set(),
  );
  const [workoutDate, setWorkoutDate] = useState(() => {
    // Default to current date/time in local timezone
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  const router = useRouter();
  const { data: templates, isLoading: templatesLoading } =
    api.templates.getAll.useQuery();
  const createWorkoutMutation = api.workouts.start.useMutation();

  const handleStart = async () => {
    if (!selectedTemplateId) {
      alert("Please select a template");
      return;
    }

    if (isStarting) {
      console.log("Already starting workout, ignoring duplicate request");
      return;
    }

    // Check if we recently created this template (client-side deduplication)
    if (recentlyCreated.has(selectedTemplateId)) {
      alert(
        "You just started this workout! Check your workout history or refresh the page.",
      );
      return;
    }

    setIsStarting(true);

    try {
      // Create session directly on server
      const result = await createWorkoutMutation.mutateAsync({
        templateId: selectedTemplateId,
        workoutDate: new Date(workoutDate),
      });

      // Track analytics
      const template = templates?.find((t) => t.id === selectedTemplateId);
      analytics.workoutStarted(
        selectedTemplateId.toString(),
        template?.name ?? "Unknown Template",
      );

      // Mark this template as recently created
      setRecentlyCreated((prev) => new Set([...prev, selectedTemplateId]));

      // Clear the recent creation flag after 2 minutes
      setTimeout(() => {
        setRecentlyCreated((prev) => {
          const newSet = new Set(prev);
          newSet.delete(selectedTemplateId);
          return newSet;
        });
      }, 120000); // 2 minutes

      // Navigate to session with better error handling
      try {
        router.push(`/workout/session/${result.sessionId}`);
      } catch (navigationError) {
        console.error("Navigation failed:", navigationError);
        // Don't show error to user - they can find the workout in history
        // Just log for debugging
      }
    } catch (error) {
      console.error("Error creating workout session:", error);
      analytics.error(error as Error, {
        context: "workout_start",
        templateId: selectedTemplateId.toString(),
      });

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Recent session found")) {
        alert(
          "You already have a recent workout with this template. Check your workout history!",
        );
      } else {
        alert("Error starting workout. Please try again.");
      }
    } finally {
      setIsStarting(false);
    }
  };

  if (templatesLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <Skeleton className="mb-4 h-4 w-1/3" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!templates?.length) {
    return (
      <div className="py-8 text-center sm:py-12">
        <div className="mb-4 text-4xl sm:text-6xl">📋</div>
        <h3 className="mb-2 text-lg font-semibold sm:text-xl">
          No templates available
        </h3>
        <p className="text-muted-foreground mb-6 px-4 text-sm sm:text-base">
          You need to create a workout template before you can start a workout
        </p>
        <Button asChild>
          <Link href="/templates/new">Create Your First Template</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Template Selection */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Select Workout Template</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const exercises = template.exercises ?? [];

            return (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplateId === template.id
                    ? "ring-primary shadow-md ring-2"
                    : "hover:ring-muted-foreground/20 hover:ring-1"
              }`}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              <CardContent className="p-4">
                <h3 className="mb-2 truncate text-sm font-semibold sm:text-base">
                  {template.name}
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {exercises.length} exercise
                  {exercises.length !== 1 ? "s" : ""}
                </p>
                {exercises.length > 0 && (
                  <div className="text-muted-foreground mt-2 text-xs">
                    {exercises
                      .slice(0, 3)
                      .map((ex) => ex.exerciseName)
                      .join(", ")}
                    {exercises.length > 3 && "..."}
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      </div>

      {/* Selected Template & Actions */}
      {selectedTemplateId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Selected:{" "}
              {(() => {
                const template = templates.find(
                  (t) => t.id === selectedTemplateId,
                );
                return template?.name;
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const template = templates.find(
                (t) => t.id === selectedTemplateId,
              );
              const exercises = template?.exercises ?? [];
              return template ? (
                <>
                  <div>
                    <div className="text-muted-foreground text-xs sm:text-sm">
                      {exercises.length === 0 ? (
                        "No exercises in this template"
                      ) : (
                        <div className="space-y-1">
                          {exercises.map((exercise, index) => (
                            <div
                              key={exercise.id}
                              className="flex items-center"
                            >
                              <span className="bg-primary text-primary-foreground mr-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-6 sm:w-6">
                                {index + 1}
                              </span>
                              <span className="text-xs sm:text-sm">
                                {exercise.exerciseName}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date/Time Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="workoutDate"
                        className="text-xs font-medium sm:text-sm"
                      >
                        Workout Date & Time
                      </Label>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => {
                          const now = new Date();
                          const year = now.getFullYear();
                          const month = String(now.getMonth() + 1).padStart(
                            2,
                            "0",
                          );
                          const day = String(now.getDate()).padStart(2, "0");
                          const hours = String(now.getHours()).padStart(2, "0");
                          const minutes = String(now.getMinutes()).padStart(
                            2,
                            "0",
                          );
                          setWorkoutDate(
                            `${year}-${month}-${day}T${hours}:${minutes}`,
                          );
                        }}
                      >
                        Use Now
                      </Button>
                    </div>
                    <Input
                      type="datetime-local"
                      id="workoutDate"
                      value={workoutDate}
                      onChange={(e) => setWorkoutDate(e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>

                  {/* Start Button */}
                  <Button
                    onClick={handleStart}
                    disabled={isStarting || createWorkoutMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {isStarting || createWorkoutMutation.isPending
                      ? "Starting..."
                      : "Start Workout"}
                  </Button>
                </>
              ) : null;
            })()}
          </CardContent>
        </Card>
      )}

      {/* No Selection State */}
      {!selectedTemplateId && (
        <div className="py-6 text-center sm:py-8">
          <p className="text-muted-foreground text-sm sm:text-base">
            Select a workout template above to continue
          </p>
        </div>
      )}
    </div>
  );
}
