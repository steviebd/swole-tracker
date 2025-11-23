"use client";

import type { ExerciseData } from "~/app/_components/exercise-card";
import type { SetData } from "~/app/_components/set-input";

type StoredSet = Pick<
  SetData,
  "id" | "setNumber" | "weight" | "reps" | "sets" | "unit" | "rpe" | "rest"
>;

export type StoredExercise = Pick<
  ExerciseData,
  "templateExerciseId" | "exerciseName" | "unit"
> & {
  sets: StoredSet[];
};

export type WorkoutDraftRecord = {
  sessionId: number;
  updatedAt: number;
  exercises: StoredExercise[];
};

const STORAGE_KEY = "workoutDrafts.v1";
export const WORKOUT_DRAFTS_STORAGE_KEY = STORAGE_KEY;
const TRIM_TRIGGER_BYTES = 3_600_000;
const TARGET_BYTES = 3_000_000;
export const WORKOUT_DRAFTS_UPDATED_EVENT = "workout-drafts:updated";

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const notifyDraftsUpdated = () => {
  console.log("notifyDraftsUpdated called");
  if (!isBrowser()) {
    console.log("Not in browser environment");
    return;
  }
  if (typeof window.dispatchEvent !== "function") {
    console.log("window.dispatchEvent not available");
    return;
  }
  try {
    console.log("Dispatching custom event:", WORKOUT_DRAFTS_UPDATED_EVENT);
    window.dispatchEvent(
      new CustomEvent(WORKOUT_DRAFTS_UPDATED_EVENT, {
        bubbles: false,
      }),
    );
    console.log("Custom event dispatched successfully");
  } catch (error) {
    console.error("Error dispatching custom event:", error);
    // Swallow errors to avoid breaking callers that lack CustomEvent support
  }
};

function safeNumber(value: unknown): number | undefined {
  return typeof value === "number" && !Number.isNaN(value) ? value : undefined;
}

const hasNumericValue = (value: unknown): value is number =>
  typeof value === "number" && !Number.isNaN(value);

function setHasMeaningfulData(set: SetData): boolean {
  if (hasNumericValue(set.weight)) return true;
  if (hasNumericValue(set.reps)) return true;
  if (hasNumericValue(set.rpe)) return true;
  if (hasNumericValue(set.rest)) return true;
  if (hasNumericValue(set.sets) && typeof set.sets === "number" && set.sets > 1)
    return true;
  return false;
}

