"use client";

import { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Enhanced submission deduplication with crypto hashing
function createSubmissionHash(name: string, exercises: string[]): string {
  const data = JSON.stringify({ name: name.trim(), exercises: exercises.sort() });
  // Simple hash function for client-side deduplication (not cryptographically secure)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";

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
  const submissionHashRef = useRef(new Set<string>());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSubmitRef = useRef<{
    name: string;
    exercises: string[];
    hash: string;
    timestamp: number;
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  const utils = api.useUtils();

  const createTemplate = api.templates.create.useMutation({
    onError: (err, newTemplate, context) => {
      // Reset submission flag on error
      submitRef.current = false;
      console.error("Error creating template:", err);
    },
    onSuccess: async (data) => {
      console.log("Template created successfully:", {
        id: data.id,
        name: data.name,
        user_id: data.user_id,
        createdAt: data.createdAt,
      });

      // Simple invalidation instead of optimistic updates to prevent race conditions
      try {
        await utils.templates.getAll.invalidate();
      } catch (error) {
        console.warn("Cache invalidation failed:", error);
      }
      
      // Reset submission flag and navigate immediately
      submitRef.current = false;
      router.push("/templates");
    },
  });

  const updateTemplate = api.templates.update.useMutation({
    onError: (err, updatedTemplate, context) => {
      // Reset submission flag on error
      submitRef.current = false;
      console.error("Error updating template:", err);
    },
    onSuccess: async () => {
      // Simple invalidation instead of optimistic updates
      try {
        await utils.templates.getAll.invalidate();
      } catch (error) {
        console.warn("Cache invalidation failed:", error);
      }

      // Reset submission flag and navigate
      submitRef.current = false;
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
    console.log("handleSubmit called");

    // Enhanced double-submission prevention for React 19 concurrent rendering
    if (isLoading || submitRef.current) {
      console.log("Form already submitting, preventing double submission");
      return;
    }

    const filteredExercises = data.exercises
      .map((ex) => ex.exerciseName.trim())
      .filter((ex) => ex !== "");
    const trimmedName = data.name.trim();

    // Enhanced hash-based duplicate submission prevention
    const now = Date.now();
    const submissionHash = createSubmissionHash(trimmedName, filteredExercises);
    
    // Check if this exact submission hash was already processed recently
    if (submissionHashRef.current.has(submissionHash)) {
      console.log("Preventing duplicate submission - hash already processed", {
        submissionHash,
        trimmedName,
        exerciseCount: filteredExercises.length,
      });
      return;
    }

    const lastSubmit = lastSubmitRef.current;
    if (!template && lastSubmit) {
      const timeDiff = now - lastSubmit.timestamp;
      
      // Check both hash and time-based deduplication for extra safety
      if (lastSubmit.hash === submissionHash && timeDiff < 30000) { // Extended to 30 seconds to match server
        console.log(
          "Preventing duplicate submission - same hash within 30 seconds",
          { timeDiff, submissionHash, trimmedName },
        );
        return;
      }
    }

    // Set submission flag FIRST to prevent race conditions
    submitRef.current = true;
    submissionHashRef.current.add(submissionHash);
    lastSubmitRef.current = {
      name: trimmedName,
      exercises: filteredExercises,
      hash: submissionHash,
      timestamp: now,
    };

    // Clean up old hashes after 60 seconds
    setTimeout(() => {
      submissionHashRef.current.delete(submissionHash);
    }, 60000);

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
          submissionHash,
        });
        await createTemplate.mutateAsync({
          name: trimmedName,
          exercises: filteredExercises,
        });
      }
    } catch (error) {
      console.error("Error saving template:", error);
      // Reset submission flag on error
      submitRef.current = false;
      alert("Error saving template. Please try again.");
    }
  };

  // Debounced submit handler to prevent rapid successive submissions
  const debouncedSubmit = useCallback((data: TemplateFormData) => {
    // Clear any pending debounced submission
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set up new debounced submission with 500ms delay
    debounceRef.current = setTimeout(() => {
      void handleSubmit(data);
    }, 500);
  }, []);

  // Cleanup debounce on unmount
  useCallback(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const isLoading = createTemplate.isPending || updateTemplate.isPending;
  const isSubmitting = isLoading || submitRef.current;

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>{template ? "Edit Template" : "Create Template"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(debouncedSubmit)}
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
                      disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                                disabled={isSubmitting}
                              />
                            </FormControl>
                          </div>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                disabled={isSubmitting}
                onClick={(e) => {
                  // Prevent any possibility of double clicks
                  if (isSubmitting) {
                    e.preventDefault();
                    return;
                  }
                }}
              >
                {isSubmitting
                  ? "Saving..."
                  : template
                    ? "Update Template"
                    : "Create Template"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={isSubmitting}
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
