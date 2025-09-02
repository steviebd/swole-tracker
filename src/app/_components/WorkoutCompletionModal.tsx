"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, TrendingUp, TrendingDown, Zap, Calendar, Target, Award, Share2, BarChart3 } from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "~/components/ui/button";
import { FocusTrap } from "./focus-trap";
import { useLiveRegion } from "./LiveRegion";
import WorkoutExportModal from "./WorkoutExportModal";
import WorkoutComparisonModal from "./WorkoutComparisonModal";
import { MilestoneCelebration } from "./ProductionUI";
import { createProgressReport, type Achievement } from "~/lib/achievements";
import type { Id } from "~/convex/_generated/dataModel";

export interface ExerciseComparison {
  exerciseName: string;
  current: {
    weight: number;
    reps: number;
    sets: number;
    volume: number;
  };
  previous?: {
    weight: number;
    reps: number;
    sets: number;
    volume: number;
  };
  improvement: {
    weight: number;
    volume: number;
    isPersonalRecord: boolean;
  };
}

export interface WorkoutStats {
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  duration: string;
  exerciseCount: number;
  personalRecords: number;
}

export interface WorkoutCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  workoutStats: WorkoutStats;
  exerciseComparisons: ExerciseComparison[];
  isLoading?: boolean;
  workoutId?: Id<"workoutSessions">;
  templateId?: Id<"workoutTemplates">;
  workoutName?: string;
  streakInfo?: {
    current: number;
    longest: number;
    lastWorkoutDate?: Date;
  };
  totalWorkouts?: number;
  totalVolume?: number;
  workoutGoalPercentage?: number;
}

/**
 * Advanced Workout Completion Modal - Phase 3
 * 
 * Features:
 * - Exercise-by-exercise performance comparison
 * - Volume and weight progress indicators
 * - Personal record achievements display
 * - Completion statistics and summary
 * - Smooth Framer Motion animations
 * - Full accessibility support with focus trap and live regions
 * - Mobile-first responsive design
 */
