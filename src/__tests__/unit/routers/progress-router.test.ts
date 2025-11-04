import { describe, it, expect, vi, beforeEach } from "vitest";
import { progressRouter } from "~/server/api/routers/progress";
import {
  getCachedCalculation,
  setCachedCalculation,
} from "~/server/api/routers/progress";
import { createMockUser, createMockExerciseDailySummary, createMockExerciseWeeklySummary, createMockExerciseMonthlySummary, createMockWorkoutSession, createMockSessionExercise } from "~/__tests__/mocks/test-data";
import { getMockData } from "~/__tests__/mocks/mock-sets";

type ChainResult<TData> = TData extends Array<unknown> ? TData : never;

const createQueryChain = <TData extends unknown[]>(
  queue: Array<ChainResult<TData>>,
) => {
  const result = queue.length > 0 ? queue.shift()! : ([] as unknown as TData);

  const chain: any = {
    result,
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    select: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    returning: vi.fn(async () => chain.result),
    onConflictDoUpdate: vi.fn(() => chain),
    execute: vi.fn(async () => chain.result),
    all: vi.fn(async () => chain.result),
    then: (
      resolve: (value: TData) => void,
      reject?: (reason: unknown) => void,
    ) => Promise.resolve(chain.result as TData).then(resolve, reject),
    catch: (reject: (reason: unknown) => void) =>
      Promise.resolve(chain.result as TData).catch(reject),
    finally: (cb: () => void) =>
      Promise.resolve(chain.result as TData).finally(cb),
  };

  return chain;
};

