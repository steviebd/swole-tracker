"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { 
  X, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Target, 
  Zap,
  Clock,
  Star
} from "lucide-react";
import { api } from "~/convex/_generated/api";
import { Button } from "~/components/ui/button";
import { GlassSurface } from "~/components/ui/glass-surface";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

interface ExerciseSubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  onSubstitute: (newExerciseName: string) => void;
}

interface Substitution {
  exerciseName: string;
  reason: string;
  muscleGroups: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
}

const difficultyColors = {
  beginner: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const difficultyIcons = {
  beginner: Clock,
  intermediate: Target,
  advanced: Zap,
};

const muscleGroupColors: Record<string, string> = {
  chest: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  back: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  shoulders: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  arms: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  legs: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  core: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  fullbody: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function ExerciseSubstitutionModal({
  isOpen,
  onClose,
  exerciseName,
  onSubstitute,
}: ExerciseSubstitutionModalProps) {
  const [selectedSubstitution, setSelectedSubstitution] = useState<string | null>(null);
  
  // Fetch exercise substitutions from Convex
  // TODO: Implement templateRecommendations.getExerciseSubstitutions function
  const substitutions: Substitution[] | undefined = [];

  const handleSubstitute = (substitution: Substitution) => {
    onSubstitute(substitution.exerciseName);
    toast.success(`Substituted ${exerciseName} with ${substitution.exerciseName}`);
    onClose();
  };

  const SubstitutionCard = ({ substitution }: { substitution: Substitution }) => {
    const DifficultyIcon = difficultyIcons[substitution.difficulty];
    const isSelected = selectedSubstitution === substitution.exerciseName;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ duration: 0.15 }}
        className="group"
      >
        <GlassSurface 
          className={cn(
            "p-4 cursor-pointer transition-all duration-200",
            isSelected && "ring-2 ring-primary ring-offset-2"
          )}
          onClick={() => setSelectedSubstitution(isSelected ? null : substitution.exerciseName)}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground leading-tight">
                  {substitution.exerciseName}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {substitution.reason}
                </p>
              </div>
              
              <div className="flex items-center gap-2 ml-3">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs flex items-center gap-1",
                    difficultyColors[substitution.difficulty]
                  )}
                >
                  <DifficultyIcon className="w-3 h-3" />
                  {substitution.difficulty}
                </Badge>
              </div>
            </div>

            {/* Muscle groups */}
            <div className="flex flex-wrap gap-1">
              {substitution.muscleGroups.map((group) => (
                <Badge
                  key={group}
                  variant="outline"
                  className={cn(
                    "text-xs",
                    muscleGroupColors[group.replace('-', '')] || muscleGroupColors.fullbody
                  )}
                >
                  {group.replace('-', ' ')}
                </Badge>
              ))}
            </div>

            {/* Action button */}
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="pt-2 border-t border-border/50"
                >
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubstitute(substitution);
                    }}
                    className="w-full"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Use This Exercise
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassSurface>
      </motion.div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg max-h-[90vh] mx-4"
      >
        <GlassSurface className="p-6 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                Exercise Substitutions
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Alternative exercises for <span className="font-medium">{exerciseName}</span>
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {substitutions === undefined ? (
              // Loading state
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <GlassSurface key={index} className="p-4 animate-pulse">
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-2 flex-1">
                        <div className="w-32 h-4 bg-muted rounded" />
                        <div className="w-48 h-3 bg-muted rounded" />
                      </div>
                      <div className="w-16 h-5 bg-muted rounded ml-3" />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-12 h-4 bg-muted rounded" />
                      <div className="w-16 h-4 bg-muted rounded" />
                      <div className="w-14 h-4 bg-muted rounded" />
                    </div>
                  </GlassSurface>
                ))}
              </div>
            ) : (substitutions?.length || 0) === 0 ? (
              // Empty state
              <GlassSurface className="p-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Substitutions Found</h3>
                <p className="text-sm text-muted-foreground">
                  We couldn't find suitable alternatives for this exercise. 
                  Try modifying the exercise name or check back later.
                </p>
              </GlassSurface>
            ) : (
              // Substitutions list
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Star className="w-4 h-4" />
                  <span>{substitutions?.length || 0} alternatives found</span>
                </div>
                
                <AnimatePresence>
                  {substitutions?.map((substitution: Substitution, index: number) => (
                    <motion.div
                      key={substitution.exerciseName}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <SubstitutionCard substitution={substitution} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer */}
          {substitutions && substitutions.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                Click on any exercise to see more details, then tap "Use This Exercise" to substitute.
              </p>
            </div>
          )}
        </GlassSurface>
      </motion.div>
    </div>
  );
}