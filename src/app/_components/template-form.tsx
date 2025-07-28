"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

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
    template?.exercises.map((ex) => ex.exerciseName) ?? [""]
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
        userId: "temp-user", // Will be replaced by server
        createdAt: new Date(),
        updatedAt: new Date(),
        exercises: newTemplate.exercises.map((exerciseName, index) => ({
          id: -index - 1,
          userId: "temp-user",
          templateId: -1,
          exerciseName,
          orderIndex: index,
          createdAt: new Date(),
        })),
      };
      
      // Optimistically add to cache
      utils.templates.getAll.setData(undefined, (old) => 
        old ? [optimisticTemplate, ...old] : [optimisticTemplate]
      );
      
      return { previousTemplates };
    },
    onError: (err, newTemplate, context) => {
      // Rollback on error
      if (context?.previousTemplates) {
        utils.templates.getAll.setData(undefined, context.previousTemplates);
      }
    },
    onSuccess: () => {
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
      utils.templates.getAll.setData(undefined, (old) => 
        old?.map((template) => 
          template.id === updatedTemplate.id
            ? {
                ...template,
                name: updatedTemplate.name,
                updatedAt: new Date(),
                exercises: updatedTemplate.exercises.map((exerciseName, index) => ({
                  id: template.exercises[index]?.id ?? -index - 1,
                  userId: template.exercises[index]?.userId ?? "temp-user",
                  templateId: template.id,
                  exerciseName,
                  orderIndex: index,
                  createdAt: template.exercises[index]?.createdAt ?? new Date(),
                })),
              }
            : template
        ) ?? []
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
      alert("Error saving template. Please try again.");
    }
  };

  const isLoading = createTemplate.isPending || updateTemplate.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Template Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Push Day, Pull Day, Legs"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          required
        />
      </div>

      {/* Exercises */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium">Exercises</label>
          <button
            type="button"
            onClick={addExercise}
            className="text-sm bg-gray-700 hover:bg-gray-600 transition-colors rounded px-3 py-1"
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
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              {exercises.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExercise(index)}
                  className="text-red-400 hover:text-red-300 text-sm px-2"
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
            className="w-full border-2 border-dashed border-gray-700 rounded-lg py-8 text-gray-400 hover:border-gray-600 transition-colors"
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
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors rounded-lg px-6 py-2 font-medium"
        >
          {isLoading ? "Saving..." : template ? "Update Template" : "Create Template"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
