/**
 * Tests for useOfflineSaveQueue hook
 * Tests offline workout save queue functionality and state management
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";

import { useOfflineSaveQueue } from "~/hooks/use-offline-save-queue";

declare global {
  interface Window {
    posthog: {
      capture: ReturnType<typeof vi.fn>;
    };
  }
}
import {
  enqueueWorkoutSave,
  getQueue,
  getQueueLength,
  pruneExhausted,
  readQueue,
  writeQueue,
  removeItem,
  requeueFront,
  QUEUE_UPDATED_EVENT,
} from "~/lib/offline-queue";

// Mock the offline queue library
vi.mock("~/lib/offline-queue", () => ({
  enqueueWorkoutSave: vi.fn(),
  getQueue: vi.fn(),
  getQueueLength: vi.fn(),
  requeueFront: vi.fn(),
  removeItem: vi.fn(),
  pruneExhausted: vi.fn(),
  readQueue: vi.fn(),
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
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
        })),
      },
    },
  },
}));

// Mock window event listeners
const mockSetInterval = vi.fn();
const mockClearInterval = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

describe("useOfflineSaveQueue", () => {
  const mockEnqueueWorkoutSave = enqueueWorkoutSave as any;
  const mockGetQueue = getQueue as any;
  const mockGetQueueLength = getQueueLength as any;
  const mockPruneExhausted = pruneExhausted as any;
  const mockReadQueue = readQueue as any;
  const mockWriteQueue = writeQueue as any;
  const mockRemoveItem = removeItem as any;
  const mockRequeueFront = requeueFront as any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Only set up window mocks if window exists (for SSR tests)
    if (typeof window !== "undefined") {
      // Mock PostHog
      Object.defineProperty(window, "posthog", {
        value: {
          capture: vi.fn(),
        },
        writable: true,
      });

      // Mock navigator
      Object.defineProperty(window, "navigator", {
        value: {
          onLine: true,
        },
        writable: true,
      });

      vi.spyOn(window, "addEventListener").mockImplementation(
        mockAddEventListener,
      );
      vi.spyOn(window, "removeEventListener").mockImplementation(
        mockRemoveEventListener,
      );
    }

    // Mock document properties (only if document exists)
    if (typeof document !== "undefined") {
      Object.defineProperty(document, "hidden", {
        value: false,
        writable: true,
      });

      vi.spyOn(document, "addEventListener");
      vi.spyOn(document, "removeEventListener");
    }

    vi.spyOn(global, "setInterval").mockImplementation(mockSetInterval);
    vi.spyOn(global, "clearInterval").mockImplementation(mockClearInterval);

    // Default mock implementations
    mockGetQueueLength.mockReturnValue(0);
    mockGetQueue.mockReturnValue([]);
    mockEnqueueWorkoutSave.mockReturnValue("test-id-123");

    // Mock localStorage operations
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        removeItem: vi.fn(),
        getItem: vi.fn(),
        setItem: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with empty queue", () => {
      mockGetQueueLength.mockReturnValue(0);
      mockGetQueue.mockReturnValue([]);

      const { result } = renderHook(() => useOfflineSaveQueue());

      expect(result.current.queueSize).toBe(0);
      expect(result.current.status).toBe("idle");
      expect(result.current.lastError).toBe(null);
      expect(result.current.items).toEqual([]);
      expect(result.current.isFlushing).toBe(false);
    });

    it("should initialize with existing queue items", () => {
      const mockQueue = [
        {
          id: "1",
          type: "workout_save",
          payload: { sessionId: 1 },
          attempts: 0,
        },
        {
          id: "2",
          type: "workout_save",
          payload: { sessionId: 2 },
          attempts: 0,
        },
      ];
      mockGetQueueLength.mockReturnValue(2);
      mockGetQueue.mockReturnValue(mockQueue);

      const { result } = renderHook(() => useOfflineSaveQueue());

      expect(result.current.queueSize).toBe(2);
      expect(result.current.items).toEqual(mockQueue);
    });

    it("should handle server-side rendering (no window)", () => {
      // Mock server environment
      const originalWindow = global.window;
      delete (global as any).window;

      const { result } = renderHook(() => useOfflineSaveQueue());

      expect(result.current.queueSize).toBe(0);
      expect(result.current.items).toEqual([]);

      // Restore window
      global.window = originalWindow;
    });
  });

  describe("enqueue function", () => {
    it("should enqueue workout and refresh count", () => {
      mockGetQueueLength.mockReturnValue(1);
      mockGetQueue.mockReturnValue([{ id: "test-id-123" }]);

      const { result } = renderHook(() => useOfflineSaveQueue());

      const payload = { sessionId: 1, exercises: [] };

      act(() => {
        const id = result.current.enqueue(payload);
        expect(id).toBe("test-id-123");
      });

      expect(mockEnqueueWorkoutSave).toHaveBeenCalledWith(payload);
      expect(mockGetQueueLength).toHaveBeenCalled();
      expect(mockGetQueue).toHaveBeenCalled();
    });
  });

  describe("refreshCount function", () => {
    it("should refresh queue size and items", () => {
      const { result } = renderHook(() => useOfflineSaveQueue());

      mockGetQueueLength.mockReturnValue(3);
      mockGetQueue.mockReturnValue([{ id: "1" }, { id: "2" }, { id: "3" }]);

      act(() => {
        result.current.refreshCount();
      });

      expect(result.current.queueSize).toBe(3);
      expect(result.current.items).toHaveLength(3);
    });

    it("should handle server environment", () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const { result } = renderHook(() => useOfflineSaveQueue());

      act(() => {
        result.current.refreshCount();
      });

      expect(mockGetQueueLength).not.toHaveBeenCalled();
      expect(mockGetQueue).not.toHaveBeenCalled();

      global.window = originalWindow;
    });
  });

  describe("flush function", () => {
    it("should handle empty queue", async () => {
      mockGetQueue.mockReturnValue([]);

      const { result } = renderHook(() => useOfflineSaveQueue());

      await act(async () => {
        await result.current.flush();
      });

      expect(result.current.status).toBe("done");
      expect(mockPruneExhausted).toHaveBeenCalled();
    });

    it("should process queue items successfully", async () => {
      const mockQueue = [
        {
          id: "1",
          type: "workout_save",
          payload: { sessionId: 1, exercises: [] },
          attempts: 0,
        },
        {
          id: "2",
          type: "workout_save",
          payload: { sessionId: 2, exercises: [] },
          attempts: 0,
        },
      ];
      mockGetQueue.mockReturnValue(mockQueue);
      mockReadQueue.mockReturnValue(mockQueue);

      const mockMutateAsync = vi.fn().mockResolvedValue({ success: true });
      vi.doMock("~/trpc/react", () => ({
        api: {
          useUtils: vi.fn(() => ({
            workouts: {
              invalidate: vi.fn(),
            },
          })),
          workouts: {
            batchSave: {
              useMutation: vi.fn(() => ({
                mutateAsync: mockMutateAsync,
              })),
            },
          },
        },
      }));

      const { result } = renderHook(() => useOfflineSaveQueue());

      await act(async () => {
        await result.current.flush();
      });

      expect(mockPruneExhausted).toHaveBeenCalled();
      expect(mockMutateAsync).toHaveBeenCalledWith({
        workouts: [
          { sessionId: 1, exercises: [] },
          { sessionId: 2, exercises: [] },
        ],
      });
      expect(result.current.status).toBe("done");
    });

    it("should handle batch failures", async () => {
      const mockQueue = [
        {
          id: "1",
          type: "workout_save",
          payload: { sessionId: 1, exercises: [] },
          attempts: 0,
        },
      ];
      mockGetQueue.mockReturnValue(mockQueue);
      mockReadQueue.mockReturnValue(mockQueue);

      const mockMutateAsync = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));
      vi.doMock("~/trpc/react", () => ({
        api: {
          useUtils: vi.fn(() => ({
            workouts: {
              invalidate: vi.fn(),
            },
          })),
          workouts: {
            batchSave: {
              useMutation: vi.fn(() => ({
                mutateAsync: mockMutateAsync,
              })),
            },
          },
        },
      }));

      const { result } = renderHook(() => useOfflineSaveQueue());

      await act(async () => {
        await result.current.flush();
      });

      expect(result.current.status).toBe("error");
      expect(result.current.lastError).toContain("Network or server error");
    });

    it("should prevent concurrent flushes", async () => {
      const { result } = renderHook(() => useOfflineSaveQueue());

      // Start first flush
      const flushPromise1 = act(async () => {
        await result.current.flush();
      });

      // Try to start second flush immediately
      const flushPromise2 = act(async () => {
        await result.current.flush();
      });

      await Promise.all([flushPromise1, flushPromise2]);

      // Should only call pruneExhausted once due to concurrent protection
      expect(mockPruneExhausted).toHaveBeenCalledTimes(1);
    });

    it("should handle exhausted items (attempts >= 8)", async () => {
      const mockQueue = [
        {
          id: "1",
          type: "workout_save",
          payload: { sessionId: 1, exercises: [] },
          attempts: 8,
        },
      ];
      mockGetQueue.mockReturnValue(mockQueue);
      mockReadQueue.mockReturnValue(mockQueue);

      const { result } = renderHook(() => useOfflineSaveQueue());

      await act(async () => {
        await result.current.flush();
      });

      expect(mockRemoveItem).toHaveBeenCalledWith("1");
      expect(result.current.lastError).toContain(
        "Failed to sync workout after 9 attempts",
      );
    });
  });

  describe("Event Listeners", () => {
    it("should set up event listeners on mount", () => {
      renderHook(() => useOfflineSaveQueue());

      expect(mockAddEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function),
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        "storage",
        expect.any(Function),
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        QUEUE_UPDATED_EVENT,
        expect.any(Function),
      );
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 60000);
    });

    it("should clean up event listeners on unmount", () => {
      const { unmount } = renderHook(() => useOfflineSaveQueue());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function),
      );
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        "storage",
        expect.any(Function),
      );
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        QUEUE_UPDATED_EVENT,
        expect.any(Function),
      );
      expect(mockClearInterval).toHaveBeenCalled();
    });
  });

  describe("Automatic Triggers", () => {
    it("should flush on app start when online and queue has items", async () => {
      mockGetQueueLength.mockReturnValue(2);
      mockGetQueue.mockReturnValue([]);

      const { result } = renderHook(() => useOfflineSaveQueue());

      // Wait for useEffect to run
      await waitFor(() => {
        expect(mockPruneExhausted).toHaveBeenCalled();
      });
    });

    it("should not flush on app start when offline", () => {
      Object.defineProperty(window.navigator, "onLine", {
        value: false,
        writable: true,
      });

      renderHook(() => useOfflineSaveQueue());

      expect(mockPruneExhausted).not.toHaveBeenCalled();
    });
  });

  describe("Cleanup Functions", () => {
    it("should clean up obsolete storage keys", () => {
      const mockLocalStorage = {
        removeItem: vi.fn(),
      };
      vi.stubGlobal("localStorage", mockLocalStorage);

      renderHook(() => useOfflineSaveQueue());

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        "swole-tracker-offline-queue-v2",
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        "swole-tracker-offline-sessions-v1",
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        "swole-tracker-sync-status-v1",
      );
    });

    it("should handle cleanup errors gracefully", () => {
      const mockLocalStorage = {
        removeItem: vi.fn().mockImplementation(() => {
          throw new Error("Storage error");
        }),
      };
      const consoleSpy = vi
        .spyOn(console, "debug")
        .mockImplementation(() => {});
      vi.stubGlobal("localStorage", mockLocalStorage);

      expect(() => {
        renderHook(() => useOfflineSaveQueue());
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to remove obsolete key:",
        expect.any(String),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Analytics Integration", () => {
    it("should capture PostHog events on successful sync", async () => {
      mockGetQueue.mockReturnValue([
        {
          id: "1",
          type: "workout_save",
          payload: { sessionId: 1, exercises: [] },
          attempts: 0,
        },
      ]);
      mockReadQueue.mockReturnValue([
        {
          id: "1",
          type: "workout_save",
          payload: { sessionId: 1, exercises: [] },
          attempts: 0,
        },
      ]);

      const mockMutateAsync = vi.fn().mockResolvedValue({ success: true });
      vi.doMock("~/trpc/react", () => ({
        api: {
          useUtils: vi.fn(() => ({
            workouts: {
              invalidate: vi.fn(),
            },
          })),
          workouts: {
            batchSave: {
              useMutation: vi.fn(() => ({
                mutateAsync: mockMutateAsync,
              })),
            },
          },
        },
      }));

      const { result } = renderHook(() => useOfflineSaveQueue());

      await act(async () => {
        await result.current.flush();
      });

      expect(window.posthog.capture).toHaveBeenCalledWith(
        "offline_sync_success",
        {
          itemsProcessed: 1,
          timestamp: expect.any(String),
        },
      );
    });

    it("should capture PostHog events on sync error", async () => {
      mockGetQueue.mockReturnValue([
        {
          id: "1",
          type: "workout_save",
          payload: { sessionId: 1, exercises: [] },
          attempts: 0,
        },
      ]);
      mockReadQueue.mockReturnValue([
        {
          id: "1",
          type: "workout_save",
          payload: { sessionId: 1, exercises: [] },
          attempts: 0,
        },
      ]);

      const mockMutateAsync = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));
      vi.doMock("~/trpc/react", () => ({
        api: {
          useUtils: vi.fn(() => ({
            workouts: {
              invalidate: vi.fn(),
            },
          })),
          workouts: {
            batchSave: {
              useMutation: vi.fn(() => ({
                mutateAsync: mockMutateAsync,
              })),
            },
          },
        },
      }));

      const { result } = renderHook(() => useOfflineSaveQueue());

      await act(async () => {
        await result.current.flush();
      });

      expect(window.posthog.capture).toHaveBeenCalledWith(
        "offline_sync_error",
        {
          error: "Network or server error",
          timestamp: expect.any(String),
        },
      );
    });

    it("should handle PostHog errors gracefully", async () => {
      // Make PostHog throw an error
      Object.defineProperty(window, "posthog", {
        value: {
          capture: vi.fn().mockImplementation(() => {
            throw new Error("PostHog error");
          }),
        },
        writable: true,
      });

      mockGetQueue.mockReturnValue([
        {
          id: "1",
          type: "workout_save",
          payload: { sessionId: 1, exercises: [] },
          attempts: 0,
        },
      ]);
      mockReadQueue.mockReturnValue([
        {
          id: "1",
          type: "workout_save",
          payload: { sessionId: 1, exercises: [] },
          attempts: 0,
        },
      ]);

      const mockMutateAsync = vi.fn().mockResolvedValue({ success: true });
      vi.doMock("~/trpc/react", () => ({
        api: {
          useUtils: vi.fn(() => ({
            workouts: {
              invalidate: vi.fn(),
            },
          })),
          workouts: {
            batchSave: {
              useMutation: vi.fn(() => ({
                mutateAsync: mockMutateAsync,
              })),
            },
          },
        },
      }));

      const { result } = renderHook(() => useOfflineSaveQueue());

      // Should not throw even if PostHog fails
      await expect(
        act(async () => {
          await result.current.flush();
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("Status Management", () => {
    it("should return correct isFlushing status", () => {
      const { result } = renderHook(() => useOfflineSaveQueue());

      expect(result.current.isFlushing).toBe(false);
      expect(result.current.status).toBe("idle");
    });

    it("should transition through status states correctly", async () => {
      mockGetQueue.mockReturnValue([]);

      const { result } = renderHook(() => useOfflineSaveQueue());

      const flushPromise = act(async () => {
        await result.current.flush();
      });

      // Should be flushing during operation
      expect(result.current.status).toBe("flushing");
      expect(result.current.isFlushing).toBe(true);

      await flushPromise;

      // Should be done after successful flush
      expect(result.current.status).toBe("done");

      // Should return to idle after a short delay
      await waitFor(
        () => {
          expect(result.current.status).toBe("idle");
          expect(result.current.isFlushing).toBe(false);
        },
        { timeout: 1000 },
      );
    });
  });
});
