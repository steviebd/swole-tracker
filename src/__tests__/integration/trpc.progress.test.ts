import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller } from "./trpc-harness";

// Helper to build a caller with strict typing for opts to avoid any
type CallerOpts = Parameters<typeof buildCaller>[0] | undefined;
const createCaller = (opts?: CallerOpts) => buildCaller(opts);

describe("tRPC progress router (integration, mocked ctx/db)", () => {
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

  describe("getStrengthProgression", () => {
    it("should return strength progression data for an exercise", async () => {
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => Promise.resolve([
                  {
                    workoutDate: new Date("2024-01-15"),
                    exerciseName: mockExerciseName,
                    weight: "100",
                    reps: 5,
                    sets: 1,
                    unit: "lbs",
                  },
                  {
                    workoutDate: new Date("2024-01-08"),
                    exerciseName: mockExerciseName,
                    weight: "95",
                    reps: 5,
                    sets: 1,
                    unit: "lbs",
                  }
                ])),
              })),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db: mockDb });
      
      const result = await caller.progress.getStrengthProgression({
        exerciseName: mockExerciseName,
        timeRange: "month",
      });
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        exerciseName: mockExerciseName,
        weight: 100,
        reps: 5,
      });
    });

    it("should handle templateExerciseId and get linked exercises", async () => {
      const mockDb = {
        query: {
          exerciseLinks: {
            findFirst: vi.fn(() => Promise.resolve({
              masterExerciseId: mockMasterExerciseId,
              masterExercise: { id: mockMasterExerciseId },
            })),
            findMany: vi.fn(() => Promise.resolve([
              { templateExercise: { exerciseName: mockExerciseName } }
            ])),
          },
        },
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => Promise.resolve([
                  {
                    workoutDate: new Date("2024-01-15"),
                    exerciseName: mockExerciseName,
                    weight: "100",
                    reps: 5,
                    sets: 1,
                    unit: "lbs",
                  }
                ])),
              })),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db: mockDb });
      
      const result = await caller.progress.getStrengthProgression({
        templateExerciseId: mockTemplateExerciseId,
        timeRange: "month",
      });
      
      expect(result).toHaveLength(1);
      expect(mockDb.query.exerciseLinks.findFirst).toHaveBeenCalled();
    });

    it("should return empty array when no exercises found", async () => {
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
      
      const result = await caller.progress.getStrengthProgression({
        exerciseName: "Non-existent Exercise",
        timeRange: "month",
      });
      
      expect(result).toHaveLength(0);
    });

    it("should require authentication", async () => {
      const caller = createCaller({ user: null });
      await expect(
        caller.progress.getStrengthProgression({
          exerciseName: mockExerciseName,
          timeRange: "month",
        })
      ).rejects.toMatchObject({
        message: expect.stringMatching(/UNAUTHORIZED/i),
      });
    });
  });

  describe("getVolumeProgression", () => {
    it("should return volume progression data", async () => {
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => Promise.resolve([
                  {
                    workoutDate: new Date("2024-01-15"),
                    exerciseName: mockExerciseName,
                    weight: "100",
                    reps: 5,
                    sets: 1,
                    unit: "lbs",
                  },
                  {
                    workoutDate: new Date("2024-01-15"),
                    exerciseName: "Squat",
                    weight: "200",
                    reps: 5,
                    sets: 1,
                    unit: "lbs",
                  }
                ])),
              })),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db: mockDb });
      
      const result = await caller.progress.getVolumeProgression({
        timeRange: "month",
      });
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        workoutDate: new Date("2024-01-15"),
        totalVolume: 1500, // (100*5*1) + (200*5*1)
        totalSets: 2,
        totalReps: 10,
        uniqueExercises: 2,
      });
    });

    it("should require authentication", async () => {
      const caller = createCaller({ user: null });
      await expect(
        caller.progress.getVolumeProgression({
          timeRange: "month",
        })
      ).rejects.toMatchObject({
        message: expect.stringMatching(/UNAUTHORIZED/i),
      });
    });
  });

  describe("getConsistencyStats", () => {
    it("should return consistency statistics", async () => {
      const mockWorkoutDates = [
        { workoutDate: new Date("2024-01-15") },
        { workoutDate: new Date("2024-01-12") },
        { workoutDate: new Date("2024-01-10") },
        { workoutDate: new Date("2024-01-08") },
        { workoutDate: new Date("2024-01-05") },
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
      
      const result = await caller.progress.getConsistencyStats({
        timeRange: "month",
      });
      
      expect(result).toMatchObject({
        totalWorkouts: 5,
        frequency: expect.any(Number),
        currentStreak: expect.any(Number),
        longestStreak: expect.any(Number),
        consistencyScore: expect.any(Number),
      });
    });

    it("should require authentication", async () => {
      const caller = createCaller({ user: null });
      await expect(
        caller.progress.getConsistencyStats({
          timeRange: "month",
        })
      ).rejects.toMatchObject({
        message: expect.stringMatching(/UNAUTHORIZED/i),
      });
    });
  });

  describe("getPersonalRecords", () => {
    it("should return personal records for an exercise", async () => {
      const mockDb = {
        query: {
          exerciseLinks: {
            findFirst: vi.fn(() => Promise.resolve(null)),
          },
        },
        select: vi.fn().mockImplementation((selector) => {
          // Check what we're selecting to determine which query this is
          if (selector && typeof selector === 'object' && 'exerciseName' in selector) {
            // This is the query to get all exercises for a user
            return {
              from: vi.fn(() => ({
                where: vi.fn(() => ({
                  groupBy: vi.fn(() => Promise.resolve([
                    { exerciseName: mockExerciseName }
                  ])),
                })),
              })),
            };
          }
          
          // This is the query to get exercise data
          return {
            from: vi.fn(() => ({
              innerJoin: vi.fn(() => ({
                where: vi.fn(() => ({
                  orderBy: vi.fn(() => Promise.resolve([
                    {
                      workoutDate: new Date("2024-01-15"),
                      weight: "100",
                      reps: 5,
                      sets: 1,
                      unit: "lbs",
                    },
                    {
                      workoutDate: new Date("2024-01-08"),
                      weight: "95",
                      reps: 5,
                      sets: 1,
                      unit: "lbs",
                    }
                  ])),
                })),
              })),
            })),
          };
        }),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db: mockDb });
      
      const result = await caller.progress.getPersonalRecords({
        exerciseName: mockExerciseName,
        timeRange: "year",
        recordType: "both",
      });
      
      expect(result).toHaveLength(2); // One for weight PR, one for volume PR
      expect(result[0]).toMatchObject({
        exerciseName: mockExerciseName,
        recordType: "weight",
        weight: 100,
      });
    });

    it("should handle templateExerciseId", async () => {
      const mockDb = {
        query: {
          exerciseLinks: {
            findFirst: vi.fn(() => Promise.resolve({
              masterExerciseId: mockMasterExerciseId,
              masterExercise: { id: mockMasterExerciseId },
            })),
            findMany: vi.fn(() => Promise.resolve([
              { templateExercise: { exerciseName: mockExerciseName } }
            ])),
          },
        },
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => Promise.resolve([
                  {
                    workoutDate: new Date("2024-01-15"),
                    weight: "100",
                    reps: 5,
                    sets: 1,
                    unit: "lbs",
                  }
                ])),
              })),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db: mockDb });
      
      const result = await caller.progress.getPersonalRecords({
        templateExerciseId: mockTemplateExerciseId,
        timeRange: "year",
        recordType: "weight",
      });
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        exerciseName: mockExerciseName,
        recordType: "weight",
        weight: 100,
      });
    });

    it("should require authentication", async () => {
      const caller = createCaller({ user: null });
      await expect(
        caller.progress.getPersonalRecords({
          exerciseName: mockExerciseName,
          timeRange: "month",
          recordType: "weight",
        })
      ).rejects.toMatchObject({
        message: expect.stringMatching(/UNAUTHORIZED/i),
      });
    });
  });

  describe("getComparativeAnalysis", () => {
    it("should return comparative analysis data", async () => {
      const mockVolumeAndStrengthData = {
        totalVolume: 10000,
        totalSets: 50,
        totalReps: 250,
        uniqueExercises: 10,
        workoutCount: 10,
      };
      
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve([
                {
                  exerciseName: mockExerciseName,
                  weight: "100",
                  reps: 5,
                  sets: 1,
                  unit: "lbs",
                }
              ])),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db: mockDb });
      
      const result = await caller.progress.getComparativeAnalysis({
        timeRange: "month",
      });
      
      expect(result).toMatchObject({
        current: expect.any(Object),
        previous: expect.any(Object),
        changes: expect.any(Object),
      });
      
      // Check that changes object has the expected structure
      expect(result.changes).toMatchObject({
        volumeChange: expect.any(Number),
        setsChange: expect.any(Number),
        repsChange: expect.any(Number),
      });
    });

    it("should require authentication", async () => {
      const caller = createCaller({ user: null });
      await expect(
        caller.progress.getComparativeAnalysis({
          timeRange: "month",
        })
      ).rejects.toMatchObject({
        message: expect.stringMatching(/UNAUTHORIZED/i),
      });
    });
  });

  describe("getExerciseList", () => {
    it("should return exercise list", async () => {
      const mockExercises = [
        {
          exerciseName: mockExerciseName,
          lastUsed: new Date("2024-01-15"),
          totalSets: 10,
        }
      ];
      
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                groupBy: vi.fn(() => ({
                  orderBy: vi.fn(() => Promise.resolve(mockExercises)),
                })),
              })),
            })),
          })),
        })),
      } as any;

      const caller = createCaller({ user: { id: mockUserId }, db: mockDb });
      
      const result = await caller.progress.getExerciseList();
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        exerciseName: mockExerciseName,
        totalSets: 10,
      });
    });

    it("should require authentication", async () => {
      const caller = createCaller({ user: null });
      await expect(
        caller.progress.getExerciseList()
      ).rejects.toMatchObject({
        message: expect.stringMatching(/UNAUTHORIZED/i),
      });
    });
  });
});