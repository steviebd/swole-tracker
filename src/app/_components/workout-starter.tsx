"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { analytics } from "~/lib/analytics";

interface WorkoutStarterProps {
  initialTemplateId?: number;
}

export function WorkoutStarter({ initialTemplateId }: WorkoutStarterProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    initialTemplateId ?? null,
  );
  const [isStarting, setIsStarting] = useState(false);
  const [recentlyCreated, setRecentlyCreated] = useState<Set<number>>(new Set());
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
      alert("You just started this workout! Check your workout history or refresh the page.");
      return;
    }

    setIsStarting(true);

    try {
      // Create session directly on server
      const result = await createWorkoutMutation.mutateAsync({
        templateId: selectedTemplateId,
        workoutDate: new Date(workoutDate),
        device_type: "desktop", // Could be detected
        theme_used: "system", // Could be from theme context
      });

      // Track analytics
      const template = templates?.find((t) => t.id === selectedTemplateId);
      analytics.workoutStarted(
        selectedTemplateId.toString(),
        template?.name ?? "Unknown Template",
      );

      // Mark this template as recently created
      setRecentlyCreated(prev => new Set([...prev, selectedTemplateId]));
      
      // Clear the recent creation flag after 2 minutes
      setTimeout(() => {
        setRecentlyCreated(prev => {
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
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Recent session found")) {
        alert("You already have a recent workout with this template. Check your workout history!");
      } else {
        alert("Error starting workout. Please try again.");
      }
    } finally {
      setIsStarting(false);
    }
  };

  if (templatesLoading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="animate-pulse rounded-lg p-3 sm:p-4" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
          <div className="mb-3 sm:mb-4 h-3 sm:h-4 w-1/3 rounded" style={{ backgroundColor: 'var(--color-border)' }}></div>
          <div className="h-8 sm:h-10 rounded" style={{ backgroundColor: 'var(--color-border)' }}></div>
        </div>
      </div>
    );
  }

  if (!templates?.length) {
    return (
      <div className="py-8 sm:py-12 text-center">
        <div className="mb-3 sm:mb-4 text-4xl sm:text-6xl">📋</div>
        <h3 className="mb-2 text-lg sm:text-xl font-semibold">No templates available</h3>
        <p className="text-secondary mb-4 sm:mb-6 text-sm sm:text-base px-4">
          You need to create a workout template before you can start a workout
        </p>
        <Link
          href="/templates/new"
          className="btn-primary inline-flex px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium"
        >
          Create Your First Template
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Template Selection */}
      <div>
        <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-medium">Select Workout Template</h2>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplateId(template.id)}
              className="rounded-lg border-2 p-3 sm:p-4 text-left transition-all"
              style={{
                borderColor: selectedTemplateId === template.id ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: selectedTemplateId === template.id 
                  ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' 
                  : 'var(--color-bg-surface)',
              }}
              onMouseEnter={(e) => {
                if (selectedTemplateId !== template.id) {
                  e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-border) 80%, var(--color-text-muted) 20%)';
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-bg-surface) 90%, var(--color-text-muted) 10%)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTemplateId !== template.id) {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-surface)';
                }
              }}
            >
              <h3 className="mb-1 sm:mb-2 truncate font-semibold text-sm sm:text-base">{template.name}</h3>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {template.exercises.length} exercise
                {template.exercises.length !== 1 ? "s" : ""}
              </p>
              {template.exercises.length > 0 && (
                <div className="mt-1 sm:mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {template.exercises
                    .slice(0, 3)
                    .map((ex) => ex.exerciseName)
                    .join(", ")}
                  {template.exercises.length > 3 && "..."}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Template & Actions */}
      {selectedTemplateId && (
        <div className="card space-y-3 sm:space-y-4 p-4 sm:p-6">
          {(() => {
            const template = templates.find((t) => t.id === selectedTemplateId);
            return template ? (
              <>
                <div>
                  <h3 className="mb-2 text-base sm:text-lg font-semibold">
                    Selected: {template.name}
                  </h3>
                  <div className="text-xs sm:text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {template.exercises.length === 0 ? (
                      "No exercises in this template"
                    ) : (
                      <div className="space-y-1">
                        {template.exercises.map((exercise, index) => (
                          <div key={exercise.id} className="flex items-center">
                            <span className="mr-2 flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full text-xs" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                              {index + 1}
                            </span>
                            <span className="text-xs sm:text-sm">{exercise.exerciseName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Date/Time Selection */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="workoutDate"
                      className="block text-xs sm:text-sm font-medium"
                    >
                      Workout Date & Time
                    </label>
                    <button
                      type="button"
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
                      className="link-primary text-xs"
                    >
                      Use Now
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    id="workoutDate"
                    value={workoutDate}
                    onChange={(e) => setWorkoutDate(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm sm:text-base focus:ring-2 focus:outline-none"
                    style={{
                      backgroundColor: 'var(--color-bg-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    } as React.CSSProperties}
                    required
                  />
                </div>

                {/* Start Button */}
                <button
                onClick={handleStart}
                disabled={isStarting || createWorkoutMutation.isPending}
                className="btn-primary w-full py-2.5 sm:py-3 text-base sm:text-lg font-medium disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                >
                {isStarting || createWorkoutMutation.isPending ? "Starting..." : "Start Workout"}
                 </button>
              </>
            ) : null;
          })()}
        </div>
      )}

      {/* No Selection State */}
      {!selectedTemplateId && (
        <div className="py-6 sm:py-8 text-center">
          <p className="text-sm sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
            Select a workout template above to continue
          </p>
        </div>
      )}
    </div>
  );
}
