/// <reference types="vitest" />
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type QueryClient } from "@tanstack/react-query";
import {
  useCacheInvalidation,
  type CacheInvalidationDependencies,
} from "~/hooks/use-cache-invalidation";

const createQueryClientMock = () => {
  const invalidateQueries = vi.fn();
  const setQueryData = vi.fn();

  return {
    client: {
      invalidateQueries,
      setQueryData,
    } as unknown as QueryClient,
    invalidateQueries,
    setQueryData,
  };
};

const createInvalidateHelpersMock = () => ({
  workouts: vi.fn(),
  templates: vi.fn(),
  preferences: vi.fn(),
  whoop: vi.fn(),
  progress: vi.fn(),
  progressAggregated: vi.fn(),
  all: vi.fn(),
});

describe("useCacheInvalidation", () => {
  let queryClientMocks: ReturnType<typeof createQueryClientMock>;
  let invalidateHelpers: ReturnType<typeof createInvalidateHelpersMock>;
  let dependencies: CacheInvalidationDependencies;

  beforeEach(() => {
    queryClientMocks = createQueryClientMock();
    invalidateHelpers = createInvalidateHelpersMock();
    dependencies = {
      useQueryClientHook: vi.fn(() => queryClientMocks.client),
      invalidateHelpers,
    };
  });

  it("returns all invalidation methods", () => {
    const { result } = renderHook(() => useCacheInvalidation(dependencies));

    expect(result.current.invalidateWorkouts).toBeTypeOf("function");
    expect(result.current.invalidateTemplates).toBeTypeOf("function");
    expect(result.current.invalidatePreferences).toBeTypeOf("function");
    expect(result.current.invalidateAll).toBeTypeOf("function");
    expect(result.current.onWorkoutStart).toBeTypeOf("function");
    expect(result.current.onWorkoutSave).toBeTypeOf("function");
    expect(result.current.optimisticWorkoutUpdate).toBeTypeOf("function");
  });

  it("invalidates workouts using helper", () => {
    const { result } = renderHook(() => useCacheInvalidation(dependencies));

    result.current.invalidateWorkouts();

    expect(invalidateHelpers.workouts).toHaveBeenCalledWith(
      queryClientMocks.client,
    );
  });

  it("invalidates templates using helper", () => {
    const { result } = renderHook(() => useCacheInvalidation(dependencies));

    result.current.invalidateTemplates();

    expect(invalidateHelpers.templates).toHaveBeenCalledWith(
      queryClientMocks.client,
    );
  });

  it("invalidates preferences using helper", () => {
    const { result } = renderHook(() => useCacheInvalidation(dependencies));

    result.current.invalidatePreferences();

    expect(invalidateHelpers.preferences).toHaveBeenCalledWith(
      queryClientMocks.client,
    );
  });

  it("invalidates all queries when requested", () => {
    const { result } = renderHook(() => useCacheInvalidation(dependencies));

    result.current.invalidateAll();

    expect(invalidateHelpers.all).toHaveBeenCalledWith(queryClientMocks.client);
  });

  it("invokes targeted invalidations when a workout starts", () => {
    const { result } = renderHook(() => useCacheInvalidation(dependencies));

    result.current.onWorkoutStart();

    expect(queryClientMocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["workouts", "getRecent"],
    });
    expect(queryClientMocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["workouts", "getLastExerciseData"],
    });
  });

  it("invalidates workouts on save", () => {
    const { result } = renderHook(() => useCacheInvalidation(dependencies));

    result.current.onWorkoutSave();

    expect(invalidateHelpers.workouts).toHaveBeenCalledWith(
      queryClientMocks.client,
    );
  });

  it("performs optimistic cache updates", () => {
    const { result } = renderHook(() => useCacheInvalidation(dependencies));

    result.current.optimisticWorkoutUpdate(1, []);

    expect(queryClientMocks.setQueryData).toHaveBeenCalledWith(
      ["workouts", "getRecent"],
      expect.any(Function),
    );
  });

  it("preserves cached data when optimistic updater runs", () => {
    const { result } = renderHook(() => useCacheInvalidation(dependencies));
    const cachedValue = { workouts: [{ id: 1 }] };
    let updater: ((old: unknown) => unknown) | undefined;

    queryClientMocks.setQueryData.mockImplementation(
      (_key, updateFn: (old: unknown) => unknown) => {
        updater = updateFn;
        return cachedValue;
      },
    );

    result.current.optimisticWorkoutUpdate(1, []);

    expect(updater?.(cachedValue)).toBe(cachedValue);
  });
});
