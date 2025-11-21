"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

interface ExerciseLinkingPreviewProps {
  exercises: { exerciseName: string }[];
  onDecisionsChange?: (decisions: LinkDecision[]) => void;
}

export type LinkDecision = {
  exerciseName: string;
  status: "pending" | "accepted" | "rejected" | "skipped";
  linkedExerciseId?: number;
  linkedExerciseName?: string;
  matchScore?: number;
};

type SearchResult = {
  id: number;
  name: string;
  normalizedName: string;
  createdAt: string;
};

type SearchResponse = {
  items: SearchResult[];
};

export function ExerciseLinkingPreview({
  exercises,
  onDecisionsChange,
}: ExerciseLinkingPreviewProps) {
  const [linkDecisions, setLinkDecisions] = useState<LinkDecision[]>([]);
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);

  // Initialize link decisions for each exercise
  // Use a ref to track if we've initialized to prevent infinite loops
  const initializedRef = useRef(false);
  const exercisesKeyRef = useRef<string>("");

  useEffect(() => {
    // Create a stable key based on exercise names
    const exercisesKey = exercises.map((ex) => ex.exerciseName).join("|");

    // Only update if exercises actually changed
    if (exercisesKeyRef.current !== exercisesKey) {
      exercisesKeyRef.current = exercisesKey;
      const newDecisions = exercises.map(
        (ex): LinkDecision => ({
          exerciseName: ex.exerciseName,
          status: "pending",
        }),
      );
      setLinkDecisions(newDecisions);
      onDecisionsChange?.(newDecisions);
    }
  }, [exercises, onDecisionsChange]);

  if (exercises.length === 0) {
    return null;
  }

  return (
    <Card padding="lg" className="space-y-4">
      <div>
        <h4 className="mb-1 text-sm font-medium">Exercise Linking</h4>
        <p className="text-muted-foreground text-xs">
          Link your exercises to existing ones to track progress across workouts
        </p>
      </div>

      <div className="space-y-3">
        {exercises.map((exercise, index) => {
          const rowProps: any = {
            exercise,
            onDecisionChange: (newDecision: LinkDecision) => {
              setLinkDecisions((prev) => {
                const updated = [...prev];
                updated[index] = newDecision;
                onDecisionsChange?.(updated);
                return updated;
              });
            },
            isSearching: searchingIndex === index,
            onSearchStart: () => setSearchingIndex(index),
            onSearchEnd: () => setSearchingIndex(null),
          };

          if (linkDecisions[index] !== undefined) {
            rowProps.decision = linkDecisions[index];
          }

          return <ExerciseLinkRow key={index} {...rowProps} />;
        })}
      </div>
    </Card>
  );
}

interface ExerciseLinkRowProps {
  exercise: { exerciseName: string };
  decision?: LinkDecision;
  onDecisionChange: (decision: LinkDecision) => void;
  isSearching: boolean;
  onSearchStart: () => void;
  onSearchEnd: () => void;
}

function ExerciseLinkRow({
  exercise,
  decision,
  onDecisionChange,
  isSearching,
  onSearchStart,
  onSearchEnd,
}: ExerciseLinkRowProps) {
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Search for matching exercises (exact match like backend)
  const { data: searchResults, isLoading: isSearchLoading } =
    api.exercises.searchMaster.useQuery(
      { q: exercise.exerciseName, limit: 5 },
      {
        enabled: true,
        staleTime: 30_000,
      },
    );

  // Type assertion to help TypeScript understand the return type
  const typedSearchResults = searchResults as
    | {
        items: Array<{
          id: number;
          name: string;
          normalizedName: string;
          createdAt: string;
        }>;
        nextCursor: string | null;
      }
    | undefined;

  const topMatch =
    typedSearchResults?.items && typedSearchResults.items.length > 0
      ? typedSearchResults.items[0]
      : null;

  const hasExactMatch =
    topMatch &&
    topMatch.name.toLowerCase() === exercise.exerciseName.toLowerCase();

  const handleAccept = () => {
    if (topMatch) {
      onDecisionChange({
        exerciseName: exercise.exerciseName,
        status: "accepted",
        linkedExerciseId: topMatch.id,
        linkedExerciseName: topMatch.name,
      });
    }
  };

  const handleReject = () => {
    onDecisionChange({
      exerciseName: exercise.exerciseName,
      status: "rejected",
    });
  };

  const handleSkip = () => {
    onDecisionChange({
      exerciseName: exercise.exerciseName,
      status: "skipped",
    });
  };

  const handleSearch = () => {
    setShowSearchResults(true);
    onSearchStart();
  };

  const handleSelectFromSearch = (selectedExercise: SearchResult) => {
    onDecisionChange({
      exerciseName: exercise.exerciseName,
      status: "accepted",
      linkedExerciseId: selectedExercise.id,
      linkedExerciseName: selectedExercise.name,
    });
    setShowSearchResults(false);
    onSearchEnd();
  };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium">{exercise.exerciseName}</div>
          {isSearchLoading && (
            <div className="mt-1">
              <Skeleton className="h-3 w-48" />
            </div>
          )}
          {!isSearchLoading && topMatch && decision?.status === "pending" && (
            <div className="text-muted-foreground mt-1 text-xs">
              {hasExactMatch ? (
                <span className="text-green-600 dark:text-green-400">
                  ✓ Exact match found: <strong>{topMatch.name}</strong>
                </span>
              ) : (
                <span>
                  Similar: <strong>{topMatch.name}</strong>
                </span>
              )}
            </div>
          )}
          {!isSearchLoading && !topMatch && decision?.status === "pending" && (
            <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              ⚠ No matches found - will create new exercise
            </div>
          )}
          {decision?.status === "accepted" && (
            <div className="mt-1 text-xs text-green-600 dark:text-green-400">
              ✓ Will link to: <strong>{decision.linkedExerciseName}</strong>
            </div>
          )}
          {decision?.status === "rejected" && (
            <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              ⚠ Will create as new exercise
            </div>
          )}
          {decision?.status === "skipped" && (
            <div className="text-muted-foreground mt-1 text-xs">
              ➡️ Auto-link on save (recommended)
            </div>
          )}
        </div>

        {decision?.status === "pending" && (
          <div className="ml-2 flex gap-1">
            {topMatch && (
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={handleAccept}
                disabled={isSearchLoading}
              >
                Link
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSearch}
              disabled={isSearchLoading}
            >
              Search
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleSkip}
              disabled={isSearchLoading}
            >
              Skip
            </Button>
          </div>
        )}

        {decision?.status !== "pending" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              onDecisionChange({
                exerciseName: exercise.exerciseName,
                status: "pending",
              })
            }
          >
            Change
          </Button>
        )}
      </div>

      {/* Search Results Modal */}
      {showSearchResults && (
        <div className="bg-muted/50 mt-2 rounded border p-3">
          <div className="mb-2 flex items-center justify-between">
            <h5 className="text-xs font-medium">Search Results</h5>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowSearchResults(false);
                onSearchEnd();
              }}
              className="h-6 text-xs"
            >
              Close
            </Button>
          </div>

          {isSearchLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : typedSearchResults?.items &&
            typedSearchResults.items.length > 0 ? (
            <div className="space-y-1">
              {typedSearchResults.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectFromSearch(item)}
                  className="hover:bg-background flex w-full items-center justify-between rounded p-2 text-left text-xs transition-colors"
                >
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">ID: {item.id}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-2 text-xs">
              No results found
            </div>
          )}

          <div className="mt-2 border-t pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleReject}
              className="w-full text-xs"
            >
              Don't link - create new exercise
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
