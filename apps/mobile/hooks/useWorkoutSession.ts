import { useState, useEffect } from 'react';
import type { SetInput } from '../lib/shared-types';

interface ExerciseData {
  templateExerciseId?: number;
  exerciseName: string;
  sets: SetInput[];
  unit: 'kg' | 'lbs';
}

export function useWorkoutSession(initialExercises: ExerciseData[] = []) {
  const [exercises, setExercises] = useState<ExerciseData[]>(initialExercises);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  const generateNewSet = (): SetInput => ({
    id: Math.random().toString(36).substr(2, 9),
    weight: undefined,
    reps: undefined,
    sets: 1,
    unit: 'kg',
    rpe: undefined,
    rest: undefined,
    isEstimate: false,
    isDefaultApplied: false,
  });

  const updateSet = (exerciseIndex: number, setIndex: number, updates: Partial<SetInput>) => {
    setExercises(prev => {
      const newExercises = [...prev];
      const exercise = newExercises[exerciseIndex];
      if (exercise && exercise.sets[setIndex]) {
        exercise.sets[setIndex] = { ...exercise.sets[setIndex], ...updates };
      }
      return newExercises;
    });
  };

  const addSet = (exerciseIndex: number) => {
    setExercises(prev => {
      const newExercises = [...prev];
      const exercise = newExercises[exerciseIndex];
      if (exercise) {
        // Copy data from previous set if available
        const previousSet = exercise.sets[exercise.sets.length - 1];
        const newSet = generateNewSet();
        
        if (previousSet) {
          newSet.weight = previousSet.weight;
          newSet.unit = previousSet.unit;
          // Don't copy reps or RPE as these typically change between sets
        }
        
        exercise.sets.push(newSet);
      }
      return newExercises;
    });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setExercises(prev => {
      const newExercises = [...prev];
      const exercise = newExercises[exerciseIndex];
      if (exercise && exercise.sets.length > 1) {
        exercise.sets.splice(setIndex, 1);
      }
      return newExercises;
    });
  };

  const toggleUnit = (exerciseIndex: number) => {
    setExercises(prev => {
      const newExercises = [...prev];
      const exercise = newExercises[exerciseIndex];
      if (exercise) {
        const newUnit = exercise.unit === 'kg' ? 'lbs' : 'kg';
        exercise.unit = newUnit;
        // Update all sets in this exercise
        exercise.sets.forEach(set => {
          set.unit = newUnit;
          // Optionally convert weights
          if (set.weight) {
            set.weight = newUnit === 'lbs' 
              ? Math.round(set.weight * 2.20462 * 10) / 10 
              : Math.round(set.weight / 2.20462 * 10) / 10;
          }
        });
      }
      return newExercises;
    });
  };

  const getWorkoutProgress = () => {
    const totalExercises = exercises.length;
    const completedExercises = exercises.filter(ex => 
      ex.sets.some(set => set.weight && set.reps)
    ).length;
    
    return {
      completed: completedExercises,
      total: totalExercises,
      percentage: totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0,
    };
  };

  const getExerciseProgress = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise) return { completed: 0, total: 0, percentage: 0 };
    
    const totalSets = exercise.sets.length;
    const completedSets = exercise.sets.filter(set => set.weight && set.reps).length;
    
    return {
      completed: completedSets,
      total: totalSets,
      percentage: totalSets > 0 ? (completedSets / totalSets) * 100 : 0,
    };
  };

  const isWorkoutValid = () => {
    return exercises.some(exercise => 
      exercise.sets.some(set => set.weight && set.reps)
    );
  };

  return {
    exercises,
    setExercises,
    currentExerciseIndex,
    setCurrentExerciseIndex,
    updateSet,
    addSet,
    removeSet,
    toggleUnit,
    generateNewSet,
    getWorkoutProgress,
    getExerciseProgress,
    isWorkoutValid,
  };
}