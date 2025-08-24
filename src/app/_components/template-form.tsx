"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { api } from "~/trpc/react";
import { useAuth } from "~/providers/AuthProvider";

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

interface TemplateDraft {
  clientId: string;
  name: string;
  exercises: string[];
  timestamp: number;
}

interface TemplateFormProps {
  template?: {
    id: number;
    name: string;
    exercises: { exerciseName: string }[];
  };
}

export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientId] = useState(() => crypto.randomUUID()); // Generate client ID on mount

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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  const utils = api.useUtils();
  
  // Pre-warm D1 connection
  api.templates.warmConnection.useQuery(undefined, {
    staleTime: Infinity,
    retry: false,
  });
  
  // LocalStorage utilities
  const getDraftKey = useCallback(() => {
    return user?.id ? `template_draft_${user.id}` : null;
  }, [user?.id]);

  const saveDraft = useCallback((data: TemplateFormData) => {
    const draftKey = getDraftKey();
    if (!draftKey) return;

    try {
      const draft: TemplateDraft = {
        clientId,
        name: data.name,
        exercises: data.exercises.map(ex => ex.exerciseName.trim()).filter(Boolean),
        timestamp: Date.now(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (error) {
      console.warn("Failed to save draft:", error);
    }
  }, [clientId, getDraftKey]);

  const loadDraft = useCallback((): TemplateDraft | null => {
    const draftKey = getDraftKey();
    if (!draftKey) return null;

    try {
      const stored = localStorage.getItem(draftKey);
      if (!stored) return null;
      return JSON.parse(stored) as TemplateDraft;
    } catch (error) {
      console.warn("Failed to load draft:", error);
      return null;
    }
  }, [getDraftKey]);

  const clearDraft = useCallback(() => {
    const draftKey = getDraftKey();
    if (!draftKey) return;

    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.warn("Failed to clear draft:", error);
    }
  }, [getDraftKey]);

  // Restore draft on mount (only for new templates)
  useEffect(() => {
    if (template) return; // Don't restore draft when editing existing template

    const draft = loadDraft();
    if (!draft) return;

    // Ask user if they want to restore the draft
    if (confirm("You have an unsaved draft. Would you like to restore it?")) {
      form.setValue("name", draft.name);
      
      // Set exercises
      const exerciseValues = draft.exercises.map(name => ({ exerciseName: name }));
      if (exerciseValues.length > 0) {
        form.setValue("exercises", exerciseValues);
      }
    } else {
      // Clear the draft if user doesn't want to restore
      clearDraft();
    }
  }, [template, loadDraft, clearDraft, form]);

  // Debounced save to localStorage
  useEffect(() => {
    if (template) return; // Don't save drafts when editing existing template

    let timeoutId: NodeJS.Timeout;

    const subscription = form.watch((value) => {
      // Clear any existing timeout
      clearTimeout(timeoutId);
      
      // Set new timeout
      timeoutId = setTimeout(() => {
        if (value.name || (value.exercises?.some(ex => ex?.exerciseName))) {
          saveDraft(value as TemplateFormData);
        }
      }, 1000); // 1 second debounce
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [template, form, saveDraft]);

  const createTemplate = api.templates.create.useMutation({
    onError: (err) => {
      setIsSubmitting(false);
      console.error("Error creating template:", err);
      alert("Error creating template. Please try again.");
    },
    onSuccess: async (data) => {
      console.log("Template created successfully:", data.id);
      
      // Clear draft on successful submission
      clearDraft();
      
      try {
        await utils.templates.getAll.invalidate();
      } catch (error) {
        console.warn("Cache invalidation failed:", error);
      }
      
      setIsSubmitting(false);
      router.push("/templates");
    },
  });

  const updateTemplate = api.templates.update.useMutation({
    onError: (err) => {
      setIsSubmitting(false);
      console.error("Error updating template:", err);
      alert("Error updating template. Please try again.");
    },
    onSuccess: async () => {
      try {
        await utils.templates.getAll.invalidate();
      } catch (error) {
        console.warn("Cache invalidation failed:", error);
      }

      setIsSubmitting(false);
      router.push("/templates");
    },
  });

  const addExercise = () => {
    append({ exerciseName: "" });
  };

  const removeExercise = (index: number) => {
    remove(index);
  };

  const handleSubmit = async (data: TemplateFormData) => {
    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    const filteredExercises = data.exercises
      .map((ex) => ex.exerciseName.trim())
      .filter((ex) => ex !== "");
    const trimmedName = data.name.trim();

    setIsSubmitting(true);

    try {
      if (template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          name: trimmedName,
          exercises: filteredExercises,
        });
      } else {
        await createTemplate.mutateAsync({
          name: trimmedName,
          exercises: filteredExercises,
          clientId, // Use the generated client ID
        });
      }
    } catch (error) {
      console.error("Error saving template:", error);
      setIsSubmitting(false);
      // Error handling is done in the mutation callbacks
    }
  };


  const isLoading = createTemplate.isPending || updateTemplate.isPending || isSubmitting;

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>{template ? "Edit Template" : "Create Template"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
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
                      disabled={isLoading}
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
                  disabled={isLoading}
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
                                disabled={isLoading}
                              />
                            </FormControl>
                          </div>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isLoading}
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
                  disabled={isLoading}
                  onClick={addExercise}
                  className="h-20 w-full border-dashed"
                >
                  + Add your first exercise
                </Button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4">
              <Button 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading
                  ? "Saving..."
                  : template
                    ? "Update Template"
                    : "Create Template"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={isLoading}
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
