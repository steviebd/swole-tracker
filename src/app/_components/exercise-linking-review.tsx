"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, X, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

interface MasterExercise {
  id: number;
  user_id: string;
  name: string;
  normalizedName: string;
  tags: string | null;
  muscleGroup: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

interface TemplateExercise {
  name: string;
  tempId: string;
}

interface ExerciseLinkingReviewProps {
  templateName: string;
  exercises: TemplateExercise[];
  onDecisionsChange?: (linkingDecisions: Record<string, string>) => void;
}

interface FuzzyMatch {
  masterExercise: MasterExercise;
  score: number;
  matchType: "exact" | "high" | "medium" | "low";
}

interface ExerciseDecision {
  tempId: string;
  selectedMasterId: string | null; // null means create new
  topMatches: FuzzyMatch[];
  autoSelected: boolean;
}

// Levenshtein distance for typo detection
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0]![j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1,     // insertion
          matrix[i - 1]![j]! + 1,     // deletion
        );
      }
    }
  }

  return matrix[str2.length]![str1.length]!;
}

// Fuzzy matching utility - calculates similarity score
function calculateSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
  const normalized1 = normalize(str1);
  const normalized2 = normalize(str2);

  // Exact match
  if (normalized1 === normalized2) return 1.0;

  // Contains match (substring)
  if (
    normalized1.includes(normalized2) ||
    normalized2.includes(normalized1)
  ) {
    const minLen = Math.min(normalized1.length, normalized2.length);
    const maxLen = Math.max(normalized1.length, normalized2.length);
    return 0.6 + (minLen / maxLen) * 0.3; // 60-90% range
  }

  // Edit distance for typo detection (handles "squat" vs "squt")
  const maxLen = Math.max(normalized1.length, normalized2.length);
  const editDistance = levenshteinDistance(normalized1, normalized2);
  const editSimilarity = 1 - editDistance / maxLen;

  // If edit similarity is high enough, use it (typo tolerance)
  if (editSimilarity >= 0.7) {
    return editSimilarity; // 70-100% range for close typos
  }

  // Word-based matching for multi-word exercises
  const words1 = normalized1.split(" ");
  const words2 = normalized2.split(" ");
  const commonWords = words1.filter((w) => words2.includes(w));
  const wordOverlap = commonWords.length / Math.max(words1.length, words2.length);

  if (wordOverlap > 0) {
    return wordOverlap * 0.7; // 0-70% range
  }

  // If no word overlap, check if individual words have typos
  // This handles "bench press" vs "bench pres" (typo in second word)
  let bestWordSimilarity = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1.length > 2 && word2.length > 2) {
        const wordEditDist = levenshteinDistance(word1, word2);
        const wordMaxLen = Math.max(word1.length, word2.length);
        const wordSim = 1 - wordEditDist / wordMaxLen;
        if (wordSim > bestWordSimilarity) {
          bestWordSimilarity = wordSim;
        }
      }
    }
  }

  if (bestWordSimilarity >= 0.7) {
    return bestWordSimilarity * 0.8; // Scale down multi-word typos slightly
  }

  return 0;
}

