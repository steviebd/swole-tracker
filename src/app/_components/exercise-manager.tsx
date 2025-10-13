"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingExercise, setEditingExercise] = useState<MasterExercise | null>(
    null,
  );
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseTags, setExerciseTags] = useState("");
  const [exerciseMuscleGroup, setExerciseMuscleGroup] = useState("");

  const {
    data: exercises,
    isLoading,
    refetch,
  } = api.exercises.getAllMaster.useQuery();

  const { data: migrationStatus } = api.exercises.getMigrationStatus.useQuery();

  // Ensure client-side rendering after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const migrateExistingExercises =
    api.exercises.migrateExistingExercises.useMutation({
      onSuccess: (result) => {
        alert(
          `Migration completed! Created ${result.createdMasterExercises} master exercises and ${result.createdLinks} links for ${result.migratedExercises} exercises.`,
        );
        void refetch();
      },
      onError: (error) => {
        alert(`Migration failed: ${error.message}`);
      },
    });

  const createMasterExercise = api.exercises.createMasterExercise.useMutation({
    onSuccess: () => {
      void refetch();
      setShowCreateDialog(false);
      setExerciseName("");
      setExerciseTags("");
      setExerciseMuscleGroup("");
    },
    onError: (error) => {
      alert(`Failed to create exercise: ${error.message}`);
    },
  });

  const updateMasterExercise = api.exercises.updateMasterExercise.useMutation({
    onSuccess: () => {
      void refetch();
      setEditingExercise(null);
      setExerciseName("");
      setExerciseTags("");
      setExerciseMuscleGroup("");
    },
    onError: (error) => {
      alert(`Failed to update exercise: ${error.message}`);
    },
  });

  const filteredExercises =
    (exercises as MasterExercise[] | undefined)?.filter((exercise) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        exercise.name.toLowerCase().includes(searchLower) ||
        exercise.tags?.toLowerCase().includes(searchLower) ||
        exercise.muscleGroup?.toLowerCase().includes(searchLower)
      );
    }) ?? [];

  const handleEditExercise = (exercise: MasterExercise) => {
    setEditingExercise(exercise);
    setExerciseName(exercise.name);
    setExerciseTags(exercise.tags || "");
    setExerciseMuscleGroup(exercise.muscleGroup || "");
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
      <div className="space-y-4">
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Search exercises, tags, or muscle groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
            aria-label="Search exercises"
          />
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            Create Exercise
          </Button>
        </div>

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
      </div>

      {/* Exercise List */}
      <div className="space-y-4">
        <div className="text-muted-foreground text-sm">
          {filteredExercises.length} exercise
          {filteredExercises.length !== 1 ? "s" : ""} found
        </div>

        <div className="rounded-md border">
          <Table role="table" aria-label="Exercise management table">
            <TableHeader>
              <TableRow>
                <TableHead>Exercise Name</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
                <TableHead>Linked Templates</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExercises.map((exercise) => (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  onUpdate={refetch}
                  onEdit={handleEditExercise}
                />
              ))}
              {filteredExercises.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No exercises found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Exercise Dialog */}
      <Dialog
        open={showCreateDialog || !!editingExercise}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingExercise(null);
            setExerciseName("");
            setExerciseTags("");
            setExerciseMuscleGroup("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExercise ? "Edit Exercise" : "Create New Exercise"}
            </DialogTitle>
            <DialogDescription>
              {editingExercise
                ? "Update the exercise details below."
                : "Add a new master exercise that can be linked to workout templates."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="exercise-name">Exercise Name</Label>
              <Input
                id="exercise-name"
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                placeholder="e.g., Bench Press"
              />
            </div>
            <div>
              <Label htmlFor="exercise-tags">Tags (comma-separated)</Label>
              <Input
                id="exercise-tags"
                value={exerciseTags}
                onChange={(e) => setExerciseTags(e.target.value)}
                placeholder="e.g., compound, chest, pressing"
              />
            </div>
            <div>
              <Label htmlFor="exercise-muscle-group">
                Primary Muscle Group
              </Label>
              <Select
                value={exerciseMuscleGroup}
                onValueChange={setExerciseMuscleGroup}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select muscle group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chest">Chest</SelectItem>
                  <SelectItem value="back">Back</SelectItem>
                  <SelectItem value="shoulders">Shoulders</SelectItem>
                  <SelectItem value="arms">Arms</SelectItem>
                  <SelectItem value="legs">Legs</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingExercise(null);
                setExerciseName("");
                setExerciseTags("");
                setExerciseMuscleGroup("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingExercise) {
                  updateMasterExercise.mutate({
                    id: editingExercise.id,
                    name: exerciseName,
                    tags: exerciseTags || undefined,
                    muscleGroup: exerciseMuscleGroup || undefined,
                  });
                } else {
                  createMasterExercise.mutate({
                    name: exerciseName,
                    tags: exerciseTags || undefined,
                    muscleGroup: exerciseMuscleGroup || undefined,
                  });
                }
              }}
              disabled={
                !exerciseName.trim() ||
                createMasterExercise.isPending ||
                updateMasterExercise.isPending
              }
            >
              {createMasterExercise.isPending || updateMasterExercise.isPending
                ? "Saving..."
                : editingExercise
                  ? "Update Exercise"
                  : "Create Exercise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ExerciseRowProps {
  exercise: MasterExercise;
  onUpdate: () => void;
  onEdit: (exercise: MasterExercise) => void;
}

