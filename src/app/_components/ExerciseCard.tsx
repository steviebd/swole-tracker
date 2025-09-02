"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, 
  ChevronUp, 
  GripVertical, 
  Plus, 
  Minus,
  Sparkles,
  TrendingUp,
  Target,
  Timer,
  RefreshCw
} from "lucide-react";
import { SetInput, type SetData } from "./set-input";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useSwipeGestures } from "~/hooks/use-swipe-gestures";
import type { ExerciseData } from "~/hooks/useWorkoutSessionState";
import type { Id } from "~/convex/_generated/dataModel";
import ExerciseSubstitutionModal from "./ExerciseSubstitutionModal";

interface ExerciseCardProps {
  exercise: ExerciseData;
  exerciseIndex: number;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onSwipeToBottom: () => void;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: keyof SetData, value: string | number | undefined) => void;
  onToggleUnit: (exerciseIndex: number, setIndex: number) => void;
  onAddSet: (exerciseIndex: number) => void;
  onDeleteSet: (exerciseIndex: number, setIndex: number) => void;
  onMoveSet: (exerciseIndex: number, setIndex: number, direction: "up" | "down") => void;
  isDraggedOver?: boolean;
  isDragging?: boolean;
  dragOffset?: { x: number; y: number };
  dragHandlers?: {
    onDragStart: (index: number) => (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDragOver: (index: number) => (e: React.DragEvent) => void;
    onDrop: (index: number) => (e: React.DragEvent) => void;
    onDragEnter: (index: number) => (e: React.DragEvent) => void;
  };
  previousBest?: {
    weight?: number;
    reps?: number;
    sets?: number;
    unit: "kg" | "lbs";
  };
  readOnly?: boolean;
  showAISuggestions?: boolean;
  onSubstituteExercise?: (exerciseIndex: number, newExerciseName: string) => void;
}

/**
 * Enhanced Exercise Card Component - Phase 4 Implementation
 * 
 * Features:
 * - Drag & drop reordering with mobile-optimized touch interactions
 * - Swipe gestures for exercise management
 * - Exercise expansion/collapse with smooth animations
 * - Set management with visual feedback
 * - AI suggestions integration
 * - Performance indicators and previous bests
 * - Mobile-first responsive design
 */
