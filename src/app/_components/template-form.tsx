"use client";

import { useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { z } from "zod";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { api, type RouterInputs, type RouterOutputs } from "~/trpc/react";
import { formAnalytics } from "~/lib/forms/tanstack-form-config";
import { analytics } from "~/lib/analytics";
import { ExerciseInput } from "~/app/_components/exercise-input";
import { ExerciseLinkingReview } from "~/app/_components/exercise-linking-review";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
  TanStackFormField,
  TanStackFormItem,
  TanStackFormLabel,
  TanStackFormControl,
  TanStackFormMessage,
} from "~/components/ui/tanstack-form";
import { useUniversalDragReorder } from "~/hooks/use-universal-drag-reorder";

// Type definitions
type TemplateList = RouterOutputs["templates"]["getAll"];
type TemplateItem = TemplateList[number];
type TemplatesGetAllInput = Exclude<
  RouterInputs["templates"]["getAll"],
  void | undefined
>;
type TemplatesQuerySnapshot = Array<[QueryKey, TemplateList | undefined]>;
type TemplateMutationContext = {
  previousQueries: TemplatesQuerySnapshot;
};

// Utility functions
const templatesQueryKeyRoot = getQueryKey(api.templates.getAll);

const sortTemplates = (
  templates: TemplateItem[],
  sort: TemplatesGetAllInput["sort"] | undefined,
): TemplateItem[] => {
  const order = (sort ?? "recent") as
    | "recent"
    | "lastUsed"
    | "mostUsed"
    | "name";
  const copy = [...templates];

  switch (order) {
    case "name":
      copy.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "lastUsed":
      copy.sort(
        (a, b) =>
          (b.lastUsed ? new Date(b.lastUsed).getTime() : 0) -
          (a.lastUsed ? new Date(a.lastUsed).getTime() : 0),
      );
      break;
    case "mostUsed":
      copy.sort(
        (a, b) =>
          (b.totalSessions ?? 0) - (a.totalSessions ?? 0) ||
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
            (a.createdAt ? new Date(a.createdAt).getTime() : 0),
      );
      break;
    default:
      copy.sort(
        (a, b) =>
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
          (a.createdAt ? new Date(a.createdAt).getTime() : 0),
      );
  }

  return copy;
};

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
  linkingDecisions: z
    .array(
      z.object({
        tempId: z.string(),
        action: z.enum(["link", "create-new", "reject"]),
        masterExerciseId: z.number().optional(),
      }),
    )
    .optional(),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

interface TemplateFormProps {
  template?: {
    id: number;
    name: string;
    exercises: { exerciseName: string }[];
  };
}

type FormStep = "basics" | "exercises" | "linking" | "preview";

