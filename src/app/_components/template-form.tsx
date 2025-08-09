"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { analytics } from "~/lib/analytics";
import { ExerciseInputWithLinking } from "~/app/_components/exercise-input-with-linking";

interface TemplateFormProps {
  template?: {
    id: number;
    name: string;
    exercises: { exerciseName: string }[];
  };
}


export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter();
  const submitRef = useRef(false);
  const lastSubmitRef = useRef<{ name: string; exercises: string[]; timestamp: number } | null>(null);
  const [name, setName] = useState(template?.name ?? "");
  const [exercises, setExercises] = useState<string[]>(
    template?.exercises.map((ex) => ex.exerciseName) ?? [""],
  );

  const utils = api.useUtils();

  const createTemplate = api.templates.create.useMutation({
    onMutate: async (_newTemplate) => {
      // Cancel any outgoing refetches to prevent race conditions
      await utils.templates.getAll.cancel();

      // Snapshot the previous value for error rollback
      const previousTemplates = utils.templates.getAll.getData();

      return { previousTemplates };
    },
    onError: (err, newTemplate, context) => {
      // Rollback on error
      if (context?.previousTemplates) {
        utils.templates.getAll.setData(undefined, context.previousTemplates);
      }
      // Reset submission flag on error
      submitRef.current = false;
    },
    onSuccess: async (data) => {
      console.log("Template created successfully:", {
        id: data.id,
        name: data.name,
        user_id: data.user_id,
        createdAt: data.createdAt
      });
      analytics.templateCreated(
        data.id.toString(),
        exercises.filter((ex) => ex.trim()).length,
      );
      // Reset submission flag
      submitRef.current = false;
      
      // Update cache with the new template optimistically
      utils.templates.getAll.setData(undefined, (old) => {
        const newTemplate = data as NonNullable<typeof old>[number];
        return old ? [newTemplate, ...old] : [newTemplate];
      });
      
      // Navigate immediately with updated cache
      router.push("/templates");
    },
    onSettled: () => {
      // Ensure cache is invalidated
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
                      linkingRejected:
                        template.exercises[index]?.linkingRejected ?? false,
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
      // Reset submission flag
      submitRef.current = false;
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
    console.log("handleSubmit called");
    e.preventDefault();

    // Prevent double submission using both loading state and ref
    if (isLoading || submitRef.current) {
      console.log("Form already submitting, preventing double submission");
      return;
    }

    const filteredExercises = exercises.filter((ex) => ex.trim() !== "");
    const trimmedName = name.trim();

    if (trimmedName === "") {
      alert("Please enter a template name");
      return;
    }

    // Check if this is a duplicate submission (same data within 5 seconds)
    const now = Date.now();
    const lastSubmit = lastSubmitRef.current;
    
    if (!template && lastSubmit) {
      const timeDiff = now - lastSubmit.timestamp;
      const sameData = lastSubmit.name === trimmedName && 
                     JSON.stringify(lastSubmit.exercises) === JSON.stringify(filteredExercises);
      
      if (sameData && timeDiff < 5000) {
        console.log("Preventing duplicate submission - same data within 5 seconds", { timeDiff });
        return;
      }
    }

    // Set submission flag and record this attempt
    submitRef.current = true;
    lastSubmitRef.current = { name: trimmedName, exercises: filteredExercises, timestamp: now };

    try {
      if (template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          name: trimmedName,
          exercises: filteredExercises,
        });
      } else {
        console.log("Creating template with data:", {
          name: trimmedName,
          exercises: filteredExercises,
        });
        await createTemplate.mutateAsync({
          name: trimmedName,
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
      submitRef.current = false;
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
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 focus:outline-none focus:ring-2"
          style={{ outline: "none", boxShadow: "none" }}
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
            className="btn-primary px-3 py-1 text-sm"
          >
            + Add Exercise
          </button>
        </div>

        <div className="space-y-3">
          {exercises.map((exercise, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1">
                <ExerciseInputWithLinking
                  value={exercise}
                  onChange={(value) => updateExercise(index, value)}
                  placeholder={`Exercise ${index + 1}`}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 focus:outline-none focus:ring-2"
                />
              </div>
              {exercises.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExercise(index)}
                  className="px-2 text-sm text-rose-400 hover:text-rose-300"
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
            className="w-full rounded-lg border-2 border-dashed border-gray-700 py-8 text-secondary transition-colors hover:border-gray-600"
          >
            + Add your first exercise
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4">
        <button
          type="submit"
          disabled={isLoading || submitRef.current}
          className="btn-primary px-6 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            pointerEvents: isLoading || submitRef.current ? 'none' : 'auto' 
          }}
        >
          {isLoading || submitRef.current
            ? "Saving..."
            : template
              ? "Update Template"
              : "Create Template"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-muted hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
