import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the browser Supabase client
const mockSupabaseClient = vi.fn();

vi.mock("~/lib/supabase-browser", () => ({
  createBrowserSupabaseClient: mockSupabaseClient,
}));

// Mock the workout operations module
vi.mock("~/lib/workout-operations", () => ({
  WorkoutOperationsClient: vi.fn().mockImplementation(() => ({
    getWorkoutTemplates: vi.fn(),
    createWorkoutTemplate: vi.fn(),
    getRecentWorkouts: vi.fn(),
    getWorkoutSession: vi.fn(),
    createWorkoutSession: vi.fn(),
    getSessionExercises: vi.fn(),
    addSessionExercise: vi.fn(),
  })),
}));

// Import after mocking
import { WorkoutOperationsClient } from "~/lib/workout-operations";

describe("WorkoutOperationsClient", () => {
  let workoutOps: WorkoutOperationsClient;

  beforeEach(() => {
    vi.clearAllMocks();
    workoutOps = new WorkoutOperationsClient();
  });

  describe("getWorkoutTemplates", () => {
    it("should call getWorkoutTemplates method", async () => {
      const mockTemplates = [
        {
          id: 1,
          name: "Push Day",
          user_id: "test-user",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: null,
        },
      ];

      // Mock the method to return data
      workoutOps.getWorkoutTemplates = vi.fn().mockResolvedValue(mockTemplates);

      const result = await workoutOps.getWorkoutTemplates("test-user");

      expect(workoutOps.getWorkoutTemplates).toHaveBeenCalledWith("test-user");
      expect(result).toEqual(mockTemplates);
    });
  });

  describe("createWorkoutTemplate", () => {
    it("should call createWorkoutTemplate method", async () => {
      const mockTemplate = {
        id: 1,
        name: "Pull Day",
        user_id: "test-user",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: null,
      };

      workoutOps.createWorkoutTemplate = vi
        .fn()
        .mockResolvedValue(mockTemplate);

      const result = await workoutOps.createWorkoutTemplate(
        "test-user",
        "Pull Day",
      );

      expect(workoutOps.createWorkoutTemplate).toHaveBeenCalledWith(
        "test-user",
        "Pull Day",
      );
      expect(result).toEqual(mockTemplate);
    });
  });

  describe("getRecentWorkouts", () => {
    it("should call getRecentWorkouts with default limit", async () => {
      const mockWorkouts = [
        {
          id: 1,
          templateId: 1,
          workoutDate: "2024-01-01",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      workoutOps.getRecentWorkouts = vi.fn().mockResolvedValue(mockWorkouts);

      const result = await workoutOps.getRecentWorkouts("test-user");

      expect(workoutOps.getRecentWorkouts).toHaveBeenCalledWith("test-user");
      expect(result).toEqual(mockWorkouts);
    });

    it("should call getRecentWorkouts with custom limit", async () => {
      const mockWorkouts = [
        {
          id: 1,
          templateId: 1,
          workoutDate: "2024-01-01",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      workoutOps.getRecentWorkouts = vi.fn().mockResolvedValue(mockWorkouts);

      const result = await workoutOps.getRecentWorkouts("test-user", 5);

      expect(workoutOps.getRecentWorkouts).toHaveBeenCalledWith("test-user", 5);
      expect(result).toEqual(mockWorkouts);
    });
  });

  describe("getWorkoutSession", () => {
    it("should call getWorkoutSession method", async () => {
      workoutOps.getWorkoutSession = vi.fn().mockResolvedValue(null);

      const result = await workoutOps.getWorkoutSession("test-user", 1);

      expect(workoutOps.getWorkoutSession).toHaveBeenCalledWith("test-user", 1);
      expect(result).toBeNull();
    });
  });

  describe("createWorkoutSession", () => {
    it("should call createWorkoutSession method", async () => {
      const mockSession = {
        id: 1,
        user_id: "test-user",
        templateId: 1,
        workoutDate: "2024-01-01",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: null,
      };

      workoutOps.createWorkoutSession = vi.fn().mockResolvedValue(mockSession);

      const result = await workoutOps.createWorkoutSession(
        "test-user",
        1,
        "2024-01-01",
      );

      expect(workoutOps.createWorkoutSession).toHaveBeenCalledWith(
        "test-user",
        1,
        "2024-01-01",
      );
      expect(result).toEqual(mockSession);
    });
  });

  describe("getSessionExercises", () => {
    it("should call getSessionExercises method", async () => {
      const mockExercises = [
        {
          id: 1,
          user_id: "test-user",
          sessionId: 1,
          templateExerciseId: null,
          exerciseName: "Bench Press",
          weight: "80",
          reps: 8,
          sets: 3,
          unit: "kg",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      workoutOps.getSessionExercises = vi.fn().mockResolvedValue(mockExercises);

      const result = await workoutOps.getSessionExercises("test-user", 1);

      expect(workoutOps.getSessionExercises).toHaveBeenCalledWith(
        "test-user",
        1,
      );
      expect(result).toEqual(mockExercises);
    });
  });

  describe("addSessionExercise", () => {
    it("should call addSessionExercise method", async () => {
      const mockExercise = {
        id: 1,
        user_id: "test-user",
        sessionId: 1,
        templateExerciseId: null,
        exerciseName: "Bench Press",
        weight: "80",
        reps: 8,
        sets: 3,
        unit: "kg",
        createdAt: "2024-01-01T00:00:00Z",
      };

      workoutOps.addSessionExercise = vi.fn().mockResolvedValue(mockExercise);

      const result = await workoutOps.addSessionExercise("test-user", 1, {
        templateExerciseId: null,
        exerciseName: "Bench Press",
        weight: "80",
        reps: 8,
        sets: 3,
        unit: "kg",
      });

      expect(workoutOps.addSessionExercise).toHaveBeenCalledWith(
        "test-user",
        1,
        {
          templateExerciseId: null,
          exerciseName: "Bench Press",
          weight: "80",
          reps: 8,
          sets: 3,
          unit: "kg",
        },
      );

      expect(workoutOps.addSessionExercise).toHaveBeenCalledWith(
        "test-user",
        1,
        {
          templateExerciseId: null,
          exerciseName: "Bench Press",
          weight: "80",
          reps: 8,
          sets: 3,
          unit: "kg",
        },
      );
      expect(result).toEqual(mockExercise);
    });
  });
});