function getMatchType(score: number): "exact" | "high" | "medium" | "low" {
  if (score >= 0.95) return "exact";
  if (score >= 0.7) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function getMatchColor(matchType: "exact" | "high" | "medium" | "low" | null) {
  switch (matchType) {
    case "exact":
      return "bg-green-50 border-green-300 text-green-900 hover:bg-green-100";
    case "high":
      return "bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100";
    case "medium":
      return "bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100";
    case "low":
      return "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100";
    default:
      return "bg-muted border-border hover:bg-muted/80";
  }
}

function getMatchBadgeColor(matchType: "exact" | "high" | "medium" | "low") {
  switch (matchType) {
    case "exact":
      return "bg-green-100 text-green-800 border-green-300";
    case "high":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "medium":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "low":
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

export function ExerciseLinkingReview({
  templateName,
  exercises,
  onDecisionsChange,
}: ExerciseLinkingReviewProps) {
  const [decisions, setDecisions] = useState<Record<string, ExerciseDecision>>(
    {},
  );

  // Fetch master exercises
  const { data: masterExercises = [], isLoading } =
    api.exercises.getAllMaster.useQuery() as {
      data: MasterExercise[];
      isLoading: boolean;
    };

  // Calculate fuzzy matches and auto-select on initial load
  useEffect(() => {
    if (masterExercises.length === 0 || Object.keys(decisions).length > 0)
      return;

    const initialDecisions: Record<string, ExerciseDecision> = {};

    exercises.forEach((templateExercise) => {
      // Calculate similarity scores for all master exercises
      const matches: FuzzyMatch[] = masterExercises
        .map((masterExercise) => {
          const score = calculateSimilarity(
            templateExercise.name,
            masterExercise.name,
          );
          const matchType = getMatchType(score);

          return {
            masterExercise,
            score,
            matchType,
          };
        })
        .filter((match) => match.score >= 0.5) // Only show matches >= 50%
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // Top 5 matches

      const bestMatch = matches[0];
      const shouldAutoSelect = bestMatch && bestMatch.score >= 0.5;

      initialDecisions[templateExercise.tempId] = {
        tempId: templateExercise.tempId,
        selectedMasterId: shouldAutoSelect
          ? bestMatch.masterExercise.id.toString()
          : null,
        topMatches: matches,
        autoSelected: shouldAutoSelect || false,
      };
    });

    setDecisions(initialDecisions);
    // Only run on initial load when decisions is empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, masterExercises]);

  // Notify parent when decisions change
  useEffect(() => {
    if (Object.keys(decisions).length === 0 || !onDecisionsChange) return;

    const linkingDecisions: Record<string, string> = {};
    Object.entries(decisions).forEach(([tempId, decision]) => {
      if (decision.selectedMasterId) {
        linkingDecisions[tempId] = decision.selectedMasterId;
      }
    });

    onDecisionsChange(linkingDecisions);
  }, [decisions, onDecisionsChange]);

  const selectMaster = (tempId: string, masterId: string) => {
    setDecisions((prev) => ({
      ...prev,
      [tempId]: {
        ...prev[tempId]!,
        selectedMasterId: masterId,
        autoSelected: false,
      },
    }));
  };

  const createNew = (tempId: string) => {
    setDecisions((prev) => ({
      ...prev,
      [tempId]: {
        ...prev[tempId]!,
        selectedMasterId: null,
        autoSelected: false,
      },
    }));
  };

  // Summary stats
  const summary = useMemo(() => {
    const total = exercises.length;
    const linked = Object.values(decisions).filter(
      (d) => d.selectedMasterId !== null,
    ).length;
    const creating = total - linked;
    const autoLinked = Object.values(decisions).filter(
      (d) => d.autoSelected && d.selectedMasterId !== null,
    ).length;

    return { total, linked, creating, autoLinked };
  }, [decisions, exercises.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading exercises...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Link Exercises</h2>
        <p className="text-muted-foreground">
          We found similar exercises in your library. Review and adjust the
          matches or create new exercises.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-4">
        <div className="flex gap-6">
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              Total Exercises
            </div>
            <div className="text-2xl font-bold">{summary.total}</div>
          </div>
          <div className="border-l pl-6">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              Auto-Linked
            </div>
            <div className="text-2xl font-bold text-green-600">
              {summary.autoLinked}
            </div>
          </div>
          <div className="border-l pl-6">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              Will Link
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {summary.linked}
            </div>
          </div>
          <div className="border-l pl-6">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              Creating New
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {summary.creating}
            </div>
          </div>
        </div>
      </div>

      {/* Exercise List */}
      <div className="space-y-4">
        {exercises.map((templateExercise) => {
          const decision = decisions[templateExercise.tempId];
          if (!decision) return null;

          const isCreatingNew = decision.selectedMasterId === null;
          const selectedMatch = decision.topMatches.find(
            (m) => m.masterExercise.id.toString() === decision.selectedMasterId,
          );

          return (
            <motion.div
              key={templateExercise.tempId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border p-4"
            >
              {/* Exercise Header */}
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold">
                    {templateExercise.name}
                    {decision.autoSelected && decision.selectedMasterId && (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-xs text-green-700 border-green-300"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Auto-matched
                      </Badge>
                    )}
                  </h3>
                  {isCreatingNew ? (
                    <p className="text-muted-foreground mt-1 text-sm">
                      Will create as new master exercise
                    </p>
                  ) : (
                    selectedMatch && (
                      <p className="text-muted-foreground mt-1 text-sm">
                        Linking to:{" "}
                        <span className="font-medium text-foreground">
                          {selectedMatch.masterExercise.name}
                        </span>{" "}
                        ({Math.round(selectedMatch.score * 100)}% match)
                      </p>
                    )
                  )}
                </div>
              </div>

              {/* Suggestions */}
              {decision.topMatches.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {isCreatingNew
                      ? "Available matches (click to link instead)"
                      : "Top matches"}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {decision.topMatches.map((match) => {
                      const isSelected =
                        decision.selectedMasterId ===
                        match.masterExercise.id.toString();

                      return (
                        <button
                          key={match.masterExercise.id}
                          type="button"
                          onClick={() =>
                            selectMaster(
                              templateExercise.tempId,
                              match.masterExercise.id.toString(),
                            )
                          }
                          className={cn(
                            "relative flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : getMatchColor(match.matchType),
                          )}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {match.masterExercise.name}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  getMatchBadgeColor(match.matchType),
                                )}
                              >
                                {Math.round(match.score * 100)}%
                              </Badge>
                            </div>
                            {match.masterExercise.muscleGroup && (
                              <p className="text-muted-foreground mt-1 text-xs">
                                {match.masterExercise.muscleGroup}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="text-primary h-5 w-5 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm">
                  <AlertCircle className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">
                    No similar exercises found - will create as new
                  </span>
                </div>
              )}

              {/* Create New Button */}
              <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
                {!isCreatingNew && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => createNew(templateExercise.tempId)}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Create New Instead
                  </Button>
                )}
                {isCreatingNew && decision.topMatches.length > 0 && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Creating new master exercise
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
