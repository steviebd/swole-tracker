import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { useWorkoutSessionState } from "~/hooks/useWorkoutSessionState";

// Mock the API with complete structure
const mockMutateAsync = vi.fn();
const mockUtils = {
  workouts: {
    save: {
      mutateAsync: mockMutateAsync,
    },
    getRecent: {
      cancel: vi.fn(),
      fetch: vi.fn(),
    },
    getById: {
      data: null,
    },
    getLastExerciseData: {
      fetch: vi.fn(),
    },
    delete: {
      mutate: vi.fn(),
    },
  },
  progress: {
    getWorkoutDates: {},
    getVolumeProgression: {},
    getConsistencyStats: {},
    getPersonalRecords: {},
    getProgressHighlights: {},
    getProgressDashboardData: {},
    getExerciseStrengthProgression: {},
    getExerciseVolumeProgression: {},
    getExerciseList: {},
  },
  templates: {
    getAll: {},
  },
  insights: {
    getExerciseInsights: {},
    getSessionInsights: {},
  },
  sessionDebriefs: {
    listRecent: {},
    listBySession: {},
  },
  healthAdvice: {
    getHistory: {},
    getBySessionId: {},
  },
  wellness: {
    getHistory: {},
    getBySessionId: {},
    getStats: {},
  },
  playbooks: {
    listByUser: {},
    getById: {},
    getAdherenceMetrics: {},
  },
  preferences: {
    get: {
      data: { defaultWeightUnit: "kg" },
    },
    update: {
      mutate: vi.fn(),
    },
  },
};

// Mock getQueryKey to return a simple array
vi.mock("@trpc/react-query", () => ({
  getQueryKey: vi.fn(() => ["workouts", "getRecent"]),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => mockUtils,
    workouts: {
      getRecent: {},
      getById: {
        useQuery: vi.fn(() => ({ data: null, isLoading: true })),
      },
      save: {
        useMutation: vi.fn(() => ({
          mutateAsync: mockMutateAsync,
          isLoading: false,
        })),
      },
      getLastExerciseData: {
        useQuery: vi.fn(() => ({ data: null, isLoading: false })),
      },
      delete: {
        useMutation: vi.fn(() => ({ mutate: vi.fn() })),
      },
      batchSave: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
      },
    },
    preferences: {
      get: {
        useQuery: vi.fn(() => ({
          data: { defaultWeightUnit: "kg" },
          isLoading: false,
        })),
      },
      update: {
        useMutation: vi.fn(() => ({ mutate: vi.fn() })),
      },
    },
  },
}));

// Mock the workout cache helpers
vi.mock("~/lib/workout-cache-helpers", () => ({
  invalidateWorkoutDependentCaches: vi.fn(),
}));

describe("useWorkoutSessionState - Playbook Optimistic Updates", () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );

    vi.clearAllMocks();
  });

  // Note: createOptimisticWorkout tests commented out as this function is not exposed in hook return
  // describe("createOptimisticWorkout", () => {
  //   ... tests would go here when function is properly exposed
  // });

  it("should initialize session state correctly", () => {
    const sessionId = 456;

    const { result } = renderHook(
      () =>
        useWorkoutSessionState({
          sessionId,
        }),
      { wrapper },
    );

    expect(result.current.exercises).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("should return initial state with empty exercises", () => {
    const { result } = renderHook(
      () =>
        useWorkoutSessionState({
          sessionId: 123,
        }),
      { wrapper },
    );

    expect(result.current.exercises).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("should return initial state with empty exercises", () => {
    const { result } = renderHook(
      () =>
        useWorkoutSessionState({
          sessionId: 123,
        }),
      { wrapper },
    );

    expect(result.current.exercises).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});
