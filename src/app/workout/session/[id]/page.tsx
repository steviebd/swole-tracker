"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Square, 
  Timer, 
  Dumbbell, 
  Plus, 
  Minus,
  Check,
  Target,
  TrendingUp,
  Save,
  RefreshCw,
  MoreVertical
} from "lucide-react";
import { api } from "~/convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { GlassSurface } from "~/components/ui/glass-surface";
import { SkeletonScreen } from "~/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import type { Id } from "~/convex/_generated/dataModel";
import { WorkoutCompletionModal, useWorkoutCompletion } from "~/app/_components/WorkoutCompletionModal";
import { WorkoutRecoveryModal, useWorkoutRecovery } from "~/app/_components/WorkoutRecoveryModal";
import ExerciseSubstitutionModal from "~/app/_components/ExerciseSubstitutionModal";
import { useAutoSave } from "~/hooks/use-cache-invalidation";
import { useWorkoutRecovery as useOfflineRecovery } from "~/lib/enhanced-offline-storage";

/**
 * Workout Session Interface
 * 
 * Features:
 * - Live workout tracking
 * - Exercise progression through template
 * - Set/rep/weight logging
 * - Real-time session updates
 * - Timer functionality
 * - Previous performance data
 * - Session completion flow
 */

interface SetData {
  reps: number;
  weight: number;
  completed: boolean;
}

interface ExerciseSession {
  templateExerciseId: string;
  exerciseName: string;
  sets: SetData[];
  previousBest?: {
    reps: number;
    weight: number;
  };
}

