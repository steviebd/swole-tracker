"use client";

import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCreateTemplate } from "~/lib/queries/templates";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExerciseLinkingReview } from "~/components/exercise-linking-review";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_app/templates/new")({
  component: NewTemplatePage,
});

type Step = "name" | "exercises" | "review";

function NewTemplatePage() {
  const createTemplate = useCreateTemplate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [exerciseInput, setExerciseInput] = useState("");
  const [exercises, setExercises] = useState<
    { name: string; tempId: string }[]
  >([]);
  const [linkingDecisions, setLinkingDecisions] = useState<
    Record<string, string | null>
  >({});
  const [error, setError] = useState<string | null>(null);

  const handleAddExercise = () => {
    const trimmed = exerciseInput.trim();
    if (
      trimmed &&
      !exercises.find((e) => e.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setExercises([
        ...exercises,
        {
          name: trimmed,
          tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      ]);
      setExerciseInput("");
    }
  };

  const handleRemoveExercise = (tempId: string) => {
    setExercises(exercises.filter((e) => e.tempId !== tempId));
    const newDecisions = { ...linkingDecisions };
    delete newDecisions[tempId];
    setLinkingDecisions(newDecisions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === "name") {
      if (name.trim()) {
        setStep("exercises");
      }
      return;
    }

    if (step === "exercises") {
      if (exercises.length === 0) {
        setError("Please add at least one exercise");
        return;
      }
      setStep("review");
      return;
    }

    if (step === "review") {
      if (!name.trim() || exercises.length === 0) {
        setError("Please fill in all required fields");
        return;
      }

      try {
        const linkedExercises = exercises.map((ex) => {
          const decision = linkingDecisions[ex.tempId];
          if (decision) {
            return decision;
          }
          return ex.name;
        });

        await createTemplate.mutateAsync({
          data: { name: name.trim(), exercises: linkedExercises as string[] },
        });
        await queryClient.invalidateQueries({ queryKey: ["templates"] });
        throw redirect({ to: "/templates" });
      } catch (err) {
        if (err instanceof Response && err.status === 302) {
          throw err;
        }
        setError(
          err instanceof Error ? err.message : "Failed to create template",
        );
      }
    }
  };

  const canProceed = () => {
    if (step === "name") return name.trim().length > 0;
    if (step === "exercises") return exercises.length > 0;
    return true;
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Create Template</h1>
        <p className="text-muted-foreground">
          Step {step === "name" ? "1" : step === "exercises" ? "2" : "3"} of 3
        </p>
      </div>

      <div className="mb-8 flex gap-2">
        {(["name", "exercises", "review"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={cn(
              "flex items-center gap-2",
              step === s && "text-primary font-medium",
              step !== s && "text-muted-foreground",
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step !== s &&
                      i < (step === "name" ? 0 : step === "exercises" ? 1 : 2)
                    ? "bg-success text-success-foreground"
                    : "bg-muted",
              )}
            >
              {step !== s &&
              i < (step === "name" ? 0 : step === "exercises" ? 1 : 2)
                ? "✓"
                : i + 1}
            </div>
            <span className="capitalize">{s === "review" ? "Review" : s}</span>
            {i < 2 && <div className="bg-border ml-2 h-px w-8" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === "name" && "Template Name"}
            {step === "exercises" && "Add Exercises"}
            {step === "review" && "Review & Create"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === "name" && (
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Template Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Push Day"
                  className="bg-background w-full rounded-lg border px-4 py-2"
                  autoFocus
                />
              </div>
            )}

            {step === "exercises" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={exerciseInput}
                    onChange={(e) => setExerciseInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddExercise();
                      }
                    }}
                    placeholder="Add an exercise"
                    className="bg-background flex-1 rounded-lg border px-4 py-2"
                    autoFocus
                  />
                  <Button type="button" onClick={handleAddExercise}>
                    Add
                  </Button>
                </div>

                {exercises.length > 0 && (
                  <div className="space-y-2">
                    {exercises.map((ex) => (
                      <div
                        key={ex.tempId}
                        className="bg-muted/50 flex items-center justify-between rounded-lg border p-3"
                      >
                        <span>{ex.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveExercise(ex.tempId)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-muted-foreground text-sm">
                  {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}{" "}
                  added
                </div>
              </div>
            )}

            {step === "review" && (
              <ExerciseLinkingReview
                templateName={name}
                exercises={exercises}
                onDecisionsChange={setLinkingDecisions}
              />
            )}

            {error && (
              <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-4">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              {step !== "name" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setStep(step === "review" ? "exercises" : "name")
                  }
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                disabled={!canProceed() || createTemplate.isPending}
                className="flex-1"
              >
                {step === "review"
                  ? createTemplate.isPending
                    ? "Creating..."
                    : "Create Template"
                  : "Continue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
