import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getQueue,
  getQueueLength,
  enqueueWorkoutSave,
  dequeue,
  updateItem,
  requeueFront,
  pruneExhausted,
  clearQueue,
  type SaveWorkoutPayload,
} from "~/lib/offline-queue";

type QueueItem = {
  id: string;
  type: "workout_save";
  payload: SaveWorkoutPayload;
  attempts: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
};

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

describe("offline-queue", () => {
  const mockPayload: SaveWorkoutPayload = {
    sessionId: 123,
    exercises: [
      {
        exerciseName: "Bench Press",
        sets: [
          { id: "set-1", weight: 80, reps: 8, unit: "kg" },
          { id: "set-2", weight: 80, reps: 6, unit: "kg" },
        ],
        unit: "kg",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
  });

  afterEach(() => {
    clearQueue();
  });

  describe("getQueue", () => {
    it("should return empty array when no queue exists", () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = getQueue();

      expect(result).toEqual([]);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("offline.queue.v1");
    });

    it("should return parsed queue from localStorage", () => {
      const mockQueue: QueueItem[] = [
        {
          id: "q_test_123",
          type: "workout_save",
          payload: mockPayload,
          attempts: 0,
          createdAt: 1234567890,
          updatedAt: 1234567890,
        },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockQueue));

      const result = getQueue();

      expect(result).toEqual(mockQueue);
    });

    it("should return empty array for invalid JSON", () => {
      mockLocalStorage.getItem.mockReturnValue("invalid json");

      const result = getQueue();

      expect(result).toEqual([]);
    });

    it("should return empty array for non-array data", () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({ not: "an array" }),
      );

      const result = getQueue();

      expect(result).toEqual([]);
    });

    it("should return empty array when window is undefined", () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const result = getQueue();

      expect(result).toEqual([]);
      global.window = originalWindow;
    });
  });

  describe("getQueueLength", () => {
    it("should return queue length", () => {
      const mockQueue: QueueItem[] = [
        {
          id: "q_test_1",
          type: "workout_save",
          payload: mockPayload,
          attempts: 0,
          createdAt: 1234567890,
          updatedAt: 1234567890,
        },
        {
          id: "q_test_2",
          type: "workout_save",
          payload: mockPayload,
          attempts: 0,
          createdAt: 1234567891,
          updatedAt: 1234567891,
        },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockQueue));

      const result = getQueueLength();

      expect(result).toBe(2);
    });
  });

  describe("enqueueWorkoutSave", () => {
    it("should add item to queue and return id", () => {
      const result = enqueueWorkoutSave(mockPayload);

      expect(result).toMatch(/^q_[a-z0-9]+_[a-z0-9]+$/);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "offline.queue.v1",
        expect.stringContaining(JSON.stringify(mockPayload)),
      );
    });

    it("should create item with correct structure", () => {
      enqueueWorkoutSave(mockPayload);

      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      expect(setItemCall).toBeDefined();
      const storedData = JSON.parse(setItemCall![1]);

      expect(storedData).toHaveLength(1);
      expect(storedData[0]).toMatchObject({
        type: "workout_save",
        payload: mockPayload,
        attempts: 0,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
      expect(storedData[0].id).toMatch(/^q_[a-z0-9]+_[a-z0-9]+$/);
    });

    it("should handle empty queue", () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      enqueueWorkoutSave(mockPayload);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe("dequeue", () => {
    it("should return undefined for empty queue", () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]));

      const result = dequeue();

      expect(result).toBeUndefined();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it("should return first item and update queue", () => {
      const mockQueue: QueueItem[] = [
        {
          id: "q_test_1",
          type: "workout_save",
          payload: mockPayload,
          attempts: 0,
          createdAt: 1234567890,
          updatedAt: 1234567890,
        },
        {
          id: "q_test_2",
          type: "workout_save",
          payload: mockPayload,
          attempts: 0,
          createdAt: 1234567891,
          updatedAt: 1234567891,
        },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockQueue));

      const result = dequeue();

      expect(result).toEqual(mockQueue[0]);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "offline.queue.v1",
        JSON.stringify([mockQueue[1]]),
      );
    });
  });

  describe("updateItem", () => {
    it("should update item with patch", () => {
      const mockQueue: QueueItem[] = [
        {
          id: "q_test_1",
          type: "workout_save",
          payload: mockPayload,
          attempts: 0,
          createdAt: 1234567890,
          updatedAt: 1234567890,
        },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockQueue));

      updateItem("q_test_1", { attempts: 1, lastError: "Network error" });

      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      expect(setItemCall).toBeDefined();
      const storedData = JSON.parse(setItemCall![1]);

      expect(storedData[0]).toMatchObject({
        id: "q_test_1",
        attempts: 1,
        lastError: "Network error",
        updatedAt: expect.any(Number),
      });
    });

    it("should not update if item not found", () => {
      const mockQueue: QueueItem[] = [
        {
          id: "q_test_1",
          type: "workout_save",
          payload: mockPayload,
          attempts: 0,
          createdAt: 1234567890,
          updatedAt: 1234567890,
        },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockQueue));

      updateItem("nonexistent", { attempts: 1 });

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe("requeueFront", () => {
    it("should add item to front of queue", () => {
      const mockQueue: QueueItem[] = [
        {
          id: "q_test_1",
          type: "workout_save",
          payload: mockPayload,
          attempts: 0,
          createdAt: 1234567890,
          updatedAt: 1234567890,
        },
      ];
      const newItem: QueueItem = {
        id: "q_test_2",
        type: "workout_save",
        payload: mockPayload,
        attempts: 1,
        createdAt: 1234567891,
        updatedAt: 1234567891,
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockQueue));

      requeueFront(newItem);

      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      expect(setItemCall).toBeDefined();
      const storedData = JSON.parse(setItemCall![1]);

      expect(storedData).toHaveLength(2);
      expect(storedData[0]).toEqual(newItem);
      expect(storedData[1]).toEqual(mockQueue[0]);
    });
  });

  describe("pruneExhausted", () => {
    it("should remove items with max attempts", () => {
      const mockQueue: QueueItem[] = [
        {
          id: "q_test_1",
          type: "workout_save",
          payload: mockPayload,
          attempts: 7, // Below max
          createdAt: 1234567890,
          updatedAt: 1234567890,
        },
        {
          id: "q_test_2",
          type: "workout_save",
          payload: mockPayload,
          attempts: 8, // At max, should be removed
          createdAt: 1234567891,
          updatedAt: 1234567891,
        },
        {
          id: "q_test_3",
          type: "workout_save",
          payload: mockPayload,
          attempts: 9, // Above max, should be removed
          createdAt: 1234567892,
          updatedAt: 1234567892,
        },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockQueue));

      pruneExhausted();

      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      expect(setItemCall).toBeDefined();
      const storedData = JSON.parse(setItemCall![1]);

      expect(storedData).toHaveLength(1);
      expect(storedData[0].id).toBe("q_test_1");
    });

    it("should keep all items below max attempts", () => {
      const mockQueue: QueueItem[] = [
        {
          id: "q_test_1",
          type: "workout_save",
          payload: mockPayload,
          attempts: 5,
          createdAt: 1234567890,
          updatedAt: 1234567890,
        },
        {
          id: "q_test_2",
          type: "workout_save",
          payload: mockPayload,
          attempts: 7,
          createdAt: 1234567891,
          updatedAt: 1234567891,
        },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockQueue));

      pruneExhausted();

      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      expect(setItemCall).toBeDefined();
      const storedData = JSON.parse(setItemCall![1]);

      expect(storedData).toHaveLength(2);
    });
  });

  describe("clearQueue", () => {
    it("should clear the queue", () => {
      clearQueue();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "offline.queue.v1",
        "[]",
      );
    });
  });

  describe("error handling", () => {
    it("should handle localStorage errors gracefully", () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      expect(() => getQueue()).not.toThrow();
      expect(getQueue()).toEqual([]);
    });

    it("should handle localStorage setItem errors gracefully", () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      expect(() => enqueueWorkoutSave(mockPayload)).not.toThrow();
    });
  });
});
