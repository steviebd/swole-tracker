"use client";

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useVirtualList, usePerformanceMonitor } from '~/hooks/useVirtualization';
import { cn } from '~/lib/utils';

interface VirtualizedWorkoutListProps {
  exercises: any[];
  renderItem: (exercise: any, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  className?: string;
  onScrollToIndex?: (index: number) => void;
}

/**
 * Optimized virtualized list for large workout sessions (20+ exercises)
 * 
 * Features:
 * - Virtual scrolling for performance
 * - Smooth animations
 * - Memory efficient rendering
 * - Performance monitoring
 */
const VirtualizedWorkoutList = memo<VirtualizedWorkoutListProps>(({
  exercises,
  renderItem,
  itemHeight,
  containerHeight,
  className,
  onScrollToIndex
}) => {
  const { renderCount, averageRenderTime } = usePerformanceMonitor('VirtualizedWorkoutList');

  const virtualization = useVirtualList(exercises, {
    itemHeight,
    containerHeight,
    overscan: 3, // Render 3 items above/below viewport
    threshold: 10 // Start virtualizing at 10+ items
  });

  const scrollToIndex = useMemo(() => {
    return (index: number) => {
      if (onScrollToIndex) {
        onScrollToIndex(index);
      }
    };
  }, [onScrollToIndex]);

  return (
    <div 
      className={cn("relative", className)}
      {...virtualization.containerProps}
    >
      <div {...virtualization.scrollElementProps}>
        {virtualization.visibleItems.map((item) => (
          <motion.div
            key={item.index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.2,
              delay: item.index * 0.05 // Stagger animations slightly
            }}
            style={{
              position: 'absolute',
              top: item.start,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item.data, item.index)}
          </motion.div>
        ))}
      </div>

      {/* Performance indicator in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white text-xs p-2 rounded">
          <div>Renders: {renderCount}</div>
          <div>Avg: {averageRenderTime.toFixed(1)}ms</div>
          <div>Items: {exercises.length}</div>
          <div>Visible: {virtualization.visibleItems.length}</div>
        </div>
      )}
    </div>
  );
});

VirtualizedWorkoutList.displayName = 'VirtualizedWorkoutList';

export default VirtualizedWorkoutList;

// Memoized exercise item component for optimal rendering
export const MemoizedExerciseItem = memo<{
  exercise: any;
  index: number;
  onUpdate?: (exercise: any) => void;
  onRemove?: (index: number) => void;
  children: React.ReactNode;
}>(({ exercise, index, onUpdate, onRemove, children }) => {
  const { renderCount } = usePerformanceMonitor(`ExerciseItem-${index}`);

  return (
    <div 
      className="w-full h-full p-2"
      data-exercise-index={index}
      data-render-count={renderCount}
    >
      {children}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for optimal re-rendering
  return (
    prevProps.exercise === nextProps.exercise &&
    prevProps.index === nextProps.index &&
    prevProps.onUpdate === nextProps.onUpdate &&
    prevProps.onRemove === nextProps.onRemove
  );
});

MemoizedExerciseItem.displayName = 'MemoizedExerciseItem';

// High-performance set input component
export const MemoizedSetInput = memo<{
  set: any;
  setIndex: number;
  exerciseIndex: number;
  onUpdate: (field: string, value: any) => void;
  className?: string;
}>(({ set, setIndex, exerciseIndex, onUpdate, className }) => {
  const { renderCount } = usePerformanceMonitor(`SetInput-${exerciseIndex}-${setIndex}`);

  // Memoize handlers to prevent unnecessary re-renders
  const handleWeightChange = useMemo(() => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate('weight', parseInt(e.target.value) || 0);
    };
  }, [onUpdate]);

  const handleRepsChange = useMemo(() => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate('reps', parseInt(e.target.value) || 0);
    };
  }, [onUpdate]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        type="number"
        value={set.weight || ""}
        onChange={handleWeightChange}
        className="w-20 h-8 px-2 text-center border rounded"
        placeholder="Weight"
        aria-label={`Set ${setIndex + 1} weight`}
      />
      <span className="text-sm text-muted-foreground">×</span>
      <input
        type="number"
        value={set.reps || ""}
        onChange={handleRepsChange}
        className="w-16 h-8 px-2 text-center border rounded"
        placeholder="Reps"
        aria-label={`Set ${setIndex + 1} repetitions`}
      />
      {process.env.NODE_ENV === 'development' && (
        <span className="text-xs text-muted-foreground">R:{renderCount}</span>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.set.weight === nextProps.set.weight &&
    prevProps.set.reps === nextProps.set.reps &&
    prevProps.setIndex === nextProps.setIndex &&
    prevProps.exerciseIndex === nextProps.exerciseIndex
  );
});

MemoizedSetInput.displayName = 'MemoizedSetInput';

// Conservative loading wrapper for heavy components
export const LazyLoadWrapper = memo<{
  children: React.ReactNode;
  isVisible: boolean;
  fallback?: React.ReactNode;
  threshold?: number;
}>(({ children, isVisible, fallback = null, threshold = 100 }) => {
  const [shouldRender, setShouldRender] = React.useState(isVisible);

  React.useEffect(() => {
    if (isVisible && !shouldRender) {
      // Add a small delay to prevent render thrashing
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, threshold);
      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldRender, threshold]);

  if (!shouldRender) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
});

LazyLoadWrapper.displayName = 'LazyLoadWrapper';