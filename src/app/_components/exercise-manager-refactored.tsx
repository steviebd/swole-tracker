"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { useExerciseMutations } from "~/hooks/use-exercise-mutations";
import { useBulkOperations } from "~/hooks/use-bulk-operations";
import { useExerciseFilters } from "~/hooks/use-exercise-filters";
import { ExerciseTable } from "~/components/exercise-manager/exercise-table";
import { ExerciseToolbar } from "~/components/exercise-manager/exercise-toolbar";
import { CreateEditExerciseDialog } from "~/components/exercise-manager/create-edit-exercise-dialog";
import { MergeExerciseDialog } from "~/components/exercise-manager/merge-exercise-dialog";

interface MasterExercise {
  id: number;
  name: string;
  normalizedName: string;
  tags?: string | null;
  muscleGroup?: string | null;
  createdAt: Date;
  linkedCount: number;
}

export function ExerciseManager() {
  const [isClient, setIsClient] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingExercise, setEditingExercise] = useState<MasterExercise | null>(
    null,
  );
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<MasterExercise[]>(
    [],
  );
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const utils = api.useUtils();

  const {
    data: exercises,
    isLoading,
    refetch,
  } = api.exercises.getAllMaster.useQuery();

  const { data: migrationStatus } = api.exercises.getMigrationStatus.useQuery();

  // Custom hooks
  const exercisesArray: MasterExercise[] = exercises || [];
  const { filters, setFilters, filteredExercises } =
    useExerciseFilters(exercisesArray);

  const { selectedExercises, handleBulkDelete, clearSelection } =
    useBulkOperations(() => {
      void refetch();
    });

  const {
    createMasterExercise,
    updateMasterExercise,
    mergeMasterExercises,
    migrateExistingExercises,
  } = useExerciseMutations(() => {
    void refetch();
  });

  // Ensure client-side rendering after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleEditExercise = useCallback((exercise: MasterExercise) => {
    setEditingExercise(exercise);
  }, []);

  const handleMergeSelection = useCallback(
    (exercise: MasterExercise) => {
      if (selectedForMerge.find((e) => e.id === exercise.id)) {
        // Deselect
        setSelectedForMerge(
          selectedForMerge.filter((e) => e.id !== exercise.id),
        );
      } else {
        // Select (max 2)
        if (selectedForMerge.length < 2) {
          setSelectedForMerge([...selectedForMerge, exercise]);
        }
      }
    },
    [selectedForMerge],
  );

  const handleMergeExercises = () => {
    if (selectedForMerge.length === 2) {
      setShowMergeDialog(true);
    }
  };

  const confirmMerge = () => {
    if (selectedForMerge.length === 2) {
      const [source, target] = selectedForMerge as [
        MasterExercise,
        MasterExercise,
      ];
      if (source.id === target.id) {
        alert("Cannot merge an exercise with itself");
        return;
      }
      mergeMasterExercises.mutate({
        sourceId: source.id,
        targetId: target.id,
      });
    }
  };

  const cancelMerge = () => {
    setMergeMode(false);
    setSelectedForMerge([]);
  };

  const handleCreateExercise = (data: {
    name: string;
    tags: string;
    muscleGroup: string;
  }) => {
    createMasterExercise.mutate({
      name: data.name,
      tags: data.tags || undefined,
      muscleGroup: data.muscleGroup || undefined,
    });
  };

  const handleUpdateExercise = (data: {
    name: string;
    tags: string;
    muscleGroup: string;
  }) => {
    if (editingExercise) {
      updateMasterExercise.mutate({
        id: editingExercise.id,
        name: data.name,
        tags: data.tags || undefined,
        muscleGroup: data.muscleGroup || undefined,
      });
    }
  };

  const handleToggleMergeMode = () => {
    if (mergeMode) {
      cancelMerge();
    } else {
      setMergeMode(true);
    }
  };

  const handleResetTable = () => {
    // Reset table state - this would be implemented with table state persistence
    alert("Reset table functionality coming soon");
  };

  // Show loading state during SSR and initial client render
  if (!isClient || isLoading) {
    return (
      <div className="space-y-4">
        {[...(Array(5) as number[])].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="bg-muted mb-2 h-4 w-1/4 rounded"></div>
              <div className="bg-muted h-3 w-1/6 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!exercises?.length) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-6xl">💪</div>
        <h3 className="mb-2 text-xl font-semibold">No exercises yet</h3>
        <p className="text-secondary mb-6">
          Exercises will appear here as you create workout templates and link
          them together.
        </p>
        <Button
          onClick={() => migrateExistingExercises.mutate()}
          disabled={migrateExistingExercises.isPending}
          size="lg"
          aria-label="Migrate existing exercises to linkable master exercises"
        >
          {migrateExistingExercises.isPending
            ? "Migrating..."
            : "Migrate Existing Exercises"}
        </Button>
        <p className="text-muted mt-2 text-xs">
          This will convert your existing template exercises into linkable
          master exercises.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Actions */}
      <ExerciseToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCreateExercise={() => setShowCreateDialog(true)}
        mergeMode={mergeMode}
        onToggleMergeMode={handleToggleMergeMode}
        selectedForMerge={selectedForMerge}
        onMergeSelected={handleMergeExercises}
        selectedExercises={selectedExercises}
        onBulkDelete={handleBulkDelete}
        onResetTable={handleResetTable}
      />

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {migrationStatus ? (
            <>
              {migrationStatus.needsMigration ? (
                <>
                  {migrationStatus.unlinkedCount} unlinked exercise
                  {migrationStatus.unlinkedCount !== 1 ? "s" : ""} found
                  {migrationStatus.lastMigrationAt && (
                    <span className="ml-2">
                      • Last migration:{" "}
                      {new Date(
                        migrationStatus.lastMigrationAt,
                      ).toLocaleDateString()}
                    </span>
                  )}
                </>
              ) : (
                <>
                  All exercises are linked
                  {migrationStatus.lastMigrationAt && (
                    <span className="ml-2">
                      • Last migration:{" "}
                      {new Date(
                        migrationStatus.lastMigrationAt,
                      ).toLocaleDateString()}
                    </span>
                  )}
                </>
              )}
            </>
          ) : (
            "Checking migration status..."
          )}
        </div>
        <Button
          onClick={() => migrateExistingExercises.mutate()}
          disabled={
            migrateExistingExercises.isPending ||
            !migrationStatus?.needsMigration
          }
          size="sm"
          aria-label="Migrate unlinked exercises to master exercises"
        >
          {migrateExistingExercises.isPending
            ? "Migrating..."
            : migrationStatus?.needsMigration
              ? "Migrate Unlinked Exercises"
              : "No Migration Needed"}
        </Button>
      </div>

      {/* Exercise List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            {filteredExercises.length} exercise
            {filteredExercises.length !== 1 ? "s" : ""} found
            {selectedExercises.length > 0 && (
              <span className="text-primary ml-2">
                • {selectedExercises.length} selected
              </span>
            )}
          </div>
        </div>

        <ExerciseTable
          exercises={filteredExercises}
          searchTerm={searchTerm}
          onEditExercise={handleEditExercise}
          onMergeExercise={handleMergeSelection}
          onToggleExerciseSelection={clearSelection}
          selectedForMerge={selectedForMerge}
          onUpdate={() => void refetch()}
        />
      </div>

      {/* Create/Edit Exercise Dialog */}
      <CreateEditExerciseDialog
        open={showCreateDialog || !!editingExercise}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingExercise(null);
          }
        }}
        editingExercise={editingExercise}
        onSubmit={editingExercise ? handleUpdateExercise : handleCreateExercise}
        isSubmitting={
          createMasterExercise.isPending || updateMasterExercise.isPending
        }
      />

      {/* Merge Confirmation Dialog */}
      <MergeExerciseDialog
        open={showMergeDialog}
        onOpenChange={setShowMergeDialog}
        selectedForMerge={selectedForMerge}
        onConfirmMerge={confirmMerge}
        isMerging={mergeMasterExercises.isPending}
      />
    </div>
  );
}
