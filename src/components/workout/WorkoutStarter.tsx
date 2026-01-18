"use client";

import React, { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useTemplates } from "~/lib/queries/templates";
import { useStartWorkout } from "~/lib/queries/workouts";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

export interface WorkoutStarterProps {
  initialTemplateId?: number;
  onTemplateSelected?: (templateId: number) => void;
  onStartFromScratch?: () => void;
}

export function WorkoutStarter({
  initialTemplateId,
  onTemplateSelected,
  onStartFromScratch,
}: WorkoutStarterProps) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(
    initialTemplateId ?? null,
  );

  const { data: templates, isLoading: isLoadingTemplates } = useTemplates();
  const startWorkout = useStartWorkout();

  const handleTemplateSelect = (templateId: number) => {
    setSelectedTemplate(templateId);
    onTemplateSelected?.(templateId);
  };

  const handleStartFromScratch = async () => {
    onStartFromScratch?.();
    const result = await startWorkout.mutateAsync({
      data: { templateId: undefined },
    });
    if (result?.sessionId) {
      router.navigate({
        to: "/workouts/$workoutId",
        params: { workoutId: String(result.sessionId) },
      });
    }
  };

  const handleStartWithTemplate = async () => {
    if (selectedTemplate === null) return;
    const result = await startWorkout.mutateAsync({
      data: { templateId: selectedTemplate },
    });
    if (result?.sessionId) {
      router.navigate({
        to: "/workouts/$workoutId",
        params: { workoutId: String(result.sessionId) },
      });
    }
  };

  const isPending = startWorkout.isPending;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          variant="interactive"
          className={cn(
            "cursor-pointer transition-all",
            selectedTemplate === null && "ring-primary ring-2",
          )}
          onClick={() => handleStartFromScratch()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleStartFromScratch();
            }
          }}
          tabIndex={0}
          role="button"
          aria-pressed={selectedTemplate === null}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">✨</span>
              Start from Scratch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Create a new workout without a template. Add exercises as you go.
            </p>
          </CardContent>
        </Card>

        {isLoadingTemplates ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
          </div>
        ) : (
          templates?.map((template) => (
            <Card
              key={template.id}
              variant="interactive"
              className={cn(
                "cursor-pointer transition-all",
                selectedTemplate === template.id && "ring-primary ring-2",
              )}
              onClick={() => handleTemplateSelect(template.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTemplateSelect(template.id);
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={selectedTemplate === template.id}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  {template.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {template.exercises?.length ?? 0} exercises
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedTemplate !== null && (
        <div className="flex justify-end">
          <Button
            size="xl"
            onClick={handleStartWithTemplate}
            disabled={isPending}
          >
            {isPending ? "Creating..." : "Start Workout with Template"}
          </Button>
        </div>
      )}
    </div>
  );
}
