import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

interface MasterExercise {
  id: number;
  name: string;
  normalizedName: string;
  tags?: string | null;
  muscleGroup?: string | null;
  createdAt: Date;
  linkedCount: number;
}

interface ExerciseToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onCreateExercise: () => void;
  mergeMode: boolean;
  onToggleMergeMode: () => void;
  selectedForMerge: MasterExercise[];
  onMergeSelected: () => void;
  selectedExercises: MasterExercise[];
  onBulkDelete: () => void;
  onResetTable: () => void;
}

export function ExerciseToolbar({
  searchTerm,
  onSearchChange,
  onCreateExercise,
  mergeMode,
  onToggleMergeMode,
  selectedForMerge,
  onMergeSelected,
  selectedExercises,
  onBulkDelete,
  onResetTable,
}: ExerciseToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          type="text"
          placeholder="Search exercises, tags, or muscle groups..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1"
          aria-label="Search exercises"
        />
        <Button onClick={onCreateExercise} size="sm">
          Create Exercise
        </Button>
        <Button
          onClick={onToggleMergeMode}
          variant={mergeMode ? "destructive" : "outline"}
          size="sm"
        >
          {mergeMode ? "Cancel Merge" : "Merge Exercises"}
        </Button>
        {selectedExercises.length > 0 && (
          <Button
            onClick={onBulkDelete}
            variant="destructive"
            size="sm"
          >
            Delete Selected ({selectedExercises.length})
          </Button>
        )}
        <Button
          onClick={onResetTable}
          variant="outline"
          size="sm"
          title="Reset table to default state"
        >
          Reset Table
        </Button>
      </div>

      {/* Merge Mode Instructions */}
      {mergeMode && (
        <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-950/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                Merge Mode Active
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Select 2 exercises to merge. The first selected will be merged
                into the second.
              </p>
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                Selected: {selectedForMerge.map((e) => e.name).join(", ")}
              </p>
            </div>
            <Button
              onClick={onMergeSelected}
              disabled={selectedForMerge.length !== 2}
              size="sm"
            >
              Merge Selected ({selectedForMerge.length}/2)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}