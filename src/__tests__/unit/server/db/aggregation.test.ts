import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the db and logger before importing
vi.mock("~/server/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  } as any,
}));

vi.mock("~/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  } as any,
}));

import {
  aggregateExerciseDaily,
  aggregateExerciseWeekly,
  aggregateExerciseMonthly,
  AggregationTrigger,
} from "~/server/db/aggregation";
import { db } from "~/server/db";
import { logger } from "~/lib/logger";

// Get the mocked functions
const selectMock = db.select as any;
const insertMock = db.insert as any;
const debugMock = logger.debug as any;
const errorMock = logger.error as any;

// Additional mocks for the chain
const valuesMock = vi.fn();
const onConflictDoUpdateMock = vi.fn();
const whereMock = vi.fn();
const innerJoinMock = vi.fn();
const orderByMock = vi.fn();

describe("aggregateExerciseDaily", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks
    selectMock.mockReset();
    insertMock.mockReset();
    onConflictDoUpdateMock.mockReset();
    valuesMock.mockReset();
    whereMock.mockReset();
    innerJoinMock.mockReset();
    orderByMock.mockReset();
    debugMock.mockReset();
    errorMock.mockReset();

    // Set up chainable mocks
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: innerJoinMock.mockReturnValue({
          where: whereMock.mockResolvedValue([]),
        }),
      }),
    });

    insertMock.mockReturnValue({
      values: valuesMock.mockReturnValue({
        onConflictDoUpdate: onConflictDoUpdateMock.mockResolvedValue(undefined),
      }),
    });
  });

  it("calculates daily aggregates correctly for multiple exercises", async () => {
    const mockExercises = [
      {
        weight: 100,
        reps: 10,
        sets: 3,
        one_rm_estimate: 110,
        volume_load: 3000,
        sessionId: 1,
      },
      {
        weight: 105,
        reps: 8,
        sets: 3,
        one_rm_estimate: 115,
        volume_load: 2520,
        sessionId: 1,
      },
      {
        weight: 100,
        reps: 10,
        sets: 2,
        one_rm_estimate: 110,
        volume_load: 2000,
        sessionId: 2,
      },
    ];

    whereMock.mockResolvedValue(mockExercises);

    const testDate = new Date("2024-01-15");
    await aggregateExerciseDaily("user-1", "Bench Press", testDate);

    // Verify the query was constructed correctly
    expect(selectMock).toHaveBeenCalledWith({
      weight: expect.any(Object),
      reps: expect.any(Object),
      sets: expect.any(Object),
      one_rm_estimate: expect.any(Object),
      volume_load: expect.any(Object),
      sessionId: expect.any(Object),
    });

    // Verify insert was called with correct aggregated values
    expect(valuesMock).toHaveBeenCalledWith({
      user_id: "user-1",
      exercise_name: "Bench Press",
      date: testDate,
      total_volume: 7520, // 3000 + 2520 + 2000
      max_weight: 105, // max of 100, 105, 100
      max_one_rm: 115, // max of 110, 115, 110
      session_count: 2, // 2 unique session IDs
      updatedAt: expect.any(Date),
    });

    expect(onConflictDoUpdateMock).toHaveBeenCalledWith({
      target: expect.any(Array),
      set: expect.objectContaining({
        total_volume: 7520,
        max_weight: 105,
        max_one_rm: 115,
        session_count: 2,
        updatedAt: expect.any(Date),
      }),
    });

    expect(debugMock).toHaveBeenCalledWith(
      "Daily exercise aggregation completed",
      expect.objectContaining({
        userId: "user-1",
        exerciseName: "Bench Press",
        sessionCount: 2,
        totalVolume: 7520,
      }),
    );
  });

  it("handles empty exercise data gracefully", async () => {
    whereMock.mockResolvedValue([]);

    const testDate = new Date("2024-01-15");
    await aggregateExerciseDaily("user-1", "Squat", testDate);

    // Should not attempt to insert when no data
    expect(insertMock).not.toHaveBeenCalled();

    expect(debugMock).toHaveBeenCalledWith(
      "No exercises found for daily aggregation",
      expect.objectContaining({
        userId: "user-1",
        exerciseName: "Squat",
      }),
    );
  });

  it("handles null/undefined values correctly", async () => {
    const mockExercises = [
      {
        weight: null,
        reps: null,
        sets: null,
        one_rm_estimate: null,
        volume_load: null,
        sessionId: 1,
      },
      {
        weight: 100,
        reps: 10,
        sets: 3,
        one_rm_estimate: 110,
        volume_load: 3000,
        sessionId: 2,
      },
    ];

    whereMock.mockResolvedValue(mockExercises);

    const testDate = new Date("2024-01-15");
    await aggregateExerciseDaily("user-1", "Deadlift", testDate);

    expect(valuesMock).toHaveBeenCalledWith({
      user_id: "user-1",
      exercise_name: "Deadlift",
      date: testDate,
      total_volume: 3000, // Only the valid volume
      max_weight: 100, // Only the valid weight
      max_one_rm: 110, // Only the valid 1RM
      session_count: 2,
      updatedAt: expect.any(Date),
    });
  });

  it("logs errors appropriately", async () => {
    const testError = new Error("Database connection failed");
    whereMock.mockRejectedValue(testError);

    const testDate = new Date("2024-01-15");
    await expect(
      aggregateExerciseDaily("user-1", "Bench Press", testDate),
    ).rejects.toThrow(testError);

    expect(errorMock).toHaveBeenCalledWith(
      "Daily exercise aggregation failed",
      testError,
      expect.objectContaining({
        userId: "user-1",
        exerciseName: "Bench Press",
      }),
    );
  });
});

