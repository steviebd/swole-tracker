"use client";

import { useState } from "react";
import { Brain, Check, X, Target, TrendingUp } from "lucide-react";
import { cn } from "~/lib/utils";
import type { SetData } from "./set-input";
import { useMutation } from "convex/react";
import { api } from "~/convex/_generated/api";
import type { Id } from "~/convex/_generated/dataModel";

interface AISuggestion {
  setIndex: number;
  suggestedWeight?: number;
  suggestedReps?: number;
  suggestedRestSeconds?: number;
  rationale: string;
  confidence: number; // 0-1 scale
  progressionType?: string;
  plateauDetected: boolean;
}

interface AISuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  exerciseIndex: number;
  currentSets: SetData[];
  sessionId: Id<"workoutSessions">;
  onAcceptSuggestion: (setIndex: number, suggestion: AISuggestion) => void;
  onRejectSuggestion: (setIndex: number) => void;
}

export function AISuggestionsModal({
  isOpen,
  onClose,
  exerciseName,
  exerciseIndex,
  currentSets,
  sessionId,
  onAcceptSuggestion,
  onRejectSuggestion,
}: AISuggestionsModalProps) {
  const [interactionStartTime] = useState(Date.now());
  
  // Track suggestion interactions
  const recordInteraction = useMutation(api.suggestions.recordInteraction);

  // Generate mock AI suggestions based on current sets
  const generateMockSuggestions = (): AISuggestion[] => {
    const suggestions: AISuggestion[] = [];
    
    currentSets.forEach((set, index) => {
      const previousSet = currentSets[index - 1];
      const hasData = !!(set.weight || set.reps);
      
      // Only suggest for empty sets or provide improvements
      if (!hasData || (set.weight && set.reps && Math.random() > 0.7)) {
        let suggestedWeight = set.weight;
        let suggestedReps = set.reps;
        let rationale = "";
        let confidence = 0.8;
        let progressionType = "maintain";
        
        if (!hasData) {
          // Empty set - predict based on previous set or typical values
          if (previousSet?.weight && previousSet?.reps) {
            suggestedWeight = previousSet.weight;
            suggestedReps = Math.max(previousSet.reps - 1, 1); // Typical drop-off
            rationale = "Based on previous set with typical rep drop-off";
            confidence = 0.85;
            progressionType = "pattern";
          } else {
            // First set - use conservative estimates
            suggestedWeight = 20; // Conservative start
            suggestedReps = 8;
            rationale = "Conservative starting recommendation";
            confidence = 0.6;
            progressionType = "conservative";
          }
        } else {
          // Has data - suggest improvements
          if (set.reps && set.reps >= 12) {
            suggestedWeight = (set.weight || 0) + 2.5;
            suggestedReps = 8;
            rationale = "High reps detected - try increasing weight";
            confidence = 0.9;
            progressionType = "weight";
          } else if (set.reps && set.reps <= 5) {
            suggestedWeight = set.weight;
            suggestedReps = set.reps + 1;
            rationale = "Low reps - try adding one more rep";
            confidence = 0.75;
            progressionType = "reps";
          }
        }
        
        suggestions.push({
          setIndex: index,
          suggestedWeight,
          suggestedReps,
          suggestedRestSeconds: 60,
          rationale,
          confidence,
          progressionType,
          plateauDetected: false,
        });
      }
    });
    
    return suggestions;
  };

  const suggestions = generateMockSuggestions();

  const handleAccept = async (suggestion: AISuggestion) => {
    try {
      await recordInteraction({
        sessionId,
        exerciseName,
        setId: currentSets[suggestion.setIndex]?.id || `set-${suggestion.setIndex}`,
        setIndex: suggestion.setIndex,
        suggestedWeightKg: suggestion.suggestedWeight,
        suggestedReps: suggestion.suggestedReps,
        suggestedRestSeconds: suggestion.suggestedRestSeconds,
        suggestionRationale: suggestion.rationale,
        action: "accepted",
        acceptedWeightKg: suggestion.suggestedWeight,
        acceptedReps: suggestion.suggestedReps,
        progressionType: suggestion.progressionType,
        readinessScore: suggestion.confidence,
        plateauDetected: suggestion.plateauDetected,
        interactionTimeMs: Date.now() - interactionStartTime,
      });
      
      onAcceptSuggestion(suggestion.setIndex, suggestion);
    } catch (error) {
      console.error("Failed to record suggestion acceptance:", error);
      // Still apply the suggestion even if tracking fails
      onAcceptSuggestion(suggestion.setIndex, suggestion);
    }
  };

  const handleReject = async (suggestion: AISuggestion) => {
    try {
      await recordInteraction({
        sessionId,
        exerciseName,
        setId: currentSets[suggestion.setIndex]?.id || `set-${suggestion.setIndex}`,
        setIndex: suggestion.setIndex,
        suggestedWeightKg: suggestion.suggestedWeight,
        suggestedReps: suggestion.suggestedReps,
        suggestedRestSeconds: suggestion.suggestedRestSeconds,
        suggestionRationale: suggestion.rationale,
        action: "rejected",
        progressionType: suggestion.progressionType,
        readinessScore: suggestion.confidence,
        plateauDetected: suggestion.plateauDetected,
        interactionTimeMs: Date.now() - interactionStartTime,
      });
      
      onRejectSuggestion(suggestion.setIndex);
    } catch (error) {
      console.error("Failed to record suggestion rejection:", error);
      onRejectSuggestion(suggestion.setIndex);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300",
          "bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl",
          "max-h-[80vh] overflow-hidden",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="px-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900">
                <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  AI Suggestions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  For {exerciseName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {suggestions.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Looking good!
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Your current sets are well-structured. Keep up the great work!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Based on your workout history and current performance, here are some suggestions:
              </p>
              
              {suggestions.map((suggestion) => {
                const currentSet = currentSets[suggestion.setIndex];
                const hasCurrentData = !!(currentSet?.weight || currentSet?.reps);
                
                return (
                  <div
                    key={suggestion.setIndex}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    {/* Set Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-semibold">
                          {suggestion.setIndex + 1}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          Set {suggestion.setIndex + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-500" />
                        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                    
                    {/* Current vs Suggested */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current</div>
                        <div className="text-sm font-medium">
                          {hasCurrentData ? (
                            <>
                              {currentSet.weight && `${currentSet.weight}kg`}
                              {currentSet.weight && currentSet.reps && " × "}
                              {currentSet.reps && `${currentSet.reps} reps`}
                              {!currentSet.weight && !currentSet.reps && "Empty"}
                            </>
                          ) : (
                            <span className="text-gray-400">Empty</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Suggested</div>
                        <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                          {suggestion.suggestedWeight && `${suggestion.suggestedWeight}kg`}
                          {suggestion.suggestedWeight && suggestion.suggestedReps && " × "}
                          {suggestion.suggestedReps && `${suggestion.suggestedReps} reps`}
                        </div>
                      </div>
                    </div>
                    
                    {/* Rationale */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        "{suggestion.rationale}"
                      </p>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAccept(suggestion)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(suggestion)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium"
                      >
                        <X className="w-4 h-4" />
                        Skip
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        {suggestions.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Suggestions based on your workout history
              </p>
              <button
                onClick={onClose}
                className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}