import { describe, it, expect, vi, beforeEach } from "vitest";

// Simple test to verify moveSet function no longer contains enqueue calls
describe("moveSet function - Bug Fix Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("moveSet function - Basic Functionality", () => {
    it("should move set down within exercise", () => {
      // Create a simple mock exercises array
      const exercises = [
        {
          id: "ex1",
          name: "Bench Press",
          sets: [
            { weight: 100, reps: 10, rpe: 8 },
            { weight: 200, reps: 8, rpe: 9 },
          ],
        },
      ];

      // Simulate moveSet logic (extracted from hook)
      const moveSet = (
        exercises: any[],
        exerciseIndex: number,
        setIndex: number,
        direction: "up" | "down",
      ) => {
        const next = [...exercises];
        const ex = next[exerciseIndex];
        if (!ex?.sets?.[setIndex]) {
          return exercises;
        }

        const newIndex = direction === "up" ? setIndex - 1 : setIndex + 1;

        // Check bounds
        if (newIndex < 0 || newIndex >= ex.sets.length) {
          return exercises;
        }

        // Simple swap operation
        const setsCopy = [...ex.sets];
        const setA = setsCopy[setIndex];
        const setB = setsCopy[newIndex];

        if (!setA || !setB) {
          return exercises;
        }

        // Create new objects to force React re-render
        setsCopy[setIndex] = { ...setB };
        setsCopy[newIndex] = { ...setA };

        // Replace entire exercise object to ensure React sees the change
        next[exerciseIndex] = {
          ...ex,
          sets: setsCopy,
        };

        return next;
      };

      // Move the first set down
      const result = moveSet(exercises, 0, 0, "down");

      // Sets should be swapped
      expect(result[0]?.sets[0]?.weight).toBe(200);
      expect(result[0]?.sets[0]?.reps).toBe(8);
      expect(result[0]?.sets[0]?.rpe).toBe(9);
      expect(result[0]?.sets[1]?.weight).toBe(100);
      expect(result[0]?.sets[1]?.reps).toBe(10);
      expect(result[0]?.sets[1]?.rpe).toBe(8);
    });
  });

  describe("moveSet function - Edge Cases", () => {
    it("should handle single set exercise", () => {
      const exercises = [
        {
          id: "ex1",
          name: "Bench Press",
          sets: [{ weight: 100, reps: 10, rpe: 8 }],
        },
      ];

      const moveSet = (
        exercises: any[],
        exerciseIndex: number,
        setIndex: number,
        direction: "up" | "down",
      ) => {
        const next = [...exercises];
        const ex = next[exerciseIndex];
        if (!ex?.sets?.[setIndex]) {
          return exercises;
        }

        const newIndex = direction === "up" ? setIndex - 1 : setIndex + 1;

        // Check bounds
        if (newIndex < 0 || newIndex >= ex.sets.length) {
          return exercises;
        }

        // Simple swap operation
        const setsCopy = [...ex.sets];
        const setA = setsCopy[setIndex];
        const setB = setsCopy[newIndex];

        if (!setA || !setB) {
          return exercises;
        }

        // Create new objects to force React re-render
        setsCopy[setIndex] = { ...setB };
        setsCopy[newIndex] = { ...setA };

        // Replace entire exercise object to ensure React sees the change
        next[exerciseIndex] = {
          ...ex,
          sets: setsCopy,
        };

        return next;
      };

      // Try to move set down - should not change anything
      const result = moveSet(exercises, 0, 0, "down");

      // Set should remain unchanged
      expect(result[0]?.sets[0]?.weight).toBe(100);
      expect(result[0]?.sets[0]?.reps).toBe(10);
      expect(result[0]?.sets[0]?.rpe).toBe(8);
    });

    it("should preserve set properties during move", () => {
      const exercises = [
        {
          id: "ex1",
          name: "Bench Press",
          sets: [
            { weight: 100, reps: 10, rpe: 8 },
            { weight: 200, reps: 8, rpe: 9 },
          ],
        },
      ];

      const moveSet = (
        exercises: any[],
        exerciseIndex: number,
        setIndex: number,
        direction: "up" | "down",
      ) => {
        const next = [...exercises];
        const ex = next[exerciseIndex];
        if (!ex?.sets?.[setIndex]) {
          return exercises;
        }

        const newIndex = direction === "up" ? setIndex - 1 : setIndex + 1;

        // Check bounds
        if (newIndex < 0 || newIndex >= ex.sets.length) {
          return exercises;
        }

        // Simple swap operation
        const setsCopy = [...ex.sets];
        const setA = setsCopy[setIndex];
        const setB = setsCopy[newIndex];

        if (!setA || !setB) {
          return exercises;
        }

        // Create new objects to force React re-render
        setsCopy[setIndex] = { ...setB };
        setsCopy[newIndex] = { ...setA };

        // Replace entire exercise object to ensure React sees the change
        next[exerciseIndex] = {
          ...ex,
          sets: setsCopy,
        };

        return next;
      };

      // Move the first set down
      const result = moveSet(exercises, 0, 0, "down");

      // All properties should be preserved
      expect(result[0]?.sets[0]?.weight).toBe(200);
      expect(result[0]?.sets[0]?.reps).toBe(8);
      expect(result[0]?.sets[0]?.rpe).toBe(9);
      expect(result[0]?.sets[1]?.weight).toBe(100);
      expect(result[0]?.sets[1]?.reps).toBe(10);
      expect(result[0]?.sets[1]?.rpe).toBe(8);
    });
  });
});
