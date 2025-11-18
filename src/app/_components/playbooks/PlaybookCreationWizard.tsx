"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { api } from "~/trpc/react";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { useOnlineStatus } from "~/hooks/use-online-status";
import { cn } from "~/lib/utils";

const GOAL_PRESETS = [
  { value: "powerlifting", label: "Powerlifting Cycle", description: "Build max strength in the big 3" },
  { value: "strength", label: "Strength Builder", description: "General strength gains across movements" },
  { value: "hypertrophy", label: "Hypertrophy Block", description: "Muscle growth and volume focus" },
  { value: "peaking", label: "Peaking Program", description: "Prepare for a competition or 1RM test" },
] as const;

const STEPS = ["Goal", "Target", "Details", "Review"] as const;

type FormData = {
  name: string;
  goalText: string;
  goalPreset: string | null;
  targetType: "template" | "exercise";
  targetIds: number[];
  duration: number;
  metadata?: {
    currentMaxes?: Record<string, number>;
    trainingDays?: number;
    equipment?: string[];
  };
};

export function PlaybookCreationWizard() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const isOnline = useOnlineStatus();
  const [currentStep, setCurrentStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    goalText: "",
    goalPreset: null,
    targetType: "template",
    targetIds: [],
    duration: 6,
  });

  // Fetch templates and exercises
  const { data: templates = [], isLoading: loadingTemplates } = api.templates.getAll.useQuery();
  const { data: exercises = [], isLoading: loadingExercises } = api.exercises.getAllMaster.useQuery();

  const createPlaybookMutation = api.playbooks.create.useMutation({
    onSuccess: (data) => {
      router.push(`/playbooks/${data.id}`);
    },
    onError: (error) => {
      // Log error for debugging
      console.error("Failed to create playbook:", error);
    },
    retry: 1, // Retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!isOnline) {
      // Show offline message
      return;
    }

    await createPlaybookMutation.mutateAsync({
      name: formData.name || `${formData.goalPreset || "Custom"} Playbook`,
      goalText: formData.goalText,
      goalPreset: formData.goalPreset as any,
      targetType: formData.targetType,
      targetIds: formData.targetIds,
      duration: formData.duration,
      metadata: formData.metadata,
    });
  };

  const handlePresetSelect = (preset: string) => {
    const selectedPreset = GOAL_PRESETS.find((p) => p.value === preset);
    setFormData({
      ...formData,
      goalPreset: preset,
      goalText: selectedPreset?.label || "",
    });
  };

  const handleTargetToggle = (id: number) => {
    setFormData((prev) => {
      const isSelected = prev.targetIds.includes(id);
      return {
        ...prev,
        targetIds: isSelected
          ? prev.targetIds.filter((targetId) => targetId !== id)
          : [...prev.targetIds, id],
      };
    });
  };

  const handleSelectAll = () => {
    const allIds = formData.targetType === "template"
      ? filteredTemplates.map((t) => t.id)
      : filteredExercises.map((e) => e.id);
    setFormData((prev) => ({ ...prev, targetIds: allIds }));
  };

  const handleClearAll = () => {
    setFormData((prev) => ({ ...prev, targetIds: [] }));
  };

  // Filter templates and exercises based on search
  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  type ExerciseType = { id: number; name: string; linkedCount: number };
  const filteredExercises: ExerciseType[] = (exercises as ExerciseType[]).filter((exercise) =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.goalText.trim().length > 0;
      case 1:
        return formData.targetIds.length > 0;
      case 2:
        return formData.duration >= 4 && formData.duration <= 12;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const MotionDiv = prefersReducedMotion ? "div" : motion.div;

  return (
    <PageShell
      title="Create Training Playbook"
      description="Design a personalized progression plan"
      headerActions={
        <Button variant="outline" onClick={handleBack} size="sm">
          <ArrowLeft className="size-4" />
          {currentStep === 0 ? "Cancel" : "Back"}
        </Button>
      }
    >
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border-2 transition-all",
                    index < currentStep && "border-primary bg-primary text-primary-foreground",
                    index === currentStep && "border-primary bg-background text-primary",
                    index > currentStep && "border-muted bg-background text-muted-foreground"
                  )}
                >
                  {index < currentStep ? (
                    <Check className="size-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <span className="mt-2 text-xs font-medium">{step}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 transition-all",
                    index < currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <MotionDiv
          key={currentStep}
          {...(!prefersReducedMotion && {
            initial: { opacity: 0, x: 20 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: -20 },
            transition: { duration: 0.3 },
          })}
        >
          {/* Step 1: Training Goal */}
          {currentStep === 0 && (
            <Card variant="glass" className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle>What's your training goal?</CardTitle>
                <CardDescription>
                  Choose a preset or describe your own goal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preset Chips */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {GOAL_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handlePresetSelect(preset.value)}
                      className={cn(
                        "group relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all",
                        "touch-target-large",
                        formData.goalPreset === preset.value
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{preset.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {preset.description}
                          </p>
                        </div>
                        {formData.goalPreset === preset.value && (
                          <Check className="size-5 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Goal Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Or describe your goal
                  </label>
                  <Input
                    value={formData.goalText}
                    onChange={(e) =>
                      setFormData({ ...formData, goalText: e.target.value, goalPreset: null })
                    }
                    placeholder="e.g., Build a 200kg deadlift in 8 weeks"
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    Be specific! This helps us create a better plan.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Target Selection */}
          {currentStep === 1 && (
            <Card variant="glass" className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle>What do you want to focus on?</CardTitle>
                <CardDescription>
                  Select templates or specific exercises
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Target Type Toggle */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setFormData({ ...formData, targetType: "template", targetIds: [] });
                      setSearchQuery("");
                    }}
                    className={cn(
                      "rounded-lg border-2 p-4 transition-all touch-target-large",
                      formData.targetType === "template"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <p className="font-semibold">Templates</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Full workout programs
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      setFormData({ ...formData, targetType: "exercise", targetIds: [] });
                      setSearchQuery("");
                    }}
                    className={cn(
                      "rounded-lg border-2 p-4 transition-all touch-target-large",
                      formData.targetType === "exercise"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <p className="font-semibold">Exercises</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Specific movements
                    </p>
                  </button>
                </div>

                {/* Selection List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {formData.targetType === "template" ? "Select Templates" : "Select Exercises"}
                    </label>
                    <Badge variant="secondary">
                      {formData.targetIds.length} selected
                    </Badge>
                  </div>

                  {/* Search and Actions */}
                  {((formData.targetType === "template" && templates.length > 0) ||
                    (formData.targetType === "exercise" && exercises.length > 0)) && (
                    <div className="space-y-2">
                      <Input
                        placeholder={`Search ${formData.targetType}s...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="text-base"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAll}
                          disabled={
                            (formData.targetType === "template" && filteredTemplates.length === 0) ||
                            (formData.targetType === "exercise" && filteredExercises.length === 0)
                          }
                        >
                          Select All {searchQuery && `(${formData.targetType === "template" ? filteredTemplates.length : filteredExercises.length})`}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearAll}
                          disabled={formData.targetIds.length === 0}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {(loadingTemplates || loadingExercises) && (
                    <div className="flex items-center justify-center rounded-lg border-2 border-border bg-muted/20 p-8">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {/* Empty State */}
                  {!loadingTemplates && !loadingExercises && formData.targetType === "template" && templates.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No templates found. Create some templates first!
                      </p>
                    </div>
                  )}

                  {!loadingTemplates && !loadingExercises && formData.targetType === "exercise" && exercises.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No exercises found. Add exercises to your templates first!
                      </p>
                    </div>
                  )}

                  {/* Templates List */}
                  {!loadingTemplates && formData.targetType === "template" && templates.length > 0 && (
                    <>
                      {filteredTemplates.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
                          <p className="text-sm text-muted-foreground">
                            No templates match "{searchQuery}"
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
                          {filteredTemplates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => handleTargetToggle(template.id)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-all touch-target-large",
                                formData.targetIds.includes(template.id)
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-card hover:border-primary/50 hover:bg-muted"
                              )}
                            >
                              <div className="flex-1">
                                <p className="font-medium">{template.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {template.exercises.length} exercises
                                </p>
                              </div>
                              {formData.targetIds.includes(template.id) && (
                                <Check className="size-5 text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Exercises List */}
                  {!loadingExercises && formData.targetType === "exercise" && exercises.length > 0 && (
                    <>
                      {filteredExercises.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
                          <p className="text-sm text-muted-foreground">
                            No exercises match "{searchQuery}"
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
                          {filteredExercises.map((exercise) => (
                            <button
                              key={exercise.id}
                              onClick={() => handleTargetToggle(exercise.id)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-all touch-target-large",
                                formData.targetIds.includes(exercise.id)
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-card hover:border-primary/50 hover:bg-muted"
                              )}
                            >
                              <div className="flex-1">
                                <p className="font-medium">{exercise.name}</p>
                                {exercise.linkedCount > 0 && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Used in {exercise.linkedCount} template{exercise.linkedCount !== 1 ? "s" : ""}
                                  </p>
                                )}
                              </div>
                              {formData.targetIds.includes(exercise.id) && (
                                <Check className="size-5 text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Duration & Preferences */}
          {currentStep === 2 && (
            <Card variant="glass" className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle>How long should this playbook run?</CardTitle>
                <CardDescription>
                  Set duration and optional training preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Duration Slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Duration</label>
                    <Badge variant="secondary" className="text-base font-semibold">
                      {formData.duration} weeks
                    </Badge>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="12"
                    step="1"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: parseInt(e.target.value) })
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>4 weeks</span>
                    <span>12 weeks</span>
                  </div>
                </div>

                {/* Optional Advanced Options (collapsed by default) */}
                <details className="group rounded-lg border border-border p-4">
                  <summary className="cursor-pointer font-medium group-open:mb-4">
                    Advanced Options (Optional)
                  </summary>
                  <div className="space-y-4">
                    <Input
                      label="Training days per week"
                      type="number"
                      min="3"
                      max="7"
                      placeholder="e.g., 4"
                      hint="How many days can you train each week?"
                    />
                    <Input
                      label="Available equipment"
                      placeholder="e.g., Barbell, Dumbbells, Squat Rack"
                      hint="Comma-separated list"
                    />
                  </div>
                </details>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review & Compare Plans */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-5 text-primary" />
                    Review Your Playbook
                  </CardTitle>
                  <CardDescription>
                    Compare AI and algorithmic recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div className="rounded-lg bg-muted/50 p-4">
                    <h4 className="mb-2 font-semibold">Goal</h4>
                    <p className="text-sm text-muted-foreground">{formData.goalText}</p>
                    <div className="mt-4 flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Duration:</span>{" "}
                        <span className="font-medium">{formData.duration} weeks</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target:</span>{" "}
                        <span className="font-medium capitalize">{formData.targetType}</span>
                      </div>
                    </div>
                  </div>

                  {/* Selected Items */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h4 className="mb-3 font-semibold">
                      Selected {formData.targetType === "template" ? "Templates" : "Exercises"}
                    </h4>
                    <div className="space-y-2">
                      {formData.targetType === "template" ? (
                        templates
                          .filter((t) => formData.targetIds.includes(t.id))
                          .map((template) => (
                            <div
                              key={template.id}
                              className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                            >
                              <div>
                                <p className="font-medium">{template.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {template.exercises.length} exercises
                                </p>
                              </div>
                              <Check className="size-4 text-primary" />
                            </div>
                          ))
                      ) : (
                        (exercises as ExerciseType[])
                          .filter((e) => formData.targetIds.includes(e.id))
                          .map((exercise) => (
                            <div
                              key={exercise.id}
                              className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                            >
                              <div>
                                <p className="font-medium">{exercise.name}</p>
                                {exercise.linkedCount > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Used in {exercise.linkedCount} template{exercise.linkedCount !== 1 ? "s" : ""}
                                  </p>
                                )}
                              </div>
                              <Check className="size-4 text-primary" />
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Offline Warning */}
                  {!isOnline && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                      <p className="text-sm font-medium text-destructive">
                        You're offline. Please connect to the internet to generate your playbook.
                      </p>
                    </div>
                  )}

                  {/* Loading Message */}
                  {createPlaybookMutation.isPending && (
                    <div className="rounded-lg border border-primary/50 bg-primary/10 p-4">
                      <div className="flex items-center gap-3">
                        <Loader2 className="size-5 animate-spin text-primary" />
                        <div>
                          <p className="text-sm font-medium text-primary">
                            Generating your personalized playbook...
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            This may take up to 2 minutes as we analyze your training history and generate AI recommendations.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {createPlaybookMutation.isError && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-destructive">
                            {createPlaybookMutation.error.message || "Failed to create playbook. Please try again."}
                          </p>
                          {createPlaybookMutation.error.message?.includes("NETWORK_ERROR") && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              This could be due to a network timeout. Please check your connection and try again.
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSubmit}
                          className="shrink-0"
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Plan Preview Placeholder */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="size-4 text-primary" />
                        <h5 className="font-semibold">AI Plan</h5>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Personalized using your history and goals
                      </p>
                    </div>
                    <div className="rounded-lg border-2 border-secondary bg-secondary/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Zap className="size-4 text-secondary" />
                        <h5 className="font-semibold">Algorithmic Plan</h5>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Science-based progressive overload
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </MotionDiv>
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={handleBack} size="lg">
          <ArrowLeft className="size-4" />
          {currentStep === 0 ? "Cancel" : "Back"}
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!isStepValid()}
            size="lg"
            haptic
          >
            Next
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!isOnline || createPlaybookMutation.isPending}
            size="lg"
            haptic
            className="gap-2"
          >
            {createPlaybookMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Check className="size-4" />
                Create Playbook
              </>
            )}
          </Button>
        )}
      </div>
    </PageShell>
  );
}
