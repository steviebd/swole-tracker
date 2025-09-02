"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { 
  X, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Calendar,
  Dumbbell,
  BarChart3,
  Target,
  Zap,
  Award
} from "lucide-react";
import { api } from "~/convex/_generated/api";
import { Button } from "~/components/ui/button";
import { GlassSurface } from "~/components/ui/glass-surface";
import { Badge } from "~/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { cn } from "~/lib/utils";
import type { Id } from "~/convex/_generated/dataModel";

interface WorkoutComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkoutId: Id<"workoutSessions">;
  templateId?: Id<"workoutTemplates">;
}

export default function WorkoutComparisonModal({
  isOpen,
  onClose,
  currentWorkoutId,
  templateId
}: WorkoutComparisonModalProps) {
  const [compareWorkoutId, setCompareWorkoutId] = useState<Id<"workoutSessions"> | null>(null);

  // Fetch workout history for comparison selection
  // TODO: Re-enable when workoutExport API is restored
  const workoutHistory: any = null; // useQuery(api.workoutExport.getWorkoutHistoryForComparison, {
  //   templateId,
  //   limit: 10
  // });

  // Fetch comparison data when both workouts are selected
  // TODO: Re-enable when workoutExport API is restored  
  const comparisonData: any = null; // useQuery(
  //   api.workoutExport.getWorkoutComparison,
  //   currentWorkoutId && compareWorkoutId ? {
  //     workout1Id: compareWorkoutId,
  //     workout2Id: currentWorkoutId
  //   } : "skip"
  // );

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num));
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPercentage = (percentage: number) => {
    const sign = percentage > 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  };

  const ImprovementIndicator = ({ 
    value, 
    percentage, 
    label, 
    icon: Icon 
  }: {
    value: number;
    percentage: number;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => {
    const isImprovement = value > 0;
    const isNeutral = Math.abs(percentage) < 1;

    return (
      <GlassSurface className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <div className="flex items-center gap-1">
              {isNeutral ? (
                <Minus className="w-4 h-4 text-muted-foreground" />
              ) : isImprovement ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className={cn(
              "text-lg font-bold",
              isNeutral ? "text-muted-foreground" :
              isImprovement ? "text-green-600 dark:text-green-400" :
              "text-red-600 dark:text-red-400"
            )}>
              {isImprovement ? '+' : ''}{formatNumber(value)}{label.includes('Volume') ? 'kg' : ''}
            </div>
            <div className={cn(
              "text-sm",
              isNeutral ? "text-muted-foreground" :
              isImprovement ? "text-green-600 dark:text-green-400" :
              "text-red-600 dark:text-red-400"
            )}>
              {formatPercentage(percentage)}
            </div>
          </div>
        </div>
      </GlassSurface>
    );
  };

  const ExerciseComparison = ({ 
    exerciseName, 
    comparison 
  }: { 
    exerciseName: string; 
    comparison: any; 
  }) => {
    const hasVolumeImprovement = comparison.volumeImprovement > 0;
    const hasWeightImprovement = comparison.weightImprovement > 0;

    return (
      <GlassSurface className="p-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            {exerciseName}
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Previous</div>
              <div className="space-y-1">
                <div className="text-sm">
                  Volume: {formatNumber(comparison.exercise1.totalVolume)}kg
                </div>
                <div className="text-sm">
                  Max Weight: {formatNumber(comparison.exercise1.maxWeight)}kg
                </div>
                <div className="text-sm">
                  Total Reps: {comparison.exercise1.totalReps}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Current</div>
              <div className="space-y-1">
                <div className="text-sm">
                  Volume: {formatNumber(comparison.exercise2.totalVolume)}kg
                  {comparison.volumeImprovement !== 0 && (
                    <span className={cn(
                      "ml-2 text-xs",
                      hasVolumeImprovement ? "text-green-600" : "text-red-600"
                    )}>
                      ({hasVolumeImprovement ? '+' : ''}{formatNumber(comparison.volumeImprovement)}kg)
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  Max Weight: {formatNumber(comparison.exercise2.maxWeight)}kg
                  {comparison.weightImprovement !== 0 && (
                    <span className={cn(
                      "ml-2 text-xs",
                      hasWeightImprovement ? "text-green-600" : "text-red-600"
                    )}>
                      ({hasWeightImprovement ? '+' : ''}{formatNumber(comparison.weightImprovement)}kg)
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  Total Reps: {comparison.exercise2.totalReps}
                  {comparison.repsImprovement !== 0 && (
                    <span className={cn(
                      "ml-2 text-xs",
                      comparison.repsImprovement > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      ({comparison.repsImprovement > 0 ? '+' : ''}{comparison.repsImprovement})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {(hasVolumeImprovement || hasWeightImprovement) && (
            <div className="flex justify-end">
              <Badge variant="outline" className="text-green-600 border-green-200">
                <Award className="w-3 h-3 mr-1" />
                Improved!
              </Badge>
            </div>
          )}
        </div>
      </GlassSurface>
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
        className="relative w-full max-w-4xl max-h-[90vh] mx-4"
      >
        <GlassSurface className="p-6 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                Workout Comparison
              </h2>
              <p className="text-muted-foreground mt-1">
                Compare your progress between workouts
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Workout Selection */}
          <div className="mb-6">
            <GlassSurface className="p-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Select a workout to compare with</h3>
                
                <Select value={compareWorkoutId || ""} onValueChange={(value) => setCompareWorkoutId(value as Id<"workoutSessions">)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a previous workout..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* TODO: Re-enable when workoutExport API is restored */}
                    <SelectItem value="placeholder" disabled>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        No workouts available
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </GlassSurface>
          </div>

          {/* Comparison Results */}
          <div className="space-y-6 max-h-[50vh] overflow-y-auto">
            {comparisonData ? (
              <div className="space-y-6">
                {/* Overall Improvements */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Overall Progress
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ImprovementIndicator
                      value={comparisonData.improvements.totalVolume.change}
                      percentage={comparisonData.improvements.totalVolume.percentage}
                      label="Total Volume"
                      icon={Target}
                    />
                    <ImprovementIndicator
                      value={comparisonData.improvements.totalSets.change}
                      percentage={comparisonData.improvements.totalSets.percentage}
                      label="Total Sets"
                      icon={BarChart3}
                    />
                    <ImprovementIndicator
                      value={comparisonData.improvements.averageWeight.change}
                      percentage={comparisonData.improvements.averageWeight.percentage}
                      label="Average Weight"
                      icon={Zap}
                    />
                  </div>
                </div>

                {/* Exercise-by-Exercise Comparison */}
                {Object.keys(comparisonData.exerciseComparisons).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Dumbbell className="w-5 h-5 text-primary" />
                      Exercise Progress
                    </h3>
                    
                    <div className="space-y-4">
                      {Object.entries(comparisonData.exerciseComparisons).map(([exerciseName, comparison]) => (
                        <ExerciseComparison
                          key={exerciseName}
                          exerciseName={exerciseName}
                          comparison={comparison}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Workout Summaries */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4">Workout Summaries</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GlassSurface className="p-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-muted-foreground">Previous Workout</h4>
                        <div className="text-lg font-bold">{comparisonData.workout1.templateName}</div>
                        <div className="text-sm text-muted-foreground">{formatDate(comparisonData.workout1.date)}</div>
                        <div className="space-y-1 text-sm">
                          <div>Volume: {formatNumber(comparisonData.workout1.totalVolume)}kg</div>
                          <div>Sets: {comparisonData.workout1.totalSets}</div>
                          <div>Exercises: {comparisonData.workout1.exercises.length}</div>
                        </div>
                      </div>
                    </GlassSurface>
                    
                    <GlassSurface className="p-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-muted-foreground">Current Workout</h4>
                        <div className="text-lg font-bold">{comparisonData.workout2.templateName}</div>
                        <div className="text-sm text-muted-foreground">{formatDate(comparisonData.workout2.date)}</div>
                        <div className="space-y-1 text-sm">
                          <div>Volume: {formatNumber(comparisonData.workout2.totalVolume)}kg</div>
                          <div>Sets: {comparisonData.workout2.totalSets}</div>
                          <div>Exercises: {comparisonData.workout2.exercises.length}</div>
                        </div>
                      </div>
                    </GlassSurface>
                  </div>
                </div>
              </div>
            ) : compareWorkoutId ? (
              // Loading state
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Loading comparison...</p>
              </div>
            ) : (
              // Empty state
              <div className="text-center py-8">
                <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Workout to Compare</h3>
                <p className="text-muted-foreground">
                  Choose a previous workout from the dropdown above to see your progress.
                </p>
              </div>
            )}
          </div>
        </GlassSurface>
      </motion.div>
    </div>
  );
}