describe("aggregateExerciseWeekly", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks
    selectMock.mockReset();
    insertMock.mockReset();
    onConflictDoUpdateMock.mockReset();
    valuesMock.mockReset();
    whereMock.mockReset();
    orderByMock.mockReset();
    debugMock.mockReset();
    errorMock.mockReset();

    // Set up chainable mocks for weekly aggregation
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: orderByMock.mockResolvedValue([]),
        }),
      }),
    });

    insertMock.mockReturnValue({
      values: valuesMock.mockReturnValue({
        onConflictDoUpdate: onConflictDoUpdateMock.mockResolvedValue(undefined),
      }),
    });
  });

  it("calculates weekly aggregates correctly with multiple daily summaries", async () => {
    const mockDailySummaries = [
      {
        date: new Date("2024-01-15"), // Monday
        total_volume: 3000,
        max_one_rm: 110,
        session_count: 2,
      },
      {
        date: new Date("2024-01-16"), // Tuesday
        total_volume: 2500,
        max_one_rm: 105,
        session_count: 1,
      },
      {
        date: new Date("2024-01-18"), // Thursday
        total_volume: 4000,
        max_one_rm: 120,
        session_count: 3,
      },
    ];

    orderByMock.mockResolvedValue(mockDailySummaries);

    const weekStart = new Date("2024-01-15"); // Monday
    await aggregateExerciseWeekly("user-1", "Bench Press", weekStart);

    // Verify the query was constructed correctly
    expect(selectMock).toHaveBeenCalledWith({
      date: expect.any(Object),
      total_volume: expect.any(Object),
      max_one_rm: expect.any(Object),
      session_count: expect.any(Object),
    });

    // Verify insert was called with correct aggregated values
    expect(valuesMock).toHaveBeenCalledWith({
      user_id: "user-1",
      exercise_name: "Bench Press",
      week_start: weekStart,
      avg_volume: 3166.6666666666665, // (3000 + 2500 + 4000) / 3
      max_one_rm: 120, // max of 110, 105, 120
      session_count: 6, // 2 + 1 + 3
      trend_slope: expect.any(Number), // Should calculate trend slope
      updatedAt: expect.any(Date),
    });

    expect(onConflictDoUpdateMock).toHaveBeenCalledWith({
      target: expect.any(Array),
      set: expect.objectContaining({
        avg_volume: 3166.6666666666665,
        max_one_rm: 120,
        session_count: 6,
        trend_slope: expect.any(Number),
        updatedAt: expect.any(Date),
      }),
    });

    expect(debugMock).toHaveBeenCalledWith(
      "Weekly exercise aggregation completed",
      expect.objectContaining({
        userId: "user-1",
        exerciseName: "Bench Press",
        dailySummariesCount: 3,
        avgVolume: 3166.6666666666665,
        trendSlope: expect.any(Number),
      }),
    );
  });

  it("handles empty daily summaries gracefully", async () => {
    orderByMock.mockResolvedValue([]);

    const weekStart = new Date("2024-01-15");
    await aggregateExerciseWeekly("user-1", "Squat", weekStart);

    // Should not attempt to insert when no data
    expect(insertMock).not.toHaveBeenCalled();

    expect(debugMock).toHaveBeenCalledWith(
      "No daily summaries found for weekly aggregation",
      expect.objectContaining({
        userId: "user-1",
        exerciseName: "Squat",
      }),
    );
  });

  it("calculates trend slope correctly for increasing volume", async () => {
    const mockDailySummaries = [
      {
        date: new Date("2024-01-15"),
        total_volume: 1000,
        max_one_rm: 100,
        session_count: 1,
      }, // Day 1
      {
        date: new Date("2024-01-16"),
        total_volume: 2000,
        max_one_rm: 105,
        session_count: 1,
      }, // Day 2
      {
        date: new Date("2024-01-17"),
        total_volume: 3000,
        max_one_rm: 110,
        session_count: 1,
      }, // Day 3
    ];

    orderByMock.mockResolvedValue(mockDailySummaries);

    const weekStart = new Date("2024-01-15");
    await aggregateExerciseWeekly("user-1", "Deadlift", weekStart);

    // For points: (1,1000), (2,2000), (3,3000)
    // Slope = (3*sum(xy) - sum(x)*sum(y)) / (3*sum(xx) - sum(x)^2)
    // = (3*(1*1000 + 2*2000 + 3*3000) - (1+2+3)*(1000+2000+3000)) / (3*(1+4+9) - (6)^2)
    // = (3*14000 - 6*6000) / (3*14 - 36) = (42000 - 36000) / (42 - 36) = 6000/6 = 1000
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trend_slope: 1000,
      }),
    );
  });

  it("calculates trend slope correctly for decreasing volume", async () => {
    const mockDailySummaries = [
      {
        date: new Date("2024-01-15"),
        total_volume: 3000,
        max_one_rm: 100,
        session_count: 1,
      },
      {
        date: new Date("2024-01-16"),
        total_volume: 2000,
        max_one_rm: 105,
        session_count: 1,
      },
      {
        date: new Date("2024-01-17"),
        total_volume: 1000,
        max_one_rm: 110,
        session_count: 1,
      },
    ];

    orderByMock.mockResolvedValue(mockDailySummaries);

    const weekStart = new Date("2024-01-15");
    await aggregateExerciseWeekly("user-1", "Deadlift", weekStart);

    // Should calculate negative slope
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trend_slope: -1000,
      }),
    );
  });

  it("sets trend slope to null with insufficient data points", async () => {
    const mockDailySummaries = [
      {
        date: new Date("2024-01-15"),
        total_volume: 3000,
        max_one_rm: 100,
        session_count: 1,
      },
    ];

    orderByMock.mockResolvedValue(mockDailySummaries);

    const weekStart = new Date("2024-01-15");
    await aggregateExerciseWeekly("user-1", "Deadlift", weekStart);

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trend_slope: null,
      }),
    );
  });

  it("handles null/undefined volume values correctly", async () => {
    const mockDailySummaries = [
      {
        date: new Date("2024-01-15"),
        total_volume: 3000,
        max_one_rm: 100,
        session_count: 1,
      },
      {
        date: new Date("2024-01-16"),
        total_volume: null,
        max_one_rm: 105,
        session_count: 1,
      },
      {
        date: new Date("2024-01-17"),
        total_volume: 2000,
        max_one_rm: 110,
        session_count: 1,
      },
    ];

    orderByMock.mockResolvedValue(mockDailySummaries);

    const weekStart = new Date("2024-01-15");
    await aggregateExerciseWeekly("user-1", "Bench Press", weekStart);

    // Should only include valid volumes: (3000 + 2000) / 2 = 2500
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        avg_volume: 2500,
      }),
    );
  });

  it("logs errors appropriately", async () => {
    const testError = new Error("Database connection failed");
    orderByMock.mockRejectedValue(testError);

    const weekStart = new Date("2024-01-15");
    await expect(
      aggregateExerciseWeekly("user-1", "Bench Press", weekStart),
    ).rejects.toThrow(testError);

    expect(errorMock).toHaveBeenCalledWith(
      "Weekly exercise aggregation failed",
      testError,
      expect.objectContaining({
        userId: "user-1",
        exerciseName: "Bench Press",
      }),
    );
  });
});

