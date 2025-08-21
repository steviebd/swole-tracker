import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  WorkoutOperationsClient,
  useWorkoutOperations,
  type WorkoutTemplate,
  type WorkoutSession,
  type SessionExercise,
} from "~/lib/workout-operations";

// Mock console to avoid noise during tests
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("WorkoutOperationsClient", () => {
  it("should warn when instantiated", () => {
    const consoleSpy = vi.spyOn(console, "warn");
    new WorkoutOperationsClient();
    expect(consoleSpy).toHaveBeenCalledWith(
      "WorkoutOperationsClient is deprecated. Use tRPC procedures instead.",
    );
  });

  it("should throw error for getWorkoutTemplates", async () => {
    const client = new WorkoutOperationsClient();
    await expect(client.getWorkoutTemplates("user1")).rejects.toThrow(
      "WorkoutOperationsClient is deprecated. Use tRPC templates.getAll instead.",
    );
  });

  it("should throw error for createWorkoutTemplate", async () => {
    const client = new WorkoutOperationsClient();
    await expect(
      client.createWorkoutTemplate("user1", "Test Template"),
    ).rejects.toThrow(
      "WorkoutOperationsClient is deprecated. Use tRPC templates.create instead.",
    );
  });

  it("should throw error for getRecentWorkouts", async () => {
    const client = new WorkoutOperationsClient();
    await expect(client.getRecentWorkouts("user1")).rejects.toThrow(
      "WorkoutOperationsClient is deprecated. Use tRPC workouts.getRecent instead.",
    );
  });

  it("should throw error for getWorkoutSession", async () => {
    const client = new WorkoutOperationsClient();
    await expect(client.getWorkoutSession("user1", 1)).rejects.toThrow(
      "WorkoutOperationsClient is deprecated. Use tRPC workouts.getSession instead.",
    );
  });

  it("should throw error for createWorkoutSession", async () => {
    const client = new WorkoutOperationsClient();
    await expect(
      client.createWorkoutSession("user1", 1, "2024-01-01"),
    ).rejects.toThrow(
      "WorkoutOperationsClient is deprecated. Use tRPC workouts.create instead.",
    );
  });

  it("should throw error for getSessionExercises", async () => {
    const client = new WorkoutOperationsClient();
    await expect(client.getSessionExercises("user1", 1)).rejects.toThrow(
      "WorkoutOperationsClient is deprecated. Use tRPC workouts.getSessionExercises instead.",
    );
  });

  it("should throw error for createSessionExercise", async () => {
    const client = new WorkoutOperationsClient();
    const exercise = {
      templateExerciseId: null,
      exerciseName: "Bench Press",
      weight: "100",
      reps: 8,
      sets: 3,
      unit: "kg",
    };
    await expect(
      client.createSessionExercise("user1", 1, exercise),
    ).rejects.toThrow(
      "WorkoutOperationsClient is deprecated. Use tRPC workouts.addExercise instead.",
    );
  });

  it("should throw error for updateSessionExercise", async () => {
    const client = new WorkoutOperationsClient();
    const updates = { weight: "110" };
    await expect(
      client.updateSessionExercise("user1", 1, updates),
    ).rejects.toThrow(
      "WorkoutOperationsClient is deprecated. Use tRPC workouts.updateExercise instead.",
    );
  });

  it("should throw error for deleteSessionExercise", async () => {
    const client = new WorkoutOperationsClient();
    await expect(client.deleteSessionExercise("user1", 1)).rejects.toThrow(
      "WorkoutOperationsClient is deprecated. Use tRPC workouts.deleteExercise instead.",
    );
  });
});

describe("useWorkoutOperations", () => {
  it("should warn when called", () => {
    const consoleSpy = vi.spyOn(console, "warn");
    useWorkoutOperations();
    expect(consoleSpy).toHaveBeenCalledWith(
      "useWorkoutOperations is deprecated. Use tRPC hooks instead.",
    );
  });

  it("should return a WorkoutOperationsClient instance", () => {
    const result = useWorkoutOperations();
    expect(result).toBeInstanceOf(WorkoutOperationsClient);
  });
});

describe("WorkoutOperationsClient types", () => {
  it("should have proper TypeScript interfaces", () => {
    // This test ensures the type definitions are correct
    const workoutTemplate: WorkoutTemplate = {
      id: 1,
      name: "Test Template",
      user_id: "user1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: null,
    };

    const workoutSession: WorkoutSession = {
      id: 1,
      user_id: "user1",
      templateId: 1,
      workoutDate: "2024-01-01",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: null,
    };

    const sessionExercise: SessionExercise = {
      id: 1,
      user_id: "user1",
      sessionId: 1,
      templateExerciseId: null,
      exerciseName: "Bench Press",
      weight: "100",
      reps: 8,
      sets: 3,
      unit: "kg",
      createdAt: "2024-01-01T00:00:00Z",
    };

    expect(workoutTemplate.id).toBe(1);
    expect(workoutSession.templateId).toBe(1);
    expect(sessionExercise.exerciseName).toBe("Bench Press");
  });
});