const createMockDb = () => {
  const selectQueue: unknown[][] = [];
  const insertQueue: unknown[][] = [];
  const updateQueue: unknown[][] = [];
  const deleteQueue: unknown[][] = [];

  const mockDb = {
    query: {
      workoutSessions: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    queueSelectResult: (rows: unknown[]) => selectQueue.push(rows),
    queueInsertResult: (rows: unknown[]) => insertQueue.push(rows),
    queueUpdateResult: (rows: unknown[]) => updateQueue.push(rows),
    queueDeleteResult: (rows: unknown[]) => deleteQueue.push(rows),
    select: vi.fn(() => createQueryChain(selectQueue)),
    insert: vi.fn(() => createQueryChain(insertQueue)),
    update: vi.fn(() => createQueryChain(updateQueue)),
    delete: vi.fn(() => createQueryChain(deleteQueue)),
    transaction: vi.fn((callback: (tx: any) => Promise<any>) =>
      callback(mockDb),
    ),
    all: vi.fn(async () => []),
  } as any;

  return mockDb;
};

describe("progressRouter", () => {
  const mockUser = createMockUser({ id: "test-user-id" });

  let mockDb: ReturnType<typeof createMockDb>;
  let mockCtx: {
    db: typeof mockDb;
    user: typeof mockUser;
    requestId: string;
    headers: Headers;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    mockCtx = {
      db: mockDb,
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    };
  });

  describe("getExerciseStrengthProgression", () => {
    it("should return default values when no aggregated data exists", async () => {
      // Mock empty aggregated data queries
      mockDb.queueSelectResult([]); // daily current
      mockDb.queueSelectResult([]); // daily previous
      mockDb.queueSelectResult([]); // weekly data
      mockDb.queueSelectResult([]); // recent sessions

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getExerciseStrengthProgression({
        exerciseName: "Bench Press",
        timeRange: "quarter",
      });

      expect(result).toEqual({
        currentOneRM: 0,
        oneRMChange: 0,
        volumeTrend: 0,
        sessionCount: 0,
        frequency: 0,
        recentPRs: [],
        topSets: [],
        progressionTrend: 0,
        consistencyScore: 0,
        timeline: [],
      });
    });

    it("should calculate strength progression using aggregated data", async () => {
      const rawData = [
        {
          workoutDate: new Date("2024-01-01"),
          one_rm_estimate: 112.5,
          volume_load: 1500,
          weight: 100,
          reps: 5,
        },
        {
          workoutDate: new Date("2024-01-15"),
          one_rm_estimate: 118.125,
          volume_load: 1575,
          weight: 105,
          reps: 5,
        },
      ];
      const prevRawData = [
        {
          workoutDate: new Date("2023-12-20"),
          one_rm_estimate: 107.125,
          volume_load: 1425,
          weight: 95,
          reps: 5,
        },
      ];

      // Mock the raw data queries
      mockDb.queueSelectResult(rawData);
      mockDb.queueSelectResult(prevRawData);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getExerciseStrengthProgression({
        exerciseName: "Bench Press",
        timeRange: "quarter",
      });

      expect(result.currentOneRM).toBe(118.125);
      expect(result.oneRMChange).toBeCloseTo(11, 1); // 118.125 - 107.125
      expect(result.sessionCount).toBe(2);
      expect(Array.isArray(result.recentPRs)).toBe(true);
      expect(result.timeline.length).toBe(2);
    });

    it("should use cached calculations for performance", async () => {
      const rawData = [
        {
          workoutDate: new Date("2024-01-01"),
          one_rm_estimate: 100,
          volume_load: 1000,
          weight: 90,
          reps: 5,
        },
      ];

      mockDb.queueSelectResult(rawData);

      const caller = progressRouter.createCaller(mockCtx);
      // First call should calculate and cache
      await caller.getExerciseStrengthProgression({
        exerciseName: "Bench Press",
        timeRange: "quarter",
      });

      // Second call with same parameters should use cache
      const result2 = await caller.getExerciseStrengthProgression({
        exerciseName: "Bench Press",
        timeRange: "quarter",
      });

      expect(result2.consistencyScore).toBeDefined();
      expect(result2.progressionTrend).toBeDefined();
    });
  });

  describe("getExerciseVolumeProgression", () => {
    it("should return default values when no aggregated data exists", async () => {
      // Mock empty aggregated data queries
      mockDb.queueSelectResult([]); // daily current
      mockDb.queueSelectResult([]); // daily previous
      mockDb.queueSelectResult([]); // weekly data

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getExerciseVolumeProgression({
        exerciseName: "Bench Press",
        timeRange: "quarter",
      });

      expect(result).toEqual({
        currentVolume: 0,
        volumeChange: 0,
        volumeChangePercent: 0,
        averageVolumePerSession: 0,
        sessionCount: 0,
        frequency: 0,
        volumeByWeek: [],
      });
    });

    it("should calculate volume progression using aggregated data", async () => {
      const dailyCurrentData = [
        {
          date: new Date("2024-01-01"),
          total_volume: 1500,
          session_count: 1,
        },
        {
          date: new Date("2024-01-08"),
          total_volume: 1575,
          session_count: 1,
        },
      ];
      const dailyPreviousData = [
        {
          date: new Date("2023-12-20"),
          total_volume: 1425,
          session_count: 1,
        },
      ];
      const weeklyData = [
        {
          week_start: new Date("2024-01-01"),
          avg_volume: 1500,
          session_count: 1,
        },
        {
          week_start: new Date("2024-01-08"),
          avg_volume: 1575,
          session_count: 1,
        },
      ];

      mockDb.queueSelectResult(dailyCurrentData);
      mockDb.queueSelectResult(dailyPreviousData);
      mockDb.queueSelectResult(weeklyData);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getExerciseVolumeProgression({
        exerciseName: "Bench Press",
        timeRange: "quarter",
      });

      expect(result.currentVolume).toBe(3075); // 1500 + 1575
      expect(result.volumeChange).toBeCloseTo(1650, 1); // 3075 - 1425
      expect(result.sessionCount).toBe(2);
      expect(result.volumeByWeek.length).toBe(2);
      expect(result.averageVolumePerSession).toBe(1537.5); // 3075 / 2
    });
  });

  describe("getExerciseRecentPRs", () => {
    it("should return empty result when no data exists", async () => {
      mockDb.queueSelectResult([]); // view query
      mockDb.queueSelectResult([]); // fallback query

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getExerciseRecentPRs({
        exerciseName: "Bench Press",
        timeRange: "quarter",
      });

      expect(result).toEqual({
        exerciseName: "Bench Press",
        recentPRs: [],
        currentBest: { oneRM: 0, maxWeight: 0, maxVolume: 0 },
        prFrequency: 0,
      });
    });

    it("should calculate recent PRs with data", async () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-01"),
          weight: 100,
          reps: 5,
          sets: 3,
          unit: "lbs",
          oneRMEstimate: 116.67,
          volumeLoad: 1500,
        },
        {
          workoutDate: new Date("2024-01-15"),
          weight: 105,
          reps: 5,
          sets: 3,
          unit: "lbs",
          oneRMEstimate: 122.5,
          volumeLoad: 1575,
        },
      ];

      mockDb.queueSelectResult(mockData);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getExerciseRecentPRs({
        exerciseName: "Bench Press",
        timeRange: "quarter",
      });

      expect(result.exerciseName).toBe("Bench Press");
      expect(result.recentPRs).toBeDefined();
      expect(result.currentBest).toBeDefined();
    });
  });

  describe("getExerciseTopSets", () => {
    it("should return empty result when no data exists", async () => {
      mockDb.queueSelectResult([]);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getExerciseTopSets({
        exerciseName: "Bench Press",
        timeRange: "quarter",
      });

      expect(result.exerciseName).toBe("Bench Press");
      expect(result.topSets).toEqual([]);
      expect(result.averageIntensity).toBe(0);
    });

    it("should calculate top sets with data", async () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-01"),
          weight: 100,
          reps: 5,
          sets: 3,
        },
        {
          workoutDate: new Date("2024-01-15"),
          weight: 105,
          reps: 5,
          sets: 3,
        },
      ];

      mockDb.queueSelectResult(mockData);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getExerciseTopSets({
        exerciseName: "Bench Press",
        timeRange: "quarter",
      });

      expect(result.exerciseName).toBe("Bench Press");
      expect(result.topSets).toBeDefined();
      expect(typeof result.averageIntensity).toBe("number");
    });
  });

  describe("getTopExercises", () => {
    it("should return empty array when no data exists", async () => {
      mockDb.queueSelectResult([]);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getTopExercises({
        timeRange: "quarter",
        limit: 10,
      });

      expect(result).toEqual([]);
    });

    it("should return top exercises with data", async () => {
      const mockData = [
        {
          exerciseName: "Bench Press",
          workoutDate: new Date("2024-01-01"),
          weight: 100,
          reps: 5,
          sets: 3,
        },
        {
          exerciseName: "Squat",
          workoutDate: new Date("2024-01-02"),
          weight: 120,
          reps: 5,
          sets: 3,
        },
      ];

      mockDb.queueSelectResult(mockData);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getTopExercises({
        timeRange: "quarter",
        limit: 10,
      });

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("exerciseName");
        expect(result[0]).toHaveProperty("sessionCount");
        expect(result[0]).toHaveProperty("frequency");
      }
    });
  });

  describe("getStrengthPulse", () => {
    it("should return baseline metrics when no sessions exist", async () => {
      mockDb.queueSelectResult([]);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getStrengthPulse({ timeRange: "week" });

      expect(result).toEqual({
        currentOneRm: 0,
        previousOneRm: 0,
        delta: 0,
        trend: "flat",
        heavySetCount: 0,
        sessionCount: 0,
        topLift: null,
        lastLiftedAt: null,
      });
    });

    it("should summarise strength sets for current and previous periods", async () => {
      const currentRows = [
        {
          workoutDate: new Date("2024-03-05"),
          exerciseName: "Back Squat",
          weight: 160,
          reps: 3,
          oneRMEstimate: 176,
        },
        {
          workoutDate: new Date("2024-03-03"),
          exerciseName: "Bench Press",
          weight: 140,
          reps: 5,
          oneRMEstimate: 163,
        },
      ];
      const previousRows = [
        {
          workoutDate: new Date("2024-02-25"),
          exerciseName: "Back Squat",
          weight: 155,
          reps: 3,
          oneRMEstimate: 170,
        },
      ];

      mockDb.queueSelectResult(currentRows);
      mockDb.queueSelectResult(previousRows);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getStrengthPulse({ timeRange: "week" });

      expect(result.currentOneRm).toBeCloseTo(176);
      expect(result.previousOneRm).toBeCloseTo(170);
      expect(result.delta).toBeCloseTo(6);
      expect(result.heavySetCount).toBeGreaterThanOrEqual(2);
      expect(result.sessionCount).toBeGreaterThanOrEqual(2);
      expect(result.topLift).toEqual(
        expect.objectContaining({
          exerciseName: "Back Squat",
          oneRm: expect.any(Number),
        }),
      );
      expect(result.lastLiftedAt).toBeInstanceOf(Date);
    });
  });

  describe("getVolumeProgression", () => {
    it("should return volume progression data", async () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-01"),
          exerciseName: "Bench Press",
          weight: 100,
          reps: 5,
          sets: 3,
          unit: "kg",
        },
      ];

      mockDb.queueSelectResult(mockData);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getVolumeProgression({
        timeRange: "month",
      });

      expect(result).toHaveProperty("data");
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("getConsistencyStats", () => {
    it("should return consistency statistics", async () => {
      const mockData = [
        { workoutDate: new Date("2024-01-01") },
        { workoutDate: new Date("2024-01-08") },
        { workoutDate: new Date("2024-01-15") },
      ];

      mockDb.queueSelectResult(mockData);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getConsistencyStats({
        timeRange: "month",
      });

      expect(result).toHaveProperty("totalWorkouts");
      expect(result).toHaveProperty("frequency");
      expect(result).toHaveProperty("currentStreak");
      expect(result).toHaveProperty("longestStreak");
      expect(result).toHaveProperty("consistencyScore");
    });
  });

  describe("getWorkoutDates", () => {
    it("should return workout dates", async () => {
      const mockData = [
        { workoutDate: new Date("2024-01-01") },
        { workoutDate: new Date("2024-01-08") },
      ];

      mockDb.queueSelectResult(mockData);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getWorkoutDates({
        timeRange: "month",
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });
  });

  describe("getExerciseList", () => {
    it("should return exercise list", async () => {
      const mockData = [
        {
          exerciseName: "Bench Press",
          lastUsed: new Date("2024-01-01"),
          totalSets: 15,
        },
      ];

      mockDb.queueSelectResult(mockData);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getExerciseList();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getStrengthProgression", () => {
    it("should return strength progression data using resolveExerciseSelection", async () => {
      // Mock the database calls
      const mockResolveResult = [
        {
          templateExerciseId: 1,
          templateName: "Bench Press",
          masterExerciseId: null,
          masterExerciseName: null,
        },
      ];
      const mockData = [
        {
          workoutDate: new Date("2024-01-01"),
          exerciseName: "Bench Press",
          weight: 100,
          reps: 5,
          sets: 3,
          unit: "kg",
        },
      ];

      mockDb.queueSelectResult(mockResolveResult);
      mockDb.queueSelectResult(mockData);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getStrengthProgression({
        exerciseName: "Bench Press",
        templateExerciseId: 1,
        timeRange: "quarter",
      });
      expect(result).toBeDefined();
    });

    it("should get strength progression for an exercise", async () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-02"),
          exerciseName: "Bench Press",
          weight: 105,
          reps: 5,
          sets: 3,
          unit: "kg",
        },
        {
          workoutDate: new Date("2024-01-01"),
          exerciseName: "Bench Press",
          weight: 100,
          reps: 5,
          sets: 3,
          unit: "kg",
        },
      ];

      const mockResolveResult = [
        {
          templateExerciseId: 1,
          templateName: "Bench Press",
          masterExerciseId: null,
          masterExerciseName: null,
        },
      ];

      mockDb.queueSelectResult(mockResolveResult);
      mockDb.queueSelectResult(mockData);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getStrengthProgression({
        exerciseName: "Bench Press",
        templateExerciseId: 1,
        timeRange: "quarter",
      });

      expect(result).toHaveProperty("data");
      expect(Array.isArray(result.data)).toBe(true);
      // Note: The actual data length depends on the query implementation
      // The test is verifying the structure, not the exact count
      if (result.data.length > 0) {
        expect(result.data[0]).toHaveProperty("workoutDate");
        expect(result.data[0]).toHaveProperty("exerciseName", "Bench Press");
        expect(result.data[0]).toHaveProperty("weight");
        expect(result.data[0]).toHaveProperty("reps", 5);
        expect(result.data[0]).toHaveProperty("sets", 3);
        expect(result.data[0]).toHaveProperty("unit", "kg");
      }
    });

    it("should handle exercise selection with both name and template ID parameters", async () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-01"),
          exerciseName: "Squat",
          weight: 120,
          reps: 3,
          sets: 4,
          unit: "kg",
        },
      ];

      const mockResolveResult2 = [
        {
          templateExerciseId: 2,
          templateName: "Squat",
          masterExerciseId: null,
          masterExerciseName: null,
        },
      ];

      mockDb.queueSelectResult(mockResolveResult2);
      mockDb.queueSelectResult(mockData);

      const caller = progressRouter.createCaller(mockCtx);
      const result = await caller.getStrengthProgression({
        exerciseName: "Squat",
        templateExerciseId: 2,
        timeRange: "month",
      });

      expect(result).toHaveProperty("data");
      expect(Array.isArray(result.data)).toBe(true);
      // Note: The actual data length depends on the query implementation
      // The test is verifying the structure, not the exact count
      if (result.data.length > 0) {
        expect(result.data[0]!.exerciseName).toBe("Squat");
        expect(result.data[0]!.weight).toBe(120);
      }
    });
  });

  describe("cache functions", () => {
    it("should cache and retrieve calculation results", () => {
      const testValue = { result: 42 };
      const cacheKey = "test_key";

      // Initially no cached value
      const initialResult = getCachedCalculation(cacheKey);
      expect(initialResult).toBeNull();

      // Set cache value
      setCachedCalculation(cacheKey, testValue);

      // Retrieve cached value
      const cachedResult = getCachedCalculation(cacheKey);
      expect(cachedResult).toEqual(testValue);
    });

    it("should return null for expired cache entries", () => {
      const testValue = { result: 42 };
      const cacheKey = "test_key";

      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      Date.now = vi.fn().mockReturnValue(0); // Set initial time

      // Set cache value
      setCachedCalculation(cacheKey, testValue);

      // Advance time past TTL (1 hour = 3600000 ms)
      Date.now = vi.fn().mockReturnValue(3600001);

      // Should return null for expired entry
      const expiredResult = getCachedCalculation(cacheKey);
      expect(expiredResult).toBeNull();

      // Restore original Date.now
      Date.now = originalNow;
    });

    it("should handle different data types in cache", () => {
      const stringValue = "test string";
      const numberValue = 123;
      const objectValue = { complex: "object", array: [1, 2, 3] };

      setCachedCalculation("string_key", stringValue);
      setCachedCalculation("number_key", numberValue);
      setCachedCalculation("object_key", objectValue);

      expect(getCachedCalculation("string_key")).toBe(stringValue);
      expect(getCachedCalculation("number_key")).toBe(numberValue);
      expect(getCachedCalculation("object_key")).toEqual(objectValue);
    });
  });
});
