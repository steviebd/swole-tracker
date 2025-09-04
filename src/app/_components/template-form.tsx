"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { analytics } from "~/lib/analytics";
import { ExerciseInputWithLinking } from "~/app/_components/exercise-input-with-linking";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

// Zod schema for form validation
const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required").max(256, "Template name is too long"),
  exercises: z.array(
    z.object({
      exerciseName: z.string().min(1, "Exercise name is required").max(256, "Exercise name is too long"),
    })
  ).min(1, "At least one exercise is required"),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

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
  const lastSubmitRef = useRef<{
    name: string;
    exercises: string[];
    timestamp: number;
  } | null>(null);

  // Initialize form with default values
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template?.name ?? "",
      exercises: template?.exercises.length 
        ? template.exercises.map(ex => ({ exerciseName: ex.exerciseName }))
        : [{ exerciseName: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

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
        createdAt: data.createdAt,
      });
      analytics.templateCreated(
        data.id.toString(),
        form.getValues("exercises").filter((ex) => ex.exerciseName.trim()).length,
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
                      id: template.exercises?.[index]?.id ?? -index - 1,
                      user_id:
                        template.exercises?.[index]?.user_id ?? "temp-user",
                      templateId: template.id,
                      exerciseName,
                      orderIndex: index,
                      linkingRejected:
                        template.exercises?.[index]?.linkingRejected ?? false,
                      createdAt:
                        template.exercises?.[index]?.createdAt ?? new Date(),
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
        form.getValues("exercises").filter((ex) => ex.exerciseName.trim()).length,
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
    append({ exerciseName: "" });
  };

  const removeExercise = (index: number) => {
    remove(index);
  };

  const handleSubmit = async (data: TemplateFormData) => {
    console.log("handleSubmit called");

    // Prevent double submission using both loading state and ref
    if (isLoading || submitRef.current) {
      console.log("Form already submitting, preventing double submission");
      return;
    }

    const filteredExercises = data.exercises
      .map(ex => ex.exerciseName.trim())
      .filter(ex => ex !== "");
    const trimmedName = data.name.trim();

    // Check if this is a duplicate submission (same data within 5 seconds)
    const now = Date.now();
    const lastSubmit = lastSubmitRef.current;

    if (!template && lastSubmit) {
      const timeDiff = now - lastSubmit.timestamp;
      const sameData =
        lastSubmit.name === trimmedName &&
        JSON.stringify(lastSubmit.exercises) ===
          JSON.stringify(filteredExercises);

      if (sameData && timeDiff < 5000) {
        console.log(
          "Preventing duplicate submission - same data within 5 seconds",
          { timeDiff },
        );
        return;
      }
    }

    // Set submission flag and record this attempt
    submitRef.current = true;
    lastSubmitRef.current = {
      name: trimmedName,
      exercises: filteredExercises,
      timestamp: now,
    };

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
    <Card padding="lg">
      <CardHeader>
        <CardTitle>
          {template ? "Edit Template" : "Create Template"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Template Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Push Day, Pull Day, Legs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Exercises */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <FormLabel>Exercises</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExercise}
                >
                  + Add Exercise
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={`exercises.${index}.exerciseName`}
                    render={({ field: exerciseField }) => (
                      <FormItem>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <FormControl>
                              <ExerciseInputWithLinking
                                value={exerciseField.value}
                                onChange={exerciseField.onChange}
                                placeholder={`Exercise ${index + 1}`}
                                className="w-full"
                              />
                            </FormControl>
                          </div>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeExercise(index)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              {fields.length === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addExercise}
                  className="w-full h-20 border-dashed"
                >
                  + Add your first exercise
                </Button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading || submitRef.current}
              >
                {isLoading || submitRef.current
                  ? "Saving..."
                  : template
                    ? "Update Template"
                    : "Create Template"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
