"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { cn } from "~/lib/utils";

type RPEFeedbackModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playbookSessionId: number;
  weekNumber: number;
  sessionNumber: number;
  onSuccess?: () => void;
};

const RPE_LABELS = [
  { value: 1, label: "Very Easy", emoji: "😌" },
  { value: 2, label: "Easy", emoji: "🙂" },
  { value: 3, label: "Moderate", emoji: "😊" },
  { value: 4, label: "Somewhat Hard", emoji: "😐" },
  { value: 5, label: "Hard", emoji: "😓" },
  { value: 6, label: "Harder", emoji: "😰" },
  { value: 7, label: "Very Hard", emoji: "😫" },
  { value: 8, label: "Extremely Hard", emoji: "😵" },
  { value: 9, label: "Near Maximal", emoji: "🥵" },
  { value: 10, label: "Maximal", emoji: "💀" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "too_easy", label: "Too Easy", description: "I could have done much more" },
  { value: "just_right", label: "Just Right", description: "Perfect challenge level" },
  { value: "too_hard", label: "Too Hard", description: "Struggled to complete" },
  { value: "failed_sets", label: "Failed Sets", description: "Couldn't complete as prescribed" },
] as const;

const ENCOURAGEMENT_MESSAGES = {
  1: "Great job showing up!",
  2: "Solid foundation work!",
  3: "Building strength smartly!",
  4: "Good effort today!",
  5: "Way to push yourself!",
  6: "Impressive work ethic!",
  7: "That was tough - well done!",
  8: "Beast mode activated!",
  9: "Absolute warrior effort!",
  10: "Legendary performance!",
} as const;

export function RPEFeedbackModal({
  open,
  onOpenChange,
  playbookSessionId,
  weekNumber,
  sessionNumber,
  onSuccess,
}: RPEFeedbackModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const [selectedRPE, setSelectedRPE] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const submitRPEMutation = api.playbooks.submitSessionRPE.useMutation({
    onSuccess: (data) => {
      if (onSuccess) {
        onSuccess();
      }
      // Auto-close after brief celebration
      setTimeout(() => {
        onOpenChange(false);
        // Reset form
        setSelectedRPE(null);
        setSelectedDifficulty(null);
        setNotes("");
      }, 1500);
    },
  });

  const handleSubmit = async () => {
    if (!selectedRPE || !selectedDifficulty) return;

    await submitRPEMutation.mutateAsync({
      playbookSessionId,
      rpe: selectedRPE,
      difficulty: selectedDifficulty as "too_easy" | "just_right" | "too_hard" | "failed_sets",
      rpeNotes: notes || undefined,
    });
  };

  const isValid = selectedRPE !== null && selectedDifficulty !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="size-5 text-primary" />
            How was Week {weekNumber}, Session {sessionNumber}?
          </DialogTitle>
          <DialogDescription>
            Your feedback helps us optimize future workouts
          </DialogDescription>
        </DialogHeader>

        {submitRPEMutation.isSuccess ? (
          // Success State
          <motion.div
            initial={prefersReducedMotion ? {} : { scale: 0.9, opacity: 0 }}
            animate={prefersReducedMotion ? {} : { scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <CheckCircle2 className="mb-4 size-16 text-tertiary" />
            <h3 className="mb-2 text-xl font-bold">
              {selectedRPE && ENCOURAGEMENT_MESSAGES[selectedRPE as keyof typeof ENCOURAGEMENT_MESSAGES]}
            </h3>
            <p className="text-sm text-muted-foreground">
              Thanks for the feedback!
            </p>
          </motion.div>
        ) : (
          <>
            {/* RPE Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Rate of Perceived Exertion (RPE)</label>
                {selectedRPE && (
                  <Badge variant="default" className="gap-2 text-base">
                    <span className="text-xl">
                      {RPE_LABELS.find((r) => r.value === selectedRPE)?.emoji}
                    </span>
                    {selectedRPE}/10 - {RPE_LABELS.find((r) => r.value === selectedRPE)?.label}
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={selectedRPE || 5}
                  onChange={(e) => setSelectedRPE(parseInt(e.target.value))}
                  className={cn(
                    "h-3 w-full cursor-pointer appearance-none rounded-full",
                    "bg-gradient-to-r from-tertiary via-secondary to-destructive",
                    "[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none",
                    "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-background",
                    "[&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:ring-2",
                    "[&::-webkit-slider-thumb]:ring-primary"
                  )}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Very Easy</span>
                  <span>Moderate</span>
                  <span>Maximal</span>
                </div>
              </div>
            </div>

            {/* Difficulty Radio Buttons */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Overall Difficulty</label>
              <div className="grid grid-cols-2 gap-3">
                {DIFFICULTY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDifficulty(option.value)}
                    className={cn(
                      "rounded-lg border-2 p-4 text-left transition-all touch-target-large",
                      selectedDifficulty === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <p className="font-semibold">{option.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Additional Notes <span className="text-muted-foreground">(Optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Any specific feedback about the session..."
                className={cn(
                  "w-full rounded-lg border border-border bg-background p-3",
                  "text-sm placeholder:text-muted-foreground",
                  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                )}
              />
              <p className="text-xs text-muted-foreground text-right">
                {notes.length}/500
              </p>
            </div>
          </>
        )}

        {!submitRPEMutation.isSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Skip for Now
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || submitRPEMutation.isPending}
              haptic
              className="gap-2"
            >
              {submitRPEMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Submit Feedback
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
