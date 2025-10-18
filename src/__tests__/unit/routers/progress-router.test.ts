import { describe, it, expect, beforeEach, vi } from "vitest";
import { progressRouter } from "~/server/api/routers/progress";

describe("progressRouter", () => {
  let db: any;
  let caller: any;

  beforeEach(() => {
    // Create a comprehensive mock db that includes all the query structures
    db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([]),
                execute: vi.fn().mockResolvedValue([]),
              })),
              limit: vi.fn().mockResolvedValue([]),
              execute: vi.fn().mockResolvedValue([]),
            })),
            limit: vi.fn().mockResolvedValue([]),
            execute: vi.fn().mockResolvedValue([]),
          })),
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(() => ({
                  groupBy: vi.fn(() => ({
                    orderBy: vi.fn().mockResolvedValue([]),
                  })),
                  orderBy: vi.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([]),
              execute: vi.fn().mockResolvedValue([]),
            })),
            limit: vi.fn().mockResolvedValue([]),
            execute: vi.fn().mockResolvedValue([]),
          })),
          orderBy: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
            execute: vi.fn().mockResolvedValue([]),
          })),
          limit: vi.fn().mockResolvedValue([]),
          execute: vi.fn().mockResolvedValue([]),
        })),
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
            execute: vi.fn().mockResolvedValue([]),
          })),
          limit: vi.fn().mockResolvedValue([]),
          execute: vi.fn().mockResolvedValue([]),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
          execute: vi.fn().mockResolvedValue([]),
        })),
        limit: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue([]),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(() => ({
            set: vi.fn(() => ({
              returning: vi.fn().mockResolvedValue([]),
              execute: vi.fn().mockResolvedValue([]),
            })),
            returning: vi.fn().mockResolvedValue([]),
            execute: vi.fn().mockResolvedValue([]),
          })),
          returning: vi.fn().mockResolvedValue([]),
          execute: vi.fn().mockResolvedValue([]),
        })),
        returning: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue([]),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValue([]),
            execute: vi.fn().mockResolvedValue([]),
          })),
          returning: vi.fn().mockResolvedValue([]),
          execute: vi.fn().mockResolvedValue([]),
        })),
        returning: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue([]),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => ({
          execute: vi.fn().mockResolvedValue([]),
        })),
        execute: vi.fn().mockResolvedValue([]),
      })),
    };

    const ctx = {
      db,
      user: { id: "test-user-id" },
      requestId: "test-request",
      headers: new Headers(),
    } as any;

    caller = progressRouter.createCaller(ctx);
  });

  describe("getExerciseStrengthProgression", () => {
    it("should return default values when no data exists", async () => {
      // Mock empty result
      db.select.mockReturnValue({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      });

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
      });
    });

    it("should calculate strength progression with data", async () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-01"),
          exerciseName: "Bench Press",
          weight: "100",
          reps: 5,
          sets: 3,
          unit: "kg",
          oneRMEstimate: 112.5,
          volumeLoad: 1500,
          period: "current",
        },
        {
          workoutDate: new Date("2024-01-15"),
          exerciseName: "Bench Press",
          weight: "105",
          reps: 5,
          sets: 3,
          unit: "kg",
          oneRMEstimate: 118.125,
          volumeLoad: 1575,
          period: "current",
        },
      ];

      // Mock the complex query chain
      const mockQueryChain = {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue(mockData),
            })),
          })),
        })),
      };

      db.select.mockReturnValue(mockQueryChain);

      const result = await caller.getExerciseStrengthProgression({
        exerciseName: "Bench Press",
        timeRange: "quarter",
      });

      expect(result.currentOneRM).toBeGreaterThan(0);
      expect(result.sessionCount).toBe(2);
      expect(result.recentPRs).toBeDefined();
      expect(result.topSets).toBeDefined();
    });
  });

  describe("getExerciseVolumeProgression", () => {
    it("should return default values when no data exists", async () => {
      db.select.mockReturnValue({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      });

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

    it("should calculate volume progression with data", async () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-01"),
          weight: "100",
          reps: 5,
          sets: 3,
          unit: "kg",
          volumeLoad: 1500,
          period: "current",
        },
        {
          workoutDate: new Date("2024-01-08"),
          weight: "105",
          reps: 5,
          sets: 3,
          unit: "kg",
          volumeLoad: 1575,
          period: "current",
        },
      ];

      const mockQueryChain = {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue(mockData),
            })),
          })),
        })),
      };

      db.select.mockReturnValue(mockQueryChain);

      const result = await caller.getExerciseVolumeProgression({
        exerciseName: "Bench Press",
        timeRange: "quarter",
      });

      expect(result.currentVolume).toBeGreaterThan(0);
      expect(result.sessionCount).toBe(2);
      expect(result.volumeByWeek).toBeDefined();
    });
  });

  describe("getExerciseRecentPRs", () => {
    it("should return empty result when no data exists", async () => {
      db.select.mockReturnValue({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      });

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
        },
        {
          workoutDate: new Date("2024-01-15"),
          weight: 105,
          reps: 5,
          sets: 3,
        },
      ];

      const mockQueryChain = {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue(mockData),
            })),
          })),
        })),
      };

      db.select.mockReturnValue(mockQueryChain);

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
      db.select.mockReturnValue({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      });

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

      const mockQueryChain = {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue(mockData),
            })),
          })),
        })),
      };

      db.select.mockReturnValue(mockQueryChain);

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
      db.select.mockReturnValue({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                leftJoin: vi.fn(() => ({
                  where: vi.fn(() => ({
                    orderBy: vi.fn().mockResolvedValue([]),
                  })),
                })),
              })),
            })),
          })),
        })),
      });

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

      const mockQueryChain = {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                leftJoin: vi.fn(() => ({
                  where: vi.fn(() => ({
                    orderBy: vi.fn().mockResolvedValue(mockData),
                  })),
                })),
              })),
            })),
          })),
        })),
      };

      db.select.mockReturnValue(mockQueryChain);

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
      db.select.mockReturnValue({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      });

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

      const mockOrderBy = vi
        .fn()
        .mockResolvedValueOnce(currentRows)
        .mockResolvedValueOnce(previousRows);

      db.select.mockReturnValue({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: mockOrderBy,
            })),
          })),
        })),
      });

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

      const mockQueryChain = {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue(mockData),
            })),
          })),
        })),
      };

      db.select.mockReturnValue(mockQueryChain);

      const result = await caller.getVolumeProgression({
        timeRange: "month",
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getConsistencyStats", () => {
    it("should return consistency statistics", async () => {
      const mockData = [
        { workoutDate: new Date("2024-01-01") },
        { workoutDate: new Date("2024-01-08") },
        { workoutDate: new Date("2024-01-15") },
      ];

      db.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn().mockResolvedValue(mockData),
          })),
        })),
      });

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

      db.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn().mockResolvedValue(mockData),
          })),
        })),
      });

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

      const mockQueryChain = {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                leftJoin: vi.fn(() => ({
                  where: vi.fn(() => ({
                    groupBy: vi.fn(() => ({
                      orderBy: vi.fn().mockResolvedValue(mockData),
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      };

      db.select.mockReturnValue(mockQueryChain);

      const result = await caller.getExerciseList();

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
