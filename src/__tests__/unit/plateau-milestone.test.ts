import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateMilestoneProgress,
  getMilestoneDifficulty,
} from "~/server/api/utils/milestone-defaults";
import {
  generatePlateauRecommendations,
  getSpecificPlateauRecommendation,
  filterRecommendationsByPreferences,
} from "~/server/api/utils/plateau-recommendations";
import type { Milestone } from "~/server/api/types/plateau-milestone";
import type {
  ExperienceLevel,
  MilestoneType,
} from "~/server/api/schemas/plateau-milestone";

describe("Plateau & Milestone Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Milestone Progress Calculation", () => {
    it("should calculate milestone progress correctly", () => {
      const progress = calculateMilestoneProgress(
        100, // current value
        150, // target value
        "absolute_weight",
      );

      expect(progress).toBeCloseTo(66.67, 1);
    });

    it("should handle zero target values gracefully", () => {
      const progress = calculateMilestoneProgress(
        100, // current value
        0, // target value
        "absolute_weight",
      );

      expect(progress).toBe(0);
    });

    it("should handle negative values gracefully", () => {
      const progress = calculateMilestoneProgress(
        -10, // current value
        100, // target value
        "absolute_weight",
      );

      expect(progress).toBe(-10); // Negative values are calculated as percentage
    });

    it("should cap progress at 100%", () => {
      const progress = calculateMilestoneProgress(
        200, // current value (exceeds target)
        150, // target value
        "absolute_weight",
      );

      expect(progress).toBe(100);
    });

    it("should handle exact target achievement", () => {
      const progress = calculateMilestoneProgress(
        150, // current value (exactly target)
        150, // target value
        "absolute_weight",
      );

      expect(progress).toBe(100);
    });
  });

  describe("Milestone Difficulty Assessment", () => {
    it("should assess difficulty for absolute weight milestones", () => {
      const easyMilestone: Milestone = {
        id: 1,
        userId: "user1",
        masterExerciseId: 1,
        type: "absolute_weight",
        targetValue: 135,
        targetMultiplier: null,
        isSystemDefault: true,
        isCustomized: false,
        experienceLevel: "beginner",
        createdAt: new Date(),
      };

      const difficulty = getMilestoneDifficulty(easyMilestone, "beginner");
      expect(difficulty).toBe("easy");
    });

    it("should assess difficulty for bodyweight multiplier milestones", () => {
      const moderateMilestone: Milestone = {
        id: 2,
        userId: "user1",
        masterExerciseId: 1,
        type: "bodyweight_multiplier",
        targetValue: 1,
        targetMultiplier: 1,
        isSystemDefault: true,
        isCustomized: false,
        experienceLevel: "intermediate",
        createdAt: new Date(),
      };

      const difficulty = getMilestoneDifficulty(
        moderateMilestone,
        "intermediate",
      );
      expect(difficulty).toBe("moderate");
    });

    it("should assess difficulty for volume milestones", () => {
      const challengingMilestone: Milestone = {
        id: 3,
        userId: "user1",
        masterExerciseId: 1,
        type: "volume",
        targetValue: 3000,
        targetMultiplier: null,
        isSystemDefault: true,
        isCustomized: false,
        experienceLevel: "advanced",
        createdAt: new Date(),
      };

      const difficulty = getMilestoneDifficulty(
        challengingMilestone,
        "advanced",
      );
      expect(difficulty).toBe("challenging");
    });
  });

  describe("Plateau Recommendations", () => {
    it("should generate recommendations for detected plateau", () => {
      const plateauContext = {
        userId: "test-user",
        masterExerciseId: 1,
        sessions: [
          { weight: 100, reps: 5, date: new Date("2024-01-01") },
          { weight: 100, reps: 5, date: new Date("2024-01-08") },
          { weight: 100, reps: 4, date: new Date("2024-01-15") },
          { weight: 100, reps: 5, date: new Date("2024-01-22") },
          { weight: 100, reps: 4, date: new Date("2024-01-29") },
          { weight: 100, reps: 5, date: new Date("2024-02-05") },
        ],
        experienceLevel: "intermediate" as ExperienceLevel,
        maintenanceMode: false,
      };

      const recommendations = generatePlateauRecommendations(plateauContext);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(6); // Should be limited to top 6
      expect(
        recommendations.every(
          (r) =>
            r.rule &&
            r.description &&
            r.action &&
            ["low", "medium", "high"].includes(r.priority),
        ),
      ).toBe(true);
    });

    it("should return maintenance recommendation when in maintenance mode", () => {
      const maintenanceContext = {
        userId: "test-user",
        masterExerciseId: 1,
        sessions: [],
        experienceLevel: "intermediate" as ExperienceLevel,
        maintenanceMode: true,
      };

      const recommendations =
        generatePlateauRecommendations(maintenanceContext);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]?.rule).toBe("maintenance_mode");
      expect(recommendations[0]?.priority).toBe("low");
    });

    it("should handle empty sessions gracefully", () => {
      const emptyContext = {
        userId: "test-user",
        masterExerciseId: 1,
        sessions: [],
        experienceLevel: "beginner" as ExperienceLevel,
        maintenanceMode: false,
      };

      const recommendations = generatePlateauRecommendations(emptyContext);

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it("should provide different recommendations for different session patterns", () => {
      const highIntensityContext = {
        userId: "test-user",
        masterExerciseId: 1,
        sessions: [
          { weight: 150, reps: 3, date: new Date("2024-01-01") },
          { weight: 150, reps: 2, date: new Date("2024-01-08") },
          { weight: 155, reps: 2, date: new Date("2024-01-15") },
        ],
        experienceLevel: "advanced" as ExperienceLevel,
        maintenanceMode: false,
      };

      const highVolumeContext = {
        userId: "test-user",
        masterExerciseId: 1,
        sessions: [
          { weight: 80, reps: 12, date: new Date("2024-01-01") },
          { weight: 80, reps: 10, date: new Date("2024-01-08") },
          { weight: 80, reps: 11, date: new Date("2024-01-15") },
        ],
        experienceLevel: "beginner" as ExperienceLevel,
        maintenanceMode: false,
      };

      const highIntensityRecs =
        generatePlateauRecommendations(highIntensityContext);
      const highVolumeRecs = generatePlateauRecommendations(highVolumeContext);

      expect(highIntensityRecs.length).toBeGreaterThan(0);
      expect(highVolumeRecs.length).toBeGreaterThan(0);

      // Recommendations should be different based on session patterns
      const highIntensityRules = highIntensityRecs.map((r) => r.rule);
      const highVolumeRules = highVolumeRecs.map((r) => r.rule);

      expect(highIntensityRules).not.toEqual(highVolumeRules);
    });
  });

  describe("Specific Plateau Recommendations", () => {
    it("should provide strength-specific recommendations", () => {
      const recommendation = getSpecificPlateauRecommendation(
        "strength",
        "intermediate",
      );

      expect(recommendation.rule).toBe("strength_plateau");
      expect(recommendation.priority).toBe("high");
      expect(recommendation.description).toContain("strength plateau");
      expect(recommendation.action).toContain("85-95%");
    });

    it("should provide hypertrophy-specific recommendations", () => {
      const recommendation = getSpecificPlateauRecommendation(
        "hypertrophy",
        "advanced",
      );

      expect(recommendation.rule).toBe("hypertrophy_plateau");
      expect(recommendation.priority).toBe("high");
      expect(recommendation.description).toContain("Muscle growth");
      expect(recommendation.action).toContain("20%");
    });

    it("should provide endurance-specific recommendations", () => {
      const recommendation = getSpecificPlateauRecommendation(
        "endurance",
        "beginner",
      );

      expect(recommendation.rule).toBe("endurance_plateau");
      expect(recommendation.priority).toBe("medium");
      expect(recommendation.description).toContain("endurance");
      expect(recommendation.action).toContain("drop sets");
    });

    it("should provide technique-specific recommendations", () => {
      const recommendation = getSpecificPlateauRecommendation(
        "technique",
        "intermediate",
      );

      expect(recommendation.rule).toBe("technique_plateau");
      expect(recommendation.priority).toBe("high");
      expect(recommendation.description).toContain("Technical");
      expect(recommendation.action).toContain("Film");
    });
  });

  describe("Recommendation Filtering", () => {
    it("should filter recommendations by playbook preference", () => {
      const allRecommendations = [
        {
          rule: "volume_overload",
          description: "Increase volume",
          action: "Add more sets",
          playbookCTA: true,
          priority: "high" as const,
        },
        {
          rule: "sleep_optimization",
          description: "Sleep more",
          action: "Get 8 hours",
          playbookCTA: false,
          priority: "low" as const,
        },
        {
          rule: "intensity_increase",
          description: "Increase intensity",
          action: "Add weight",
          playbookCTA: true,
          priority: "medium" as const,
        },
      ];

      const playbookOnly = filterRecommendationsByPreferences(
        allRecommendations,
        {
          prefersPlaybooks: true,
        },
      );

      expect(playbookOnly).toHaveLength(2);
      expect(playbookOnly.every((r) => r.playbookCTA)).toBe(true);
    });

    it("should filter recommendations by excluded rules", () => {
      const allRecommendations = [
        {
          rule: "volume_overload",
          description: "Increase volume",
          action: "Add more sets",
          playbookCTA: true,
          priority: "high" as const,
        },
        {
          rule: "sleep_optimization",
          description: "Sleep more",
          action: "Get 8 hours",
          playbookCTA: false,
          priority: "low" as const,
        },
        {
          rule: "intensity_increase",
          description: "Increase intensity",
          action: "Add weight",
          playbookCTA: true,
          priority: "medium" as const,
        },
      ];

      const filtered = filterRecommendationsByPreferences(allRecommendations, {
        excludedRules: ["sleep_optimization"],
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.some((r) => r.rule === "sleep_optimization")).toBe(false);
    });

    it("should limit recommendations by max count", () => {
      const allRecommendations = [
        {
          rule: "volume_overload",
          description: "Increase volume",
          action: "Add more sets",
          playbookCTA: true,
          priority: "high" as const,
        },
        {
          rule: "sleep_optimization",
          description: "Sleep more",
          action: "Get 8 hours",
          playbookCTA: false,
          priority: "low" as const,
        },
        {
          rule: "intensity_increase",
          description: "Increase intensity",
          action: "Add weight",
          playbookCTA: true,
          priority: "medium" as const,
        },
      ];

      const limited = filterRecommendationsByPreferences(allRecommendations, {
        maxRecommendations: 2,
      });

      expect(limited).toHaveLength(2);
    });

    it("should apply multiple filters together", () => {
      const allRecommendations = [
        {
          rule: "volume_overload",
          description: "Increase volume",
          action: "Add more sets",
          playbookCTA: true,
          priority: "high" as const,
        },
        {
          rule: "sleep_optimization",
          description: "Sleep more",
          action: "Get 8 hours",
          playbookCTA: false,
          priority: "low" as const,
        },
        {
          rule: "intensity_increase",
          description: "Increase intensity",
          action: "Add weight",
          playbookCTA: true,
          priority: "medium" as const,
        },
        {
          rule: "recovery_focus",
          description: "Focus on recovery",
          action: "Take rest days",
          playbookCTA: true,
          priority: "medium" as const,
        },
      ];

      const filtered = filterRecommendationsByPreferences(allRecommendations, {
        prefersPlaybooks: true,
        excludedRules: ["recovery_focus"],
        maxRecommendations: 1,
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.playbookCTA).toBe(true);
      expect(filtered[0]?.rule).not.toBe("recovery_focus");
    });
  });

  describe("Data Validation and Edge Cases", () => {
    it("should handle milestone progress with very small numbers", () => {
      const progress = calculateMilestoneProgress(0.1, 0.5, "absolute_weight");

      expect(progress).toBeCloseTo(20, 1);
    });

    it("should handle milestone progress with very large numbers", () => {
      const progress = calculateMilestoneProgress(
        1000000,
        2000000,
        "absolute_weight",
      );

      expect(progress).toBeCloseTo(50, 1);
    });

    it("should handle different milestone types in progress calculation", () => {
      const types: MilestoneType[] = [
        "absolute_weight",
        "bodyweight_multiplier",
        "volume",
      ];

      types.forEach((type) => {
        const progress = calculateMilestoneProgress(75, 100, type);
        expect(progress).toBeCloseTo(75, 1);
      });
    });

    it("should handle plateau detection with single session", () => {
      const singleSessionContext = {
        userId: "test-user",
        masterExerciseId: 1,
        sessions: [{ weight: 100, reps: 5, date: new Date("2024-01-01") }],
        experienceLevel: "intermediate" as ExperienceLevel,
        maintenanceMode: false,
      };

      const recommendations =
        generatePlateauRecommendations(singleSessionContext);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it("should handle plateau detection with consistent progress", () => {
      const progressingContext = {
        userId: "test-user",
        masterExerciseId: 1,
        sessions: [
          { weight: 100, reps: 5, date: new Date("2024-01-01") },
          { weight: 105, reps: 5, date: new Date("2024-01-08") },
          { weight: 110, reps: 5, date: new Date("2024-01-15") },
          { weight: 115, reps: 5, date: new Date("2024-01-22") },
        ],
        experienceLevel: "intermediate" as ExperienceLevel,
        maintenanceMode: false,
      };

      const recommendations =
        generatePlateauRecommendations(progressingContext);
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });
});
