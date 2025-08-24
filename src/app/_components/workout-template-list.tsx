"use client";

import { useEffect, useState } from "react";
import { useAuth } from "~/providers/AuthProvider";
import {
  useWorkoutOperations,
  type WorkoutTemplate,
} from "~/lib/workout-operations";
import Link from "next/link";
import { formatSafeDate } from "~/lib/utils";

export function WorkoutTemplateList() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const workoutOps = useWorkoutOperations();

  useEffect(() => {
    if (!user?.id) return;

    async function loadTemplates() {
      setIsLoading(true);
      setError(null);

      try {
        const templatesData = await workoutOps.getWorkoutTemplates(user!.id);
        setTemplates(templatesData);
      } catch (err: unknown) {
        console.error("Error loading templates:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load templates",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadTemplates();
  }, [user, workoutOps]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...(Array(3) as number[])].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg bg-gray-800 p-4">
            <div className="mb-2 h-4 w-1/2 rounded bg-gray-700"></div>
            <div className="h-3 w-1/3 rounded bg-gray-700"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500 bg-red-900/20 p-4">
        <p className="text-red-400">Error loading templates: {error}</p>
      </div>
    );
  }

  if (!templates?.length) {
    return (
      <div className="rounded-lg bg-gray-800 p-4">
        <p className="py-4 text-center text-gray-400">
          No workout templates yet. Create your first template!
        </p>
        <div className="mt-4 text-center">
          <Link
            href="/templates/create"
            className="inline-block rounded-md bg-purple-600 px-4 py-2 transition-colors hover:bg-purple-700"
          >
            Create Template
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <div key={template.id} className="rounded-lg bg-gray-800 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-medium">{template.name}</h4>
            <div className="text-xs text-gray-400">
              {formatSafeDate(template.createdAt)}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/templates/${template.id}`}
              className="text-purple-400 hover:text-purple-300"
            >
              Edit
            </Link>
            <Link
              href={`/workout/start?templateId=${template.id}`}
              className="text-muted-foreground hover:text-foreground"
            >
              Start Workout
            </Link>
          </div>
        </div>
      ))}
      <div className="pt-2 text-center text-xs text-gray-500">
        ✨ Powered by Supabase
      </div>
    </div>
  );
}
