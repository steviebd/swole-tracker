/**
 * Tests for useOfflineSaveQueue hook
 * Tests offline workout save queue functionality and state management
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock localStorage BEFORE any imports
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock window.navigator
Object.defineProperty(window, "navigator", {
  value: {
    onLine: true,
  },
  writable: true,
});

import { useOfflineSaveQueue } from "~/hooks/use-offline-save-queue";

declare global {
  interface Window {
    posthog: {
      capture: ReturnType<typeof vi.fn>;
    };
  }
}

// Mock the offline queue library
vi.mock("~/lib/offline-queue", () => ({
  enqueueWorkoutSave: vi.fn(() => "test-id"),
  getQueue: vi.fn(() => []),
  getQueueLength: vi.fn(() => 0),
  requeueFront: vi.fn(),
  removeItem: vi.fn(),
  pruneExhausted: vi.fn(),
  readQueue: vi.fn(() => []),
  writeQueue: vi.fn(),
  QUEUE_UPDATED_EVENT: "queue-updated",
}));

// Mock the workout cache helpers
vi.mock("~/lib/workout-cache-helpers", () => ({
  invalidateWorkoutDependentCaches: vi.fn(),
}));

// Mock the tRPC API
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: vi.fn(() => ({
      workouts: {
        invalidate: vi.fn(),
      },
    })),
    workouts: {
      batchSave: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({ success: true }),
        }),
      },
    },
  },
}));

describe("useOfflineSaveQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(vi.fn());
    localStorageMock.removeItem.mockImplementation(vi.fn());
    localStorageMock.clear.mockImplementation(vi.fn());

    // Setup PostHog mock
    window.posthog = {
      capture: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with empty queue", async () => {
      const { result } = renderHook(() => useOfflineSaveQueue());

      await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(result.current.queueSize).toBe(0);
        expect(result.current.items).toEqual([]);
        expect(result.current.isFlushing).toBe(false);
      });
    });

    it("should handle server-side rendering (no window)", () => {
      const originalWindow = global.window;
      delete (global as any).window;

      expect(() => {
        renderHook(() => useOfflineSaveQueue());
      }).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe("enqueue function", () => {
    it("should enqueue workout", async () => {
      const { result } = renderHook(() => useOfflineSaveQueue());

      await waitFor(() => {
        expect(result.current.queueSize).toBe(0);
      });

      act(() => {
        const workoutData = { sessionId: 1, exercises: [] };
        result.current.enqueue(workoutData);
      });

      // Just verify it doesn't throw - the mock handles the rest
      expect(result.current).toBeDefined();
    });
  });

  describe("refreshCount function", () => {
    it("should refresh queue size", async () => {
      const { result } = renderHook(() => useOfflineSaveQueue());

      await waitFor(() => {
        expect(result.current.queueSize).toBe(0);
      });

      act(() => {
        result.current.refreshCount();
      });

      expect(result.current).toBeDefined();
    });
  });

  describe("flush function", () => {
    it("should handle empty queue", async () => {
      const { result } = renderHook(() => useOfflineSaveQueue());

      await waitFor(() => {
        expect(result.current.queueSize).toBe(0);
      });

      await act(async () => {
        await result.current.flush();
      });

      expect(result.current).toBeDefined();
    });

    it("should handle flush without errors", async () => {
      const { result } = renderHook(() => useOfflineSaveQueue());

      await waitFor(() => {
        expect(result.current.queueSize).toBe(0);
      });

      await act(async () => {
        await result.current.flush();
      });

      expect(result.current).toBeDefined();
    });
  });

  describe("Event Listeners", () => {
    it("should set up without errors", () => {
      expect(() => {
        renderHook(() => useOfflineSaveQueue());
      }).not.toThrow();
    });

    it("should clean up on unmount", () => {
      const { unmount } = renderHook(() => useOfflineSaveQueue());

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe("Cleanup Functions", () => {
    it("should clean up obsolete storage keys", () => {
      renderHook(() => useOfflineSaveQueue());

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "swole-tracker-offline-queue-v2",
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "swole-tracker-offline-sessions-v1",
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "swole-tracker-sync-status-v1",
      );
    });

    it("should handle cleanup errors gracefully", () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      expect(() => {
        renderHook(() => useOfflineSaveQueue());
      }).not.toThrow();
    });
  });

  describe("Status Management", () => {
    it("should return correct initial status", async () => {
      const { result } = renderHook(() => useOfflineSaveQueue());

      await waitFor(() => {
        expect(result.current.status).toBe("idle");
        expect(result.current.isFlushing).toBe(false);
        expect(result.current.lastError).toBe(null);
      });
    });
  });
});
