import { useState, useMemo } from 'react';

interface MasterExercise {
  id: number;
  name: string;
  normalizedName: string;
  tags?: string | null;
  muscleGroup?: string | null;
  createdAt: Date;
  linkedCount: number;
}

interface ExerciseFilters {
  muscleGroups: string[];
  equipment: string[];
  difficulty: string[];
}

export function useExerciseFilters(exercises: MasterExercise[]) {
  const [filters, setFilters] = useState<ExerciseFilters>({
    muscleGroups: [],
    equipment: [],
    difficulty: [],
  });

  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      // Filter by muscle groups
      if (filters.muscleGroups.length > 0 && exercise.muscleGroup) {
        if (!filters.muscleGroups.includes(exercise.muscleGroup)) {
          return false;
        }
      }

      // Filter by equipment (from tags)
      if (filters.equipment.length > 0 && exercise.tags) {
        const exerciseEquipment = exercise.tags.split(',').map(tag => tag.trim());
        if (!filters.equipment.some(equip => exerciseEquipment.includes(equip))) {
          return false;
        }
      }

      // Filter by difficulty (from tags)
      if (filters.difficulty.length > 0 && exercise.tags) {
        const exerciseDifficulty = exercise.tags.split(',').map(tag => tag.trim());
        if (!filters.difficulty.some(diff => exerciseDifficulty.includes(diff))) {
          return false;
        }
      }

      return true;
    });
  }, [exercises, filters]);

  return { filters, setFilters, filteredExercises };
}