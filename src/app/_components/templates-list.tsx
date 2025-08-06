"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { analytics } from "~/lib/analytics";

export function TemplatesList() {
  const { data: templates, isLoading } = api.templates.getAll.useQuery();
  const utils = api.useUtils();
  const deleteTemplate = api.templates.delete.useMutation({
    onMutate: async (deletedTemplate) => {
      // Cancel any outgoing refetches
      await utils.templates.getAll.cancel();

      // Snapshot the previous value
      const previousTemplates = utils.templates.getAll.getData();

      // Optimistically remove from cache
      utils.templates.getAll.setData(
        undefined,
        (old) =>
          old?.filter((template) => template.id !== deletedTemplate.id) ?? [],
      );

      return { previousTemplates };
    },
    onError: (err, deletedTemplate, context) => {
      // Rollback on error
      if (context?.previousTemplates) {
        utils.templates.getAll.setData(undefined, context.previousTemplates);
      }
    },
    onSettled: () => {
      // Always refetch to ensure we have the latest data
      void utils.templates.getAll.invalidate();
    },
  });

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteTemplate.mutateAsync({ id });
        analytics.templateDeleted(id.toString());
      } catch (error) {
        console.error("Error deleting template:", error);
        analytics.error(error as Error, {
          context: "template_delete",
          templateId: id.toString(),
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...(Array(3) as number[])].map((_, i) => (
          <div key={i} className="animate-pulse glass-surface card p-4">
            <div className="mb-2 h-4 w-1/3 rounded bg-gray-700"></div>
            <div className="h-3 w-2/3 rounded bg-gray-700"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!templates?.length) {
    return (
      <div className="py-12 text-center glass-surface card">
        <div className="mb-4 text-6xl">📋</div>
        <h3 className="mb-2 text-xl font-semibold">No templates yet</h3>
        <p className="mb-6 text-secondary">
          Create your first workout template to get started
        </p>
        <Link
          href="/templates/new"
          className="btn-primary inline-flex px-6 py-3 font-medium"
        >
          Create Template
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => (
        <div key={template.id} className="card glass-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{template.name}</h3>
            <div className="flex items-center gap-2">
              <Link
                href={`/templates/${template.id}/edit`}
                className="text-sm link-primary"
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
          <div className="text-sm text-secondary">
            {template.exercises.length === 0 ? (
              "No exercises"
            ) : (
              <>
                {template.exercises.length} exercise
                {template.exercises.length !== 1 ? "s" : ""}:{" "}
                {template.exercises.map((ex) => ex.exerciseName).join(", ")}
              </>
            )}
          </div>
          <div className="mt-3">
            <Link
              href={`/workout/start?templateId=${template.id}`}
              className="btn-primary inline-flex px-3 py-1 text-sm"
            >
              Start Workout
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