describe("aggregateExerciseMonthly", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks
    selectMock.mockReset();
    insertMock.mockReset();
    onConflictDoUpdateMock.mockReset();
    valuesMock.mockReset();
    whereMock.mockReset();
    orderByMock.mockReset();
    debugMock.mockReset();
    errorMock.mockReset();

    // Set up chainable mocks for monthly aggregation
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: orderByMock.mockResolvedValue([]),
        }),
      }),
    });

    insertMock.mockReturnValue({
      values: valuesMock.mockReturnValue({
        onConflictDoUpdate: onConflictDoUpdateMock.mockResolvedValue(undefined),
      }),
    });
  });

  it("calculates monthly aggregates correctly with multiple weekly summaries", async () => {
    const mockWeeklySummaries = [
      {
        week_start: new Date("2024-01-01"), // Week 1
        avg_volume: 3000,
        max_one_rm: 110,
        session_count: 3,
      },
      {
        week_start: new Date("2024-01-08"), // Week 2
        avg_volume: 3500,
        max_one_rm: 115,
        session_count: 4,
      },
      {
        week_start: new Date("2024-01-15"), // Week 3
        avg_volume: 4000,
        max_one_rm: 120,
        session_count: 5,
      },
      {
        week_start: new Date("2024-01-22"), // Week 4
        avg_volume: 3200,
        max_one_rm: 118,
        session_count: 2,
      },
    ];

    orderByMock.mockResolvedValue(mockWeeklySummaries);

    const monthStart = new Date("2024-01-01"); // January 1st
    await aggregateExerciseMonthly("user-1", "Bench Press", monthStart);

    // Verify insert was called with correct aggregated values
    expect(valuesMock).toHaveBeenCalledWith({
      user_id: "user-1",
      exercise_name: "Bench Press",
      month_start: monthStart,
      total_volume: 13700, // 3000 + 3500 + 4000 + 3200
      max_one_rm: 120, // max of 110, 115, 120, 118
      session_count: 14, // 3 + 4 + 5 + 2
      consistency_score: 1.0, // 4 weeks with sessions / 4 total weeks = 1.0
      updatedAt: expect.any(Date),
    });

    expect(debugMock).toHaveBeenCalledWith(
      "Monthly exercise aggregation completed",
      expect.objectContaining({
        userId: "user-1",
        exerciseName: "Bench Press",
        weeklySummariesCount: 4,
        totalVolume: 13700,
        consistencyScore: 1.0,
      }),
    );
  });

  it("calculates consistency score correctly for partial month", async () => {
    const mockWeeklySummaries = [
      {
        week_start: new Date("2024-01-01"),
        avg_volume: 3000,
        max_one_rm: 110,
        session_count: 3, // Has sessions
      },
      {
        week_start: new Date("2024-01-08"),
        avg_volume: 3500,
        max_one_rm: 115,
        session_count: 0, // No sessions
      },
      {
        week_start: new Date("2024-01-15"),
        avg_volume: 4000,
        max_one_rm: 120,
        session_count: 4, // Has sessions
      },
    ];

    orderByMock.mockResolvedValue(mockWeeklySummaries);

    const monthStart = new Date("2024-01-01");
    await aggregateExerciseMonthly("user-1", "Squat", monthStart);

    // 2 weeks with sessions out of 4 total weeks = 0.5 consistency
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        consistency_score: 0.5,
      }),
    );
  });

  it("handles empty weekly summaries gracefully", async () => {
    orderByMock.mockResolvedValue([]);

    const monthStart = new Date("2024-01-01");
    await aggregateExerciseMonthly("user-1", "Deadlift", monthStart);

    // Should not attempt to insert when no data
    expect(insertMock).not.toHaveBeenCalled();

    expect(debugMock).toHaveBeenCalledWith(
      "No weekly summaries found for monthly aggregation",
      expect.objectContaining({
        userId: "user-1",
        exerciseName: "Deadlift",
      }),
    );
  });

  it("handles null/undefined volume values correctly", async () => {
    const mockWeeklySummaries = [
      {
        week_start: new Date("2024-01-01"),
        avg_volume: 3000,
        max_one_rm: 110,
        session_count: 3,
      },
      {
        week_start: new Date("2024-01-08"),
        avg_volume: null,
        max_one_rm: 115,
        session_count: 4,
      },
      {
        week_start: new Date("2024-01-15"),
        avg_volume: 4000,
        max_one_rm: 120,
        session_count: 5,
      },
    ];

    orderByMock.mockResolvedValue(mockWeeklySummaries);

    const monthStart = new Date("2024-01-01");
    await aggregateExerciseMonthly("user-1", "Bench Press", monthStart);

    // Should only include valid volumes: 3000 + 4000 = 7000
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        total_volume: 7000,
      }),
    );
  });

  it("logs errors appropriately", async () => {
    const testError = new Error("Database connection failed");
    orderByMock.mockRejectedValue(testError);

    const monthStart = new Date("2024-01-01");
    await expect(
      aggregateExerciseMonthly("user-1", "Bench Press", monthStart),
    ).rejects.toThrow(testError);

    expect(errorMock).toHaveBeenCalledWith(
      "Monthly exercise aggregation failed",
      testError,
      expect.objectContaining({
        userId: "user-1",
        exerciseName: "Bench Press",
      }),
    );
  });
});

