"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

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
          <div key={i} className="animate-pulse rounded-lg bg-gray-800 p-4">
            <div className="mb-2 h-4 w-1/4 rounded bg-gray-700"></div>
            <div className="h-3 w-1/6 rounded bg-gray-700"></div>
          </div>
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
        <button
          onClick={() => migrateExistingExercises.mutate()}
          disabled={migrateExistingExercises.isPending}
          className="btn-primary px-6 py-3"
        >
          {migrateExistingExercises.isPending
            ? "Migrating..."
            : "Migrate Existing Exercises"}
        </button>
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
        <input
          type="text"
          placeholder="Search exercises..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />

        <div className="flex justify-end">
          <button
            onClick={() => migrateExistingExercises.mutate()}
            disabled={migrateExistingExercises.isPending}
            className="btn-primary px-4 py-2 text-sm"
          >
            {migrateExistingExercises.isPending
              ? "Migrating..."
              : "Migrate Unlinked Exercises"}
          </button>
        </div>
      </div>

      {/* Exercise List */}
      <div className="space-y-3">
        <div className="text-secondary mb-4 text-sm">
          {filteredExercises.length} exercise
          {filteredExercises.length !== 1 ? "s" : ""} found
        </div>

        {filteredExercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onUpdate={refetch}
          />
        ))}
      </div>
    </div>
  );
}

interface ExerciseCardProps {
  exercise: MasterExercise;
  onUpdate: () => void;
}

function ExerciseCard({ exercise, onUpdate }: ExerciseCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold">{exercise.name}</h3>
          <div className="text-secondary mt-1 flex items-center gap-4 text-sm">
            <span>
              {exercise.linkedCount} template
              {exercise.linkedCount !== 1 ? "s" : ""} linked
            </span>
            <span>Created {exercise.createdAt.toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="link-primary text-sm hover:no-underline"
          >
            {showDetails ? "Hide Details" : "Show Details"}
          </button>
        </div>
      </div>

      {showDetails && (
        <ExerciseDetails
          masterExerciseId={exercise.id}
          masterExerciseName={exercise.name}
          normalizedName={exercise.normalizedName}
          onUpdate={onUpdate}
        />
      )}
    </div>
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
      <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
        <div className="text-secondary animate-pulse text-sm">
          Loading linking details...
        </div>
      </div>
    );
  }

  if (!linkingDetails) {
    return (
      <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
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
    <div className="mt-4 space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
      {/* Basic Info */}
      <div className="text-sm">
        <span className="text-secondary">Normalized name:</span>
        <span className="text-muted ml-2 font-mono">{normalizedName}</span>
      </div>

      {/* Latest Performance */}
      {latestPerformance && (
        <div className="text-sm">
          <span className="text-gray-400">Latest performance:</span>
          <span className="ml-2 text-green-600 dark:text-green-400">
            {latestPerformance.weight} {latestPerformance.unit} ×{" "}
            {latestPerformance.reps} reps × {latestPerformance.sets} sets
          </span>
          <span className="text-muted ml-2">
            ({latestPerformance.workoutDate.toLocaleDateString()})
          </span>
        </div>
      )}

      {/* Bulk Actions */}
      <div className="flex gap-2">
        {similarPotentialLinks.length > 0 && (
          <button
            onClick={() => bulkLinkSimilar.mutate({ masterExerciseId })}
            disabled={bulkLinkSimilar.isPending}
            className="btn-primary px-3 py-1 text-sm disabled:opacity-50"
          >
            {bulkLinkSimilar.isPending
              ? "Linking..."
              : `Link All Similar (${similarPotentialLinks.length})`}
          </button>
        )}

        {linkedExercises.length > 0 && (
          <button
            onClick={() => setShowConfirmUnlinkAll(true)}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-700"
          >
            Unlink All ({linkedExercises.length})
          </button>
        )}
      </div>

      {/* Confirm Unlink All Dialog */}
      {showConfirmUnlinkAll && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-600 dark:bg-red-900/20">
          <div className="mb-2 text-sm font-medium text-red-700 dark:text-red-400">
            Confirm Unlink All
          </div>
          <div className="mb-3 text-sm text-gray-700 dark:text-gray-300">
            This will unlink all {linkedExercises.length} exercises from &quot;
            {masterExerciseName}&quot;. Historical data will be separated.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => bulkUnlinkAll.mutate({ masterExerciseId })}
              disabled={bulkUnlinkAll.isPending}
              className="rounded bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {bulkUnlinkAll.isPending ? "Unlinking..." : "Confirm Unlink All"}
            </button>
            <button
              onClick={() => setShowConfirmUnlinkAll(false)}
              className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-900 transition-colors hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Linked Exercises */}
      {linkedExercises.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-green-700 dark:text-green-400">
            🔗 Linked Template Exercises ({linkedExercises.length})
          </h4>
          <div className="space-y-2">
            {linkedExercises.map((linked) => (
              <div
                key={linked.templateExerciseId}
                className="flex items-center justify-between rounded border border-green-300 bg-green-50 p-2 dark:border-green-700 dark:bg-green-900/20"
              >
                <div className="text-sm">
                  <span className="font-medium">{linked.exerciseName}</span>
                  <span className="text-secondary ml-2">
                    from {linked.templateName}
                  </span>
                </div>
                <button
                  onClick={() =>
                    unlinkExercise.mutate({
                      templateExerciseId: linked.templateExerciseId,
                    })
                  }
                  disabled={unlinkExercise.isPending}
                  className="rounded bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {unlinkExercise.isPending ? "..." : "Unlink"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Potential Links */}
      {potentialLinks.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-blue-700 dark:text-blue-400">
            🔍 Potential Links ({potentialLinks.length})
          </h4>
          <div className="space-y-2">
            {potentialLinks.map((potential) => (
              <div
                key={potential.templateExerciseId}
                className={`flex items-center justify-between rounded border p-2 ${
                  potential.linkingRejected
                    ? "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20"
                    : potential.similarity >= 0.7
                      ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                      : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/20"
                }`}
              >
                <div className="text-sm">
                  <span className="font-medium">{potential.exerciseName}</span>
                  <span className="text-secondary ml-2">
                    from {potential.templateName}
                  </span>
                  <span
                    className={`ml-2 text-xs ${
                      potential.similarity >= 0.7
                        ? "text-green-700 dark:text-green-400"
                        : "text-yellow-700 dark:text-yellow-400"
                    }`}
                  >
                    {Math.round(potential.similarity * 100)}% match
                  </span>
                  {potential.linkingRejected && (
                    <span className="ml-2 text-xs text-orange-700 dark:text-orange-400">
                      (rejected)
                    </span>
                  )}
                </div>
                {!potential.linkingRejected && (
                  <button
                    onClick={() =>
                      linkToMaster.mutate({
                        templateExerciseId: potential.templateExerciseId,
                        masterExerciseId,
                      })
                    }
                    disabled={linkToMaster.isPending}
                    className="btn-primary px-2 py-1 text-xs disabled:opacity-50"
                  >
                    {linkToMaster.isPending ? "..." : "Link"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No potential links message */}
      {potentialLinks.length === 0 && (
        <div className="text-secondary text-sm">
          No unlinked template exercises found
        </div>
      )}
    </div>
  );
}
