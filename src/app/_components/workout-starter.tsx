"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { analytics } from "~/lib/analytics";
import { useCacheInvalidation } from "~/hooks/use-cache-invalidation";

interface WorkoutStarterProps {
  initialTemplateId?: number;
}

export function WorkoutStarter({ initialTemplateId }: WorkoutStarterProps) {
  const router = useRouter();
  const { onWorkoutStart } = useCacheInvalidation();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    initialTemplateId ?? null,
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

  const { data: templates, isLoading: templatesLoading } =
    api.templates.getAll.useQuery();

  const startWorkout = api.workouts.start.useMutation({
    onSuccess: (data) => {
      const template = templates?.find((t) => t.id === selectedTemplateId);
      analytics.workoutStarted(
        selectedTemplateId?.toString() ?? "unknown",
        template?.name ?? "Unknown Template",
      );
      
      // Immediately invalidate cache for instant UI updates
      onWorkoutStart();
      
      router.push(`/workout/session/${data.sessionId}`);
    },
  });

  const handleStart = async () => {
    if (!selectedTemplateId) {
      alert("Please select a template");
      return;
    }

    try {
      await startWorkout.mutateAsync({
        templateId: selectedTemplateId,
        workoutDate: new Date(workoutDate),
      });
    } catch (error) {
      console.error("Error starting workout:", error);
      analytics.error(error as Error, {
        context: "workout_start",
        templateId: selectedTemplateId?.toString(),
      });
      alert("Error starting workout. Please try again.");
    }
  };

  if (templatesLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse rounded-lg bg-gray-800 p-4">
          <div className="mb-4 h-4 w-1/3 rounded bg-gray-700"></div>
          <div className="h-10 rounded bg-gray-700"></div>
        </div>
      </div>
    );
  }

  if (!templates?.length) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-6xl">📋</div>
        <h3 className="mb-2 text-xl font-semibold">No templates available</h3>
        <p className="mb-6 text-gray-400">
          You need to create a workout template before you can start a workout
        </p>
        <Link
          href="/templates/new"
          className="rounded-lg bg-purple-600 px-6 py-3 font-medium transition-colors hover:bg-purple-700"
        >
          Create Your First Template
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <div>
        <h2 className="mb-4 text-lg font-medium">Select Workout Template</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplateId(template.id)}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                selectedTemplateId === template.id
                  ? "border-purple-500 bg-purple-600/20"
                  : "border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-700"
              }`}
            >
              <h3 className="mb-2 truncate font-semibold">{template.name}</h3>
              <p className="text-sm text-gray-400">
                {template.exercises.length} exercise
                {template.exercises.length !== 1 ? "s" : ""}
              </p>
              {template.exercises.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
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
        <div className="space-y-4 rounded-lg bg-gray-800 p-6">
          {(() => {
            const template = templates.find((t) => t.id === selectedTemplateId);
            return template ? (
              <>
                <div>
                  <h3 className="mb-2 text-lg font-semibold">
                    Selected: {template.name}
                  </h3>
                  <div className="text-sm text-gray-400">
                    {template.exercises.length === 0 ? (
                      "No exercises in this template"
                    ) : (
                      <div className="space-y-1">
                        {template.exercises.map((exercise, index) => (
                          <div key={exercise.id} className="flex items-center">
                            <span className="mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs text-white">
                              {index + 1}
                            </span>
                            {exercise.exerciseName}
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
                      className="block text-sm font-medium"
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
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Use Now
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    id="workoutDate"
                    value={workoutDate}
                    onChange={(e) => setWorkoutDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Start Button */}
                <button
                  onClick={handleStart}
                  disabled={startWorkout.isPending}
                  className="w-full rounded-lg bg-purple-600 py-3 text-lg font-medium transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {startWorkout.isPending ? "Starting..." : "Start Workout"}
                </button>
              </>
            ) : null;
          })()}
        </div>
      )}

      {/* No Selection State */}
      {!selectedTemplateId && (
        <div className="py-8 text-center">
          <p className="text-gray-400">
            Select a workout template above to continue
          </p>
        </div>
      )}
    </div>
  );
}
