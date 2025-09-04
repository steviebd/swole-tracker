import { describe, it, expect } from "vitest";
import {
  getQueue,
  getQueueLength,
  enqueueWorkoutSave,
  dequeue,
  clearQueue,
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
});
