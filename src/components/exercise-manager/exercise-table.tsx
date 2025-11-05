import { Fragment } from "react";
import { DataTable } from "~/components/ui/data-table";
import { useExerciseTable } from "~/hooks/use-exercise-table";
import { ExerciseDetails } from "./exercise-details";

interface MasterExercise {
  id: number;
  name: string;
  normalizedName: string;
  tags?: string | null;
  muscleGroup?: string | null;
  createdAt: Date;
  linkedCount: number;
}

interface ExerciseTableProps {
  exercises: MasterExercise[];
  searchTerm: string;
  onEditExercise: (exercise: MasterExercise) => void;
  onMergeExercise: (exercise: MasterExercise) => void;
  onToggleExerciseSelection: (exercise: MasterExercise) => void;
  selectedForMerge: MasterExercise[];
  onUpdate: () => void;
}

export function ExerciseTable({
  exercises,
  searchTerm,
  onEditExercise,
  onMergeExercise,
  onToggleExerciseSelection,
  selectedForMerge,
  onUpdate,
}: ExerciseTableProps) {
  const { table } = useExerciseTable(exercises);

  // Override the table's global filter with our search term
  table.setGlobalFilter(searchTerm);

  return (
    <div className="space-y-4">
      <DataTable table={table} />

      {/* Expanded rows with details */}
      {table.getRowModel().rows.map((row) => {
        const exercise = row.original;
        const isSelectedForMerge = selectedForMerge.some(
          (e) => e.id === exercise.id,
        );

        if (!row.getIsExpanded()) return null;

        return (
          <div
            key={`details-${row.id}`}
            className={`bg-muted/50 border-t p-4 ${
              isSelectedForMerge ? "bg-blue-50 dark:bg-blue-950/50" : ""
            }`}
          >
            <ExerciseDetails
              masterExerciseId={exercise.id}
              masterExerciseName={exercise.name}
              normalizedName={exercise.normalizedName}
              onUpdate={onUpdate}
            />
          </div>
        );
      })}
    </div>
  );
}