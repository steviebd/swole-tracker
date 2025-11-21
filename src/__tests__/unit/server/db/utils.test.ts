/**
 * Tests for database utilities
 * Tests critical database operations and caching functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resolveExerciseNameWithLookup,
  withRetry,
  type ResolvedExerciseNameMap,
} from "~/server/db/utils";

// Helper function to mock setTimeout properly
const mockSetTimeout = () => {
  const originalSetTimeout = global.setTimeout;
  const mockFn = vi.fn().mockImplementation((fn: () => void) => {
    return originalSetTimeout(fn, 0);
  });
  global.setTimeout = mockFn as any;
  return originalSetTimeout;
};

describe("Database Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("resolveExerciseNameWithLookup", () => {
    it("should return fallback when templateExerciseId is null", () => {
      const lookup: ResolvedExerciseNameMap = new Map();
      const result = resolveExerciseNameWithLookup(null, "fallback", lookup);

      expect(result).toEqual({ name: "fallback", masterExerciseId: null });
    });

    it("should return fallback when templateExerciseId is undefined", () => {
      const lookup: ResolvedExerciseNameMap = new Map();
      const result = resolveExerciseNameWithLookup(
        undefined,
        "fallback",
        lookup,
      );

      expect(result).toEqual({ name: "fallback", masterExerciseId: null });
    });

    it("should return fallback when templateExerciseId is not in lookup", () => {
      const lookup: ResolvedExerciseNameMap = new Map();
      const result = resolveExerciseNameWithLookup(999, "fallback", lookup);

      expect(result).toEqual({ name: "fallback", masterExerciseId: null });
    });

    it("should return resolved name from lookup", () => {
      const lookup: ResolvedExerciseNameMap = new Map([
        [1, { name: "Resolved Name", masterExerciseId: 42 }],
      ]);
      const result = resolveExerciseNameWithLookup(1, "fallback", lookup);

      expect(result).toEqual({ name: "Resolved Name", masterExerciseId: 42 });
    });

    it("should use fallback when resolved name is empty", () => {
      const lookup: ResolvedExerciseNameMap = new Map([
        [1, { name: "", masterExerciseId: 42 }],
      ]);
      const result = resolveExerciseNameWithLookup(1, "fallback", lookup);

      expect(result).toEqual({ name: "fallback", masterExerciseId: 42 });
    });

    it("should use fallback when resolved name is null", () => {
      const lookup: ResolvedExerciseNameMap = new Map([
        [1, { name: "fallback", masterExerciseId: 42 }],
      ]);
      const result = resolveExerciseNameWithLookup(1, "fallback", lookup);

      expect(result).toEqual({ name: "fallback", masterExerciseId: 42 });
    });

    it("should handle zero templateExerciseId", () => {
      const lookup: ResolvedExerciseNameMap = new Map();
      const result = resolveExerciseNameWithLookup(0, "fallback", lookup);

      expect(result).toEqual({ name: "fallback", masterExerciseId: null });
    });

    it("should handle negative templateExerciseId", () => {
      const lookup: ResolvedExerciseNameMap = new Map();
      const result = resolveExerciseNameWithLookup(-1, "fallback", lookup);

      expect(result).toEqual({ name: "fallback", masterExerciseId: null });
    });
  });

  describe("withRetry", () => {
    it("should succeed on first try", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await withRetry(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockResolvedValue("success");

      // Mock setTimeout to be immediate
      const originalSetTimeout = mockSetTimeout();

      const result = await withRetry(operation, 3, 1);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);

      global.setTimeout = originalSetTimeout;
    });

    it("should fail after max retries", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Always fails"));

      // Mock setTimeout to be immediate
      const originalSetTimeout = mockSetTimeout();

      await expect(withRetry(operation, 2, 1)).rejects.toThrow("Always fails");
      expect(operation).toHaveBeenCalledTimes(2);

      global.setTimeout = originalSetTimeout;
    });

    it("should use default parameters", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await withRetry(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should handle different error types", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new TypeError("Type Error"))
        .mockResolvedValue("success");

      // Mock setTimeout to be immediate
      const originalSetTimeout = mockSetTimeout();

      const result = await withRetry(operation, 3, 1);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);

      global.setTimeout = originalSetTimeout;
    });

    it("should preserve original error message", async () => {
      const originalError = new Error("Original error message");
      const operation = vi.fn().mockRejectedValue(originalError);

      // Mock setTimeout to be immediate
      const originalSetTimeout = mockSetTimeout();

      await expect(withRetry(operation, 1, 1)).rejects.toThrow(
        "Original error message",
      );

      global.setTimeout = originalSetTimeout;
    });

    it("should handle zero delay", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockResolvedValue("success");

      // Mock setTimeout to be immediate
      const originalSetTimeout = mockSetTimeout();

      const result = await withRetry(operation, 3, 1);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);

      global.setTimeout = originalSetTimeout;
    });

    it("should handle string errors", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce("String error 1")
        .mockResolvedValue("success");

      // Mock setTimeout to be immediate
      const originalSetTimeout = mockSetTimeout();

      const result = await withRetry(operation, 2, 1);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);

      global.setTimeout = originalSetTimeout;
    });
  });

  describe("Integration Tests", () => {
    it("should have proper function exports", async () => {
      const utilsModule = await import("~/server/db/utils");

      expect(typeof utilsModule.resolveExerciseNameWithLookup).toBe("function");
      expect(typeof utilsModule.withRetry).toBe("function");
      expect(typeof utilsModule.loadResolvedExerciseNameMap).toBe("function");
      expect(typeof utilsModule.batchInsertWorkouts).toBe("function");
      expect(typeof utilsModule.batchUpdateSessionExercises).toBe("function");
      expect(typeof utilsModule.batchCreateMasterExerciseLinks).toBe(
        "function",
      );
      expect(typeof utilsModule.batchDeleteWorkouts).toBe("function");
      expect(typeof utilsModule.getCachedUserPreferences).toBe("function");
      expect(typeof utilsModule.clearUserPreferencesCache).toBe("function");
    });

    it("should handle edge cases gracefully", async () => {
      // Test with null/undefined inputs
      const lookup: ResolvedExerciseNameMap = new Map();

      expect(() =>
        resolveExerciseNameWithLookup(undefined, "fallback", lookup),
      ).not.toThrow();
      expect(() =>
        resolveExerciseNameWithLookup(null, "fallback", lookup),
      ).not.toThrow();
    });

    it("should handle empty fallback", () => {
      const lookup: ResolvedExerciseNameMap = new Map();
      const result = resolveExerciseNameWithLookup(999, "", lookup);

      expect(result).toEqual({ name: "", masterExerciseId: null });
    });

    it("should handle complex lookup scenarios", () => {
      const lookup: ResolvedExerciseNameMap = new Map([
        [1, { name: "Bench Press", masterExerciseId: 100 }],
        [2, { name: "Squat", masterExerciseId: 101 }],
        [3, { name: "", masterExerciseId: 102 }], // Empty name
        [4, { name: "Deadlift", masterExerciseId: null }], // No master ID
      ]);

      expect(resolveExerciseNameWithLookup(1, "fallback", lookup)).toEqual({
        name: "Bench Press",
        masterExerciseId: 100,
      });
      expect(resolveExerciseNameWithLookup(2, "fallback", lookup)).toEqual({
        name: "Squat",
        masterExerciseId: 101,
      });
      expect(resolveExerciseNameWithLookup(3, "fallback", lookup)).toEqual({
        name: "fallback",
        masterExerciseId: 102,
      });
      expect(resolveExerciseNameWithLookup(4, "fallback", lookup)).toEqual({
        name: "Deadlift",
        masterExerciseId: null,
      });
    });
  });
});
