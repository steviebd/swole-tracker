import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller } from "./trpc-harness";

// Helper to build a caller with strict typing for opts to avoid any
type CallerOpts = Parameters<typeof buildCaller>[0] | undefined;
const createCaller = (opts?: CallerOpts) => buildCaller(opts);

describe("tRPC progress router enhanced coverage (integration, mocked ctx/db)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Mock data for tests
  const mockUserId = "user_test_123";
  const mockExerciseName = "Bench Press";
  const mockTemplateExerciseId = 1;
  const mockMasterExerciseId = 100;
  
  const mockWorkoutSession = {
    id: 1,
    user_id: mockUserId,
    workoutDate: new Date("2024-01-15"),
  };
  
  const mockSessionExercises = [
    {
      id: 1,
      sessionId: 1,
      exerciseName: mockExerciseName,
      weight: "100",
      reps: 5,
      sets: 1,
      unit: "lbs",
      user_id: mockUserId,
    },
    {
      id: 2,
      sessionId: 1,
      exerciseName: mockExerciseName,
      weight: "90",
      reps: 8,
      sets: 1,
      unit: "lbs",
      user_id: mockUserId,
    },
  ];

  describe("getWorkoutDates", () => {
    it("should return workout dates for calendar display", async () => {
      const mockWorkoutDates = [
        { workoutDate: new Date("2024-01-15") },
        { workoutDate: new Date("2024-01-12") },
        { workoutDate: new Date("2024-01-10") },
      ];
      
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve(mockWorkoutDates)),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db: mockDb });
      
      const result = await caller.progress.getWorkoutDates({
        timeRange: "month",
      });
      
      expect(result).toHaveLength(3);
      expect(result[0]).toBe("2024-01-15");
      expect(result[1]).toBe("2024-01-12");
      expect(result[2]).toBe("2024-01-10");
    });

    it("should require authentication", async () => {
      const caller = createCaller({ user: null });
      await expect(
        caller.progress.getWorkoutDates({
          timeRange: "month",
        })
      ).rejects.toMatchObject({
        message: expect.stringMatching(/UNAUTHORIZED/i),
      });
    });
  });

  describe("getVolumeByExercise", () => {
    it("should return volume breakdown by exercise", async () => {
      const mockVolumeData = [
        {
          exerciseName: "Bench Press",
          weight: "100",
          reps: 5,
          sets: 1,
          unit: "lbs",
          workoutDate: new Date("2024-01-15"),
        },
        {
          exerciseName: "Squat",
          weight: "200",
          reps: 5,
          sets: 1,
          unit: "lbs",
          workoutDate: new Date("2024-01-15"),
        },
        {
          exerciseName: "Bench Press",
          weight: "95",
          reps: 5,
          sets: 1,
          unit: "lbs",
          workoutDate: new Date("2024-01-12"),
        }
      ];
      
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => Promise.resolve(mockVolumeData)),
              })),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db: mockDb });
      
      const result = await caller.progress.getVolumeByExercise({
        timeRange: "month",
      });
      
      expect(result).toHaveLength(2);
      // Squat should be first as it has higher total volume
      expect(result[0]).toMatchObject({
        exerciseName: "Squat",
        totalVolume: 1000, // (200*5*1)
        totalSets: 1,
        totalReps: 5,
        sessions: 1,
      });
      
      expect(result[1]).toMatchObject({
        exerciseName: "Bench Press",
        totalVolume: 975, // (100*5*1) + (95*5*1)
        totalSets: 2,
        totalReps: 10,
        sessions: 2,
      });
    });

    it("should handle empty data", async () => {
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => Promise.resolve([])),
              })),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db: mockDb });
      
      const result = await caller.progress.getVolumeByExercise({
        timeRange: "month",
      });
      
      expect(result).toHaveLength(0);
    });

    it("should require authentication", async () => {
      const caller = createCaller({ user: null });
      await expect(
        caller.progress.getVolumeByExercise({
          timeRange: "month",
        })
      ).rejects.toMatchObject({
        message: expect.stringMatching(/UNAUTHORIZED/i),
      });
    });
  });

  describe("getSetRepDistribution", () => {
    it("should return set/rep distribution analytics", async () => {
      const mockRawData = [
        {
          sets: 3,
          reps: 5,
          weight: "100",
          exerciseName: "Bench Press",
        },
        {
          sets: 3,
          reps: 5,
          weight: "95",
          exerciseName: "Bench Press",
        },
        {
          sets: 4,
          reps: 8,
          weight: "200",
          exerciseName: "Squat",
        }
      ];
      
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve(mockRawData)),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db: mockDb });
      
      const result = await caller.progress.getSetRepDistribution({
        timeRange: "month",
      });
      
      expect(result).toMatchObject({
        setDistribution: expect.any(Array),
        repDistribution: expect.any(Array),
        repRangeDistribution: expect.any(Array),
        mostCommonSetRep: expect.any(Array),
      });
      
      // Check set distribution
      expect(result.setDistribution).toContainEqual({
        sets: 3,
        count: 2,
        percentage: expect.any(Number),
      });
      
      expect(result.setDistribution).toContainEqual({
        sets: 4,
        count: 1,
        percentage: expect.any(Number),
      });
      
      // Check rep distribution
      expect(result.repDistribution).toContainEqual({
        reps: 5,
        count: 2,
        percentage: expect.any(Number),
      });
      
      expect(result.repDistribution).toContainEqual({
        reps: 8,
        count: 1,
        percentage: expect.any(Number),
      });
    });

    it("should handle empty data", async () => {
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db: mockDb });
      
      const result = await caller.progress.getSetRepDistribution({
        timeRange: "month",
      });
      
      expect(result).toMatchObject({
        setDistribution: [],
        repDistribution: [],
        repRangeDistribution: [],
        mostCommonSetRep: [],
      });
    });

    it("should require authentication", async () => {
      const caller = createCaller({ user: null });
      await expect(
        caller.progress.getSetRepDistribution({
          timeRange: "month",
        })
      ).rejects.toMatchObject({
        message: expect.stringMatching(/UNAUTHORIZED/i),
      });
    });
  });

  // Test helper functions directly
  describe("Helper functions", () => {
    describe("calculateVolumeByExercise", () => {
      it("should calculate volume metrics by exercise correctly", async () => {
        const { calculateVolumeByExercise } = await import("~/server/api/routers/progress");
        
        const mockData = [
          {
            exerciseName: "Bench Press",
            weight: "100",
            reps: 5,
            sets: 3,
            unit: "lbs",
            workoutDate: new Date("2024-01-15"),
          },
          {
            exerciseName: "Bench Press",
            weight: "95",
            reps: 5,
            sets: 3,
            unit: "lbs",
            workoutDate: new Date("2024-01-12"),
          },
          {
            exerciseName: "Squat",
            weight: "200",
            reps: 5,
            sets: 3,
            unit: "lbs",
            workoutDate: new Date("2024-01-15"),
          }
        ];

        const result = calculateVolumeByExercise(mockData);
        
        expect(result).toHaveLength(2);
        // Sorted by total volume descending
        expect(result[0].exerciseName).toBe("Squat");
        expect(result[0].totalVolume).toBe(3000); // 200 * 5 * 3
        expect(result[0].totalSets).toBe(3);
        expect(result[0].totalReps).toBe(15); // 5 * 3
        expect(result[0].sessions).toBe(1);
        expect(result[0].averageVolume).toBe(3000);
        expect(result[0].percentOfTotal).toBeCloseTo(50.63, 1);
        
        expect(result[1].exerciseName).toBe("Bench Press");
        expect(result[1].totalVolume).toBe(2925); // (100 * 5 * 3) + (95 * 5 * 3)
        expect(result[1].totalSets).toBe(6);
        expect(result[1].totalReps).toBe(30); // (5 * 3) + (5 * 3)
        expect(result[1].sessions).toBe(2);
        expect(result[1].averageVolume).toBe(1462.5);
        expect(result[1].percentOfTotal).toBeCloseTo(49.37, 1);
      });

      it("should handle empty data", async () => {
        const { calculateVolumeByExercise } = await import("~/server/api/routers/progress");
        
        const result = calculateVolumeByExercise([]);
        expect(result).toHaveLength(0);
      });

      it("should handle zero volume case", async () => {
        const { calculateVolumeByExercise } = await import("~/server/api/routers/progress");
        
        const mockData = [
          {
            exerciseName: "Bench Press",
            weight: "0",
            reps: 0,
            sets: 0,
            unit: "lbs",
            workoutDate: new Date("2024-01-15"),
          }
        ];

        const result = calculateVolumeByExercise(mockData);
        
        expect(result).toHaveLength(1);
        expect(result[0].totalVolume).toBe(0);
        expect(result[0].percentOfTotal).toBe(0);
      });
    });

    describe("calculateSetRepDistribution", () => {
      it("should calculate set/rep distribution correctly", async () => {
        const { calculateSetRepDistribution } = await import("~/server/api/routers/progress");
        
        const mockData = [
          {
            sets: 3,
            reps: 5,
            weight: "100",
            exerciseName: "Bench Press",
          },
          {
            sets: 3,
            reps: 5,
            weight: "95",
            exerciseName: "Bench Press",
          },
          {
            sets: 4,
            reps: 8,
            weight: "200",
            exerciseName: "Squat",
          },
          {
            sets: 3,
            reps: 10,
            weight: "135",
            exerciseName: "OHP",
          }
        ];

        const result = calculateSetRepDistribution(mockData);
        
        // Check set distribution
        expect(result.setDistribution).toContainEqual({
          sets: 3,
          count: 3,
          percentage: 75, // 3 out of 4 entries
        });
        
        expect(result.setDistribution).toContainEqual({
          sets: 4,
          count: 1,
          percentage: 25, // 1 out of 4 entries
        });
        
        // Check rep distribution (top 10, sorted by count descending)
        expect(result.repDistribution).toContainEqual({
          reps: 5,
          count: 2,
          percentage: 50, // 2 out of 4 entries
        });
        
        // Check rep range distribution
        expect(result.repRangeDistribution).toContainEqual({
          range: "1-5 reps (Strength)",
          count: 2,
          percentage: 50,
        });
        
        expect(result.repRangeDistribution).toContainEqual({
          range: "6-8 reps (Strength-Hypertrophy)",
          count: 1,
          percentage: 25,
        });
        
        expect(result.repRangeDistribution).toContainEqual({
          range: "9-12 reps (Hypertrophy)",
          count: 1,
          percentage: 25,
        });
        
        // Check most common set/rep combinations (top 8)
        expect(result.mostCommonSetRep).toContainEqual({
          sets: 3,
          reps: 5,
          count: 2,
          percentage: 50,
        });
      });

      it("should handle empty data", async () => {
        const { calculateSetRepDistribution } = await import("~/server/api/routers/progress");
        
        const result = calculateSetRepDistribution([]);
        
        expect(result).toMatchObject({
          setDistribution: [],
          repDistribution: [],
          repRangeDistribution: [],
          mostCommonSetRep: [],
        });
      });
    });

    describe("calculateOneRM", () => {
      it("should calculate 1RM correctly using Epley formula", async () => {
        const { calculateOneRM } = await import("~/server/api/routers/progress");
        
        // Test 1 rep = weight
        expect(calculateOneRM(100, 1)).toBe(100);
        
        // Test Epley formula: 1RM = weight * (1 + reps/30)
        expect(calculateOneRM(100, 5)).toBe(116.7); // 100 * (1 + 5/30) = 100 * 1.167
        expect(calculateOneRM(200, 3)).toBe(220);   // 200 * (1 + 3/30) = 200 * 1.1
        expect(calculateOneRM(150, 10)).toBe(200);  // 150 * (1 + 10/30) = 150 * 1.333
      });

      it("should round to 1 decimal place", async () => {
        const { calculateOneRM } = await import("~/server/api/routers/progress");
        
        expect(calculateOneRM(100, 6)).toBe(120);   // 100 * (1 + 6/30) = 100 * 1.2
        expect(calculateOneRM(100, 7)).toBe(123.3); // 100 * (1 + 7/30) = 100 * 1.233
      });
    });
  });
});