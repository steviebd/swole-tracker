"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";

interface WorkoutStarterProps {
  initialTemplateId?: number;
}

export function WorkoutStarter({ initialTemplateId }: WorkoutStarterProps) {
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    initialTemplateId ?? null
  );
  const [workoutDate, setWorkoutDate] = useState(() => {
    // Default to current date/time in local timezone
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  const { data: templates, isLoading: templatesLoading } = api.templates.getAll.useQuery();
  
  const startWorkout = api.workouts.start.useMutation({
    onSuccess: (data) => {
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
      alert("Error starting workout. Please try again.");
    }
  };

  if (templatesLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!templates?.length) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-semibold mb-2">No templates available</h3>
        <p className="text-gray-400 mb-6">
          You need to create a workout template before you can start a workout
        </p>
        <Link
          href="/templates/new"
          className="bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg px-6 py-3 font-medium"
        >
          Create Your First Template
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Template Selection */}
      <div>
        <label htmlFor="template" className="block text-sm font-medium mb-2">
          Select Workout Template
        </label>
        <select
          id="template"
          value={selectedTemplateId ?? ""}
          onChange={(e) => setSelectedTemplateId(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          required
        >
          <option value="">Choose a template...</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.exercises.length} exercises)
            </option>
          ))}
        </select>
      </div>

      {/* Date/Time Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="workoutDate" className="block text-sm font-medium">
            Workout Date & Time
          </label>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const day = String(now.getDate()).padStart(2, '0');
              const hours = String(now.getHours()).padStart(2, '0');
              const minutes = String(now.getMinutes()).padStart(2, '0');
              setWorkoutDate(`${year}-${month}-${day}T${hours}:${minutes}`);
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
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          required
        />
      </div>

      {/* Template Preview */}
      {selectedTemplateId && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-medium mb-2">Template Preview</h3>
          {(() => {
            const template = templates.find(t => t.id === selectedTemplateId);
            return template ? (
              <div className="text-sm text-gray-400">
                {template.exercises.length === 0 ? (
                  "No exercises in this template"
                ) : (
                  <ul className="space-y-1">
                    {template.exercises.map((exercise, index) => (
                      <li key={exercise.id}>
                        {index + 1}. {exercise.exerciseName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={!selectedTemplateId || startWorkout.isPending}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg py-3 font-medium"
      >
        {startWorkout.isPending ? "Starting..." : "Start Workout"}
      </button>
    </div>
  );
}
