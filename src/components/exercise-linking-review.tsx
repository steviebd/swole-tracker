"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useAllMasterExercises } from "~/lib/queries/exercises";

export interface MasterExercise {
  id: number;
  name: string;
  normalizedName: string;
  tags: string | null;
  muscleGroup: string | null;
  createdAt: Date;
}

export interface TemplateExercise {
  name: string;
  tempId: string;
}

interface ExerciseLinkingReviewProps {
  templateName: string;
  exercises: TemplateExercise[];
  onDecisionsChange: (decisions: Record<string, string | null>) => void;
  className?: string;
}

interface LinkingDecision {
  tempId: string;
  exerciseName: string;
  selectedMasterId: string | null;
  matchQuality: number;
  isExactMatch: boolean;
}

export function ExerciseLinkingReview({
  templateName,
  exercises,
  onDecisionsChange,
  className,
}: ExerciseLinkingReviewProps) {
  const { data: masterExercisesData, isLoading } = useAllMasterExercises(
    100,
    0,
  );
  const masterExercises: MasterExercise[] = masterExercisesData || [];
  const [decisions, setDecisions] = useState<Record<string, string | null>>({});

  const linkingResults = useMemo((): LinkingDecision[] => {
    return exercises.map((ex) => {
      const normalizedInput = ex.name.toLowerCase().trim();
      const exactMatch = masterExercises.find(
        (m) =>
          m.normalizedName === normalizedInput ||
          m.name.toLowerCase() === normalizedInput,
      );

      if (exactMatch) {
        return {
          tempId: ex.tempId,
          exerciseName: ex.name,
          selectedMasterId: String(exactMatch.id),
          matchQuality: 100,
          isExactMatch: true,
        };
      }

      const similarMatches = masterExercises
        .map((m) => {
          const similarity = calculateSimilarity(
            normalizedInput,
            m.normalizedName,
          );
          return { exercise: m, similarity };
        })
        .filter((m) => m.similarity > 0.5)
        .sort((a, b) => b.similarity - a.similarity);

      const bestMatch = similarMatches[0];
      return {
        tempId: ex.tempId,
        exerciseName: ex.name,
        selectedMasterId: bestMatch ? String(bestMatch.exercise.id) : null,
        matchQuality: bestMatch ? Math.round(bestMatch.similarity * 100) : 0,
        isExactMatch: false,
      };
    });
  }, [exercises, masterExercises]);

  useEffect(() => {
    const initialDecisions: Record<string, string | null> = {};
    linkingResults.forEach((result) => {
      if (result.matchQuality >= 80) {
        initialDecisions[result.tempId] = result.selectedMasterId;
      } else {
        initialDecisions[result.tempId] = null;
      }
    });
    setDecisions(initialDecisions);
    onDecisionsChange(initialDecisions);
  }, [linkingResults, onDecisionsChange]);

  const stats = useMemo(() => {
    const total = exercises.length;
    const autoLinked = linkingResults.filter(
      (r) => r.matchQuality >= 80 && r.selectedMasterId,
    ).length;
    const needsReview = linkingResults.filter(
      (r) => r.matchQuality < 80 || r.matchQuality >= 80,
    ).length;
    const creatingNew = linkingResults.filter(
      (r) => !r.selectedMasterId,
    ).length;

    return { total, autoLinked, needsReview, creatingNew };
  }, [exercises, linkingResults]);

  const handleMasterSelect = (tempId: string, masterId: string | null) => {
    const newDecisions = { ...decisions, [tempId]: masterId };
    setDecisions(newDecisions);
    onDecisionsChange(newDecisions);
  };

  const handleAcceptAll = () => {
    const newDecisions: Record<string, string | null> = {};
    linkingResults.forEach((result) => {
      if (result.selectedMasterId) {
        newDecisions[result.tempId] = result.selectedMasterId;
      }
    });
    setDecisions(newDecisions);
    onDecisionsChange(newDecisions);
  };

  const handleCreateNewForAll = () => {
    const newDecisions: Record<string, string | null> = {};
    linkingResults.forEach((result) => {
      newDecisions[result.tempId] = null;
    });
    setDecisions(newDecisions);
    onDecisionsChange(newDecisions);
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="py-12 text-center">
          <div className="animate-pulse space-y-4">
            <div className="bg-muted mx-auto h-4 w-1/3 rounded"></div>
            <div className="bg-muted mx-auto h-4 w-1/4 rounded"></div>
          </div>
          <p className="text-muted-foreground mt-4">Loading exercises...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Smart Linking Results</span>
          <span className="text-muted-foreground text-sm font-normal">
            {templateName}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-muted-foreground text-xs">Total Exercises</div>
          </div>
          <div className="bg-success/10 border-success/20 rounded-lg border p-4 text-center">
            <div className="text-success text-2xl font-bold">
              {stats.autoLinked}
            </div>
            <div className="text-muted-foreground text-xs">Auto-Linked</div>
          </div>
          <div className="bg-warning/10 border-warning/20 rounded-lg border p-4 text-center">
            <div className="text-warning text-2xl font-bold">
              {stats.needsReview}
            </div>
            <div className="text-muted-foreground text-xs">Need Review</div>
          </div>
          <div className="bg-info/10 border-info/20 rounded-lg border p-4 text-center">
            <div className="text-info text-2xl font-bold">
              {stats.creatingNew}
            </div>
            <div className="text-muted-foreground text-xs">Creating New</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleAcceptAll}>
            Accept All Auto-Links
          </Button>
          <Button variant="outline" size="sm" onClick={handleCreateNewForAll}>
            Create New for Unmatched
          </Button>
        </div>

        <div className="space-y-4">
          {linkingResults.map((result) => {
            const selectedMaster = masterExercises.find(
              (m) => String(m.id) === decisions[result.tempId],
            );

            return (
              <div
                key={result.tempId}
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  decisions[result.tempId]
                    ? "border-success/30 bg-success/5"
                    : "border-warning/30 bg-warning/5",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-medium">{result.exerciseName}</div>
                    {decisions[result.tempId] ? (
                      <div className="text-muted-foreground mt-1 text-sm">
                        Linking to:{" "}
                        <span className="text-foreground font-medium">
                          {selectedMaster?.name}
                        </span>
                        {result.isExactMatch ? (
                          <Badge variant="default" className="ml-2">
                            Exact match
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="ml-2">
                            {result.matchQuality}% match
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="text-warning mt-1 text-sm">
                        No similar exercises found - will create as new
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {decisions[result.tempId] ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMasterSelect(result.tempId, null)}
                      >
                        Create New Instead
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          const bestMatch = masterExercises.find(
                            (m) => String(m.id) === result.selectedMasterId,
                          );
                          if (bestMatch) {
                            handleMasterSelect(
                              result.tempId,
                              String(bestMatch.id),
                            );
                          }
                        }}
                      >
                        Link to {result.exerciseName}
                      </Button>
                    )}
                  </div>
                </div>

                {!decisions[result.tempId] && (
                  <div className="border-border/50 mt-3 border-t pt-3">
                    <div className="text-muted-foreground mb-2 text-xs">
                      Select a master exercise:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {masterExercises.slice(0, 6).map((master) => {
                        const similarity = calculateSimilarity(
                          result.exerciseName.toLowerCase(),
                          master.normalizedName,
                        );
                        const isSelected =
                          decisions[result.tempId] === String(master.id);

                        return (
                          <button
                            key={master.id}
                            onClick={() =>
                              handleMasterSelect(
                                result.tempId,
                                String(master.id),
                              )
                            }
                            className={cn(
                              "rounded-md border px-3 py-1.5 text-sm transition-all",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-surface-base hover:bg-surface-hover border-border",
                            )}
                          >
                            {master.name}
                            {similarity < 1 && similarity > 0.5 && (
                              <span className="ml-1 text-xs opacity-70">
                                {Math.round(similarity * 100)}%
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);

  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matches++;
        break;
      }
    }
  }

  return matches / Math.max(words1.length, words2.length);
}