export default function WorkoutSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as Id<"workoutSessions">;
  const sessionIdString = sessionId.toString();
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exercises, setExercises] = useState<ExerciseSession[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [sessionStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [workoutData, setWorkoutData] = useState<any>(null);

  // Fetch session data
  const session = useQuery(api.workouts.getWorkout, { id: sessionId });

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isCompletingWorkout, setIsCompletingWorkout] = useState(false);
  const { prepareCompletionData } = useWorkoutCompletion();

  // Exercise substitution state
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [substitutionExerciseIndex, setSubstitutionExerciseIndex] = useState<number | null>(null);

  // Recovery and auto-save hooks
  const { showRecoveryModal, recoveryData, showRecovery, hideRecovery } = useWorkoutRecovery();
  const {
    hasDraft,
    draftData,
    showRecoveryModal: showOfflineRecovery,
    recoverDraft,
    discardDraft
  } = useOfflineRecovery(sessionIdString);

  // Auto-save current workout state
  const currentWorkoutState = {
    sessionId: sessionIdString,
    workoutName: session?.template?.name,
    exercises,
    currentExerciseIndex,
    unit,
    sessionDuration: elapsedTime,
    completedSets: exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0),
    totalSets: exercises.reduce((acc, ex) => acc + ex.sets.length, 0),
    savedAt: Date.now()
  };

  const { isDirty, forceSave } = useAutoSave(
    sessionIdString,
    currentWorkoutState,
    {
      interval: 30000, // Save every 30 seconds
      enabled: isSessionActive,
      onSave: () => {
        console.log('Auto-save completed');
      },
      onError: (error) => {
        console.error('Auto-save failed:', error);
        toast.error('Auto-save failed');
      }
    }
  );

  const updateSessionSets = useMutation(api.workouts.updateSessionSets);
  const updateWorkout = useMutation(api.workouts.updateWorkout);

  // Define completeWorkout function early to avoid hoisting issues
  const completeWorkout = async () => {
    try {
      // Note: saveProgress is defined later, this may need adjustment
      // await saveProgress();
      // Show completion modal instead of completing immediately
      setShowCompletionModal(true);
    } catch (error) {
      console.error('Error saving progress before completion:', error);
      toast.error('Failed to save progress. Please try again.');
    }
  };

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - sessionStartTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when not in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (currentExerciseIndex > 0) {
            setCurrentExerciseIndex(prev => prev - 1);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (currentExerciseIndex < exercises.length - 1) {
            setCurrentExerciseIndex(prev => prev + 1);
          } else if (currentExerciseIndex === exercises.length - 1) {
            // Show completion modal when on last exercise and pressing right arrow
            completeWorkout();
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (showCompletionModal) {
            setShowCompletionModal(false);
          } else {
            router.back();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentExerciseIndex, exercises.length, showCompletionModal, router, completeWorkout]);

  // Check for draft recovery on mount
  useEffect(() => {
    if (hasDraft && draftData && showOfflineRecovery) {
      showRecovery(draftData);
    }
  }, [hasDraft, draftData, showOfflineRecovery, showRecovery]);

  // Initialize exercises from template data (since session exercises may be empty for new workouts)
  useEffect(() => {
    if (session?.template?.exercises && exercises.length === 0) {
      const initialExercises: ExerciseSession[] = session.template.exercises.map((ex: any) => ({
        templateExerciseId: ex._id,
        exerciseName: ex.exerciseName,
        sets: Array.from({ length: 3 }, () => ({
          reps: 0,
          weight: 0,
          completed: false
        })),
        previousBest: ex.previousBest
      }));
      setExercises(initialExercises);
    }
  }, [session, exercises.length]);

  // Recovery handlers
  const handleRecoverDraft = () => {
    const recovered = recoverDraft();
    if (recovered && recovered.exercises) {
      setExercises(recovered.exercises);
      setCurrentExerciseIndex(recovered.currentExerciseIndex || 0);
      setUnit(recovered.unit || 'kg');
      toast.success('Workout recovered successfully!');
    }
    hideRecovery();
  };

  const handleDiscardDraft = () => {
    discardDraft();
    hideRecovery();
    toast.info('Draft discarded');
  };

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => {
    setExercises(prev => prev.map((ex, i) => 
      i === exerciseIndex 
        ? {
            ...ex,
            sets: ex.sets.map((set, si) => 
              si === setIndex 
                ? { ...set, [field]: Math.max(0, value) }
                : set
            )
          }
        : ex
    ));
  };

  const toggleSetCompleted = (exerciseIndex: number, setIndex: number) => {
    setExercises(prev => prev.map((ex, i) => 
      i === exerciseIndex 
        ? {
            ...ex,
            sets: ex.sets.map((set, si) => 
              si === setIndex 
                ? { ...set, completed: !set.completed }
                : set
            )
          }
        : ex
    ));
  };

  const addSet = (exerciseIndex: number) => {
    setExercises(prev => prev.map((ex, i) => 
      i === exerciseIndex 
        ? {
            ...ex,
            sets: [...ex.sets, { reps: 0, weight: 0, completed: false }]
          }
        : ex
    ));
  };

  const addExercise = () => {
    const newExercise: ExerciseSession = {
      templateExerciseId: `custom-${Date.now()}`,
      exerciseName: "New Exercise",
      sets: [{ reps: 0, weight: 0, completed: false }],
    };
    setExercises(prev => [...prev, newExercise]);
  };

  const removeExercise = (exerciseIndex: number) => {
    if (exercises.length <= 1) {
      toast.error("Cannot remove the last exercise");
      return;
    }
    
    setExercises(prev => prev.filter((_, i) => i !== exerciseIndex));
    
    // Adjust current exercise index if necessary
    if (currentExerciseIndex >= exercises.length - 1) {
      setCurrentExerciseIndex(prev => Math.max(0, prev - 1));
    }
  };

  const substituteExercise = (exerciseIndex: number, newExerciseName: string) => {
    setExercises(prev => prev.map((ex, i) => 
      i === exerciseIndex 
        ? { ...ex, exerciseName: newExerciseName }
        : ex
    ));
  };

  const openSubstitutionModal = (exerciseIndex: number) => {
    setSubstitutionExerciseIndex(exerciseIndex);
    setShowSubstitutionModal(true);
  };

  const handleExerciseSubstitution = (newExerciseName: string) => {
    if (substitutionExerciseIndex !== null) {
      substituteExercise(substitutionExerciseIndex, newExerciseName);
    }
    setShowSubstitutionModal(false);
    setSubstitutionExerciseIndex(null);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise || exercise.sets.length <= 1) return;
    
    setExercises(prev => prev.map((ex, i) => 
      i === exerciseIndex 
        ? {
            ...ex,
            sets: ex.sets.filter((_, si) => si !== setIndex)
          }
        : ex
    ));
  };

  const saveProgress = async () => {
    try {
      const updates = exercises.flatMap((exercise, exerciseIndex) =>
        exercise.sets.map((set, setIndex) => ({
          setId: `${exercise.templateExerciseId}_${setIndex}`,
          exerciseName: exercise.exerciseName,
          setIndex,
          weight: set.weight,
          reps: set.reps,
          unit
        }))
      );

      await updateSessionSets({
        sessionId,
        updates
      });

      // Also force save to offline storage
      await forceSave();

      toast.success("Progress saved!");
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress. Please try again.');
    }
  };


  const handleWorkoutCompletion = async () => {
    try {
      setIsCompletingWorkout(true);
      
      await updateWorkout({
        sessionId: sessionId,
        exercises: exercises.flatMap((exercise, exerciseIndex) =>
          exercise.sets.map((set, setIndex) => ({
            templateExerciseId: exercise.templateExerciseId as Id<"templateExercises">,
            exerciseName: exercise.exerciseName,
            sets: [{
              id: `${exercise.templateExerciseId}_${setIndex}`,
              weight: set.weight,
              reps: set.reps,
              sets: 1,
              unit
            }],
            unit
          }))
        )
      });

      toast.success("Workout completed! 🎉");
      router.push('/workouts');
    } catch (error) {
      console.error('Error completing workout:', error);
      toast.error('Failed to complete workout. Please try again.');
    } finally {
      setIsCompletingWorkout(false);
    }
  };

  // Prepare completion data for the modal
  const completionData = prepareCompletionData(exercises, []);

  const nextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  };

  const previousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  };

  // Loading state
  if (session === undefined) {
    return <SkeletonScreen />;
  }

  // Error state
  if (session === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <GlassSurface className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Session Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The workout session you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => router.push('/workouts')}>
            Back to Workouts
          </Button>
        </GlassSurface>
      </div>
    );
  }

  const currentExercise = exercises[currentExerciseIndex];
  const completedSets = currentExercise?.sets.filter(set => set.completed).length || 0;
  const totalSets = currentExercise?.sets.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {session.template?.name || 'Workout Session'}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Timer className="w-4 h-4" />
                  {formatTime(elapsedTime)}
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  {currentExerciseIndex + 1} of {exercises.length}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setUnit(unit === "kg" ? "lbs" : "kg")}
            >
              {unit}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={saveProgress}
              className={cn(isDirty && "border-orange-200 bg-orange-50")}
            >
              <Save className={cn("w-4 h-4", isDirty && "text-orange-600")} />
              {isDirty && <span className="ml-1 text-xs">•</span>}
            </Button>
          </div>
        </motion.div>

        {/* Exercise Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <GlassSurface className="p-4">
            <div className="flex justify-between items-center mb-3">
              {exercises.map((_, index) => (
                <div 
                  key={index}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    index === currentExerciseIndex 
                      ? "bg-primary text-primary-foreground" 
                      : index < currentExerciseIndex 
                      ? "bg-green-500 text-white" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index < currentExerciseIndex ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
              ))}
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentExerciseIndex + (completedSets / totalSets)) / exercises.length) * 100}%` }}
              />
            </div>
          </GlassSurface>
        </motion.div>

        {/* Current Exercise */}
        {currentExercise && (
          <motion.div
            key={currentExerciseIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <GlassSurface className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <Dumbbell className="w-5 h-5 text-primary" />
                      {currentExercise.exerciseName}
                    </h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{completedSets} of {totalSets} sets completed</span>
                      {currentExercise.previousBest && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Best: {currentExercise.previousBest.weight}{unit} × {currentExercise.previousBest.reps}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Exercise modification controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openSubstitutionModal(currentExerciseIndex)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    {exercises.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExercise(currentExerciseIndex)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Sets */}
                <div className="space-y-3">
                  {currentExercise.sets.map((set, setIndex) => (
                    <div 
                      key={setIndex}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all",
                        set.completed 
                          ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
                          : "bg-muted/50 border-border"
                      )}
                    >
                      <span className="text-sm font-medium w-8 text-center">
                        {setIndex + 1}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Weight"
                          value={set.weight || ""}
                          onChange={(e) => updateSet(currentExerciseIndex, setIndex, 'weight', parseInt(e.target.value) || 0)}
                          className="w-20 h-8 text-center"
                        />
                        <span className="text-xs text-muted-foreground">{unit}</span>
                      </div>
                      
                      <span className="text-sm text-muted-foreground">×</span>
                      
                      <Input
                        type="number"
                        placeholder="Reps"
                        value={set.reps || ""}
                        onChange={(e) => updateSet(currentExerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                        className="w-16 h-8 text-center"
                      />
                      
                      <Button
                        size="sm"
                        variant={set.completed ? "default" : "outline"}
                        onClick={() => toggleSetCompleted(currentExerciseIndex, setIndex)}
                        className="ml-auto"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      
                      {currentExercise.sets.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSet(currentExerciseIndex, setIndex)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addSet(currentExerciseIndex)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4" />
                  Add Set
                </Button>
              </div>
            </GlassSurface>
          </motion.div>
        )}

        {/* Add Exercise Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center"
        >
          <Button
            variant="outline"
            onClick={addExercise}
            className="w-full max-w-xs"
          >
            <Plus className="w-4 h-4" />
            Add Exercise
          </Button>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex gap-3"
        >
          <Button
            variant="outline"
            onClick={previousExercise}
            disabled={currentExerciseIndex === 0}
            className="flex-1"
          >
            Previous Exercise
          </Button>
          
          {currentExerciseIndex === exercises.length - 1 ? (
            <Button
              onClick={completeWorkout}
              className="flex-1"
              haptic
            >
              <Check className="w-4 h-4" />
              Complete Workout
            </Button>
          ) : (
            <Button
              onClick={nextExercise}
              className="flex-1"
              haptic
            >
              Next Exercise
            </Button>
          )}
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-sm text-muted-foreground"
        >
          <p>
            Session Progress: {exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0)} sets completed
          </p>
        </motion.div>
      </div>

      {/* Workout Completion Modal */}
      <WorkoutCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        onConfirm={handleWorkoutCompletion}
        workoutStats={completionData.stats}
        exerciseComparisons={completionData.comparisons}
        isLoading={isCompletingWorkout}
        workoutId={sessionId}
        templateId={session?.templateId}
        workoutName={session?.template?.name}
      />

      {/* Workout Recovery Modal */}
      <WorkoutRecoveryModal
        isOpen={showRecoveryModal}
        onRecover={handleRecoverDraft}
        onDiscard={handleDiscardDraft}
        onClose={hideRecovery}
        draftData={recoveryData}
      />

      {/* Exercise Substitution Modal */}
      {substitutionExerciseIndex !== null && (
        <ExerciseSubstitutionModal
          isOpen={showSubstitutionModal}
          onClose={() => {
            setShowSubstitutionModal(false);
            setSubstitutionExerciseIndex(null);
          }}
          exerciseName={exercises[substitutionExerciseIndex]?.exerciseName || ""}
          onSubstitute={handleExerciseSubstitution}
        />
      )}
    </div>
  );
}