export function WorkoutCompletionModal({
  isOpen,
  onClose,
  onConfirm,
  workoutStats,
  exerciseComparisons,
  isLoading = false,
  workoutId,
  templateId,
  workoutName = "Workout",
  streakInfo = { current: 0, longest: 0 },
  totalWorkouts = 1,
  totalVolume = 0,
  workoutGoalPercentage = 100
}: WorkoutCompletionModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(null);
  const announceToScreenReader = useLiveRegion();

  useEffect(() => {
    if (isOpen) {
      announceToScreenReader("Workout completed! Reviewing performance data.");
    }
  }, [isOpen, announceToScreenReader]);

  const handleConfirm = async () => {
    announceToScreenReader("Saving workout and returning to dashboard.");
    onConfirm();
  };

  const personalRecords = exerciseComparisons.filter(ex => ex.improvement.isPersonalRecord);
  const hasImprovements = exerciseComparisons.some(ex => 
    ex.improvement.weight > 0 || ex.improvement.volume > 0
  );
  
  // Calculate achievements
  const progressReport = createProgressReport(
    workoutGoalPercentage,
    100, // volume goal percentage (could be calculated)
    streakInfo,
    totalWorkouts,
    totalVolume
  );
  
  // Show achievement celebration if there's a new achievement
  useEffect(() => {
    if (isOpen && (progressReport.goalAchievement || progressReport.streakAchievement)) {
      const achievement = progressReport.goalAchievement || progressReport.streakAchievement;
      if (achievement) {
        setTimeout(() => setShowAchievement(achievement), 1000); // Show after modal is open
      }
    }
  }, [isOpen, progressReport]);

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95, 
      y: 20 
    },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  const statsVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3
      }
    })
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <FocusTrap onEscape={onClose} preventScroll>
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
            >
              <Card
                surface="elevated"
                variant="glass"
                className="glass-modal"
                padding="none"
              >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-glass-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-primary rounded-lg">
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">
                          Workout Complete!
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {hasImprovements ? "Great progress today!" : "Solid training session!"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="touch-target"
                      aria-label="Close completion modal"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  {/* Personal Records Banner */}
                  {personalRecords.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-4 p-3 bg-gradient-accent rounded-lg border border-primary/20"
                    >
                      <div className="flex items-center gap-2 text-primary">
                        <Award className="w-5 h-5" />
                        <span className="font-semibold">
                          {personalRecords.length} Personal Record{personalRecords.length !== 1 ? 's' : ''} Set!
                        </span>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Achievements Banner */}
                  {progressReport.allUnlockedAchievements.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4 p-3 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-lg border border-yellow-400/30"
                    >
                      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                        <Trophy className="w-5 h-5" />
                        <span className="font-semibold">
                          {progressReport.allUnlockedAchievements.length} Achievement{progressReport.allUnlockedAchievements.length !== 1 ? 's' : ''} Unlocked!
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {progressReport.allUnlockedAchievements.slice(0, 3).map(achievement => (
                          <div
                            key={achievement.id}
                            className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-xs font-medium text-yellow-800 dark:text-yellow-200"
                          >
                            {achievement.title}
                          </div>
                        ))}
                        {progressReport.allUnlockedAchievements.length > 3 && (
                          <div className="px-2 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                            +{progressReport.allUnlockedAchievements.length - 3} more
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Workout Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Volume", value: `${workoutStats.totalVolume.toLocaleString()}lbs`, icon: Target },
                      { label: "Total Sets", value: workoutStats.totalSets, icon: Zap },
                      { label: "Duration", value: workoutStats.duration, icon: Calendar },
                      { label: "Exercises", value: workoutStats.exerciseCount, icon: TrendingUp }
                    ].map((stat, index) => (
                      <motion.div
                        key={stat.label}
                        custom={index}
                        variants={statsVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <Card surface="card" className="text-center p-4">
                          <stat.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                          <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                          <div className="text-xs text-muted-foreground">{stat.label}</div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {/* Exercise Comparisons */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">Exercise Performance</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-sm"
                      >
                        {showDetails ? 'Hide Details' : 'Show Details'}
                      </Button>
                    </div>

                    <AnimatePresence>
                      {showDetails && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-3 overflow-hidden"
                        >
                          {exerciseComparisons.map((exercise, index) => (
                            <motion.div
                              key={exercise.exerciseName}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <Card surface="surface" className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium text-foreground flex items-center gap-2">
                                      {exercise.exerciseName}
                                      {exercise.improvement.isPersonalRecord && (
                                        <Award className="w-4 h-4 text-primary" />
                                      )}
                                    </h4>
                                    <div className="text-sm text-muted-foreground">
                                      {exercise.current.weight}lbs × {exercise.current.reps} × {exercise.current.sets} sets
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    {exercise.improvement.volume > 0 ? (
                                      <div className="flex items-center gap-1 text-green-500">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="text-sm font-medium">
                                          +{exercise.improvement.volume}lbs
                                        </span>
                                      </div>
                                    ) : exercise.improvement.volume < 0 ? (
                                      <div className="flex items-center gap-1 text-orange-500">
                                        <TrendingDown className="w-4 h-4" />
                                        <span className="text-sm font-medium">
                                          {exercise.improvement.volume}lbs
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-muted-foreground">No change</div>
                                    )}
                                    
                                    {exercise.previous && (
                                      <div className="text-xs text-muted-foreground">
                                        vs {exercise.previous.weight}lbs × {exercise.previous.reps}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Share and Export Options */}
                {workoutId && (
                  <div className="px-6 py-4 border-t border-glass-border/50">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        Share & Export
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowComparisonModal(true)}
                        className="flex items-center gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Compare
                      </Button>
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="p-6 pt-4 border-t border-glass-border">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      Review More
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      className="flex-2 bg-gradient-primary hover:opacity-90"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Saving...
                        </div>
                      ) : (
                        "Finish & Save"
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </FocusTrap>
        </div>
      )}

      {/* Export Modal */}
      {workoutId && (
        <WorkoutExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          workoutId={workoutId}
          workoutName={workoutName}
        />
      )}

      {/* Comparison Modal */}
      {workoutId && (
        <WorkoutComparisonModal
          isOpen={showComparisonModal}
          onClose={() => setShowComparisonModal(false)}
          currentWorkoutId={workoutId}
          templateId={templateId}
        />
      )}
      
      {/* Achievement Milestone Celebration */}
      {showAchievement && (
        <MilestoneCelebration
          isVisible={!!showAchievement}
          milestone={{
            title: showAchievement.title,
            description: showAchievement.description,
            icon: Trophy,
            value: showAchievement.type === 'streak' ? `${streakInfo.current} days` : 
                  showAchievement.type === 'goal' ? `${workoutGoalPercentage}%` :
                  'Unlocked!'
          }}
          onClose={() => setShowAchievement(null)}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to prepare workout completion data
 */
export function useWorkoutCompletion() {
  const prepareCompletionData = (
    currentExercises: any[], 
    previousData?: any[]
  ): { stats: WorkoutStats; comparisons: ExerciseComparison[] } => {
    // Calculate total volume, sets, reps
    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;
    let personalRecords = 0;

    const comparisons: ExerciseComparison[] = currentExercises.map((exercise, index) => {
      const currentVolume = exercise.sets.reduce((sum: number, set: any) => 
        sum + (set.weight * set.reps), 0
      );
      
      const currentTotalSets = exercise.sets.length;
      const currentTotalReps = exercise.sets.reduce((sum: number, set: any) => 
        sum + set.reps, 0
      );
      
      totalVolume += currentVolume;
      totalSets += currentTotalSets;
      totalReps += currentTotalReps;

      // Find previous data for comparison
      const previousExercise = previousData?.find(prev => 
        prev.exerciseName === exercise.exerciseName
      );

      let improvement = {
        weight: 0,
        volume: 0,
        isPersonalRecord: false
      };

      if (previousExercise) {
        const previousVolume = previousExercise.sets.reduce((sum: number, set: any) => 
          sum + (set.weight * set.reps), 0
        );
        
        const maxCurrentWeight = Math.max(...exercise.sets.map((s: any) => s.weight || 0));
        const maxPreviousWeight = Math.max(...previousExercise.sets.map((s: any) => s.weight || 0));
        
        improvement = {
          weight: maxCurrentWeight - maxPreviousWeight,
          volume: currentVolume - previousVolume,
          isPersonalRecord: maxCurrentWeight > maxPreviousWeight
        };
        
        if (improvement.isPersonalRecord) personalRecords++;
      }

      return {
        exerciseName: exercise.exerciseName,
        current: {
          weight: Math.max(...exercise.sets.map((s: any) => s.weight || 0)),
          reps: Math.max(...exercise.sets.map((s: any) => s.reps || 0)),
          sets: currentTotalSets,
          volume: currentVolume
        },
        previous: previousExercise ? {
          weight: Math.max(...previousExercise.sets.map((s: any) => s.weight || 0)),
          reps: Math.max(...previousExercise.sets.map((s: any) => s.reps || 0)),
          sets: previousExercise.sets.length,
          volume: previousExercise.sets.reduce((sum: number, set: any) => 
            sum + (set.weight * set.reps), 0
          )
        } : undefined,
        improvement
      };
    });

    const stats: WorkoutStats = {
      totalVolume,
      totalSets,
      totalReps,
      duration: "45 min", // TODO: Calculate actual duration
      exerciseCount: currentExercises.length,
      personalRecords
    };

    return { stats, comparisons };
  };

  return { prepareCompletionData };
}