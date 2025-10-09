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

interface MasterExercise {
  id: number;
  name: string;
  normalizedName: string;
  createdAt: Date;
  linkedCount: number;
}

export function ExerciseManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isClient, setIsClient] = useState(false);

  const {
    data: exercises,
    isLoading,
    refetch,
  } = api.exercises.getAllMaster.useQuery();

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

  const filteredExercises =
    (exercises as MasterExercise[] | undefined)?.filter((exercise) =>
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()),
    ) ?? [];

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
      {/* Search and Migration */}
      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Search exercises..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
          aria-label="Search exercises"
        />

        <div className="flex justify-end">
          <Button
            onClick={() => migrateExistingExercises.mutate()}
            disabled={migrateExistingExercises.isPending}
            size="sm"
            aria-label="Migrate unlinked exercises to master exercises"
          >
            {migrateExistingExercises.isPending
              ? "Migrating..."
              : "Migrate Unlinked Exercises"}
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
    </div>
  );
}

interface ExerciseRowProps {
  exercise: MasterExercise;
  onUpdate: () => void;
}

function ExerciseRow({ exercise, onUpdate }: ExerciseRowProps) {
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
            aria-label={`${showDetails ? "Hide" : "Show"} details for ${exercise.name}`}
          >
            {showDetails ? "Hide Details" : "Show Details"}
          </Button>
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
