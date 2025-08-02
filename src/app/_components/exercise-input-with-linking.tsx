"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";

interface ExerciseInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  templateExerciseId?: number; // For existing template exercises
  onLinkSuggestion?: (exerciseName: string, suggestions: SimilarExercise[]) => void;
}

interface SimilarExercise {
  id: number;
  name: string;
  similarity: number;
}

export function ExerciseInputWithLinking({ 
  value, 
  onChange, 
  placeholder, 
  className,
  templateExerciseId,
  onLinkSuggestion 
}: ExerciseInputProps) {
  const [suggestions, setSuggestions] = useState<SimilarExercise[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCheckingForSuggestions, setIsCheckingForSuggestions] = useState(false);
  const [linkingRejected, setLinkingRejected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const findSimilar = api.exercises.findSimilar.useQuery(
    { exerciseName: value },
    { 
      enabled: false // We'll trigger this manually
    }
  );

  const rejectLinking = api.exercises.rejectLinking.useMutation({
    onSuccess: () => {
      setLinkingRejected(true);
      setShowSuggestions(false);
      setSuggestions([]);
    },
  });

  // Check if this template exercise already has linking rejected
  const { data: isLinkingRejectedData } = api.exercises.isLinkingRejected.useQuery(
    { templateExerciseId: templateExerciseId! },
    { enabled: !!templateExerciseId }
  );

  // Initialize linkingRejected state for existing exercises
  useEffect(() => {
    if (isLinkingRejectedData) {
      setLinkingRejected(isLinkingRejectedData);
    }
  }, [isLinkingRejectedData]);

  // Check for similar exercises when the user stops typing
  useEffect(() => {
    if (value.trim().length < 2 || linkingRejected) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      if (value.trim()) {
        setIsCheckingForSuggestions(true);
        void findSimilar.refetch().then((result) => {
          if (result.data && result.data.length > 0) {
            // Check if there's an exact match (100% similarity or exact name match)
            const normalizedInput = value.toLowerCase().trim().replace(/\s+/g, ' ');
            const exactMatch = result.data.find(suggestion => 
              suggestion.similarity === 1 || 
              suggestion.name.toLowerCase().trim().replace(/\s+/g, ' ') === normalizedInput
            );
            
            if (exactMatch) {
              // If there's an exact match, don't show suggestions
              setSuggestions([]);
              setShowSuggestions(false);
            } else {
              // Only show suggestions for non-exact matches
              setSuggestions(result.data);
              setShowSuggestions(true);
              onLinkSuggestion?.(value, result.data);
            }
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
          setIsCheckingForSuggestions(false);
        });
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [value, findSimilar, onLinkSuggestion, linkingRejected]);

  // Handle clicking outside to dismiss suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSuggestions([]);
      }
    }

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSuggestions]);

  const handleSuggestionSelect = (suggestion: SimilarExercise) => {
    onChange(suggestion.name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleRejectLinking = () => {
    if (templateExerciseId) {
      rejectLinking.mutate({ templateExerciseId });
    } else {
      // For new exercises (no templateExerciseId), just dismiss and mark as rejected locally
      setLinkingRejected(true);
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          // Small delay to allow suggestion clicks to register
          setTimeout(() => {
            setShowSuggestions(false);
            setSuggestions([]);
          }, 200);
        }}
        placeholder={placeholder}
        className={className}
      />
      
      {linkingRejected && (
        <div className="mt-1 flex items-center gap-2 text-xs text-orange-400">
          <span>🔗</span>
          <span>Not linked - will create as new exercise</span>
        </div>
      )}
      
      {isCheckingForSuggestions && (
        <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 p-2 text-sm text-gray-400">
          Checking for similar exercises...
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 shadow-lg">
          <div className="border-b border-gray-700 p-3">
            <div className="mb-2 text-sm font-medium text-yellow-400">
              🔗 Similar exercises found
            </div>
            <div className="text-xs text-gray-400">
              Link to existing exercise to track progress across templates
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {suggestions.map((suggestion) => (
            <button
            key={suggestion.id}
            onClick={() => handleSuggestionSelect(suggestion)}
            className="w-full p-3 text-left transition-colors hover:bg-gray-700"
            >
            <div className="flex items-center justify-between">
            <span className="font-medium">{suggestion.name}</span>
            <span className="text-xs text-green-400">
            {Math.round(suggestion.similarity * 100)}% match
            </span>
            </div>
            </button>
            ))}
          </div>
          
          <div className="border-t border-gray-700 p-3">
            <button
              onClick={handleRejectLinking}
              disabled={rejectLinking.isPending}
              className="w-full rounded bg-gray-700 py-2 text-sm transition-colors hover:bg-gray-600 disabled:opacity-50"
            >
              {rejectLinking.isPending 
                ? "Saving..." 
                : `Keep as "${value}" (new exercise)`
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
