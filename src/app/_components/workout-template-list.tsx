"use client";

import { useAuth } from "~/providers/AuthProvider";
import { api } from "~/trpc/react";
import Link from "next/link";

interface WorkoutTemplate {
  id: number;
  name: string;
  user_id: string;
  createdAt: string;
  updatedAt: string | null;
}

export function WorkoutTemplateList() {
  const { user } = useAuth();
  const {
    data: templates,
    isLoading,
    error,
  } = api.templates.getAll.useQuery(undefined, { enabled: !!user?.id });

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
        <p className="text-red-400">Error loading templates</p>
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
              {new Date(template.createdAt).toLocaleDateString()}
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
