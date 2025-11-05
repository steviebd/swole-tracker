import { describe, it, expect } from "vitest";
import { getMockData, mockDataSets } from "~/__tests__/mocks/mock-sets";

describe("getMockData", () => {
  it("should return a deep copy of the mock data to prevent test pollution", () => {
    // Get a copy of the standardUser data
    const originalData = mockDataSets.standardUser;
    const copiedData = getMockData("standardUser");

    // Verify that the copied data is not the same reference as the original
    expect(copiedData).not.toBe(originalData);
    expect(copiedData.user).not.toBe(originalData.user);
    expect(copiedData.preferences).not.toBe(originalData.preferences);

    // Modify the copied data (shallow modification)
    copiedData.user.email = "modified@example.com";

    // The original data should remain unchanged
    expect(originalData.user.email).toBe("standard@example.com");
    expect(copiedData.user.email).toBe("modified@example.com");

    // Modify nested data (deep modification)
    if (copiedData.preferences) {
      copiedData.preferences.defaultWeightUnit = "modified-unit";
    }

    // The original nested data should remain unchanged
    expect(originalData.preferences?.defaultWeightUnit).toBe("kg");
    expect(copiedData.preferences?.defaultWeightUnit).toBe("modified-unit");

    // Test with a more complex data set
    const workoutData = getMockData("workoutWithExercises");
    const originalWorkoutData = mockDataSets.workoutWithExercises;

    // Verify that arrays are not the same reference
    expect(workoutData.sessionExercises).not.toBe(originalWorkoutData.sessionExercises);

    // Modify an array element in the copied data
    if (workoutData.sessionExercises && workoutData.sessionExercises.length > 0) {
      workoutData.sessionExercises[0].weight = 999;
    }

    // The original array should remain unchanged
    expect(originalWorkoutData.sessionExercises?.[0]?.weight).toBe(185.0);
    expect(workoutData.sessionExercises?.[0]?.weight).toBe(999);
  });
});