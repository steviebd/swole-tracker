"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  Dumbbell,
  CheckCircle,
  X,
  RotateCcw,
  Trash2
} from "lucide-react";
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
import { Separator } from "~/components/ui/separator";
import { formatDistanceToNow } from "date-fns";

interface WorkoutRecoveryModalProps {
  isOpen: boolean;
  onRecover: () => void;
  onDiscard: () => void;
  onClose: () => void;
  draftData?: {
    workoutName?: string;
    exercises?: any[];
    savedAt?: number;
    sessionDuration?: number;
    completedSets?: number;
    totalSets?: number;
  };
}

export function WorkoutRecoveryModal({
  isOpen,
  onRecover,
  onDiscard,
  onClose,
  draftData
}: WorkoutRecoveryModalProps) {
  const [isRecovering, setIsRecovering] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  if (!draftData) return null;

  const handleRecover = async () => {
    setIsRecovering(true);
    try {
      onRecover();
      onClose();
    } catch (error) {
      console.error('Recovery failed:', error);
    } finally {
      setIsRecovering(false);
    }
  };

  const handleDiscard = async () => {
    setIsDiscarding(true);
    try {
      onDiscard();
      onClose();
    } catch (error) {
      console.error('Discard failed:', error);
    } finally {
      setIsDiscarding(false);
    }
  };

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const completionPercentage = draftData.totalSets 
    ? Math.round((draftData.completedSets || 0) / draftData.totalSets * 100)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={() => !isRecovering && !isDiscarding && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-orange-500" />
            <DialogTitle>Recover Workout</DialogTitle>
          </div>
          <DialogDescription>
            We found an unsaved workout from your last session. Would you like to recover it?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Workout Preview */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                <span className="font-medium">
                  {draftData.workoutName || 'Unnamed Workout'}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                Draft
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Last saved:</div>
                <div className="font-medium">
                  {draftData.savedAt 
                    ? formatDistanceToNow(draftData.savedAt, { addSuffix: true })
                    : 'Unknown'
                  }
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground">Session time:</div>
                <div className="font-medium">
                  {draftData.sessionDuration 
                    ? formatDuration(draftData.sessionDuration)
                    : 'Unknown'
                  }
                </div>
              </div>
            </div>

            {/* Progress indicator */}
            {draftData.totalSets && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {draftData.completedSets || 0} / {draftData.totalSets} sets
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1 text-right">
                  {completionPercentage}% complete
                </div>
              </div>
            )}

            {/* Exercise preview */}
            {draftData.exercises && draftData.exercises.length > 0 && (
              <div className="mt-4">
                <Separator className="mb-3" />
                <div className="text-sm text-muted-foreground mb-2">
                  Exercises ({draftData.exercises.length})
                </div>
                <div className="space-y-1">
                  {draftData.exercises.slice(0, 3).map((exercise, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <span className="truncate">{exercise.exerciseName || exercise.name}</span>
                      {exercise.sets && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {exercise.sets.length} sets
                        </Badge>
                      )}
                    </div>
                  ))}
                  {draftData.exercises.length > 3 && (
                    <div className="text-xs text-muted-foreground pl-4">
                      +{draftData.exercises.length - 3} more exercises
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Warning message */}
          <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-orange-700 dark:text-orange-300 mb-1">
                Recovery Options
              </div>
              <div className="text-orange-600 dark:text-orange-400">
                <strong>Recover:</strong> Continue your workout from where you left off.
                <br />
                <strong>Discard:</strong> Start fresh and permanently delete this draft.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleDiscard}
            disabled={isRecovering || isDiscarding}
            className="text-red-600 hover:text-red-700"
          >
            {isDiscarding && <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            <Trash2 className="w-4 h-4 mr-2" />
            Discard
          </Button>
          <Button
            onClick={handleRecover}
            disabled={isRecovering || isDiscarding}
            className="flex-1"
          >
            {isRecovering && <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            <RotateCcw className="w-4 h-4 mr-2" />
            Recover Workout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing workout recovery state
export function useWorkoutRecovery() {
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryData, setRecoveryData] = useState<any>(null);

  const showRecovery = (draftData: any) => {
    setRecoveryData(draftData);
    setShowRecoveryModal(true);
  };

  const hideRecovery = () => {
    setShowRecoveryModal(false);
    setRecoveryData(null);
  };

  return {
    showRecoveryModal,
    recoveryData,
    showRecovery,
    hideRecovery
  };
}