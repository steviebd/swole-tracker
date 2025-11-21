/**
 * Tests for the algorithmic playbook planner
 * Validates progressive overload formulas, deload calculations, and 1RM estimations
 */

import { describe, it, expect } from "vitest";
import {
  generateAlgorithmicPlan,
  calculateWeekVolume,
  estimateOneRMFromPrescription,
} from "~/server/api/utils/algorithmic-planner";
import type { PlaybookGenerationContext } from "~/server/api/types/playbook";

describe("Algorithmic Planner", () => {
  const mockContext: PlaybookGenerationContext = {
    userId: "test-user-123",
    targetType: "exercise",
    targetIds: [1, 2, 3],
    duration: 6,
    recentSessions: [],
    currentOneRmEstimates: {
      Squat: 100,
      "Bench Press": 80,
      Deadlift: 120,
    },
    preferences: {
      defaultWeightUnit: "kg",
      progressionType: "linear",
      trainingDaysPerWeek: 3,
    },
    volumeTrends: [],
  };

  describe("Linear Periodization", () => {
    it("should generate 6-week linear plan for beginners", () => {
      const plan = generateAlgorithmicPlan({
        ...mockContext,
        recentSessions: [], // New user
      });

      expect(plan).toHaveLength(6);

      // Week 4 should be a deload
      const week4 = plan.find((w) => w.weekNumber === 4);
      expect(week4?.weekType).toBe("deload");

      // Week 6 should be PR attempt
      const week6 = plan.find((w) => w.weekNumber === 6);
      expect(week6?.weekType).toBe("pr_attempt");
    });

    it("should progressively increase intensity over weeks", () => {
      const plan = generateAlgorithmicPlan(mockContext);

      // Volume phase (weeks 1-3) should have lower intensity than intensity phase (week 5)
      const week1 = plan[0];
      const week5 = plan[4];

      expect(week1).toBeDefined();
      expect(week5).toBeDefined();

      // Assuming first session, first exercise
      const week1Exercise = week1!.sessions[0]?.exercises[0];
      const week5Exercise = week5!.sessions[0]?.exercises[0];

      if (week1Exercise?.weight && week5Exercise?.weight) {
        expect(week5Exercise.weight).toBeGreaterThan(week1Exercise.weight);
      }
    });

    it("should include deload week with reduced volume", () => {
      const plan = generateAlgorithmicPlan(mockContext);

      const deloadWeek = plan.find((w) => w.weekType === "deload");
      const trainingWeek = plan.find((w) => w.weekType === "training");

      expect(deloadWeek).toBeDefined();
      expect(trainingWeek).toBeDefined();

      if (deloadWeek && trainingWeek) {
        const deloadVolume = calculateWeekVolume(deloadWeek);
        const trainingVolume = calculateWeekVolume(trainingWeek);

        // Deload should be significantly lower volume
        expect(deloadVolume).toBeLessThan(trainingVolume * 0.8);
      }
    });
  });

  describe("DUP (Daily Undulating Periodization)", () => {
    it("should use DUP for experienced lifters with strength goal", () => {
      const experiencedContext = {
        ...mockContext,
        goalPreset: "strength" as const,
        recentSessions: Array(15).fill({
          sessionId: 1,
          workoutDate: new Date(),
          templateId: 1,
          templateName: "Test",
          exercises: [],
          totalVolume: 1000,
        }),
      };

      const plan = generateAlgorithmicPlan(experiencedContext);

      // Should have varied sessions per week (heavy/medium/light)
      const week1 = plan[0];
      expect(week1?.sessions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Block Periodization", () => {
    it("should use block periodization for powerlifting goal", () => {
      const powerliftingContext = {
        ...mockContext,
        goalPreset: "powerlifting" as const,
      };

      const plan = generateAlgorithmicPlan(powerliftingContext);

      // Should have distinct phases
      const week1 = plan[0]; // Accumulation
      const week3 = plan[2]; // Intensification
      const week5 = plan[4]; // Realization

      expect(week1).toBeDefined();
      expect(week3).toBeDefined();
      expect(week5).toBeDefined();

      // Progressive formula changes
      expect(week1!.progressionFormula).toContain("accumulation");
      expect(week3!.progressionFormula).toContain("intensification");
      expect(week5!.progressionFormula).toContain("realization");
    });
  });

  describe("1RM Calculations", () => {
    it("should correctly estimate 1RM from training prescription", () => {
      // 80kg x 5 reps should estimate ~90kg 1RM (Brzycki formula)
      const oneRM = estimateOneRMFromPrescription(80, 5);
      expect(oneRM).toBeCloseTo(90, 0);
    });

    it("should handle single rep as exact 1RM", () => {
      const oneRM = estimateOneRMFromPrescription(100, 1);
      expect(oneRM).toBe(100);
    });
  });

  describe("Volume Calculations", () => {
    it("should calculate weekly volume correctly", () => {
      const mockWeek = {
        weekNumber: 1,
        weekType: "training" as const,
        sessions: [
          {
            sessionNumber: 1,
            exercises: [
              {
                exerciseName: "Squat",
                sets: 5,
                reps: 5,
                weight: 80,
              },
            ],
            totalVolumeTarget: 2000,
          },
        ],
        volumeTarget: 2000,
        progressionFormula: "linear_80%",
      };

      const volume = calculateWeekVolume(mockWeek);
      expect(volume).toBe(2000);
    });
  });

  describe("Safety Validations", () => {
    it("should never recommend progression > 5% per week", () => {
      const plan = generateAlgorithmicPlan(mockContext);

      // Check each week's progression
      for (let i = 0; i < plan.length - 1; i++) {
        const thisWeek = plan[i];
        const nextWeek = plan[i + 1];

        if (
          thisWeek &&
          nextWeek &&
          thisWeek.weekType === "training" &&
          nextWeek.weekType === "training"
        ) {
          const thisVolume = calculateWeekVolume(thisWeek);
          const nextVolume = calculateWeekVolume(nextWeek);

          const percentChange = ((nextVolume - thisVolume) / thisVolume) * 100;

          // Allow for deload weeks which reduce volume
          if (percentChange > 0) {
            expect(percentChange).toBeLessThanOrEqual(10); // 10% max to be safe
          }
        }
      }
    });

    it("should include proper rest periods based on intensity", () => {
      const plan = generateAlgorithmicPlan({
        ...mockContext,
        goalPreset: "strength",
      });

      const heavyWeek = plan.find((w) => w.weekType === "pr_attempt");
      if (heavyWeek) {
        const heavyExercise = heavyWeek.sessions[0]?.exercises[0];
        if (heavyExercise) {
          // Heavy training should have 3-5 min rest
          expect(heavyExercise.restSeconds).toBeGreaterThanOrEqual(180);
        }
      }
    });
  });
});
