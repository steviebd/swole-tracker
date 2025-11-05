import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

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

  const { data: latestPerformanceData } =
    api.exercises.getLatestPerformance.useQuery({
      masterExerciseId,
    });

  type LatestPerformanceDetails = {
    weight: number | null;
    unit: string | null;
    reps: number | null;
    sets: number | null;
    workoutDate: Date;
  };

  const latestPerformance =
    latestPerformanceData as LatestPerformanceDetails | null;

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
              "
              {masterExerciseName}". Historical data will be separated and
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

export { ExerciseDetails };