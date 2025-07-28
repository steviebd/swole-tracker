"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export function TemplatesList() {
  const { data: templates, isLoading } = api.templates.getAll.useQuery();
  const utils = api.useUtils();
  const deleteTemplate = api.templates.delete.useMutation({
    onSuccess: () => {
      void utils.templates.getAll.invalidate();
    },
  });

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteTemplate.mutateAsync({ id });
      } catch (error) {
        console.error("Error deleting template:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3) as number[]].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!templates?.length) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-semibold mb-2">No templates yet</h3>
        <p className="text-gray-400 mb-6">
          Create your first workout template to get started
        </p>
        <Link
          href="/templates/new"
          className="bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg px-6 py-3 font-medium"
        >
          Create Template
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => (
        <div key={template.id} className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">{template.name}</h3>
            <div className="flex items-center gap-2">
              <Link
                href={`/templates/${template.id}/edit`}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                Edit
              </Link>
              <button
                onClick={() => handleDelete(template.id, template.name)}
                disabled={deleteTemplate.isPending}
                className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            {template.exercises.length === 0 ? (
              "No exercises"
            ) : (
              <>
                {template.exercises.length} exercise
                {template.exercises.length !== 1 ? "s" : ""}: {" "}
                {template.exercises.map((ex) => ex.exerciseName).join(", ")}
              </>
            )}
          </div>
          <div className="mt-3">
            <Link
              href={`/workout/start?templateId=${template.id}`}
              className="text-sm bg-purple-600 hover:bg-purple-700 transition-colors rounded px-3 py-1"
            >
              Start Workout
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
