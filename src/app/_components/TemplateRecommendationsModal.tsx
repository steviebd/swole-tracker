"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { 
  X, 
  PlayCircle, 
  Lightbulb, 
  TrendingUp, 
  RotateCcw, 
  Target,
  Clock,
  Zap,
  CheckCircle
} from "lucide-react";
import { api } from "~/convex/_generated/api";
import { Button } from "~/components/ui/button";
import { GlassSurface } from "~/components/ui/glass-surface";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

interface TemplateRecommendationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTemplate: (templateId: string) => void;
  onCreateFromRecommendation: (recommendation: any) => void;
}

interface Recommendation {
  type: string;
  title: string;
  description: string;
  templateId: string | null;
  exercises: Array<{
    exerciseName: string;
    sets: number;
    reps: number | string;
    weight: number;
  }>;
  confidence: number;
}

const recommendationTypeIcons = {
  comeback: RotateCcw,
  balance: Target,
  progression: TrendingUp,
  recovery: Clock,
  intensity: Zap,
};

const recommendationTypeColors = {
  comeback: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
  balance: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
  progression: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30",
  recovery: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30",
  intensity: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30",
};

export default function TemplateRecommendationsModal({
  isOpen,
  onClose,
  onStartTemplate,
  onCreateFromRecommendation,
}: TemplateRecommendationsModalProps) {
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
  const [acceptedRecommendations, setAcceptedRecommendations] = useState<Set<string>>(new Set());

  // Fetch recommendations from Convex
  // TODO: Implement templateRecommendations functions
  const recommendations: Recommendation[] | undefined = [];
  const recordInteraction = async (params: any) => {
    // TODO: Implement recordRecommendationInteraction
    console.log('recordInteraction called with:', params);
  };

  const handleRecommendationAction = async (
    recommendation: Recommendation,
    action: "accepted" | "rejected" | "viewed"
  ) => {
    try {
      await recordInteraction({
        recommendationType: recommendation.type,
        templateId: recommendation.templateId,
        action,
        confidence: recommendation.confidence,
      });

      if (action === "accepted") {
        setAcceptedRecommendations(prev => new Set(prev).add(recommendation.type));
        
        if (recommendation.templateId) {
          // Start existing template
          onStartTemplate(recommendation.templateId);
        } else {
          // Create new template from recommendation
          onCreateFromRecommendation(recommendation);
        }
        toast.success(`Starting ${recommendation.title}!`);
        onClose();
      } else if (action === "rejected") {
        toast.info("Recommendation dismissed");
      }
    } catch (error) {
      console.error("Error recording recommendation interaction:", error);
      toast.error("Failed to process recommendation");
    }
  };

  const RecommendationCard = ({ recommendation }: { recommendation: Recommendation }) => {
    const IconComponent = recommendationTypeIcons[recommendation.type as keyof typeof recommendationTypeIcons] || Lightbulb;
    const isSelected = selectedRecommendation === recommendation.type;
    const isAccepted = acceptedRecommendations.has(recommendation.type);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.2 }}
        className="group relative"
      >
        <GlassSurface 
          className={cn(
            "p-6 cursor-pointer transition-all duration-200",
            isSelected && "ring-2 ring-primary ring-offset-2",
            isAccepted && "opacity-60"
          )}
          onClick={() => setSelectedRecommendation(isSelected ? null : recommendation.type)}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  recommendationTypeColors[recommendation.type as keyof typeof recommendationTypeColors] || 
                  "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30"
                )}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{recommendation.title}</h3>
                  <p className="text-sm text-muted-foreground">{recommendation.description}</p>
                </div>
              </div>
              
              {/* Confidence indicator */}
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">
                  {Math.round(recommendation.confidence * 100)}%
                </div>
                {isAccepted && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
            </div>

            {/* Exercise preview */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Exercises:</h4>
              <div className="grid grid-cols-1 gap-2">
                {recommendation.exercises.slice(0, 3).map((exercise, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{exercise.exerciseName}</span>
                    <span className="text-muted-foreground">
                      {exercise.sets} × {exercise.reps}
                      {exercise.weight > 0 && ` @ ${exercise.weight}kg`}
                    </span>
                  </div>
                ))}
                {recommendation.exercises.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{recommendation.exercises.length - 3} more exercises
                  </div>
                )}
              </div>
            </div>

            {/* Expanded view */}
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 pt-4 border-t border-border/50"
                >
                  {/* Full exercise list */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">Complete Workout:</h4>
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                      {recommendation.exercises.map((exercise, index) => (
                        <div key={index} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                          <span className="font-medium">{exercise.exerciseName}</span>
                          <span className="text-muted-foreground">
                            {exercise.sets} sets × {exercise.reps} reps
                            {exercise.weight > 0 && ` @ ${exercise.weight}kg`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecommendationAction(recommendation, "accepted");
                      }}
                      className="flex-1"
                      size="sm"
                      disabled={isAccepted}
                    >
                      <PlayCircle className="w-4 h-4" />
                      {recommendation.templateId ? "Start Template" : "Create & Start"}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecommendationAction(recommendation, "rejected");
                        setSelectedRecommendation(null);
                      }}
                      variant="outline"
                      size="sm"
                      disabled={isAccepted}
                    >
                      Dismiss
                    </Button>
                  </div>
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
        className="relative w-full max-w-2xl max-h-[90vh] mx-4"
      >
        <GlassSurface className="p-6 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-primary" />
                Workout Recommendations
              </h2>
              <p className="text-muted-foreground mt-1">
                AI-powered suggestions based on your workout patterns
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {recommendations === undefined ? (
              // Loading state
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <GlassSurface key={index} className="p-6 animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-muted rounded-lg" />
                      <div className="space-y-2">
                        <div className="w-32 h-4 bg-muted rounded" />
                        <div className="w-48 h-3 bg-muted rounded" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-24 h-3 bg-muted rounded" />
                      <div className="w-full h-3 bg-muted rounded" />
                      <div className="w-3/4 h-3 bg-muted rounded" />
                    </div>
                  </GlassSurface>
                ))}
              </div>
            ) : (recommendations?.length || 0) === 0 ? (
              // Empty state
              <GlassSurface className="p-8 text-center">
                <Lightbulb className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Recommendations Available</h3>
                <p className="text-muted-foreground">
                  Complete a few more workouts to get personalized recommendations based on your patterns.
                </p>
              </GlassSurface>
            ) : (
              // Recommendations list
              <AnimatePresence>
                {recommendations?.map((recommendation: Recommendation) => (
                  <RecommendationCard
                    key={recommendation.type}
                    recommendation={recommendation}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              Recommendations are generated based on your workout history and recovery data.
              {recommendations && recommendations.length > 0 && (
                <span className="ml-1">
                  • {recommendations?.length || 0} suggestions available
                </span>
              )}
            </p>
          </div>
        </GlassSurface>
      </motion.div>
    </div>
  );
}