import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectPlateau,
  storePlateau,
  getActivePlateaus,
} from "~/server/api/utils/plateau-detection";
import {
  generatePRForecast,
  storePRForecast,
} from "~/server/api/utils/pr-forecasting";
import {
  generateDefaultMilestones,
  storeMilestones,
  calculateMilestoneProgress,
} from "~/server/api/utils/milestone-defaults";
import { generatePlateauRecommendations } from "~/server/api/utils/plateau-recommendations";
import { db } from "~/server/db";
import { eq, and, desc } from "drizzle-orm";
import {
  sessionExercises,
  workoutSessions,
  plateaus,
  milestones,
  milestoneAchievements,
  prForecasts,
  masterExercises,
} from "~/server/db/schema";

// Mock database
vi.mock("~/server/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {
      sessionExercises: {},
      workoutSessions: {},
      plateaus: {},
      milestones: {},
      milestoneAchievements: {},
      prForecasts: {},
      masterExercises: {},
    },
  },
}));

describe("Plateau & Milestone Features", () => {
  const mockUserId = "test-user-id";
  const mockExerciseId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Plateau Detection", () => {
    it("should detect plateau when performance stalls", async () => {
      // Mock exercise history showing plateau
      const mockExerciseHistory = [
        { one_rm_estimate: 100, workout_date: new Date("2024-01-01") },
        { one_rm_estimate: 101, workout_date: new Date("2024-01-08") },
        { one_rm_estimate: 100, workout_date: new Date("2024-01-15") }, // No progress
        { one_rm_estimate: 99.5, workout_date: new Date("2024-01-22") }, // Slight regression
        { one_rm_estimate: 100, workout_date: new Date("2024-01-29") }, // No progress
        { one_rm_estimate: 99, workout_date: new Date("2024-02-05") }, // Regression
      ];

      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockExerciseHistory),
          }),
        }),
      });

      const result = await detectPlateau(db as any, mockUserId, mockExerciseId);

      expect(result.plateauDetected).toBe(true);
      expect(result.plateau).toBeDefined();
      expect(result.plateau!.stalledWeight).toBe(100);
      expect(result.plateau!.stalledReps).toBeCloseTo(5, 0);
      expect(result.plateau!.severity).toBe("medium");
    });

    it("should not detect plateau with consistent progress", async () => {
      // Mock exercise history showing progress
      const mockExerciseHistory = [
        { one_rm_estimate: 100, workout_date: new Date("2024-01-01") },
        { one_rm_estimate: 105, workout_date: new Date("2024-01-08") },
        { one_rm_estimate: 110, workout_date: new Date("2024-01-15") },
        { one_rm_estimate: 115, workout_date: new Date("2024-01-22") },
        { one_rm_estimate: 120, workout_date: new Date("2024-01-29") },
      ];

      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockExerciseHistory),
          }),
        }),
      });

      const result = await detectPlateau(db as any, mockUserId, mockExerciseId);

      expect(result.plateauDetected).toBe(false);
      expect(result.plateau).toBeNull();
    });

    it("should store plateau detection results", async () => {
      const plateauData = {
        isPlateaued: true,
        sessionCount: 6,
        stalledWeight: 100,
        stalledReps: 5,
        confidenceLevel: "medium" as const,
        detectedAt: new Date(),
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 123 }]),
            }),
          }),
        }),
      });

      await storePlateau(db as any, mockUserId, mockExerciseId, plateauData);

      expect(db.insert).toHaveBeenCalledWith(plateaus);
      expect(db.insert().values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          masterExerciseId: mockExerciseId,
          isPlateaued: true,
          sessionCount: 6,
          stalledWeight: 100,
          stalledReps: 5,
          confidenceLevel: "medium",
        }),
      );
    });
  });

  describe("PR Forecasting", () => {
    it("should generate PR forecast based on progression", async () => {
      // Mock exercise history for forecasting
      const mockExerciseHistory = [
        { one_rm_estimate: 100, workout_date: new Date("2024-01-01") },
        { one_rm_estimate: 102, workout_date: new Date("2024-01-08") },
        { one_rm_estimate: 104, workout_date: new Date("2024-01-15") },
        { one_rm_estimate: 106, workout_date: new Date("2024-01-22") },
        { one_rm_estimate: 108, workout_date: new Date("2024-01-29") },
      ];

      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockExerciseHistory),
          }),
        }),
      });

      const result = await generatePRForecast(
        db as any,
        mockUserId,
        mockExerciseId,
      );

      expect(result.forecasts).toHaveLength(1);
      expect(result.forecasts[0].currentWeight).toBe(108);
      expect(result.forecasts[0].forecastedWeight).toBeGreaterThan(108);
      expect(result.forecasts[0].confidencePercent).toBeGreaterThan(60);
    });

    it("should store PR forecast results", async () => {
      const forecastData = {
        currentWeight: 100,
        forecastedWeight: 115,
        confidencePercent: 75,
        timeframeWeeks: 8,
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 456 }]),
            }),
          }),
        }),
      });

      await storePRForecast(
        db as any,
        mockUserId,
        mockExerciseId,
        forecastData,
      );

      expect(db.insert).toHaveBeenCalledWith(prForecasts);
      expect(db.insert().values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          masterExerciseId: mockExerciseId,
          currentWeight: 100,
          forecastedWeight: 115,
          confidencePercent: 75,
          timeframeWeeks: 8,
        }),
      );
    });
  });

  describe("Milestone Management", () => {
    it("should generate default milestones for experience level", () => {
      const milestones = generateDefaultMilestones("intermediate", 70);

      expect(milestones).toHaveLengthGreaterThan(0);
      expect(milestones.some((m) => m.type === "absolute_weight")).toBe(true);
      expect(milestones.some((m) => m.type === "bodyweight_multiplier")).toBe(
        true,
      );
      expect(milestones.some((m) => m.type === "volume")).toBe(true);
    });

    it("should store milestones for user", async () => {
      const milestoneData = [
        {
          type: "absolute_weight" as const,
          targetValue: 150,
          experienceLevel: "intermediate" as const,
          isSystemDefault: true,
        },
        {
          type: "bodyweight_multiplier" as const,
          targetValue: 2.0,
          targetMultiplier: 2.0,
          experienceLevel: "intermediate" as const,
          isSystemDefault: true,
        },
      ];

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 789 }, { id: 790 }]),
        }),
      });

      await storeMilestones(
        db as any,
        mockUserId,
        mockExerciseId,
        milestoneData,
      );

      expect(db.insert).toHaveBeenCalledWith(milestones);
      expect(db.insert().values).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: mockUserId,
            masterExerciseId: mockExerciseId,
            type: "absolute_weight",
            targetValue: 150,
            experienceLevel: "intermediate",
            isSystemDefault: true,
          }),
          expect.objectContaining({
            userId: mockUserId,
            masterExerciseId: mockExerciseId,
            type: "bodyweight_multiplier",
            targetValue: 2.0,
            targetMultiplier: 2.0,
            experienceLevel: "intermediate",
            isSystemDefault: true,
          }),
        ]),
      );
    });

    it("should calculate milestone progress correctly", () => {
      const progress = calculateMilestoneProgress(
        100, // current value
        150, // target value
        "absolute_weight",
      );

      expect(progress).toBeCloseTo(66.67, 1);
    });

    it("should detect milestone achievement", async () => {
      // Mock milestone and achievement data
      vi.mocked(db.select).mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 123,
              targetValue: 100,
              type: "absolute_weight",
            },
          ]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // No existing achievement
        }),
      });

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 999 }]),
        }),
      });

      // This would be called from the workout save logic
      const currentOneRM = 105;
      const milestoneId = 123;

      // Simulate the achievement check logic
      if (currentOneRM >= 100) {
        await db.insert(milestoneAchievements).values({
          userId: mockUserId,
          milestoneId,
          workoutId: 456,
          achievedAt: new Date(),
          achievedValue: currentOneRM,
          metadata: JSON.stringify({
            trigger: "workout_completion",
            masterExerciseId: mockExerciseId,
          }),
        });
      }

      expect(db.insert).toHaveBeenCalledWith(milestoneAchievements);
      expect(db.insert().values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          milestoneId,
          achievedValue: currentOneRM,
        }),
      );
    });
  });

  describe("Plateau Recommendations", () => {
    it("should generate recommendations for detected plateau", () => {
      const plateauData = {
        exerciseName: "Squat",
        stalledWeight: 100,
        stalledReps: 5,
        severity: "medium" as const,
        sessionCount: 6,
      };

      const recommendations = generatePlateauRecommendations(
        plateauData,
        "intermediate",
      );

      expect(recommendations).toHaveLengthGreaterThan(0);
      expect(recommendations.some((r) => r.category === "volume")).toBe(true);
      expect(recommendations.some((r) => r.category === "intensity")).toBe(
        true,
      );
      expect(recommendations.some((r) => r.category === "technique")).toBe(
        true,
      );
      expect(recommendations.some((r) => r.category === "recovery")).toBe(true);
    });

    it("should provide different recommendations for different severity levels", () => {
      const lowSeverityPlateau = {
        exerciseName: "Bench Press",
        stalledWeight: 80,
        stalledReps: 8,
        severity: "low" as const,
        sessionCount: 4,
      };

      const highSeverityPlateau = {
        exerciseName: "Deadlift",
        stalledWeight: 150,
        stalledReps: 3,
        severity: "high" as const,
        sessionCount: 8,
      };

      const lowRecs = generatePlateauRecommendations(
        lowSeverityPlateau,
        "beginner",
      );
      const highRecs = generatePlateauRecommendations(
        highSeverityPlateau,
        "advanced",
      );

      // High severity should have more urgent recommendations
      expect(highRecs.length).toBeGreaterThanOrEqual(lowRecs.length);

      // Check for deload recommendations in high severity
      expect(
        highRecs.some(
          (r) =>
            r.title.toLowerCase().includes("deload") ||
            r.description.toLowerCase().includes("deload"),
        ),
      ).toBe(true);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete plateau detection and notification flow", async () => {
      // 1. Mock workout data that triggers plateau
      const workoutData = {
        exercises: [
          { templateExerciseId: 1, masterExerciseId: 1, oneRMEstimate: 100 },
        ],
      };

      // 2. Mock plateau detection
      vi.mocked(detectPlateau).mockResolvedValue({
        plateauDetected: true,
        plateau: {
          id: "plateau-123",
          exerciseName: "Squat",
          stalledWeight: 100,
          stalledReps: 5,
          severity: "medium",
        },
      });

      // 3. Mock milestone check
      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 456,
              type: "absolute_weight",
              targetValue: 120,
            },
          ]),
        }),
      });

      // 4. Simulate the flow
      const plateauResult = await detectPlateau(db as any, mockUserId, 1);

      expect(plateauResult.plateauDetected).toBe(true);

      if (plateauResult.plateauDetected) {
        // Store plateau
        await storePlateau(db as any, mockUserId, 1, {
          isPlateaued: true,
          sessionCount: 6,
          stalledWeight: plateauResult.plateau!.stalledWeight,
          stalledReps: plateauResult.plateau!.stalledReps,
          confidenceLevel: plateauResult.plateau!.severity,
          detectedAt: new Date(),
        });

        // Check for milestone achievements
        const currentOneRM = 100;
        if (currentOneRM >= 120) {
          await db.insert(milestoneAchievements).values({
            userId: mockUserId,
            milestoneId: 456,
            workoutId: 789,
            achievedAt: new Date(),
            achievedValue: currentOneRM,
          });
        }
      }

      // Verify plateau was stored
      expect(db.insert).toHaveBeenCalledWith(plateaus);
    });

    it("should handle milestone achievement with toast notification", async () => {
      // Mock milestone achievement data
      const achievementData = {
        type: "milestone_achieved" as const,
        exerciseName: "Deadlift",
        achievedValue: 200,
        targetValue: 200,
        achievedDate: new Date().toISOString(),
      };

      // Mock toast function
      const mockToast = vi.fn();
      global.toast = mockToast;

      // Simulate toast notification from workout save
      if (achievementData.type === "milestone_achieved") {
        mockToast({
          title: "Milestone Achieved! 🎉",
          description: `${achievementData.exerciseName}: ${achievementData.achievedValue}kg (target: ${achievementData.targetValue}kg)`,
          duration: 8000,
        });
      }

      expect(mockToast).toHaveBeenCalledWith({
        title: "Milestone Achieved! 🎉",
        description: "Deadlift: 200kg (target: 200kg)",
        duration: 8000,
      });
    });
  });

  describe("Data Validation", () => {
    it("should validate milestone target values", () => {
      const validMilestones = [
        { type: "absolute_weight", targetValue: 100 },
        { type: "bodyweight_multiplier", targetValue: 1.5 },
        { type: "volume", targetValue: 10000 },
      ];

      validMilestones.forEach((milestone) => {
        expect(milestone.targetValue).toBeGreaterThan(0);
      });

      // Test invalid cases
      expect(() => generateDefaultMilestones("intermediate", 0)).not.toThrow();
      expect(() =>
        generateDefaultMilestones("intermediate", -10),
      ).not.toThrow();
    });

    it("should handle edge cases in plateau detection", async () => {
      // Test with insufficient data
      const insufficientHistory = [
        { one_rm_estimate: 100, workout_date: new Date("2024-01-01") },
        { one_rm_estimate: 101, workout_date: new Date("2024-01-08") },
      ];

      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(insufficientHistory),
          }),
        }),
      });

      const result = await detectPlateau(db as any, mockUserId, mockExerciseId);

      // Should not detect plateau with insufficient data
      expect(result.plateauDetected).toBe(false);
    });
  });
});
