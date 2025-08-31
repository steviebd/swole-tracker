"use client";

import { Dumbbell, ChevronDown, ChevronUp, TrendingUp, Target } from "lucide-react";
import { cn } from "~/lib/utils";

interface PreviousBest {
  weight?: number;
  reps?: number;
  sets?: number;
  unit: "kg" | "lbs";
}

interface ExerciseHeaderProps {
  name: string;
  isExpanded: boolean;
  isSwiped: boolean;
  readOnly: boolean;
  previousBest?: PreviousBest;
  currentBest?: {
    weight?: number;
    reps?: number;
    unit: "kg" | "lbs";
  };
  completedSets?: number;
  totalSets?: number;
  onToggleExpansion: (exerciseIndex: number) => void;
  onSwipeToBottom?: (exerciseIndex: number) => void;
  exerciseIndex: number;
}

export function ExerciseHeader({
  name,
  isExpanded,
  isSwiped,
  readOnly,
  previousBest,
  currentBest,
  completedSets = 0,
  totalSets = 0,
  onToggleExpansion,
  exerciseIndex,
}: ExerciseHeaderProps) {
  const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const isComplete = completedSets === totalSets && totalSets > 0;
  const hasProgress = completedSets > 0;

  // Compare current vs previous performance
  const getPerformanceIndicator = () => {
    if (!currentBest || !previousBest || !currentBest.weight || !previousBest.weight) {
      return null;
    }
    
    const currentTotal = currentBest.weight * (currentBest.reps || 1);
    const previousTotal = previousBest.weight * (previousBest.reps || 1);
    
    if (currentTotal > previousTotal) {
      return { type: 'improvement', value: '+' + ((currentTotal - previousTotal) / previousTotal * 100).toFixed(1) + '%' };
    } else if (currentTotal < previousTotal) {
      return { type: 'decline', value: '-' + ((previousTotal - currentTotal) / previousTotal * 100).toFixed(1) + '%' };
    }
    return { type: 'same', value: '=' };
  };

  const performanceIndicator = getPerformanceIndicator();

  return (
    <div className="flex items-start justify-between gap-3 mb-2">
      {/* Exercise Info */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Exercise Icon with Status */}
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 shrink-0",
          isComplete 
            ? "bg-green-500 text-white" 
            : hasProgress
            ? "bg-blue-500 text-white"
            : "bg-muted text-muted-foreground"
        )}>
          <Dumbbell className="w-5 h-5" />
        </div>
        
        {/* Exercise Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn(
              "font-semibold leading-tight transition-colors truncate",
              "text-base sm:text-lg",
              isComplete ? "text-green-700 dark:text-green-300" : "text-foreground"
            )}>
              {name}
            </h3>
            
            {/* Performance Indicator */}
            {performanceIndicator && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0",
                performanceIndicator.type === 'improvement' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                performanceIndicator.type === 'decline' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                performanceIndicator.type === 'same' && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
              )}>
                <TrendingUp className="w-3 h-3" />
                {performanceIndicator.value}
              </div>
            )}
          </div>
          
          {/* Progress and Previous Best */}
          <div className="mt-1 space-y-1">
            {/* Set Progress */}
            {totalSets > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="w-3 h-3" />
                <span>
                  {completedSets}/{totalSets} sets
                  {isComplete && " ✓"}
                </span>
                {/* Progress Bar */}
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300 rounded-full",
                      isComplete 
                        ? "bg-green-500" 
                        : hasProgress 
                        ? "bg-blue-500" 
                        : "bg-muted"
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Previous Best */}
            {previousBest && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3 opacity-60" />
                <span>
                  Previous: {previousBest.weight}{previousBest.unit}
                  {previousBest.reps && ` × ${previousBest.reps}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Action Area */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Swiped Indicator */}
        {isSwiped && (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs rounded-full font-medium">
            Moved
          </span>
        )}
        
        {/* Expand/Collapse Button - Larger touch target for mobile */}
        <button
          type="button"
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
            "hover:bg-muted active:bg-muted/80",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            readOnly && "opacity-50 cursor-not-allowed"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (!readOnly) {
              onToggleExpansion(exerciseIndex);
            }
          }}
          disabled={readOnly}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${name}`}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

export default ExerciseHeader;