function ExerciseRow({ exercise, onUpdate, onEdit }: ExerciseRowProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="font-medium">{exercise.name}</div>
          <div className="text-muted-foreground text-sm sm:hidden">
            Created {exercise.createdAt.toLocaleDateString()}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
          {exercise.createdAt.toLocaleDateString()}
        </TableCell>
        <TableCell>
          <div className="text-sm">
            {exercise.linkedCount} template
            {exercise.linkedCount !== 1 ? "s" : ""}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              aria-expanded={showDetails}
              aria-label={`${showDetails ? "Hide" : "Show"} details for ${exercise.name}`}
            >
              {showDetails ? "Hide" : "Details"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(exercise)}
              aria-label={`Edit ${exercise.name}`}
            >
              ✏️
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // TODO: Implement merge functionality
                alert("Merge functionality coming soon");
              }}
              aria-label={`Merge ${exercise.name}`}
            >
              🔗
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // TODO: Implement favorite functionality
                alert("Favorite functionality coming soon");
              }}
              aria-label={`Mark ${exercise.name} as favorite`}
            >
              ⭐
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {showDetails && (
        <TableRow>
          <TableCell colSpan={4} className="p-0">
            <div className="bg-muted/50 border-t p-4">
              <ExerciseDetails
                masterExerciseId={exercise.id}
                masterExerciseName={exercise.name}
                normalizedName={exercise.normalizedName}
                onUpdate={onUpdate}
              />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

interface ExerciseDetailsProps {
  masterExerciseId: number;
  masterExerciseName: string;
  normalizedName: string;
  onUpdate: () => void;
}

function ExerciseDetails({
  masterExerciseId,
  masterExerciseName,
  normalizedName,
  onUpdate,
}: ExerciseDetailsProps) {
  const [showConfirmUnlinkAll, setShowConfirmUnlinkAll] = useState(false);

  const {
    data: linkingDetails,
    isLoading: detailsLoading,
    refetch: refetchDetails,
  } = api.exercises.getLinkingDetails.useQuery({ masterExerciseId });

  const { data: latestPerformance } =
    api.exercises.getLatestPerformance.useQuery({
      masterExerciseId,
    });

  const unlinkExercise = api.exercises.unlink.useMutation({
    onSuccess: () => {
      void refetchDetails();
      onUpdate();
    },
  });

  const linkToMaster = api.exercises.linkToMaster.useMutation({
    onSuccess: () => {
      void refetchDetails();
      onUpdate();
    },
  });

  const bulkLinkSimilar = api.exercises.bulkLinkSimilar.useMutation({
    onSuccess: (result) => {
      alert(`Successfully linked ${result.linkedCount} similar exercises!`);
      void refetchDetails();
      onUpdate();
    },
  });

  const bulkUnlinkAll = api.exercises.bulkUnlinkAll.useMutation({
    onSuccess: (result) => {
      alert(`Successfully unlinked ${result.unlinkedCount} exercises!`);
      void refetchDetails();
      onUpdate();
      setShowConfirmUnlinkAll(false);
    },
  });

  if (detailsLoading) {
    return (
      <div className="border-border mt-4 space-y-3 border-t pt-4">
        <div className="text-secondary animate-pulse text-sm">
          Loading linking details...
        </div>
      </div>
    );
  }

  if (!linkingDetails) {
    return (
      <div className="border-border mt-4 space-y-3 border-t pt-4">
        <div className="text-sm text-red-600 dark:text-red-400">
          Failed to load linking details
        </div>
      </div>
    );
  }

  const { linkedExercises, potentialLinks } = linkingDetails;
  const similarPotentialLinks = potentialLinks.filter(
    (link) => link.similarity >= 0.6 && !link.linkingRejected,
  );

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card className="bg-muted/30">
        <CardContent className="p-3">
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Normalized name:</span>
              <span className="bg-muted ml-2 rounded px-2 py-1 font-mono text-xs">
                {normalizedName}
              </span>
            </div>
            {/* Latest Performance */}
            {latestPerformance && (
              <div>
                <span className="text-muted-foreground">
                  Latest performance:
                </span>
                <div className="mt-1 ml-2">
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {latestPerformance.weight} {latestPerformance.unit} ×{" "}
                    {latestPerformance.reps} reps × {latestPerformance.sets}{" "}
                    sets
                  </span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    (
                    {new Date(
                      latestPerformance.workoutDate,
                    ).toLocaleDateString()}
                    )
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <div className="flex gap-2">
        {similarPotentialLinks.length > 0 && (
          <Button
            onClick={() => bulkLinkSimilar.mutate({ masterExerciseId })}
            disabled={bulkLinkSimilar.isPending}
            size="sm"
            aria-label={`Link all ${similarPotentialLinks.length} similar exercises to ${masterExerciseName}`}
          >
            {bulkLinkSimilar.isPending
              ? "Linking..."
              : `Link All Similar (${similarPotentialLinks.length})`}
          </Button>
        )}

        {linkedExercises.length > 0 && (
          <Button
            onClick={() => setShowConfirmUnlinkAll(true)}
            variant="destructive"
            size="sm"
            aria-label={`Unlink all ${linkedExercises.length} linked exercises from ${masterExerciseName}`}
          >
            Unlink All ({linkedExercises.length})
          </Button>
        )}
      </div>

      {/* Confirm Unlink All Dialog */}
      <Dialog
        open={showConfirmUnlinkAll}
        onOpenChange={setShowConfirmUnlinkAll}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Unlink All</DialogTitle>
            <DialogDescription>
              This will unlink all {linkedExercises.length} exercises from
              &quot;
              {masterExerciseName}&quot;. Historical data will be separated and
              this action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmUnlinkAll(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkUnlinkAll.mutate({ masterExerciseId })}
              disabled={bulkUnlinkAll.isPending}
            >
              {bulkUnlinkAll.isPending ? "Unlinking..." : "Confirm Unlink All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Linked Exercises */}
      {linkedExercises.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-green-700 dark:text-green-400">
            🔗 Linked Template Exercises ({linkedExercises.length})
          </h4>
          <div className="space-y-2">
            {linkedExercises.map((linked) => (
              <Card
                key={linked.templateExerciseId}
                className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50"
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">{linked.exerciseName}</span>
                      <span className="text-muted-foreground ml-2">
                        from {linked.templateName}
                      </span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        unlinkExercise.mutate({
                          templateExerciseId: linked.templateExerciseId,
                        })
                      }
                      disabled={unlinkExercise.isPending}
                      className="h-7 px-2 text-xs"
                      aria-label={`Unlink ${linked.exerciseName} from ${linked.templateName}`}
                    >
                      {unlinkExercise.isPending ? "..." : "Unlink"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Potential Links */}
      {potentialLinks.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-blue-700 dark:text-blue-400">
            🔍 Potential Links ({potentialLinks.length})
          </h4>
          <div className="space-y-2">
            {potentialLinks.map((potential) => (
              <Card
                key={potential.templateExerciseId}
                className={
                  potential.linkingRejected
                    ? "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/50"
                    : potential.similarity >= 0.7
                      ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50"
                      : "border-border bg-muted/50"
                }
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">
                        {potential.exerciseName}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        from {potential.templateName}
                      </span>
                      <span
                        className={`ml-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          potential.similarity >= 0.7
                            ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400"
                        }`}
                      >
                        {Math.round(potential.similarity * 100)}% match
                      </span>
                      {potential.linkingRejected && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/50 dark:text-orange-400">
                          rejected
                        </span>
                      )}
                    </div>
                    {!potential.linkingRejected && (
                      <Button
                        size="sm"
                        onClick={() =>
                          linkToMaster.mutate({
                            templateExerciseId: potential.templateExerciseId,
                            masterExerciseId,
                          })
                        }
                        disabled={linkToMaster.isPending}
                        className="h-7 px-2 text-xs"
                        aria-label={`Link ${potential.exerciseName} from ${potential.templateName} to master exercise`}
                      >
                        {linkToMaster.isPending ? "..." : "Link"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No potential links message */}
      {potentialLinks.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <div className="text-muted-foreground text-sm">
              No unlinked template exercises found
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
