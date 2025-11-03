import { api } from "~/trpc/react";
import { useCacheInvalidation } from './use-cache-invalidation';

export function useExerciseMutations(onSuccess: () => void) {
  const { invalidateAll } = useCacheInvalidation();

  const createMasterExercise = api.exercises.createMasterExercise.useMutation({
    onSuccess: () => {
      invalidateAll();
      onSuccess();
    },
    onError: (error) => {
      alert(`Failed to create exercise: ${error.message}`);
    },
  });

  const updateMasterExercise = api.exercises.updateMasterExercise.useMutation({
    onSuccess: () => {
      invalidateAll();
      onSuccess();
    },
    onError: (error) => {
      alert(`Failed to update exercise: ${error.message}`);
    },
  });

  const mergeMasterExercises = api.exercises.mergeMasterExercises.useMutation({
    onSuccess: (result) => {
      alert(
        `Successfully merged "${result.sourceName}" into "${result.targetName}". Moved ${result.movedLinks} links, skipped ${result.skippedLinks} duplicates.`,
      );
      invalidateAll();
      onSuccess();
    },
    onError: (error) => {
      alert(`Failed to merge exercises: ${error.message}`);
    },
  });

  const migrateExistingExercises = api.exercises.migrateExistingExercises.useMutation({
    onSuccess: (result) => {
      alert(
        `Migration completed! Created ${result.createdMasterExercises} master exercises and ${result.createdLinks} links for ${result.migratedExercises} exercises.`,
      );
      invalidateAll();
      onSuccess();
    },
    onError: (error) => {
      alert(`Migration failed: ${error.message}`);
    },
  });

  return {
    createMasterExercise,
    updateMasterExercise,
    mergeMasterExercises,
    migrateExistingExercises,
  };
}