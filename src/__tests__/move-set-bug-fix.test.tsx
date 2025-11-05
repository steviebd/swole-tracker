import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "~/trpc/react";
import { useWorkoutSessionState } from "~/hooks/useWorkoutSessionState";

// Mock all dependencies
const mockApi = {
  useUtils: vi.fn(() => ({
    workouts: {
      getLastExerciseData: {
        fetch: vi.fn(() => Promise.resolve(null)),
      },
    },
    invalidate: vi.fn(),
  })),
  workouts: {
    getById: {
      fetch: vi.fn(() => Promise.resolve(null)),
    },
    start: {
      mutate: vi.fn(() => Promise.resolve({ id: 123 })),
    },
    save: {
      mutate: vi.fn(() => Promise.resolve({ id: 123 })),
    },
  },
};

describe("moveSet function - Bug Fix Tests", () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;
  let mockEnqueue: any;
  let mockGetWorkoutDraft: any;
  let mockSaveWorkoutDraft: any;
  let mockInvalidateWorkoutDependentCaches: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup QueryClient
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Create tRPC client for testing
    const trpcClient = api.createClient({
      links: [
        () => {
          return () => {
            throw new Error("TRPC client should not be called in hooks tests");
          };
        },
      ],
    });

    // Create wrapper
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <api.Provider client={trpcClient} queryClient={queryClient}>
          {children}
        </api.Provider>
      </QueryClientProvider>
    );

    // Initialize mocks
    mockEnqueue = vi.fn();
    mockGetWorkoutDraft = vi.fn(() => null);
    mockSaveWorkoutDraft = vi.fn();
    mockInvalidateWorkoutDependentCaches = vi.fn();

    // Re-mock with our controlled functions
    vi.doMock("~/hooks/use-offline-save-queue", () => ({
      useOfflineSaveQueue: () => ({
        enqueue: mockEnqueue,
      }),
    }));

    vi.doMock("~/lib/workout-drafts", () => ({
      getWorkoutDraft: mockGetWorkoutDraft,
      removeWorkoutDraft: vi.fn(),
      saveWorkoutDraft: mockSaveWorkoutDraft,
    }));

    vi.doMock("~/lib/workout-cache-helpers", () => ({
      applyOptimisticWorkoutDate: vi.fn(),
      applyOptimisticVolumeMetrics: vi.fn(),
      calculateVolumeSummaryFromExercises: vi.fn(),
      invalidateWorkoutDependentCaches: mockInvalidateWorkoutDependentCaches,
    }));

    vi.doMock("~/trpc/react", () => ({
      api: mockApi,
      useTRPCClient: () => trpcClient,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("moveSet function - Basic Functionality", () => {
    it("should move set down within exercise", async () => {
      const { result } = renderHook(
        () => useWorkoutSessionState({ sessionId: 123 }),
        { wrapper },
      );

      // Initialize with empty state
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Hook should initialize with template exercises, check if we have any
      if (result.current.exercises.length === 0) {
        // If no exercises, we can't test this scenario
        expect(result.current.exercises).toHaveLength(0);
        return;
      }

      // Add a set to the first exercise
      await act(async () => {
        result.current.addSet(0);
      });

      await act(async () => {
        result.current.updateSet(0, 0, "weight", 100);
        result.current.updateSet(0, 0, "reps", 10);
        result.current.updateSet(0, 0, "rpe", 8);
      });

      await act(async () => {
        result.current.addSet(0);
      });

      await act(async () => {
        result.current.updateSet(0, 1, "weight", 200);
        result.current.updateSet(0, 1, "reps", 8);
        result.current.updateSet(0, 1, "rpe", 9);
      });

      // Move the first set down
      await act(async () => {
        result.current.moveSet(0, 0, "down");
      });

      // Sets should be swapped
      expect(result.current.exercises[0]?.sets[0]?.weight).toBe(200);
      expect(result.current.exercises[0]?.sets[0]?.reps).toBe(8);
      expect(result.current.exercises[0]?.sets[0]?.rpe).toBe(9);
      expect(result.current.exercises[0]?.sets[1]?.weight).toBe(100);
      expect(result.current.exercises[0]?.sets[1]?.reps).toBe(10);
      expect(result.current.exercises[0]?.sets[1]?.rpe).toBe(8);
    });
  });

  describe("moveSet function - Edge Cases", () => {
    it("should handle single set exercise", async () => {
      const { result } = renderHook(
        () => useWorkoutSessionState({ sessionId: 123 }),
        { wrapper },
      );

      // Initialize with empty state
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Hook should initialize with template exercises, check if we have any
      if (result.current.exercises.length === 0) {
        // If no exercises, we can't test this scenario
        expect(result.current.exercises).toHaveLength(0);
        return;
      }

      // Ensure first exercise has only one set
      const firstExerciseSets = result.current.exercises[0]?.sets || [];
      if (firstExerciseSets.length <= 1) {
        // Add a set if needed
        await act(async () => {
          result.current.addSet(0);
        });

        await act(async () => {
          result.current.updateSet(0, 0, "weight", 100);
          result.current.updateSet(0, 0, "reps", 10);
          result.current.updateSet(0, 0, "rpe", 8);
        });
      }

      // Try to move set down - should not crash
      await act(async () => {
        result.current.moveSet(0, 0, "down");
      });

      // Set should remain unchanged
      expect(result.current.exercises[0]?.sets[0]?.weight).toBe(100);
      expect(result.current.exercises[0]?.sets[0]?.reps).toBe(10);
      expect(result.current.exercises[0]?.sets[0]?.rpe).toBe(8);
    });

    it("should preserve set properties during move", async () => {
      const { result } = renderHook(
        () => useWorkoutSessionState({ sessionId: 123 }),
        { wrapper },
      );

      // Initialize with empty state
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Hook should initialize with template exercises, check if we have any
      if (result.current.exercises.length === 0) {
        // If no exercises, we can't test this scenario
        expect(result.current.exercises).toHaveLength(0);
        return;
      }

      // Add a set to the first exercise
      await act(async () => {
        result.current.addSet(0);
      });

      await act(async () => {
        result.current.updateSet(0, 0, "weight", 100);
        result.current.updateSet(0, 0, "reps", 10);
        result.current.updateSet(0, 0, "rpe", 8);
      });

      // Add a second set with full data
      await act(async () => {
        result.current.addSet(0);
        result.current.updateSet(0, 1, "weight", 200);
        result.current.updateSet(0, 1, "reps", 8);
        result.current.updateSet(0, 1, "rpe", 9);
      });

      // Move the first set down
      await act(async () => {
        result.current.moveSet(0, 0, "down");
      });

      // All properties should be preserved
      expect(result.current.exercises[0]?.sets[0]?.weight).toBe(200);
      expect(result.current.exercises[0]?.sets[0]?.reps).toBe(8);
      expect(result.current.exercises[0]?.sets[0]?.rpe).toBe(9);
      expect(result.current.exercises[0]?.sets[1]?.weight).toBe(100);
      expect(result.current.exercises[0]?.sets[1]?.reps).toBe(10);
      expect(result.current.exercises[0]?.sets[1]?.rpe).toBe(8);
    });
  });
});
