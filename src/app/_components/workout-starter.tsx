"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { analytics } from "~/lib/analytics";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Toast, type ToastType } from "~/components/ui/toast";
import {
  TemplateFilters,
  type TemplateFiltersState,
} from "~/components/filters/template-filters";
import { useSyncIndicator } from "~/hooks/use-sync-indicator";
import { Badge } from "~/components/ui/badge";

interface WorkoutStarterProps {
  initialTemplateId?: number;
}

export function WorkoutStarter({ initialTemplateId }: WorkoutStarterProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    initialTemplateId ?? null,
  );
  const [isStarting, setIsStarting] = useState(false);
  const [recentlyCreated, setRecentlyCreated] = useState<Set<number>>(
    new Set(),
  );
  const [workoutDate, setWorkoutDate] = useState(() => {
    // Default to current date/time in local timezone
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  const [filters, setFilters] = useState<TemplateFiltersState>({
    search: "",
    sort: "recent",
    tag: null,
  });
  const [showFullExerciseList, setShowFullExerciseList] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const { data: templates, isLoading: templatesLoading } =
    api.templates.getAll.useQuery({ search: "", sort: "recent" });
  const createWorkoutMutation = api.workouts.start.useMutation();
  const {
    badgeText,
    description,
    isOnline,
    pendingOperations,
    canManualSync,
    manualSync,
    isBusy: syncBusy,
    failedOperations,
  } = useSyncIndicator();

  const strengthSuggestions = useMemo(
    () => [
      {
        id: "upper",
        title: "Upper body power",
        description: "Heavy presses with vertical pulls and arm finishers.",
        searchTerm: "upper",
      },
      {
        id: "lower",
        title: "Lower body strength",
        description: "Squats, pulls, and posterior-chain accessories.",
        searchTerm: "lower",
      },
    ],
    [],
  );

  const handleSuggestionSelect = useCallback(
    (suggestion: (typeof strengthSuggestions)[number]) => {
      setFilters((prev) => ({
        ...prev,
        search: suggestion.searchTerm,
      }));

      const match = templates?.find((template) =>
        template.name
          .toLowerCase()
          .includes(suggestion.searchTerm.toLowerCase()),
      );
      if (match) {
        setSelectedTemplateId(match.id);
      }

      analytics.event("workout_starter_suggestion_selected", {
        suggestion: suggestion.id,
      });
    },
    [templates, setFilters, setSelectedTemplateId],
  );

  const [toastOpen, setToastOpen] = useState(false);
  const [toastProps, setToastProps] = useState<{ type: ToastType; message: string } | null>(null);

  const showToast = useCallback((toastType: ToastType, toastMessage: string) => {
    setToastProps({ type: toastType, message: toastMessage });
    setToastOpen(true);
  }, []);

  const toastComponent = (
    <Toast
      open={toastOpen}
      type={toastProps?.type ?? "info"}
      message={toastProps?.message ?? ""}
      onClose={() => setToastOpen(false)}
    />
  );

  useEffect(() => {
    const focus = searchParams?.get("focus");
    if (!focus) return;
    const suggestion = strengthSuggestions.find((entry) => entry.id === focus);
    if (suggestion) {
      handleSuggestionSelect(suggestion);
      router.replace("/workout/start");
    }
  }, [handleSuggestionSelect, router, searchParams, strengthSuggestions]);

  const handleStartFreestyle = async () => {
    if (isStarting) {
      console.log("Already starting workout, ignoring duplicate request");
      return;
    }

    setIsStarting(true);

    try {
      // Create session without template
      const result = await createWorkoutMutation.mutateAsync({
        workoutDate: new Date(workoutDate),
      });

      // Track analytics
      analytics.workoutStarted("freestyle", "Freestyle Workout");

      // Navigate to session
      router.push(`/workout/session/${result.sessionId}`);
    } catch (error) {
      console.error("Error creating freestyle workout session:", error);
      analytics.error(error as Error, {
        context: "workout_start_freestyle",
      });

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      showToast(
        "error",
        errorMessage || "Error starting freestyle workout. Please try again.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];

    const filtered = templates.filter((template) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = template.name.toLowerCase().includes(searchLower);
        const matchesExercises = template.exercises?.some((exercise) =>
          exercise.exerciseName.toLowerCase().includes(searchLower),
        );
        if (!matchesName && !matchesExercises) return false;
      }

      // Tag filter (not implemented yet - no tags in schema)
      // if (filters.tag && template.tag !== filters.tag) return false;

      return true;
    });

    // Sort templates
    filtered.sort((a, b) => {
      switch (filters.sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "recent":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "lastUsed":
          // For now, fall back to created date since we don't have last used
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "mostUsed":
          // For now, fall back to created date since we don't have usage count
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        default:
          return 0;
      }
    });

    return filtered;
  }, [templates, filters]);

  const handleStart = async () => {
    if (!selectedTemplateId) {
      showToast("warning", "Select a template to get started.");
      return;
    }

    if (isStarting) {
      console.log("Already starting workout, ignoring duplicate request");
      return;
    }

    // Check if we recently created this template (client-side deduplication)
    if (recentlyCreated.has(selectedTemplateId)) {
      alert(
        "You just started this workout! Check your workout history or refresh the page.",
      );
      return;
    }

    setIsStarting(true);

    try {
      // Create session directly on server
      const result = await createWorkoutMutation.mutateAsync({
        templateId: selectedTemplateId,
        workoutDate: new Date(workoutDate),
      });

      // Track analytics
      const template = templates?.find((t) => t.id === selectedTemplateId);
      analytics.workoutStarted(
        selectedTemplateId.toString(),
        template?.name ?? "Unknown Template",
      );

      // Mark this template as recently created
      setRecentlyCreated((prev) => new Set([...prev, selectedTemplateId]));

      // Clear the recent creation flag after 2 minutes
      setTimeout(() => {
        setRecentlyCreated((prev) => {
          const newSet = new Set(prev);
          newSet.delete(selectedTemplateId);
          return newSet;
        });
      }, 120000); // 2 minutes

      // Navigate to session with better error handling
      try {
        router.push(`/workout/session/${result.sessionId}`);
      } catch (navigationError) {
        console.error("Navigation failed:", navigationError);
        // Don't show error to user - they can find the workout in history
        // Just log for debugging
      }
    } catch (error) {
      console.error("Error creating workout session:", error);
      analytics.error(error as Error, {
        context: "workout_start",
        templateId: selectedTemplateId.toString(),
      });

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Recent session found")) {
        showToast(
          "warning",
          "Recent session already exists for this template. Check your history.",
        );
      } else if (errorMessage === "Template not found") {
        showToast(
          "error",
          "This template is no longer available. Pick another template.",
        );
        void utils.templates.getAll.invalidate({ search: "", sort: "recent" });
      } else {
        showToast("error", "Error starting workout. Please try again.");
      }
    } finally {
      setIsStarting(false);
    }
  };

  if (templatesLoading) {
    return (
      <>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <Skeleton className="mb-4 h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
        {toastComponent}
      </>
    );
  }

  if (!templates?.length) {
    return (
      <>
        <div className="py-8 text-center sm:py-12">
          <div className="mb-4 text-4xl sm:text-6xl">📋</div>
          <h3 className="mb-2 text-lg font-semibold sm:text-xl">
            No templates available
          </h3>
          <p className="text-muted-foreground mb-6 px-4 text-sm sm:text-base">
            You need to create a workout template before you can start a workout
          </p>
          <Button asChild>
            <Link href="/templates/new">Create Your First Template</Link>
          </Button>
        </div>
        {toastComponent}
      </>
    );
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
      {/* Template Selection */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Select Workout Template</h2>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {strengthSuggestions.map((suggestion) => {
            const isActive = filters.search
              .toLowerCase()
              .includes(suggestion.searchTerm.toLowerCase());
            return (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleSuggestionSelect(suggestion)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isActive
                    ? "border-primary/60 bg-primary/10"
                    : "border-border/60 bg-surface-secondary hover:border-primary/30 hover:bg-surface-secondary/80",
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Recommended split
                </p>
                <p className="mt-1 text-sm font-semibold text-content-primary">
                  {suggestion.title}
                </p>
                <p className="mt-1 text-xs text-content-secondary">
                  {suggestion.description}
                </p>
                <span className="mt-3 inline-flex items-center text-[11px] font-semibold uppercase tracking-wide text-primary">
                  {isActive ? "Selected" : "Tap to focus"}
                </span>
              </button>
            );
          })}
        </div>
        <TemplateFilters
          value={filters}
          onChange={setFilters}
          className="mb-4"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const exercises = template.exercises ?? [];

            return (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplateId === template.id
                    ? "ring-primary shadow-md ring-2"
                    : "hover:ring-muted-foreground/20 hover:ring-1"
                }`}
                onClick={() => setSelectedTemplateId(template.id)}
              >
                <CardContent className="p-4">
                  <h3 className="mb-2 truncate text-sm font-semibold sm:text-base">
                    {template.name}
                  </h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    {exercises.length} exercise
                    {exercises.length !== 1 ? "s" : ""}
                  </p>
                  {exercises.length > 0 && (
                    <div className="text-muted-foreground mt-2 text-xs">
                      {exercises
                        .slice(0, 3)
                        .map((ex) => ex.exerciseName)
                        .join(", ")}
                      {exercises.length > 3 && "..."}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Selected Template & Actions */}
      {selectedTemplateId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Selected:{" "}
              {(() => {
                const template = filteredTemplates.find(
                  (t) => t.id === selectedTemplateId,
                );
                return template?.name;
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const template = filteredTemplates.find(
                (t) => t.id === selectedTemplateId,
              );
              const exercises = template?.exercises ?? [];
              return template ? (
                <>
                  <div>
                    <div className="text-muted-foreground text-xs sm:text-sm">
                      {exercises.length === 0 ? (
                        "No exercises in this template"
                      ) : (
                        <div className="space-y-1">
                          {(showFullExerciseList
                            ? exercises
                            : exercises.slice(0, 3)
                          ).map((exercise, index) => (
                            <div
                              key={exercise.id}
                              className="flex items-center"
                            >
                              <span className="bg-primary text-primary-foreground mr-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-6 sm:w-6">
                                {index + 1}
                              </span>
                              <span className="text-xs sm:text-sm">
                                {exercise.exerciseName}
                              </span>
                            </div>
                          ))}
                          {exercises.length > 3 && !showFullExerciseList && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => setShowFullExerciseList(true)}
                            >
                              Show {exercises.length - 3} more exercises...
                            </Button>
                          )}
                          {showFullExerciseList && exercises.length > 3 && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => setShowFullExerciseList(false)}
                            >
                              Show less
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date/Time Selection */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="workoutDate"
                      className="text-xs font-medium sm:text-sm"
                    >
                      Workout Date & Time
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const now = new Date();
                          const year = now.getFullYear();
                          const month = String(now.getMonth() + 1).padStart(
                            2,
                            "0",
                          );
                          const day = String(now.getDate()).padStart(2, "0");
                          const hours = String(now.getHours()).padStart(2, "0");
                          const minutes = String(now.getMinutes()).padStart(
                            2,
                            "0",
                          );
                          setWorkoutDate(
                            `${year}-${month}-${day}T${hours}:${minutes}`,
                          );
                        }}
                      >
                        Now
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const today = new Date();
                          const year = today.getFullYear();
                          const month = String(today.getMonth() + 1).padStart(
                            2,
                            "0",
                          );
                          const day = String(today.getDate()).padStart(2, "0");
                          setWorkoutDate(`${year}-${month}-${day}T09:00`);
                        }}
                      >
                        Today AM
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const today = new Date();
                          const year = today.getFullYear();
                          const month = String(today.getMonth() + 1).padStart(
                            2,
                            "0",
                          );
                          const day = String(today.getDate()).padStart(2, "0");
                          setWorkoutDate(`${year}-${month}-${day}T18:00`);
                        }}
                      >
                        Today PM
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          const year = yesterday.getFullYear();
                          const month = String(
                            yesterday.getMonth() + 1,
                          ).padStart(2, "0");
                          const day = String(yesterday.getDate()).padStart(
                            2,
                            "0",
                          );
                          setWorkoutDate(`${year}-${month}-${day}T18:00`);
                        }}
                      >
                        Yesterday
                      </Button>
                    </div>
                    <Input
                      type="datetime-local"
                      id="workoutDate"
                      value={workoutDate}
                      onChange={(e) => setWorkoutDate(e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>

                  {/* Sync Status */}
                  {(!isOnline || pendingOperations > 0 || failedOperations > 0) && (
                    <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-3 text-center shadow-sm backdrop-blur">
                      <Badge variant="secondary" className="text-xs">
                        {badgeText}
                      </Badge>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {!isOnline
                          ? description
                          : pendingOperations > 0
                            ? `${pendingOperations} change${pendingOperations === 1 ? "" : "s"} waiting to sync.`
                            : `${failedOperations} item${failedOperations === 1 ? "" : "s"} need attention. Tap sync to retry now.`}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 text-xs"
                        onClick={() => {
                          void manualSync();
                        }}
                        disabled={!isOnline || !canManualSync || syncBusy}
                      >
                        {syncBusy ? "Syncing…" : "Sync now"}
                      </Button>
                    </div>
                  )}

                  {/* Start Button */}
                  <Button
                    onClick={handleStart}
                    disabled={isStarting || createWorkoutMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {isStarting || createWorkoutMutation.isPending
                      ? "Starting..."
                      : "Start Workout"}
                  </Button>
                </>
              ) : null;
            })()}
          </CardContent>
        </Card>
      )}

      {/* No Selection State */}
      {!selectedTemplateId && (
        <div className="py-6 text-center sm:py-8">
          <p className="text-muted-foreground mb-4 text-sm sm:text-base">
            Select a workout template above or start freestyle
          </p>
          <Button
            onClick={handleStartFreestyle}
            disabled={isStarting || createWorkoutMutation.isPending}
            variant="outline"
            size="lg"
          >
            {isStarting || createWorkoutMutation.isPending
              ? "Starting..."
          : "Start Freestyle Workout"}
        </Button>
      </div>
      )}
      </div>
      {toastComponent}
    </>
  );
}
