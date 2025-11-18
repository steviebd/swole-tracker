"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Zap, Plus, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { WarmupSetInput, type WarmupSetData } from "./WarmupSetInput";
import { cn } from "~/lib/utils";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

interface WarmupSectionProps {
  exerciseName: string;
  warmupSets: WarmupSetData[];
  workingWeight?: number;
  weightUnit: "kg" | "lbs";
  onUpdate: (sets: WarmupSetData[]) => void;
  onAutoFill: () => void;
  suggestedSets?: WarmupSetData[]; // From AI/pattern detection
  className?: string;
}

export function WarmupSection({
  exerciseName,
  warmupSets,
  workingWeight,
  weightUnit,
  onUpdate,
  onAutoFill,
  suggestedSets,
  className,
}: WarmupSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(
    !!suggestedSets && warmupSets.length === 0,
  );
  const prefersReducedMotion = useReducedMotion();

  const handleUpdateSet = (index: number, updates: Partial<WarmupSetData>) => {
    const updated = [...warmupSets];
    updated[index] = { ...updated[index]!, ...updates };
    onUpdate(updated);
  };

  const handleDeleteSet = (index: number) => {
    const updated = warmupSets.filter((_, i) => i !== index);
    // Renumber sets
    const renumbered = updated.map((set, i) => ({ ...set, setNumber: i + 1 }));
    onUpdate(renumbered);
  };

  const handleMoveSet = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= warmupSets.length) return;

    const updated = [...warmupSets];
    [updated[index], updated[newIndex]] = [updated[newIndex]!, updated[index]!];

    // Renumber
    const renumbered = updated.map((set, i) => ({ ...set, setNumber: i + 1 }));
    onUpdate(renumbered);
  };

  const handleAddSet = () => {
    const newSet: WarmupSetData = {
      setNumber: warmupSets.length + 1,
      weight: 0,
      reps: 5,
    };
    onUpdate([...warmupSets, newSet]);
    setIsExpanded(true); // Auto-expand when adding a set
  };

  const handleApplySuggestion = () => {
    if (suggestedSets) {
      onUpdate(suggestedSets);
      setShowSuggestion(false);
      setIsExpanded(true); // Auto-expand after applying
    }
  };

  const totalWarmupVolume = warmupSets.reduce(
    (sum, set) => sum + set.weight * set.reps,
    0,
  );

  return (
    <div
      className={cn(
        "glass-surface glass-hairline border-l-secondary/50 overflow-hidden rounded-lg border-l-4",
        className,
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex w-full items-center justify-between p-3 text-left transition-colors",
          "hover:bg-secondary/5 active:bg-secondary/10",
          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        )}
        aria-expanded={isExpanded}
        aria-controls={`warmup-content-${exerciseName}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Warm-up Sets ({warmupSets.length})
          </span>
          {warmupSets.length > 0 && (
            <span
              className="bg-secondary/20 text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-medium"
              title={`Total warm-up volume: ${totalWarmupVolume.toFixed(0)}${weightUnit}`}
            >
              {totalWarmupVolume.toFixed(0)}
              {weightUnit} moved
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.2,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          <ChevronDown className="text-muted-foreground size-4" />
        </motion.div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id={`warmup-content-${exerciseName}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.2,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-3 pb-3">
              {/* Suggestion Banner */}
              {showSuggestion && suggestedSets && suggestedSets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                  className={cn(
                    "glass-surface glass-hairline flex flex-col items-start justify-between gap-3 rounded-lg p-3 sm:flex-row sm:items-center",
                    "border-primary/20 from-primary/5 to-secondary/5 border bg-gradient-to-r",
                  )}
                  role="alert"
                  aria-live="polite"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <Zap className="text-primary mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug font-medium">
                        Smart Suggestion
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                        Based on your history:{" "}
                        <span className="font-medium">
                          {suggestedSets
                            .map((s) => `${s.weight}${weightUnit}`)
                            .join(" → ")}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSuggestion(false)}
                      className="flex-1 sm:flex-none"
                    >
                      Dismiss
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleApplySuggestion}
                      className="flex-1 sm:flex-none"
                      haptic
                    >
                      Apply
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Warm-up Set Inputs */}
              <AnimatePresence mode="popLayout">
                {warmupSets.map((set, index) => (
                  <WarmupSetInput
                    key={`warmup-${set.setNumber}`}
                    data={set}
                    weightUnit={weightUnit}
                    onUpdate={(updates) => handleUpdateSet(index, updates)}
                    onDelete={() => handleDeleteSet(index)}
                    onMoveUp={
                      index > 0 ? () => handleMoveSet(index, "up") : undefined
                    }
                    onMoveDown={
                      index < warmupSets.length - 1
                        ? () => handleMoveSet(index, "down")
                        : undefined
                    }
                  />
                ))}
              </AnimatePresence>

              {/* Empty State */}
              {warmupSets.length === 0 && !showSuggestion && (
                <div className="py-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    No warm-up sets added yet
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Add sets manually or use Auto Fill for smart suggestions
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddSet}
                  className="flex-1 gap-1"
                >
                  <Plus className="size-4" />
                  Add Set
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAutoFill}
                  className="flex-1 gap-1"
                  haptic
                >
                  <Zap className="size-4" />
                  Auto Fill
                </Button>
                {warmupSets.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdate([])}
                    className="gap-1"
                  >
                    <RotateCcw className="size-4" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Footer Info */}
              {warmupSets.length > 0 && workingWeight && (
                <div className="from-secondary/5 to-primary/5 mt-2 rounded-lg bg-gradient-to-r px-3 py-2">
                  <p className="text-xs leading-relaxed">
                    <span className="text-muted-foreground font-medium">
                      Progressive load:
                    </span>{" "}
                    <span className="text-secondary font-bold">
                      {warmupSets
                        .map((s) => `${s.weight}${weightUnit}`)
                        .join(" → ")}{" "}
                      → {workingWeight}
                      {weightUnit}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