export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const utils = api.useUtils();
  const [currentStep, setCurrentStep] = useState<FormStep>("basics");
  const [linkingDecisions, setLinkingDecisions] = useState<any[]>([]);
  const submitRef = useRef(false);
  const lastSubmitRef = useRef<{
    name: string;
    exercises: string[];
    timestamp: number;
    dedupeKey: string;
  } | null>(null);

  // Utility functions for query management
  const snapshotTemplateQueries = (): TemplatesQuerySnapshot => {
    const matches = queryClient.getQueriesData<TemplateList>({
      queryKey: templatesQueryKeyRoot,
    });
    return matches as TemplatesQuerySnapshot;
  };

  const restoreTemplateQueries = (snapshot: TemplatesQuerySnapshot) => {
    for (const [key, data] of snapshot) {
      queryClient.setQueryData(key, data);
    }
  };

  // Initialize TanStack Form with lazy validation for better performance
  const form = useForm({
    defaultValues: {
      name: template?.name ?? "",
      exercises: template?.exercises.length
        ? template.exercises.map((ex) => ({ exerciseName: ex.exerciseName }))
        : [{ exerciseName: "" }],
    },
    validators: {
      onBlur: templateFormSchema, // Use lazy validation (onBlur) for better performance
    },
    onSubmit: async ({ value }) => {
      console.log(
        "TanStack Form onSubmit callback triggered with value:",
        value,
      );
      await handleSubmit(value);
    },
    onSubmitInvalid: ({ value, formApi }) => {
      console.log("Form submission blocked - validation failed!", {
        value,
        errors: formApi.state.errors,
      });
    },
  });

  const shouldIncludeInQuery = (
    templateRecord: TemplateItem,
    input: TemplatesGetAllInput | undefined,
  ): boolean => {
    const searchTerm = input?.search?.trim();
    if (!searchTerm) {
      return true;
    }
    const normalizedSearch = searchTerm.toLowerCase();
    return templateRecord.name.toLowerCase().includes(normalizedSearch);
  };

  const upsertTemplateIntoList = (
    list: TemplateList | undefined,
    templateRecord: TemplateItem,
    sort: TemplatesGetAllInput["sort"] | undefined,
  ): TemplateList => {
    const base = (list ?? []).filter((item) => item.id !== templateRecord.id);
    return sortTemplates([...base, templateRecord], sort);
  };

  const updateAllTemplateQueries = (
    updater: (
      list: TemplateList | undefined,
      input: TemplatesGetAllInput | undefined,
    ) => TemplateList | undefined,
  ) => {
    const matching = queryClient.getQueriesData<TemplateList>({
      queryKey: templatesQueryKeyRoot,
    });

    for (const [key] of matching) {
      const maybeOpts = (key as QueryKey)[1] as
        | { input?: TemplatesGetAllInput }
        | undefined;
      const input = maybeOpts?.input;

      queryClient.setQueryData<TemplateList | undefined>(
        key,
        (current: TemplateList | undefined) => updater(current, input),
      );
    }
  };

  const createTemplate = api.templates.create.useMutation({
    onMutate: async (_newTemplate) => {
      await queryClient.cancelQueries({ queryKey: templatesQueryKeyRoot });
      const previousQueries = snapshotTemplateQueries();
      return { previousQueries } satisfies TemplateMutationContext;
    },
    onError: (err, newTemplate, context) => {
      const mutationContext = context as TemplateMutationContext | undefined;
      if (mutationContext?.previousQueries) {
        restoreTemplateQueries(mutationContext.previousQueries);
      }
      submitRef.current = false;
    },
    onSuccess: async (data) => {
      console.log("Template created successfully:", {
        id: data.id,
        name: data.name,
        user_id: data.user_id,
        createdAt: data.createdAt,
      });
      const exercises = form.getFieldValue("exercises");
      formAnalytics.formSubmissionCompleted("template_form", {
        templateId: data.id.toString(),
        exerciseCount: exercises.filter((ex) => ex.exerciseName.trim()).length,
      });
      submitRef.current = false;

      const newTemplate = data as TemplateItem;

      updateAllTemplateQueries((current, input) => {
        if (!shouldIncludeInQuery(newTemplate, input)) {
          return current;
        }
        return upsertTemplateIntoList(current, newTemplate, input?.sort);
      });

      router.push("/templates");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: templatesQueryKeyRoot });
    },
  });

  const createTemplateWithLinking =
    api.templates.bulkCreateAndLinkExercises.useMutation({
      onMutate: async (_newTemplate) => {
        await queryClient.cancelQueries({ queryKey: templatesQueryKeyRoot });
        const previousQueries = snapshotTemplateQueries();
        return { previousQueries } satisfies TemplateMutationContext;
      },
      onError: (err, newTemplate, context) => {
        const mutationContext = context as TemplateMutationContext | undefined;
        if (mutationContext?.previousQueries) {
          restoreTemplateQueries(mutationContext.previousQueries);
        }
        submitRef.current = false;
      },
      onSuccess: async (data) => {
        console.log("Template with linking created successfully:", {
          id: data.id,
          name: data.name,
          user_id: data.user_id,
          createdAt: data.createdAt,
        });
        const exercises = form.getFieldValue("exercises");
        formAnalytics.formSubmissionCompleted("template_form", {
          templateId: data.id.toString(),
          exerciseCount: exercises.filter((ex) => ex.exerciseName.trim())
            .length,
        });
        submitRef.current = false;

        const newTemplate = data as TemplateItem;

        updateAllTemplateQueries((current, input) => {
          if (!shouldIncludeInQuery(newTemplate, input)) {
            return current;
          }
          return upsertTemplateIntoList(current, newTemplate, input?.sort);
        });

        router.push("/templates");
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: templatesQueryKeyRoot });
      },
    });

  const updateTemplate = api.templates.update.useMutation({
    onMutate: async (updatedTemplate) => {
      await queryClient.cancelQueries({ queryKey: templatesQueryKeyRoot });
      const previousQueries = snapshotTemplateQueries();
      const updatedAt = new Date();

      updateAllTemplateQueries((current, input) => {
        if (!current) {
          return current;
        }

        const existing = current.find(
          (record) => record.id === updatedTemplate.id,
        );
        if (!existing) {
          return current;
        }

        const exercises = updatedTemplate.exercises.map(
          (exerciseName, index) => {
            const existingExercise = existing.exercises?.[index];
            return {
              id: existingExercise?.id ?? -index - 1,
              user_id: existingExercise?.user_id ?? existing.user_id,
              templateId: existing.id,
              exerciseName,
              orderIndex: index,
              linkingRejected: existingExercise?.linkingRejected ?? false,
              createdAt: existingExercise?.createdAt ?? updatedAt,
            };
          },
        );

        const mergedTemplate: TemplateItem = {
          ...existing,
          name: updatedTemplate.name,
          updatedAt,
          exercises,
        };

        if (!shouldIncludeInQuery(mergedTemplate, input)) {
          return current.filter((record) => record.id !== mergedTemplate.id);
        }

        return upsertTemplateIntoList(current, mergedTemplate, input?.sort);
      });

      return { previousQueries } satisfies TemplateMutationContext;
    },
    onError: (err, updatedTemplate, context) => {
      const mutationContext = context as TemplateMutationContext | undefined;
      if (mutationContext?.previousQueries) {
        restoreTemplateQueries(mutationContext.previousQueries);
      }
      submitRef.current = false;
    },
    onSuccess: () => {
      const exercises = form.getFieldValue("exercises");
      formAnalytics.formSubmissionCompleted("template_form", {
        templateId: template!.id.toString(),
        exerciseCount: exercises.filter((ex) => ex.exerciseName.trim()).length,
        action: "update",
      });
      submitRef.current = false;
      router.push("/templates");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: templatesQueryKeyRoot });
    },
  });

  const handleSubmit = async (data: TemplateFormData) => {
    console.log("handleSubmit called", {
      currentStep,
      linkingDecisionsCount: linkingDecisions.length,
      data,
    });

    if (isLoading || submitRef.current) {
      console.log("Form already submitting, preventing double submission");
      return;
    }

    const filteredExercises = data.exercises
      .map((ex) => ex.exerciseName.trim())
      .filter((ex) => ex !== "");
    const trimmedName = data.name.trim();

    console.log("Filtered exercises:", filteredExercises);
    console.log("Linking decisions:", linkingDecisions);

    submitRef.current = true;
    const now = Date.now();
    try {
      if (template) {
        console.log("Updating existing template");
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

        // Use new bulkCreateAndLinkExercises endpoint if we have linking decisions
        if (linkingDecisions.length > 0) {
          console.log("Creating template with linking decisions:", {
            name: trimmedName,
            exercisesCount: filteredExercises.length,
            linkingDecisionsCount: linkingDecisions.length,
            dedupeKey,
          });
          await createTemplateWithLinking.mutateAsync({
            name: trimmedName,
            exercises: filteredExercises,
            linkingDecisions,
            dedupeKey,
          });
        } else {
          console.log("Creating template without linking decisions:", {
            name: trimmedName,
            exercisesCount: filteredExercises.length,
            dedupeKey,
          });
          await createTemplate.mutateAsync({
            name: trimmedName,
            exercises: filteredExercises,
            dedupeKey,
          });
        }
      }
    } catch (error) {
      console.error("Error saving template:", error);
      formAnalytics.formSubmissionError("template_form", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: template ? "template_edit" : "template_create",
        templateId: template?.id.toString(),
      });
      alert("Error saving template. Please try again.");
      submitRef.current = false;
    }
  };

  const isLoading =
    createTemplate.isPending ||
    createTemplateWithLinking.isPending ||
    updateTemplate.isPending;

  // Field array management for exercises
  const addExercise = () => {
    const currentExercises = form.getFieldValue("exercises");
    form.setFieldValue("exercises", [
      ...currentExercises,
      { exerciseName: "" },
    ]);
  };

  const removeExercise = (index: number) => {
    const currentExercises = form.getFieldValue("exercises");
    if (currentExercises.length > 1) {
      form.setFieldValue(
        "exercises",
        currentExercises.filter((_, i) => i !== index),
      );
    }
  };

  const duplicateExercise = (index: number) => {
    const currentExercises = form.getFieldValue("exercises");
    const exerciseToDuplicate = currentExercises[index];
    if (exerciseToDuplicate) {
      form.setFieldValue("exercises", [
        ...currentExercises,
        { exerciseName: exerciseToDuplicate.exerciseName },
      ]);
    }
  };

  const swapExercises = (index: number, targetIndex: number) => {
    const currentExercises = form.getFieldValue("exercises");
    const newExercises = [...currentExercises];
    const temp = newExercises[index];
    const target = newExercises[targetIndex];
    if (temp && target) {
      newExercises[index] = target;
      newExercises[targetIndex] = temp;
      form.setFieldValue("exercises", newExercises);
    }
  };

  // Access form values reactively using useStore for reactive updates
  const formValues = useStore(form.store, (state) => state.values);
  const exercises = formValues.exercises || [];
  const watchedName = formValues.name || "";
  const watchedExercises = exercises;

  // Drag and drop for exercises
  const [dragState, dragHandlers] = useUniversalDragReorder(
    exercises,
    (newExercises) => {
      form.setFieldValue("exercises", newExercises);
    },
  );

  const steps: { key: FormStep; label: string; description: string }[] = [
    { key: "basics", label: "Basics", description: "Name your template" },
    {
      key: "exercises",
      label: "Exercises",
      description: "Add workout exercises",
    },
    {
      key: "linking",
      label: "Link Exercises",
      description: "Review exercise linking suggestions",
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

  const canProceedToNext = () => {
    if (currentStep === "basics") {
      return watchedName.trim().length > 0;
    }
    if (currentStep === "exercises") {
      return watchedExercises.some((ex) => ex.exerciseName.trim().length > 0);
    }
    return true;
  };

  const estimatedDuration = () => {
    const exerciseCount = watchedExercises.filter((ex) =>
      ex.exerciseName.trim(),
    ).length;
    const minMinutes = exerciseCount * 3;
    const maxMinutes = exerciseCount * 5;
    return exerciseCount > 0 ? `${minMinutes}-${maxMinutes} min` : "—";
  };

  const estimatedVolume = () => {
    const exerciseCount = watchedExercises.filter((ex) =>
      ex.exerciseName.trim(),
    ).length;
    return exerciseCount > 0 ? `${exerciseCount} exercises` : "—";
  };

  const getValidationSummary = () => {
    const errorMessages: string[] = [];

    // TanStack Form stores errors differently - check field meta for errors
    // For now, return empty array as we handle field-level errors inline
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
          <form
            onSubmit={(e) => {
              console.log("Form onSubmit event triggered!");
              e.preventDefault();
              e.stopPropagation();
              console.log("About to call form.handleSubmit()");
              void form.handleSubmit();
            }}
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

                <form.Field name="name">
                  {(field) => {
                    const error = field.state.meta.errors?.[0];
                    const errorMessage =
                      typeof error === "string" ? error : error?.message;
                    return (
                      <TanStackFormField
                        name={field.name}
                        {...(errorMessage !== undefined && {
                          error: errorMessage,
                        })}
                      >
                        <TanStackFormItem>
                          <TanStackFormLabel>Template Name</TanStackFormLabel>
                          <TanStackFormControl>
                            <Input
                              placeholder="e.g., Push Day, Pull Day, Legs"
                              value={field.state.value}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              onBlur={field.handleBlur}
                            />
                          </TanStackFormControl>
                          <TanStackFormMessage />
                        </TanStackFormItem>
                      </TanStackFormField>
                    );
                  }}
                </form.Field>
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
                    <Label>Exercises</Label>
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
                    {exercises.map((exercise, index) => (
                      <div
                        key={index}
                        ref={(el) => dragHandlers.setCardElement(index, el)}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-all duration-200 ${
                          dragState.isDragging &&
                          dragState.draggedIndex === index
                            ? "bg-primary/5 border-primary scale-105 shadow-lg"
                            : dragState.dragOverIndex === index
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card"
                        }`}
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
                        <form.Field name={`exercises[${index}].exerciseName`}>
                          {(field) => {
                            const error = field.state.meta.errors?.[0];
                            const errorMessage =
                              typeof error === "string"
                                ? error
                                : error?.message;
                            return (
                              <TanStackFormField
                                name={field.name}
                                {...(errorMessage !== undefined && {
                                  error: errorMessage,
                                })}
                              >
                                <TanStackFormItem className="flex-1">
                                  <TanStackFormControl>
                                    <ExerciseInput
                                      value={field.state.value}
                                      onChange={field.handleChange}
                                      placeholder={`Exercise ${index + 1}`}
                                      className="w-full"
                                    />
                                  </TanStackFormControl>
                                  <TanStackFormMessage />
                                </TanStackFormItem>
                              </TanStackFormField>
                            );
                          }}
                        </form.Field>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-1">
                          {/* Duplicate */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateExercise(index)}
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
                          {index < exercises.length - 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => swapExercises(index, index + 1)}
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
                          {exercises.length > 1 && (
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

                  {exercises.length === 0 && (
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
                    Add exercises in the order you want to perform them. You can
                    reorder them later by dragging the handle.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="mb-1 text-xs font-medium tracking-wide uppercase">
                      Recommendations:
                    </p>
                    <ul className="space-y-1 text-xs">
                      <li>
                        • <strong>Rep ranges:</strong> 8-12 for hypertrophy, 3-6
                        for strength, 15+ for endurance
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

            {currentStep === "linking" && (
              <div className="space-y-6">
                <ExerciseLinkingReview
                  templateName={watchedName || "Untitled Template"}
                  exercises={watchedExercises
                    .filter((ex) => ex.exerciseName.trim())
                    .map((ex, index) => ({
                      name: ex.exerciseName,
                      tempId: `temp-${index}`, // Generate temporary ID
                    }))}
                  onDecisionsChange={(decisions) => {
                    // Transform decisions to the format expected by the backend
                    const transformedDecisions = watchedExercises
                      .filter((ex) => ex.exerciseName.trim())
                      .map((ex, index) => {
                        const tempId = `temp-${index}`;
                        const masterExerciseId = decisions[tempId];

                        return {
                          tempId,
                          action: masterExerciseId
                            ? ("link" as const)
                            : ("create-new" as const),
                          masterExerciseId: masterExerciseId
                            ? parseInt(masterExerciseId, 10)
                            : undefined,
                        };
                      });

                    // Store linking decisions for final submission
                    setLinkingDecisions(transformedDecisions);
                  }}
                />
              </div>
            )}

            {currentStep === "preview" && (
              <div className="space-y-6">
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium">
                    {watchedName || "Untitled Template"}
                  </h3>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Exercises:</span>
                      <span>
                        {
                          watchedExercises.filter((ex) =>
                            ex.exerciseName.trim(),
                          ).length
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
                      {watchedExercises
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
                    type="button"
                    disabled={isLoading || submitRef.current}
                    onClick={async (e) => {
                      console.log("Create Template button clicked!", {
                        currentStep,
                        isLoading,
                        submitRefCurrent: submitRef.current,
                        linkingDecisions,
                        formState: form.state,
                      });
                      e.preventDefault();
                      e.stopPropagation();

                      // Manually trigger form submission
                      const formValues = form.state.values;
                      console.log("Form values:", formValues);

                      await handleSubmit(formValues);
                    }}
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
        </CardContent>
      </Card>
    </div>
  );
}
