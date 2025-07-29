"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { analytics } from "~/lib/analytics";

interface TemplateFormProps {
  template?: {
    id: number;
    name: string;
    exercises: { exerciseName: string }[];
  };
}

export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? "");
  const [exercises, setExercises] = useState<string[]>(
    template?.exercises.map((ex) => ex.exerciseName) ?? [""],
  );

  const utils = api.useUtils();

  const createTemplate = api.templates.create.useMutation({
    onMutate: async (newTemplate) => {
      // Cancel any outgoing refetches
      await utils.templates.getAll.cancel();

      // Snapshot the previous value
      const previousTemplates = utils.templates.getAll.getData();

      // Create optimistic template
      const optimisticTemplate = {
        id: -1, // Temporary negative ID
        name: newTemplate.name,
        user_id: "temp-user", // Will be replaced by server
        createdAt: new Date(),
        updatedAt: new Date(),
        exercises: newTemplate.exercises.map((exerciseName, index) => ({
          id: -index - 1,
          user_id: "temp-user",
          templateId: -1,
          exerciseName,
          orderIndex: index,
          createdAt: new Date(),
        })),
      };

      // Optimistically add to cache
      utils.templates.getAll.setData(undefined, (old) =>
        old ? [optimisticTemplate, ...old] : [optimisticTemplate],
      );

      return { previousTemplates };
    },
    onError: (err, newTemplate, context) => {
      // Rollback on error
      if (context?.previousTemplates) {
        utils.templates.getAll.setData(undefined, context.previousTemplates);
      }
    },
    onSuccess: (data) => {
      analytics.templateCreated(
        data.id.toString(),
        exercises.filter((ex) => ex.trim()).length,
      );
      router.push("/templates");
    },
    onSettled: () => {
      // Always refetch to ensure we have the latest data
      void utils.templates.getAll.invalidate();
    },
  });

  const updateTemplate = api.templates.update.useMutation({
    onMutate: async (updatedTemplate) => {
      // Cancel any outgoing refetches
      await utils.templates.getAll.cancel();

      // Snapshot the previous value
      const previousTemplates = utils.templates.getAll.getData();

      // Optimistically update the cache
      utils.templates.getAll.setData(
        undefined,
        (old) =>
          old?.map((template) =>
            template.id === updatedTemplate.id
              ? {
                  ...template,
                  name: updatedTemplate.name,
                  updatedAt: new Date(),
                  exercises: updatedTemplate.exercises.map(
                    (exerciseName, index) => ({
                      id: template.exercises[index]?.id ?? -index - 1,
                      user_id:
                        template.exercises[index]?.user_id ?? "temp-user",
                      templateId: template.id,
                      exerciseName,
                      orderIndex: index,
                      createdAt:
                        template.exercises[index]?.createdAt ?? new Date(),
                    }),
                  ),
                }
              : template,
          ) ?? [],
      );

      return { previousTemplates };
    },
    onError: (err, updatedTemplate, context) => {
      // Rollback on error
      if (context?.previousTemplates) {
        utils.templates.getAll.setData(undefined, context.previousTemplates);
      }
    },
    onSuccess: () => {
      analytics.templateEdited(
        template!.id.toString(),
        exercises.filter((ex) => ex.trim()).length,
      );
      router.push("/templates");
    },
    onSettled: () => {
      // Always refetch to ensure we have the latest data
      void utils.templates.getAll.invalidate();
    },
  });

  const addExercise = () => {
    setExercises([...exercises, ""]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, value: string) => {
    const newExercises = [...exercises];
    newExercises[index] = value;
    setExercises(newExercises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const filteredExercises = exercises.filter((ex) => ex.trim() !== "");

    if (name.trim() === "") {
      alert("Please enter a template name");
      return;
    }

    try {
      if (template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          name: name.trim(),
          exercises: filteredExercises,
        });
      } else {
        await createTemplate.mutateAsync({
          name: name.trim(),
          exercises: filteredExercises,
        });
      }
    } catch (error) {
      console.error("Error saving template:", error);
      analytics.error(error as Error, {
        context: template ? "template_edit" : "template_create",
        templateId: template?.id.toString(),
      });
      alert("Error saving template. Please try again.");
    }
  };

  const isLoading = createTemplate.isPending || updateTemplate.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Name */}
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium">
          Template Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Push Day, Pull Day, Legs"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          required
        />
      </div>

      {/* Exercises */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <label className="block text-sm font-medium">Exercises</label>
          <button
            type="button"
            onClick={addExercise}
            className="rounded bg-gray-700 px-3 py-1 text-sm transition-colors hover:bg-gray-600"
          >
            + Add Exercise
          </button>
        </div>

        <div className="space-y-3">
          {exercises.map((exercise, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={exercise}
                  onChange={(e) => updateExercise(index, e.target.value)}
                  placeholder={`Exercise ${index + 1}`}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              {exercises.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExercise(index)}
                  className="px-2 text-sm text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {exercises.length === 0 && (
          <button
            type="button"
            onClick={addExercise}
            className="w-full rounded-lg border-2 border-dashed border-gray-700 py-8 text-gray-400 transition-colors hover:border-gray-600"
          >
            + Add your first exercise
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-purple-600 px-6 py-2 font-medium transition-colors hover:bg-purple-700 disabled:opacity-50"
        >
          {isLoading
            ? "Saving..."
            : template
              ? "Update Template"
              : "Create Template"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-400 transition-colors hover:text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
