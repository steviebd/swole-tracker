import { useState } from "react";

interface MasterExercise {
  id: number;
  name: string;
  normalizedName: string;
  tags?: string | null;
  muscleGroup?: string | null;
  createdAt: Date;
  linkedCount: number;
}

export function useBulkOperations(onSuccess: () => void) {
  const [selectedExercises, setSelectedExercises] = useState<MasterExercise[]>(
    [],
  );

  const handleBulkDelete = () => {
    alert("Bulk delete functionality not yet implemented");
    setSelectedExercises([]);
    onSuccess();
  };

  const clearSelection = () => {
    setSelectedExercises([]);
  };

  return {
    selectedExercises,
    handleBulkDelete,
    clearSelection,
  };
}
