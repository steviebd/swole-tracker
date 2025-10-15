import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getQueue,
  getQueueLength,
  enqueueWorkoutSave,
  dequeue,
  clearQueue,
  updateItem,
  requeueFront,
  pruneExhausted,
} from "~/lib/offline-queue";

describe("offline-queue", () => {
  describe("getQueue", () => {
    it("should return empty array when window is not available", () => {
      const result = getQueue();
      expect(result).toEqual([]);
    });
  });

  describe("getQueueLength", () => {
    it("should return 0 when window is not available", () => {
      const result = getQueueLength();
      expect(result).toBe(0);
    });
  });

  describe("enqueueWorkoutSave", () => {
    it("should not throw when window is not available", () => {
      const payload = {
        sessionId: 123,
        exercises: [
          {
            exerciseName: "Bench Press",
            sets: [
              {
                id: "set-1",
                weight: 80,
                reps: 8,
                sets: 3,
                unit: "kg" as const,
              },
            ],
            unit: "kg" as const,
          },
        ],
      };

      expect(() => {
        enqueueWorkoutSave(payload);
      }).not.toThrow();
    });
  });

  describe("dequeue", () => {
    it("should return undefined when window is not available", () => {
      const result = dequeue();
      expect(result).toBeUndefined();
    });
  });

  describe("clearQueue", () => {
    it("should not throw when window is not available", () => {
      expect(() => {
        clearQueue();
      }).not.toThrow();
    });
  });

  describe("browser code paths", () => {
    let localStorageMock: any;
    let originalLocalStorage: any;

    beforeEach(() => {
      localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      originalLocalStorage = window.localStorage;
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, "localStorage", {
        value: originalLocalStorage,
        writable: true,
      });
    });

    describe("getQueue", () => {
      it("should return empty array when no stored data", () => {
        localStorageMock.getItem.mockReturnValue(null);
        const result = getQueue();
        expect(result).toEqual([]);
        expect(localStorageMock.getItem).toHaveBeenCalledWith(
          "offline.queue.v1",
        );
      });

      it("should return parsed queue items", () => {
        const mockItems = [
          {
            id: "q_abc_123",
            type: "workout_save",
            payload: { sessionId: 1, exercises: [] },
            attempts: 0,
            createdAt: 1234567890,
            updatedAt: 1234567890,
          },
        ];
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockItems));
        const result = getQueue();
        expect(result).toEqual(mockItems);
      });

      it("should return empty array on invalid JSON", () => {
        localStorageMock.getItem.mockReturnValue("invalid json");
        const result = getQueue();
        expect(result).toEqual([]);
      });

      it("should return empty array when stored data is not an array", () => {
        localStorageMock.getItem.mockReturnValue(JSON.stringify({}));
        const result = getQueue();
        expect(result).toEqual([]);
      });
    });

    describe("enqueueWorkoutSave", () => {
      it("should enqueue a workout save payload", () => {
        localStorageMock.getItem.mockReturnValue(null);
        const payload = {
          sessionId: 123,
          exercises: [
            {
              exerciseName: "Bench Press",
              sets: [
                {
                  id: "set-1",
                  weight: 80,
                  reps: 8,
                  sets: 3,
                  unit: "kg" as const,
                },
              ],
              unit: "kg" as const,
            },
          ],
        };

        const id = enqueueWorkoutSave(payload);
        expect(typeof id).toBe("string");
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "offline.queue.v1",
          expect.stringContaining('"type":"workout_save"'),
        );
      });
    });

    describe("dequeue", () => {
      it("should dequeue the first item", () => {
        const mockItems = [
          {
            id: "q_abc_123",
            type: "workout_save",
            payload: { sessionId: 1, exercises: [] },
            attempts: 0,
            createdAt: 1234567890,
            updatedAt: 1234567890,
          },
          {
            id: "q_def_456",
            type: "workout_save",
            payload: { sessionId: 2, exercises: [] },
            attempts: 0,
            createdAt: 1234567891,
            updatedAt: 1234567891,
          },
        ];
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockItems));

        const result = dequeue();
        expect(result).toEqual(mockItems[0]);
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "offline.queue.v1",
          JSON.stringify([mockItems[1]]),
        );
      });

      it("should return undefined when queue is empty", () => {
        localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
        const result = dequeue();
        expect(result).toBeUndefined();
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });
    });

    describe("updateItem", () => {
      it("should update an existing item", () => {
        const mockItems = [
          {
            id: "q_abc_123",
            type: "workout_save",
            payload: { sessionId: 1, exercises: [] },
            attempts: 0,
            createdAt: 1234567890,
            updatedAt: 1234567890,
          },
        ];
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockItems));

        updateItem("q_abc_123", { attempts: 1, lastError: "Network error" });

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "offline.queue.v1",
          expect.stringContaining('"attempts":1'),
        );
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "offline.queue.v1",
          expect.stringContaining('"lastError":"Network error"'),
        );
      });

      it("should do nothing if item not found", () => {
        localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
        updateItem("nonexistent", { attempts: 1 });
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });
    });

    describe("requeueFront", () => {
      it("should requeue an item to the front", () => {
        const existingItems = [
          {
            id: "q_def_456",
            type: "workout_save",
            payload: { sessionId: 2, exercises: [] },
            attempts: 0,
            createdAt: 1234567891,
            updatedAt: 1234567891,
          },
        ];
        localStorageMock.getItem.mockReturnValue(JSON.stringify(existingItems));

        const itemToRequeue = {
          id: "q_abc_123",
          type: "workout_save" as const,
          payload: { sessionId: 1, exercises: [] },
          attempts: 1,
          createdAt: 1234567890,
          updatedAt: 1234567890,
        };

        requeueFront(itemToRequeue);

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "offline.queue.v1",
          JSON.stringify([itemToRequeue, ...existingItems]),
        );
      });
    });

    describe("pruneExhausted", () => {
      it("should remove items with attempts >= MAX_ATTEMPTS", () => {
        const mockItems = [
          {
            id: "q_abc_123",
            type: "workout_save",
            payload: { sessionId: 1, exercises: [] },
            attempts: 7, // below max
            createdAt: 1234567890,
            updatedAt: 1234567890,
          },
          {
            id: "q_def_456",
            type: "workout_save",
            payload: { sessionId: 2, exercises: [] },
            attempts: 8, // at max, should be removed
            createdAt: 1234567891,
            updatedAt: 1234567891,
          },
          {
            id: "q_ghi_789",
            type: "workout_save",
            payload: { sessionId: 3, exercises: [] },
            attempts: 9, // above max
            createdAt: 1234567892,
            updatedAt: 1234567892,
          },
        ];
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockItems));

        pruneExhausted();

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "offline.queue.v1",
          JSON.stringify([mockItems[0]]),
        );
      });
    });
  });
});
