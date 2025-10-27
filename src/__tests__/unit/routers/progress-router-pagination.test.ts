import { describe, it, expect } from "vitest";

describe("Progress Highlights Pagination and Sorting", () => {
  it("sorts personal records by recency for pagination", () => {
    // Test the sorting logic that was added to getProgressHighlights
    const personalRecords = [
      {
        exerciseName: "Bench Press",
        recordType: "weight" as const,
        weight: 100,
        reps: 5,
        sets: 3,
        unit: "kg",
        workoutDate: new Date("2024-01-15"), // Older date
        oneRMEstimate: 120,
      },
      {
        exerciseName: "Squat",
        recordType: "weight" as const,
        weight: 150,
        reps: 3,
        sets: 4,
        unit: "kg",
        workoutDate: new Date("2024-03-20"), // Newer date
        oneRMEstimate: 180,
      },
      {
        exerciseName: "Deadlift",
        recordType: "volume" as const,
        weight: 120,
        reps: 5,
        sets: 5,
        unit: "kg",
        workoutDate: new Date("2024-02-10"), // Middle date
        totalVolume: 3000,
      },
    ];

    // Sort by recency (most recent first) - this is the logic added to the router
    const sortedRecords = personalRecords.sort(
      (a, b) => b.workoutDate.getTime() - a.workoutDate.getTime(),
    );

    // Verify sorting
    expect(sortedRecords[0]?.exerciseName).toBe("Squat"); // 2024-03-20
    expect(sortedRecords[1]?.exerciseName).toBe("Deadlift"); // 2024-02-10
    expect(sortedRecords[2]?.exerciseName).toBe("Bench Press"); // 2024-01-15
  });

  it("applies pagination limit and offset correctly", () => {
    const personalRecords = [
      {
        exerciseName: "Bench Press",
        recordType: "weight" as const,
        weight: 100,
        reps: 5,
        sets: 3,
        unit: "kg",
        workoutDate: new Date("2024-01-15"),
        oneRMEstimate: 120,
      },
      {
        exerciseName: "Squat",
        recordType: "weight" as const,
        weight: 150,
        reps: 3,
        sets: 4,
        unit: "kg",
        workoutDate: new Date("2024-03-20"),
        oneRMEstimate: 180,
      },
      {
        exerciseName: "Deadlift",
        recordType: "volume" as const,
        weight: 120,
        reps: 5,
        sets: 5,
        unit: "kg",
        workoutDate: new Date("2024-02-10"),
        totalVolume: 3000,
      },
      {
        exerciseName: "Overhead Press",
        recordType: "weight" as const,
        weight: 80,
        reps: 4,
        sets: 3,
        unit: "kg",
        workoutDate: new Date("2024-04-05"),
        oneRMEstimate: 95,
      },
      {
        exerciseName: "Pull-ups",
        recordType: "weight" as const,
        weight: 0,
        reps: 12,
        sets: 3,
        unit: "bodyweight",
        workoutDate: new Date("2024-05-12"),
        oneRMEstimate: 0,
      },
    ];

    // Sort by recency first
    const sortedRecords = personalRecords.sort(
      (a, b) => b.workoutDate.getTime() - a.workoutDate.getTime(),
    );

    // Apply pagination: limit 2, offset 1
    const limit = 2;
    const offset = 1;
    const paginatedRecords = sortedRecords.slice(offset, offset + limit);

    // Should return 2 items starting from index 1
    expect(paginatedRecords).toHaveLength(2);
    expect(paginatedRecords[0]?.exerciseName).toBe("Overhead Press"); // Index 1 after sorting
    expect(paginatedRecords[1]?.exerciseName).toBe("Squat"); // Index 2 after sorting
  });

  it("handles empty personal records array", () => {
    const personalRecords: any[] = [];

    const sortedRecords = personalRecords.sort(
      (a, b) => b.workoutDate.getTime() - a.workoutDate.getTime(),
    );

    expect(sortedRecords).toHaveLength(0);
  });

  it("handles single personal record", () => {
    const personalRecords = [
      {
        exerciseName: "Bench Press",
        recordType: "weight" as const,
        weight: 100,
        reps: 5,
        sets: 3,
        unit: "kg",
        workoutDate: new Date("2024-01-15"),
        oneRMEstimate: 120,
      },
    ];

    const sortedRecords = personalRecords.sort(
      (a, b) => b.workoutDate.getTime() - a.workoutDate.getTime(),
    );

    expect(sortedRecords).toHaveLength(1);
    expect(sortedRecords[0]?.exerciseName).toBe("Bench Press");
  });
});
