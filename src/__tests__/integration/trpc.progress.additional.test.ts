import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller } from "./trpc-harness";

// Helper to build a caller with strict typing for opts to avoid any
type CallerOpts = Parameters<typeof buildCaller>[0] | undefined;
const createCaller = (opts?: CallerOpts) => buildCaller(opts as CallerOpts);

describe("tRPC progress router additional coverage (integration, mocked ctx/db)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Mock data for tests
  const mockUserId = "user_test_123";
  const mockExerciseName = "Bench Press";
  const mockTemplateExerciseId = 1;

  describe("getStrengthProgression edge cases", () => {
    it("should return empty array when no exercise names to search", async () => {
      const caller = createCaller({ user: { id: mockUserId }, db: {} });
      
      const result = await caller.progress.getStrengthProgression({
        timeRange: "month",
      });
      
      expect(result).toHaveLength(0);
    });

    it("should handle database errors gracefully", async () => {
      const db = {
        select: vi.fn(() => {
          throw new Error("Database error");
        }),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getStrengthProgression({
        exerciseName: mockExerciseName,
        timeRange: "month",
      });
      
      expect(result).toHaveLength(0);
    });

    it("should handle single exercise name correctly", async () => {
      const mockProgressData = [
        {
          workoutDate: new Date("2024-01-15"),
          exerciseName: mockExerciseName,
          weight: "100",
          reps: 5,
          sets: 1,
          unit: "lbs",
        }
      ];
      
      const db = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => Promise.resolve(mockProgressData)),
              })),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getStrengthProgression({
        exerciseName: mockExerciseName,
        timeRange: "month",
      });
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        exerciseName: mockExerciseName,
        weight: 100,
        reps: 5,
      });
    });
  });

  describe("getVolumeProgression edge cases", () => {
    it("should handle database errors gracefully", async () => {
      const db = {
        select: vi.fn(() => {
          throw new Error("Database error");
        }),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getVolumeProgression({
        timeRange: "month",
      });
      
      expect(result).toHaveLength(0);
    });

    it("should handle empty volume data", async () => {
      const db = {
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

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getVolumeProgression({
        timeRange: "month",
      });
      
      expect(result).toHaveLength(0);
    });
  });

  describe("getConsistencyStats edge cases", () => {
    it("should handle database errors gracefully", async () => {
      const db = {
        select: vi.fn(() => {
          throw new Error("Database error");
        }),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getConsistencyStats({
        timeRange: "month",
      });
      
      expect(result).toMatchObject({
        totalWorkouts: 0,
        frequency: 0,
        currentStreak: 0,
        longestStreak: 0,
        consistencyScore: 0,
      });
    });

    it("should handle empty workout dates", async () => {
      const db = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getConsistencyStats({
        timeRange: "month",
      });
      
      expect(result).toMatchObject({
        totalWorkouts: 0,
        frequency: 0,
        currentStreak: 0,
        longestStreak: 0,
        consistencyScore: 0,
      });
    });
  });

  describe("getWorkoutDates edge cases", () => {
    it("should handle database errors gracefully", async () => {
      const db = {
        select: vi.fn(() => {
          throw new Error("Database error");
        }),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getWorkoutDates({
        timeRange: "month",
      });
      
      expect(result).toHaveLength(0);
    });
  });

  describe("getPersonalRecords edge cases", () => {
    it("should handle case when no exercise names to search", async () => {
      const select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              groupBy: vi.fn(() => Promise.resolve([])), // No exercises found
            })),
          })),
        });

      const db = { select } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getPersonalRecords({
        timeRange: "year",
        recordType: "both",
      });
      
      expect(result).toHaveLength(0);
    });

    it("should handle database errors when getting all exercises", async () => {
      const select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => {
            throw new Error("Database error");
          }),
        });

      const db = { select } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getPersonalRecords({
        timeRange: "year",
        recordType: "both",
      });
      
      expect(result).toHaveLength(0);
    });

    it("should handle database errors when getting exercise data", async () => {
      const select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              groupBy: vi.fn(() => Promise.resolve([{ exerciseName: mockExerciseName }])), // Exercises found
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => {
            throw new Error("Database error");
          }),
        });

      const db = { select } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getPersonalRecords({
        exerciseName: mockExerciseName,
        timeRange: "year",
        recordType: "both",
      });
      
      expect(result).toHaveLength(0);
    });

    it("should handle empty exercise data", async () => {
      const select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => Promise.resolve([])), // Empty exercise data
              })),
            })),
          })),
        });

      const db = { select } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getPersonalRecords({
        exerciseName: mockExerciseName,
        timeRange: "year",
        recordType: "both",
      });
      
      expect(result).toHaveLength(0);
    });

    it("should handle weight PR calculation with empty data", async () => {
      const mockExerciseData = [
        { workoutDate: new Date("2024-01-15"), weight: "", reps: 0, sets: 0, unit: "lbs" }
      ];
      
      const select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => Promise.resolve(mockExerciseData)),
              })),
            })),
          })),
        });

      const db = { select } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getPersonalRecords({
        exerciseName: mockExerciseName,
        timeRange: "year",
        recordType: "weight",
      });
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        recordType: "weight",
        weight: 0,
        reps: 0,
        sets: 0,
      });
    });

    it("should handle volume PR calculation with empty data", async () => {
      const mockExerciseData = [
        { workoutDate: new Date("2024-01-15"), weight: "", reps: 0, sets: 0, unit: "lbs" }
      ];
      
      const select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => Promise.resolve(mockExerciseData)),
              })),
            })),
          })),
        });

      const db = { select } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getPersonalRecords({
        exerciseName: mockExerciseName,
        timeRange: "year",
        recordType: "volume",
      });
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        recordType: "volume",
        weight: 0,
        reps: 0,
        sets: 0,
        totalVolume: 0,
      });
    });
  });

  describe("getComparativeAnalysis edge cases", () => {
    it("should handle database errors gracefully", async () => {
      const db = {
        select: vi.fn(() => {
          throw new Error("Database error");
        }),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getComparativeAnalysis({
        timeRange: "month",
      });
      
      expect(result).toMatchObject({
        current: {
          totalVolume: 0,
          totalSets: 0,
          totalReps: 0,
          uniqueExercises: 0,
          workoutCount: 0,
        },
        previous: {
          totalVolume: 0,
          totalSets: 0,
          totalReps: 0,
          uniqueExercises: 0,
          workoutCount: 0,
        },
        changes: {
          volumeChange: 0,
          setsChange: 0,
          repsChange: 0,
        },
      });
    });

    it("should handle empty data", async () => {
      const db = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getComparativeAnalysis({
        timeRange: "month",
      });
      
      expect(result).toMatchObject({
        current: {
          totalVolume: 0,
          totalSets: 0,
          totalReps: 0,
          uniqueExercises: 0,
          workoutCount: 0,
        },
        previous: {
          totalVolume: 0,
          totalSets: 0,
          totalReps: 0,
          uniqueExercises: 0,
          workoutCount: 0,
        },
      });
    });

    it("should handle case where previous period total is zero", async () => {
      const mockCurrentData = [
        {
          exerciseName: mockExerciseName,
          weight: "100",
          reps: 5,
          sets: 1,
          unit: "lbs",
        }
      ];
      
      const select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve(mockCurrentData)),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve([])), // Empty previous period data
            })),
          })),
        });

      const db = { select } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getComparativeAnalysis({
        timeRange: "month",
      });
      
      expect(result.changes).toMatchObject({
        volumeChange: 0,
        setsChange: 0,
        repsChange: 0,
      });
    });
  });

  describe("getVolumeByExercise edge cases", () => {
    it("should handle database errors gracefully", async () => {
      const db = {
        select: vi.fn(() => {
          throw new Error("Database error");
        }),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getVolumeByExercise({
        timeRange: "month",
      });
      
      expect(result).toHaveLength(0);
    });
  });

  describe("getSetRepDistribution edge cases", () => {
    it("should handle database errors gracefully", async () => {
      const db = {
        select: vi.fn(() => {
          throw new Error("Database error");
        }),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
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

    it("should handle empty raw data", async () => {
      const db = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
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

    it("should handle zero values in set/rep data", async () => {
      const mockRawData = [
        {
          sets: 0,
          reps: 0,
          weight: "0",
          exerciseName: mockExerciseName,
        }
      ];
      
      const db = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve(mockRawData)),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getSetRepDistribution({
        timeRange: "month",
      });
      
      expect(result.setDistribution).toContainEqual({
        sets: 0,
        count: 1,
        percentage: 100,
      });
      
      expect(result.repDistribution).toContainEqual({
        reps: 0,
        count: 1,
        percentage: 100,
      });
    });
  });

  describe("getExerciseList edge cases", () => {
    it("should handle database errors gracefully", async () => {
      const db = {
        select: vi.fn(() => {
          throw new Error("Database error");
        }),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getExerciseList();
      
      expect(result).toHaveLength(0);
    });

    it("should handle empty exercise data", async () => {
      const db = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                groupBy: vi.fn(() => ({
                  orderBy: vi.fn(() => Promise.resolve([])),
                })),
              })),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db });
      
      const result = await caller.progress.getExerciseList();
      
      expect(result).toHaveLength(0);
    });
  });

  describe("Helper functions edge cases", () => {
    describe("getDateRange", () => {
      it("should handle custom date range", async () => {
        const { getDateRange } = await import("~/server/api/routers/progress");
        
        const startDate = new Date("2024-01-01");
        const endDate = new Date("2024-01-31");
        
        const result = getDateRange("month", startDate, endDate);
        
        expect(result.startDate).toEqual(startDate);
        expect(result.endDate).toEqual(endDate);
      });
    });

    describe("getPreviousPeriod", () => {
      it("should calculate previous period correctly", async () => {
        const { getPreviousPeriod } = await import("~/server/api/routers/progress");
        
        const startDate = new Date("2024-01-01");
        const endDate = new Date("2024-01-31");
        
        const result = getPreviousPeriod(startDate, endDate);
        
        expect(result.startDate).toBeInstanceOf(Date);
        expect(result.endDate).toBeInstanceOf(Date);
      });
    });

    describe("getLinkedExerciseNames", () => {
      it("should handle case when no exercise link found", async () => {
        const { getLinkedExerciseNames } = await import("~/server/api/routers/progress");
        
        const db = {
          query: {
            exerciseLinks: {
              findFirst: vi.fn(() => Promise.resolve(null)), // No link found
            },
          },
        } as any;
        
        const result = await getLinkedExerciseNames(db, mockTemplateExerciseId);
        
        expect(result).toHaveLength(0);
      });

      it("should handle case when template exercise not found", async () => {
        const { getLinkedExerciseNames } = await import("~/server/api/routers/progress");
        
        const db = {
          query: {
            exerciseLinks: {
              findFirst: vi.fn(() => Promise.resolve(null)), // No link found
            },
          },
          queryOne: vi.fn(() => Promise.resolve(null)), // Template exercise not found
        } as any;
        
        const result = await getLinkedExerciseNames(db, mockTemplateExerciseId);
        
        expect(result).toHaveLength(0);
      });

      it("should handle case when template exercise found", async () => {
        const { getLinkedExerciseNames } = await import("~/server/api/routers/progress");
        
        const db = {
          query: {
            exerciseLinks: {
              findFirst: vi.fn(() => Promise.resolve(null)), // No link found
            },
          },
          queryOne: vi.fn(() => Promise.resolve({ exerciseName: mockExerciseName })), // Template exercise found
        } as any;
        
        const result = await getLinkedExerciseNames(db, mockTemplateExerciseId);
        
        expect(result).toEqual([mockExerciseName]);
      });
    });

    describe("processTopSets", () => {
      it("should handle empty progress data", async () => {
        const { processTopSets } = await import("~/server/api/routers/progress");
        
        const result = processTopSets([]);
        
        expect(result).toHaveLength(0);
      });

      it("should handle progress data with empty weight", async () => {
        const { processTopSets } = await import("~/server/api/routers/progress");
        
        const mockProgressData = [
          {
            workoutDate: new Date("2024-01-15"),
            exerciseName: mockExerciseName,
            weight: "",
            reps: 5,
            sets: 1,
            unit: "lbs",
          }
        ];
        
        const result = processTopSets(mockProgressData);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          weight: 0,
          reps: 5,
          sets: 1,
        });
      });
    });

    describe("calculateVolumeMetrics", () => {
      it("should handle empty volume data", async () => {
        const { calculateVolumeMetrics } = await import("~/server/api/routers/progress");
        
        const result = calculateVolumeMetrics([]);
        
        expect(result).toHaveLength(0);
      });

      it("should handle volume data with empty values", async () => {
        const { calculateVolumeMetrics } = await import("~/server/api/routers/progress");
        
        const mockVolumeData = [
          {
            workoutDate: new Date("2024-01-15"),
            weight: "",
            reps: 0,
            sets: 0,
            unit: "lbs",
          }
        ];
        
        const result = calculateVolumeMetrics(mockVolumeData);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          totalVolume: 0,
          totalSets: 0,
          totalReps: 0,
        });
      });
    });

    describe("calculateConsistencyMetrics", () => {
      it("should handle empty workout dates", async () => {
        const { calculateConsistencyMetrics } = await import("~/server/api/routers/progress");
        
        const startDate = new Date("2024-01-01");
        const endDate = new Date("2024-01-31");
        
        const result = calculateConsistencyMetrics([], startDate, endDate);
        
        expect(result).toMatchObject({
          totalWorkouts: 0,
          frequency: 0,
          currentStreak: 0,
          longestStreak: 0,
          consistencyScore: 0,
        });
      });
    });

    describe("calculateCurrentStreak", () => {
      it("should handle empty dates", async () => {
        const { calculateCurrentStreak } = await import("~/server/api/routers/progress");
        
        const result = calculateCurrentStreak([]);
        
        expect(result).toBe(0);
      });
    });

    describe("calculateLongestStreak", () => {
      it("should handle empty dates", async () => {
        const { calculateLongestStreak } = await import("~/server/api/routers/progress");
        
        const result = calculateLongestStreak([]);
        
        expect(result).toBe(0);
      });
    });

    describe("calculateChanges", () => {
      it("should handle zero values", async () => {
        const { calculateChanges } = await import("~/server/api/routers/progress");
        
        const current = {
          totalVolume: 0,
          totalSets: 0,
          totalReps: 0,
        };
        
        const previous = {
          totalVolume: 0,
          totalSets: 0,
          totalReps: 0,
        };
        
        const result = calculateChanges(current, previous);
        
        expect(result).toMatchObject({
          volumeChange: 0,
          setsChange: 0,
          repsChange: 0,
        });
      });
    });
  });
});