describe("AggregationTrigger", () => {
  let trigger: AggregationTrigger;

  beforeEach(() => {
    vi.clearAllMocks();
    trigger = AggregationTrigger.getInstance();

    // Reset mocks
    selectMock.mockReset();
    insertMock.mockReset();
    onConflictDoUpdateMock.mockReset();
    valuesMock.mockReset();
    whereMock.mockReset();
    innerJoinMock.mockReset();
    orderByMock.mockReset();
    debugMock.mockReset();
    errorMock.mockReset();

    // Set up chainable mocks
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: innerJoinMock.mockReturnValue({
          where: whereMock.mockResolvedValue([]),
        }),
        where: vi.fn().mockReturnValue({
          orderBy: orderByMock.mockResolvedValue([]),
        }),
      }),
    });

    insertMock.mockReturnValue({
      values: valuesMock.mockReturnValue({
        onConflictDoUpdate: onConflictDoUpdateMock.mockResolvedValue(undefined),
      }),
    });
  });

  it("returns singleton instance", () => {
    const instance1 = AggregationTrigger.getInstance();
    const instance2 = AggregationTrigger.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("triggers aggregation for session changes with multiple exercises", async () => {
    const mockExercises = [
      {
        resolvedExerciseName: "Bench Press",
        workoutDate: new Date("2024-01-15"),
      },
      {
        resolvedExerciseName: "Squat",
        workoutDate: new Date("2024-01-15"),
      },
      {
        resolvedExerciseName: "Bench Press",
        workoutDate: new Date("2024-01-16"),
      },
    ];

    whereMock.mockResolvedValue(mockExercises);

    await trigger.onSessionChange(1, "user-1");

    // Should have called select for getting exercises
    expect(selectMock).toHaveBeenCalledWith({
      resolvedExerciseName: expect.any(Object),
      workoutDate: expect.any(Object),
    });

    // Should have triggered daily aggregations (grouped by exercise/date)
    expect(valuesMock).toHaveBeenCalledTimes(3); // 3 unique exercise-date combinations
  });

  it("prevents duplicate aggregations with processing set", async () => {
    const mockExercises = [
      {
        resolvedExerciseName: "Bench Press",
        workoutDate: new Date("2024-01-15"),
      },
    ];

    whereMock.mockResolvedValue(mockExercises);

    // Start two concurrent calls
    await Promise.all([
      trigger.onSessionChange(1, "user-1"),
      trigger.onSessionChange(1, "user-1"),
    ]);

    // Should still only process once due to deduplication
    expect(valuesMock).toHaveBeenCalledTimes(1);
  });

  it("handles empty session exercises gracefully", async () => {
    whereMock.mockResolvedValue([]);

    await trigger.onSessionChange(1, "user-1");

    // Should not attempt any aggregations
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("logs errors appropriately in session change trigger", async () => {
    const testError = new Error("Database connection failed");
    whereMock.mockRejectedValue(testError);

    await trigger.onSessionChange(1, "user-1");

    expect(errorMock).toHaveBeenCalledWith(
      "Session change trigger failed",
      testError,
      expect.objectContaining({
        sessionId: 1,
        userId: "user-1",
      }),
    );
  });

  it("chains daily to weekly to monthly aggregations", async () => {
    const mockExercises = [
      {
        resolvedExerciseName: "Bench Press",
        workoutDate: new Date("2024-01-15"), // Monday
      },
    ];

    whereMock.mockResolvedValue(mockExercises);

    // Set up mock data for weekly and monthly aggregations
    const mockDailySummaries = [
      {
        date: new Date("2024-01-15"),
        total_volume: 3000,
        max_one_rm: 110,
        session_count: 1,
      },
    ];
    const mockWeeklySummaries = [
      {
        week_start: new Date("2024-01-15"),
        avg_volume: 3000,
        max_one_rm: 110,
        session_count: 1,
      },
    ];

    // Mock the orderBy calls: daily query, weekly query, monthly query
    orderByMock
      .mockResolvedValueOnce([]) // Daily exercise query in onSessionChange
      .mockResolvedValueOnce(mockDailySummaries) // Weekly aggregation query
      .mockResolvedValueOnce(mockWeeklySummaries) // Monthly aggregation query
      .mockResolvedValue([]); // Any additional calls

    await trigger.onSessionChange(1, "user-1");

    // Should have triggered daily and weekly aggregations
    expect(valuesMock).toHaveBeenCalledTimes(2); // daily, weekly
  });
});