function sanitizeExercises(exercises: ExerciseData[]): StoredExercise[] {
  return exercises
    .map((exercise) => {
      const cleanedSets = exercise.sets
        .filter((set) => setHasMeaningfulData(set))
        .map((set) => ({
          id:
            set.id ??
            `draft-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
          weight: safeNumber(set.weight),
          reps: safeNumber(set.reps),
          sets:
            typeof set.sets === "number" && set.sets > 0
              ? set.sets
              : (safeNumber(set.sets) ?? 1),
          unit: set.unit ?? exercise.unit ?? "kg",
          rpe: safeNumber(set.rpe),
          rest: safeNumber(set.rest),
        }));

      if (cleanedSets.length === 0) {
        return null;
      }

      return {
        templateExerciseId: exercise.templateExerciseId,
        exerciseName: exercise.exerciseName,
        unit: exercise.unit ?? "kg",
        sets: cleanedSets,
      };
    })
    .filter((exercise) => exercise !== null) as StoredExercise[];
}

function readDrafts(): WorkoutDraftRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is WorkoutDraftRecord => {
        if (!item || typeof item !== "object" || Array.isArray(item))
          return false;
        const obj = item as Record<string, unknown>;
        return (
          typeof obj["sessionId"] === "number" &&
          typeof obj["updatedAt"] === "number" &&
          Array.isArray(obj["exercises"])
        );
      })
      .map((item) => ({
        sessionId: item.sessionId,
        updatedAt:
          typeof item.updatedAt === "number" ? item.updatedAt : Date.now(),
        exercises: item.exercises.map(
          (exercise: StoredExercise): StoredExercise => {
            const exerciseResult: StoredExercise = {
              exerciseName: exercise.exerciseName,
              unit: (exercise.unit as "kg" | "lbs") ?? "kg",
              sets: [],
            };
            if (exercise.templateExerciseId !== undefined) {
              exerciseResult.templateExerciseId = exercise.templateExerciseId;
            }
            exerciseResult.sets = Array.isArray(exercise.sets)
              ? exercise.sets.map((set) => {
                  const setResult: StoredSet = {
                    id:
                      typeof set.id === "string"
                        ? set.id
                        : `draft-${Math.random().toString(36).slice(2)}`,
                    setNumber: set.setNumber,
                    sets:
                      typeof set.sets === "number" && set.sets > 0
                        ? set.sets
                        : 1,
                    unit: (set.unit as "kg" | "lbs") ?? "kg",
                  };

                  const weight = safeNumber(set.weight);
                  if (weight !== undefined) {
                    setResult.weight = weight;
                  }

                  const reps = safeNumber(set.reps);
                  if (reps !== undefined) {
                    setResult.reps = reps;
                  }

                  const rpe = safeNumber(set.rpe);
                  if (rpe !== undefined) {
                    setResult.rpe = rpe;
                  }

                  const rest = safeNumber(set.rest);
                  if (rest !== undefined) {
                    setResult.rest = rest;
                  }

                  return setResult;
                })
              : [];
            return exerciseResult;
          },
        ),
      }));
  } catch {
    return [];
  }
}

function isQuotaError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && (error as { code?: number }).code === 22) return true;
  if (
    "name" in error &&
    (error as { name?: string }).name === "QuotaExceededError"
  )
    return true;
  return false;
}

function enforceBudget(drafts: WorkoutDraftRecord[]): WorkoutDraftRecord[] {
  if (drafts.length === 0) return drafts;
  const sorted = [...drafts].sort((a, b) => b.updatedAt - a.updatedAt);
  let serialized = JSON.stringify(sorted);
  if (serialized.length <= TRIM_TRIGGER_BYTES) {
    return sorted;
  }

  while (sorted.length > 0 && serialized.length > TARGET_BYTES) {
    sorted.pop();
    serialized = JSON.stringify(sorted);
  }

  return sorted;
}

function writeDrafts(drafts: WorkoutDraftRecord[]) {
  console.log("writeDrafts called with", drafts.length, "drafts");
  if (!isBrowser()) {
    console.log("Not in browser environment");
    return;
  }
  if (drafts.length === 0) {
    console.log("No drafts to write, removing storage key");
    window.localStorage.removeItem(STORAGE_KEY);
    notifyDraftsUpdated();
    return;
  }

  const toPersist = enforceBudget(drafts);
  const serialized = JSON.stringify(toPersist);
  console.log("Writing to localStorage:", serialized.length, "bytes");

  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
    console.log("Successfully wrote to localStorage");
    notifyDraftsUpdated();
  } catch (error) {
    console.error("Error writing to localStorage:", error);
    if (!isQuotaError(error)) {
      console.warn("Failed to persist workout drafts", error);
      return;
    }

    const trimmed = enforceBudget(
      toPersist.slice(0, Math.max(0, toPersist.length - 1)),
    );
    if (trimmed.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      notifyDraftsUpdated();
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      notifyDraftsUpdated();
    } catch (err) {
      console.warn("Unable to persist workout drafts after trimming", err);
      window.localStorage.removeItem(STORAGE_KEY);
      notifyDraftsUpdated();
    }
  }
}

export function getWorkoutDraft(sessionId: number): WorkoutDraftRecord | null {
  const drafts = readDrafts();
  return drafts.find((draft) => draft.sessionId === sessionId) ?? null;
}

export function saveWorkoutDraft(sessionId: number, exercises: ExerciseData[]) {
  if (!isBrowser()) return;
  const sanitized = sanitizeExercises(exercises);
  if (sanitized.length === 0) {
    removeWorkoutDraft(sessionId);
    return;
  }

  const drafts = readDrafts();
  const nextRecord: WorkoutDraftRecord = {
    sessionId,
    updatedAt: Date.now(),
    exercises: sanitized,
  };

  const existingIndex = drafts.findIndex((d) => d.sessionId === sessionId);
  if (existingIndex >= 0) {
    drafts[existingIndex] = nextRecord;
  } else {
    drafts.push(nextRecord);
  }

  writeDrafts(drafts);
}

export function removeWorkoutDraft(sessionId: number) {
  if (!isBrowser()) return;
  const drafts = readDrafts();
  const filtered = drafts.filter((draft) => draft.sessionId !== sessionId);
  if (filtered.length === drafts.length) return;
  writeDrafts(filtered);
  notifyDraftsUpdated();
}

export function getMostRecentWorkoutDraft(): WorkoutDraftRecord | null {
  const drafts = readDrafts();
  if (drafts.length === 0) {
    return null;
  }

  return drafts.reduce(
    (latest, current) =>
      current.updatedAt > latest.updatedAt ? current : latest,
    drafts[0]!,
  );
}
