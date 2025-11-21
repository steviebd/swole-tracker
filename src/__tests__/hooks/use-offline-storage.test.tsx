/**
 * Tests for useOfflineStorage hook
 * Tests offline storage functionality for pending actions
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";

import { useOfflineStorage } from "~/hooks/use-offline-storage";

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: vi.fn(() => "test-uuid-123"),
  },
  writable: true,
});

describe("useOfflineStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with empty pending actions", () => {
      const { result } = renderHook(() => useOfflineStorage());

      expect(result.current.pendingActions).toEqual([]);
      expect(result.current.hasPendingActions).toBe(false);
    });

    it("should load existing actions from localStorage", () => {
      const existingActions = [
        {
          id: "action-1",
          type: "save_workout",
          data: { sessionId: 1 },
          timestamp: 1234567890,
        },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingActions));

      const { result } = renderHook(() => useOfflineStorage());

      expect(result.current.pendingActions).toEqual(existingActions);
      expect(result.current.hasPendingActions).toBe(true);
    });

    it("should handle localStorage errors gracefully", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      expect(() => {
        renderHook(() => useOfflineStorage());
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load offline actions:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe("addPendingAction", () => {
    it("should add a new pending action", () => {
      const { result } = renderHook(() => useOfflineStorage());

      const actionData = {
        type: "save_workout" as const,
        data: { sessionId: 1, exercises: [] },
      };

      act(() => {
        const id = result.current.addPendingAction(actionData);
        expect(id).toBe("test-uuid-123");
      });

      expect(result.current.pendingActions).toHaveLength(1);
      expect(result.current.pendingActions[0]).toEqual({
        id: "test-uuid-123",
        type: "save_workout",
        data: { sessionId: 1, exercises: [] },
        timestamp: expect.any(Number),
      });
      expect(result.current.hasPendingActions).toBe(true);
    });

    it("should save to localStorage when adding action", () => {
      const { result } = renderHook(() => useOfflineStorage());

      act(() => {
        result.current.addPendingAction({
          type: "create_template",
          data: { name: "New Template" },
        });
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "swole-tracker-offline-actions",
        expect.stringContaining("create_template"),
      );
    });

    it("should handle different action types", () => {
      const { result } = renderHook(() => useOfflineStorage());

      const actions = [
        { type: "create_template" as const, data: { name: "Template" } },
        { type: "update_template" as const, data: { id: 1, name: "Updated" } },
        { type: "delete_template" as const, data: { id: 1 } },
        { type: "save_workout" as const, data: { sessionId: 1 } },
      ];

      actions.forEach((action) => {
        act(() => {
          result.current.addPendingAction(action);
        });
      });

      expect(result.current.pendingActions).toHaveLength(4);
      expect(result.current.hasPendingActions).toBe(true);
    });
  });

  describe("removePendingAction", () => {
    it("should remove a pending action by ID", () => {
      const { result } = renderHook(() => useOfflineStorage());

      // Add some actions first
      act(() => {
        result.current.addPendingAction({
          type: "save_workout",
          data: { sessionId: 1 },
        });
        result.current.addPendingAction({
          type: "save_workout",
          data: { sessionId: 2 },
        });
      });

      expect(result.current.pendingActions).toHaveLength(2);

      // Remove the first action
      act(() => {
        result.current.removePendingAction("test-uuid-123");
      });

      expect(result.current.pendingActions).toHaveLength(1);
      expect(result.current.hasPendingActions).toBe(true);
    });

    it("should handle removing non-existent action", () => {
      const { result } = renderHook(() => useOfflineStorage());

      act(() => {
        result.current.addPendingAction({
          type: "save_workout",
          data: { sessionId: 1 },
        });
      });

      const initialLength = result.current.pendingActions.length;

      act(() => {
        result.current.removePendingAction("non-existent-id");
      });

      expect(result.current.pendingActions).toHaveLength(initialLength);
    });

    it("should update hasPendingActions when all actions removed", () => {
      const { result } = renderHook(() => useOfflineStorage());

      act(() => {
        result.current.addPendingAction({
          type: "save_workout",
          data: { sessionId: 1 },
        });
      });

      expect(result.current.hasPendingActions).toBe(true);

      act(() => {
        result.current.removePendingAction("test-uuid-123");
      });

      expect(result.current.hasPendingActions).toBe(false);
    });
  });

  describe("clearAllPendingActions", () => {
    it("should clear all pending actions", () => {
      const { result } = renderHook(() => useOfflineStorage());

      // Add multiple actions
      act(() => {
        result.current.addPendingAction({
          type: "save_workout",
          data: { sessionId: 1 },
        });
        result.current.addPendingAction({
          type: "create_template",
          data: { name: "Template" },
        });
      });

      expect(result.current.pendingActions).toHaveLength(2);
      expect(result.current.hasPendingActions).toBe(true);

      act(() => {
        result.current.clearAllPendingActions();
      });

      expect(result.current.pendingActions).toEqual([]);
      expect(result.current.hasPendingActions).toBe(false);
    });

    it("should save empty array to localStorage when cleared", () => {
      const { result } = renderHook(() => useOfflineStorage());

      act(() => {
        result.current.addPendingAction({
          type: "save_workout",
          data: { sessionId: 1 },
        });
      });

      act(() => {
        result.current.clearAllPendingActions();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "swole-tracker-offline-actions",
        "[]",
      );
    });
  });

  describe("localStorage Integration", () => {
    it("should save to localStorage when actions change", () => {
      const { result } = renderHook(() => useOfflineStorage());

      act(() => {
        result.current.addPendingAction({
          type: "save_workout",
          data: { sessionId: 1 },
        });
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2); // Once for empty init, once for add
    });

    it("should handle localStorage save errors gracefully", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const { result } = renderHook(() => useOfflineStorage());

      act(() => {
        result.current.addPendingAction({
          type: "save_workout",
          data: { sessionId: 1 },
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save offline actions:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe("hasPendingActions Computed Property", () => {
    it("should return false when no actions", () => {
      const { result } = renderHook(() => useOfflineStorage());

      expect(result.current.hasPendingActions).toBe(false);
    });

    it("should return true when there are actions", () => {
      const { result } = renderHook(() => useOfflineStorage());

      act(() => {
        result.current.addPendingAction({
          type: "save_workout",
          data: { sessionId: 1 },
        });
      });

      expect(result.current.hasPendingActions).toBe(true);
    });

    it("should update correctly when actions are added and removed", () => {
      const { result } = renderHook(() => useOfflineStorage());

      expect(result.current.hasPendingActions).toBe(false);

      act(() => {
        result.current.addPendingAction({
          type: "save_workout",
          data: { sessionId: 1 },
        });
      });

      expect(result.current.hasPendingActions).toBe(true);

      act(() => {
        result.current.clearAllPendingActions();
      });

      expect(result.current.hasPendingActions).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle invalid JSON in localStorage", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockLocalStorage.getItem.mockReturnValue("invalid json");

      expect(() => {
        renderHook(() => useOfflineStorage());
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load offline actions:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("should generate unique IDs for each action", () => {
      const { result } = renderHook(() => useOfflineStorage());
      const mockUUID = vi.mocked(crypto.randomUUID);

      mockUUID.mockReturnValueOnce("uuid-1").mockReturnValueOnce("uuid-2");

      act(() => {
        result.current.addPendingAction({
          type: "save_workout",
          data: { sessionId: 1 },
        });
        result.current.addPendingAction({
          type: "save_workout",
          data: { sessionId: 2 },
        });
      });

      expect(result.current.pendingActions[0]?.id).toBe("uuid-1");
      expect(result.current.pendingActions[1]?.id).toBe("uuid-2");
    });

    it("should include timestamp for each action", () => {
      const { result } = renderHook(() => useOfflineStorage());
      const beforeTime = Date.now();

      act(() => {
        result.current.addPendingAction({
          type: "save_workout",
          data: { sessionId: 1 },
        });
      });

      const afterTime = Date.now();
      const action = result.current.pendingActions[0];

      expect(action?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(action?.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});