export function ExerciseCard({
  exercise,
  exerciseIndex,
  isExpanded,
  onToggleExpansion,
  onSwipeToBottom,
  onUpdateSet,
  onToggleUnit,
  onAddSet,
  onDeleteSet,
  onMoveSet,
  isDraggedOver,
  isDragging,
  dragOffset = { x: 0, y: 0 },
  dragHandlers,
  previousBest,
  readOnly = false,
  showAISuggestions = true,
  onSubstituteExercise
}: ExerciseCardProps) {
  const [showPreviousBest, setShowPreviousBest] = useState(false);
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Swipe gesture handling
  const [swipeState, swipeHandlers, resetSwipe] = useSwipeGestures(
    () => {
      onSwipeToBottom();
      resetSwipe();
    },
    {
      dismissThreshold: 120,
      velocityThreshold: 6,
      friction: 0.92
    },
    "horizontal"
  );

  // Calculate completion stats
  const completedSets = exercise.sets.filter(set => set.weight && set.reps).length;
  const totalSets = exercise.sets.length;
  const completionPercentage = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  
  // Calculate current volume
  const currentVolume = exercise.sets.reduce((sum, set) => {
    if (set.weight && set.reps && set.sets) {
      return sum + (set.weight * set.reps * set.sets);
    }
    return sum;
  }, 0);

  // Check if this is a personal record
  const maxCurrentWeight = Math.max(...exercise.sets.map(s => s.weight || 0));
  const maxCurrentReps = Math.max(...exercise.sets.map(s => s.reps || 0));
  const isPersonalRecord = previousBest && (
    (maxCurrentWeight > (previousBest.weight || 0)) ||
    (maxCurrentWeight === previousBest.weight && maxCurrentReps > (previousBest.reps || 0))
  );

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3
      }
    },
    dragging: {
      scale: 1.02,
      rotate: 2,
      zIndex: 10,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
    },
    draggedOver: {
      scale: 0.98,
      backgroundColor: "rgba(59, 130, 246, 0.1)"
    }
  };

  const contentVariants = {
    collapsed: { 
      height: 0, 
      opacity: 0,
      transition: { duration: 0.2 }
    },
    expanded: { 
      height: "auto", 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div
      ref={cardRef}
      variants={cardVariants}
      initial="hidden"
      animate={
        isDragging ? "dragging" : 
        isDraggedOver ? "draggedOver" : 
        "visible"
      }
      style={{
        transform: `translate3d(${swipeState.translateX + dragOffset.x}px, ${dragOffset.y}px, 0)`,
      }}
      className={cn(
        "glass-card relative overflow-hidden rounded-xl border border-glass-border bg-glass-primary backdrop-blur-lg transition-all duration-200",
        isDragging && "shadow-2xl ring-2 ring-primary/30",
        isDraggedOver && "ring-2 ring-blue-400/50 bg-blue-50/20 dark:bg-blue-950/20",
        completionPercentage === 100 && "ring-2 ring-green-400/50 bg-green-50/20 dark:bg-green-950/20",
        swipeState.isDragging && "select-none"
      )}
      // Drag and drop is handled by universal drag system via onPointerDown
      // Swipe gesture handlers
      {...swipeHandlers}
    >
      {/* Drag indicator - only show when card is being dragged */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {/* Exercise Name with PR indicator */}
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                {exercise.exerciseName}
                {isPersonalRecord && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full"
                  >
                    <Sparkles className="w-3 h-3" />
                    PR!
                  </motion.div>
                )}
              </h3>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span>{completedSets}/{totalSets} sets</span>
              </div>
              
              {currentVolume > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>{currentVolume.toLocaleString()} {exercise.unit}</span>
                </div>
              )}
              
              {previousBest && (
                <button
                  onClick={() => setShowPreviousBest(!showPreviousBest)}
                  className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
                >
                  <Timer className="w-3 h-3" />
                  Best: {previousBest.weight}{previousBest.unit} × {previousBest.reps}
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div 
                  className={cn(
                    "h-2 rounded-full transition-colors duration-300",
                    completionPercentage === 100 ? "bg-green-500" : 
                    completionPercentage > 50 ? "bg-blue-500" : 
                    completionPercentage > 0 ? "bg-yellow-500" : "bg-muted-foreground/30"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-4">
            {/* Exercise Substitution Button */}
            {!readOnly && onSubstituteExercise && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSubstitutionModal(true)}
                className="text-muted-foreground hover:text-foreground"
                title="Substitute exercise"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            
            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpansion}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Exercise Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            variants={contentVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Previous Best Display */}
              <AnimatePresence>
                {showPreviousBest && previousBest && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
                  >
                    <div className="text-sm">
                      <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                        Previous Best Performance
                      </div>
                      <div className="text-blue-600 dark:text-blue-300">
                        {previousBest.weight}{previousBest.unit} × {previousBest.reps} reps
                        {previousBest.sets && previousBest.sets > 1 && ` × ${previousBest.sets} sets`}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sets List */}
              <div className="space-y-3">
                {exercise.sets.map((set, setIndex) => (
                  <motion.div
                    key={set.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SetInput
                      set={set}
                      setIndex={setIndex}
                      exerciseIndex={exerciseIndex}
                      exerciseName={exercise.exerciseName}
                      templateExerciseId={exercise.templateExerciseId}
                      onUpdate={onUpdateSet}
                      onToggleUnit={onToggleUnit}
                      onDelete={onDeleteSet}
                      onMoveUp={setIndex > 0 ? () => onMoveSet(exerciseIndex, setIndex, "up") : undefined}
                      onMoveDown={setIndex < exercise.sets.length - 1 ? () => onMoveSet(exerciseIndex, setIndex, "down") : undefined}
                      readOnly={readOnly}
                      showDelete={exercise.sets.length > 1}
                      preferredUnit={exercise.unit}
                      allSets={exercise.sets}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Add Set Button */}
              {!readOnly && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddSet(exerciseIndex)}
                    className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Set
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe Indicator */}
      <AnimatePresence>
        {swipeState.isDragging && Math.abs(swipeState.translateX) > 20 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-y-0 right-4 flex items-center"
          >
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium",
              Math.abs(swipeState.translateX) > 120 ? 
                "bg-red-500 text-white" : 
                "bg-orange-500/80 text-white"
            )}>
              {Math.abs(swipeState.translateX) > 120 ? "Release to move to bottom" : "Keep swiping..."}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise Substitution Modal */}
      {showSubstitutionModal && (
        <ExerciseSubstitutionModal
          isOpen={showSubstitutionModal}
          onClose={() => setShowSubstitutionModal(false)}
          exerciseName={exercise.exerciseName}
          onSubstitute={(newExerciseName) => {
            if (onSubstituteExercise) {
              onSubstituteExercise(exerciseIndex, newExerciseName);
            }
            setShowSubstitutionModal(false);
          }}
        />
      )}
    </motion.div>
  );
}