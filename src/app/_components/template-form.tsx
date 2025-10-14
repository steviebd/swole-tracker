"use client";

import { useRef, useState } from "react";
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
import { Badge } from "~/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { useUniversalDragReorder } from "~/hooks/use-universal-drag-reorder";

// Zod schema for form validation
const templateFormSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(256, "Template name is too long"),
  exercises: z
    .array(
      z.object({
        exerciseName: z
          .string()
          .min(1, "Exercise name is required")
          .max(256, "Exercise name is too long"),
      }),
    )
    .min(1, "At least one exercise is required"),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

interface TemplateFormProps {
  template?: {
    id: number;
    name: string;
    exercises: { exerciseName: string }[];
  };
}

type FormStep = "basics" | "exercises" | "preview";

export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<FormStep>("basics");
  const submitRef = useRef(false);
  const lastSubmitRef = useRef<{
    name: string;
    exercises: string[];
    timestamp: number;
    dedupeKey: string;
  } | null>(null);

  // Initialize form with default values
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template?.name ?? "",
      exercises: template?.exercises.length
        ? template.exercises.map((ex) => ({ exerciseName: ex.exerciseName }))
        : [{ exerciseName: "" }],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  // Drag and drop for exercises
  const [dragState, dragHandlers] = useUniversalDragReorder(
    fields,
    (newFields) => {
      // Update the form with the new order
      const currentValues = form.getValues("exercises");
      const reorderedValues = newFields
        .map((field) => {
          const originalIndex = fields.findIndex((f) => f.id === field.id);
          return currentValues[originalIndex];
        })
        .filter((item): item is { exerciseName: string } => item !== undefined);
      form.setValue("exercises", reorderedValues);
    },
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
        createdAt: data.createdAt,
      });
      analytics.templateCreated(
        data.id.toString(),
        form.getValues("exercises").filter((ex) => ex.exerciseName.trim())
          .length,
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
        form.getValues("exercises").filter((ex) => ex.exerciseName.trim())
          .length,
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
      .map((ex) => ex.exerciseName.trim())
      .filter((ex) => ex !== "");
    const trimmedName = data.name.trim();

    // Set submission flag and record this attempt
    submitRef.current = true;
    const now = Date.now();
    try {
      if (template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          name: trimmedName,
          exercises: filteredExercises,
        });
      } else {
        const previousAttempt = lastSubmitRef.current;
        let dedupeKey = crypto.randomUUID();
        if (previousAttempt) {
          const sameData =
            previousAttempt.name === trimmedName &&
            JSON.stringify(previousAttempt.exercises) ===
              JSON.stringify(filteredExercises);
          if (sameData) {
            dedupeKey = previousAttempt.dedupeKey;
          }
        }

        lastSubmitRef.current = {
          name: trimmedName,
          exercises: filteredExercises,
          timestamp: now,
          dedupeKey,
        };
        console.log("Creating template with data:", {
          name: trimmedName,
          exercises: filteredExercises,
        });
        await createTemplate.mutateAsync({
          name: trimmedName,
          exercises: filteredExercises,
          dedupeKey,
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

  const steps: { key: FormStep; label: string; description: string }[] = [
    { key: "basics", label: "Basics", description: "Name your template" },
    {
      key: "exercises",
      label: "Exercises",
      description: "Add workout exercises",
    },
    { key: "preview", label: "Preview", description: "Review and save" },
  ];

  const currentStepIndex = steps.findIndex((step) => step.key === currentStep);

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length && steps[nextIndex]) {
      setCurrentStep(steps[nextIndex].key);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0 && steps[prevIndex]) {
      setCurrentStep(steps[prevIndex].key);
    }
  };

  const watchedName = form.watch("name");
  const watchedExercises = form.watch("exercises");

  const canProceedToNext = () => {
    if (currentStep === "basics") {
      return watchedName.trim().length > 0;
    }
    if (currentStep === "exercises") {
      return watchedExercises.some((ex) => ex.exerciseName.trim().length > 0);
    }
    return true;
  };

  const getCurrentStep = () => steps[currentStepIndex];

  const estimatedDuration = () => {
    // Rough estimate: 3-5 minutes per exercise
    const exerciseCount = form
      .getValues("exercises")
      .filter((ex) => ex.exerciseName.trim()).length;
    const minMinutes = exerciseCount * 3;
    const maxMinutes = exerciseCount * 5;
    return exerciseCount > 0 ? `${minMinutes}-${maxMinutes} min` : "—";
  };

  const estimatedVolume = () => {
    // This would be more complex in reality, but for now just show exercise count
    const exerciseCount = form
      .getValues("exercises")
      .filter((ex) => ex.exerciseName.trim()).length;
    return exerciseCount > 0 ? `${exerciseCount} exercises` : "—";
  };

  const getValidationSummary = () => {
    const errors = form.formState.errors;
    const errorMessages: string[] = [];

    if (errors.name) {
      errorMessages.push("Template name is required");
    }

    if (errors.exercises) {
      if (Array.isArray(errors.exercises)) {
        errors.exercises.forEach((error, index) => {
          if (error?.exerciseName) {
            errorMessages.push(
              `Exercise ${index + 1}: ${error.exerciseName.message}`,
            );
          }
        });
      } else if (errors.exercises.message) {
        errorMessages.push(errors.exercises.message);
      }
    }

    return errorMessages;
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Card padding="md" className="sticky top-4 z-10">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    index <= currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                <span className="mt-1 text-xs font-medium">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-4 h-px w-12 ${
                    index < currentStepIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <p className="text-muted-foreground text-sm">
            {steps[currentStepIndex]?.description}
          </p>
        </div>
      </Card>

      {/* Form Content */}
      <Card padding="lg">
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* Step Content */}
              {currentStep === "basics" && (
                <div className="space-y-6">
                  {/* Validation Summary */}
                  {getValidationSummary().length > 0 && (
                    <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3">
                      <h4 className="text-destructive mb-2 text-sm font-medium">
                        Please fix the following issues:
                      </h4>
                      <ul className="text-destructive space-y-1 text-sm">
                        {getValidationSummary().map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

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
                  <div className="text-muted-foreground text-sm">
                    <p>
                      Choose a descriptive name for your workout template. This
                      will help you identify it quickly when starting workouts.
                    </p>
                  </div>
                </div>
              )}

              {currentStep === "exercises" && (
                <div className="space-y-6">
                  {/* Validation Summary */}
                  {getValidationSummary().length > 0 && (
                    <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3">
                      <h4 className="text-destructive mb-2 text-sm font-medium">
                        Please fix the following issues:
                      </h4>
                      <ul className="text-destructive space-y-1 text-sm">
                        {getValidationSummary().map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

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
                        <div
                          key={field.id}
                          ref={(el) => dragHandlers.setCardElement(index, el)}
                          className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                            dragState.isDragging &&
                            dragState.draggedIndex === index
                              ? "bg-primary/5 border-primary shadow-lg"
                              : dragState.dragOverIndex === index
                                ? "border-primary bg-primary/10"
                                : "border-border bg-card"
                          }`}
                          style={{
                            transform:
                              dragState.isDragging &&
                              dragState.draggedIndex === index
                                ? `translateY(${dragState.dragOffset.y}px)`
                                : undefined,
                          }}
                        >
                          {/* Drag Handle */}
                          <div
                            className="hover:bg-muted cursor-grab rounded p-1 active:cursor-grabbing"
                            data-drag-handle="true"
                            onPointerDown={dragHandlers.onPointerDown(index)}
                          >
                            <svg
                              className="text-muted-foreground h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 8h16M4 16h16"
                              />
                            </svg>
                          </div>

                          {/* Exercise Input */}
                          <FormField
                            control={form.control}
                            name={`exercises.${index}.exerciseName`}
                            render={({ field: exerciseField }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <ExerciseInputWithLinking
                                    value={exerciseField.value}
                                    onChange={exerciseField.onChange}
                                    placeholder={`Exercise ${index + 1}`}
                                    className="w-full"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1">
                            {/* Duplicate */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const currentValues =
                                  form.getValues("exercises");
                                const exerciseToDuplicate =
                                  currentValues[index];
                                if (exerciseToDuplicate) {
                                  append({
                                    exerciseName:
                                      exerciseToDuplicate.exerciseName,
                                  });
                                }
                              }}
                              title="Duplicate exercise"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </Button>

                            {/* Swap with next */}
                            {index < fields.length - 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  move(index, index + 1);
                                }}
                                title="Swap with next"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                                  />
                                </svg>
                              </Button>
                            )}

                            {/* Remove */}
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExercise(index)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Remove exercise"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {fields.length === 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addExercise}
                        className="h-20 w-full border-dashed"
                      >
                        + Add your first exercise
                      </Button>
                    )}
                  </div>
                  <div className="text-muted-foreground space-y-2 text-sm">
                    <p>
                      Add exercises in the order you want to perform them. You
                      can reorder them later by dragging the handle.
                    </p>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="mb-1 text-xs font-medium tracking-wide uppercase">
                        Recommendations:
                      </p>
                      <ul className="space-y-1 text-xs">
                        <li>
                          • <strong>Rep ranges:</strong> 8-12 for hypertrophy,
                          3-6 for strength, 15+ for endurance
                        </li>
                        <li>
                          • <strong>Rest periods:</strong> 60-90 seconds between
                          sets for most exercises
                        </li>
                        <li>
                          • <strong>Order:</strong> Compound movements first
                          (squats, deadlifts, presses), isolation last
                        </li>
                        <li>
                          • <strong>Balance:</strong> Include exercises for
                          opposing muscle groups
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === "preview" && (
                <div className="space-y-6">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium">
                      {form.getValues("name") || "Untitled Template"}
                    </h3>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Exercises:
                        </span>
                        <span>
                          {
                            form
                              .getValues("exercises")
                              .filter((ex) => ex.exerciseName.trim()).length
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Est. Duration:
                        </span>
                        <span>{estimatedDuration()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Volume:</span>
                        <span>{estimatedVolume()}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-muted-foreground text-sm font-medium">
                        Exercise List:
                      </h4>
                      <ul className="mt-2 space-y-1">
                        {form
                          .getValues("exercises")
                          .filter((ex) => ex.exerciseName.trim())
                          .map((ex, index) => (
                            <li key={index} className="text-sm">
                              {index + 1}. {ex.exerciseName}
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                  <div className="text-muted-foreground text-sm">
                    <p>
                      Review your template details. You can go back to make
                      changes or save to create the template.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4">
                <div>
                  {currentStepIndex > 0 && (
                    <Button type="button" variant="outline" onClick={prevStep}>
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  {currentStepIndex < steps.length - 1 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={!canProceedToNext()}
                    >
                      Next
                    </Button>
                  ) : (
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
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
