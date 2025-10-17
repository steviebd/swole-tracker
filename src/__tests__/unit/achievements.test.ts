import { describe, it, expect } from "vitest";
import {
  calculateGoalAchievements,
  getBestGoalAchievement,
  calculateStreakAchievements,
  getStreakBadge,
  getProgressMilestone,
  calculateStreak,
  getAllAchievements,
  getAchievementById,
  createProgressReport,
  formatAchievementBadge,
  type Achievement,
  type StreakInfo,
} from "~/lib/achievements";

describe("Achievements System", () => {
  describe("calculateGoalAchievements", () => {
    it("should return no achievements for percentage below 90", () => {
      const result = calculateGoalAchievements(85);
      expect(result).toEqual([]);
    });

    it("should return nearly-perfect achievement for 90%", () => {
      const result = calculateGoalAchievements(90);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("nearly-perfect");
    });

    it("should return perfect and nearly-perfect achievements for 100%", () => {
      const result = calculateGoalAchievements(100);
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe("perfect-week");
      expect(result[1]!.id).toBe("nearly-perfect");
    });

    it("should return all goal achievements for 110%", () => {
      const result = calculateGoalAchievements(110);
      expect(result).toHaveLength(3);
      expect(result[0]!.id).toBe("exceeded-week");
      expect(result[1]!.id).toBe("perfect-week");
      expect(result[2]!.id).toBe("nearly-perfect");
    });

    it("should return multiple achievements sorted by threshold desc", () => {
      const result = calculateGoalAchievements(120);
      expect(result).toHaveLength(3);
      expect(result[0]!.id).toBe("exceeded-week");
      expect(result[1]!.id).toBe("perfect-week");
      expect(result[2]!.id).toBe("nearly-perfect");
    });
  });

  describe("getBestGoalAchievement", () => {
    it("should return null for no achievements", () => {
      const result = getBestGoalAchievement(85);
      expect(result).toBeNull();
    });

    it("should return the highest threshold achievement", () => {
      const result = getBestGoalAchievement(110);
      expect(result!.id).toBe("exceeded-week");
    });
  });

  describe("calculateStreakAchievements", () => {
    it("should return no achievements for streak below 3", () => {
      const streakInfo: StreakInfo = { current: 2, longest: 2 };
      const result = calculateStreakAchievements(streakInfo);
      expect(result).toEqual([]);
    });

    it("should return hat-trick for 3-day streak", () => {
      const streakInfo: StreakInfo = { current: 3, longest: 3 };
      const result = calculateStreakAchievements(streakInfo);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("streak-3");
    });

    it("should return multiple streak achievements", () => {
      const streakInfo: StreakInfo = { current: 30, longest: 30 };
      const result = calculateStreakAchievements(streakInfo);
      expect(result).toHaveLength(4);
      expect(result[0]!.id).toBe("streak-30");
    });
  });

  describe("getStreakBadge", () => {
    it("should return null for no streak achievements", () => {
      const streakInfo: StreakInfo = { current: 2, longest: 2 };
      const result = getStreakBadge(streakInfo);
      expect(result).toBeNull();
    });

    it("should return the highest streak achievement", () => {
      const streakInfo: StreakInfo = { current: 7, longest: 7 };
      const result = getStreakBadge(streakInfo);
      expect(result!.id).toBe("streak-7");
    });
  });

  describe("getProgressMilestone", () => {
    it("should return first-workout for 1 workout", () => {
      const result = getProgressMilestone(1, 0);
      expect(result!.id).toBe("first-workout");
    });

    it("should return volume milestone for high volume with no workouts", () => {
      const result = getProgressMilestone(0, 10000);
      expect(result!.id).toBe("volume-milestone-10k");
    });

    it("should return higher volume milestone", () => {
      const result = getProgressMilestone(0, 50000);
      expect(result!.id).toBe("volume-milestone-50k");
    });

    it("should return null for no milestones", () => {
      const result = getProgressMilestone(0, 0);
      expect(result).toBeNull();
    });
  });

  describe("calculateStreak", () => {
    it("should return zero streak for empty dates", () => {
      const result = calculateStreak([]);
      expect(result).toEqual({ current: 0, longest: 0 });
    });

    it("should calculate current streak for consecutive days", () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const result = calculateStreak([today, yesterday, twoDaysAgo]);
      expect(result.current).toBe(3);
      expect(result.longest).toBe(3);
    });

    it("should not count streak if not recent", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 3);
      const result = calculateStreak([oldDate]);
      expect(result.current).toBe(0);
      expect(result.longest).toBe(1);
    });

    it("should handle non-consecutive dates", () => {
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const result = calculateStreak([today, twoDaysAgo, threeDaysAgo]);
      expect(result.current).toBe(1);
      expect(result.longest).toBe(2);
    });
  });

  describe("getAllAchievements", () => {
    it("should return all achievements", () => {
      const result = getAllAchievements();
      expect(result).toHaveLength(11);
      expect(result.some((a) => a.id === "perfect-week")).toBe(true);
      expect(result.some((a) => a.id === "streak-30")).toBe(true);
    });
  });

  describe("getAchievementById", () => {
    it("should return achievement by id", () => {
      const result = getAchievementById("perfect-week");
      expect(result!.title).toBe("Perfect!");
    });

    it("should return undefined for invalid id", () => {
      const result = getAchievementById("invalid");
      expect(result).toBeUndefined();
    });
  });

  describe("createProgressReport", () => {
    it("should create complete progress report", () => {
      const streakInfo: StreakInfo = { current: 7, longest: 7 };
      const result = createProgressReport(100, 100, streakInfo, 10, 10000);

      expect(result.goalAchievement!.id).toBe("perfect-week");
      expect(result.streakAchievement!.id).toBe("streak-7");
      expect(result.progressMilestone!.id).toBe("first-workout");
      expect(result.allUnlockedAchievements).toHaveLength(5);
    });
  });

  describe("formatAchievementBadge", () => {
    it("should format achievement badge with icon", () => {
      const achievement: Achievement = {
        id: "perfect-week",
        title: "Perfect!",
        description: "Completed 100% of weekly goal",
        badgeColor: "gradient-stats-orange",
        threshold: 100,
        type: "goal",
      };

      const result = formatAchievementBadge(achievement);
      expect(result.text).toBe("Perfect!");
      expect(result.className).toContain("gradient-stats-orange");
      expect(result.icon).toBe("🎉");
    });

    it("should format without icon when disabled", () => {
      const achievement: Achievement = {
        id: "perfect-week",
        title: "Perfect!",
        description: "Completed 100% of weekly goal",
        badgeColor: "gradient-stats-orange",
        threshold: 100,
        type: "goal",
      };

      const result = formatAchievementBadge(achievement, false);
      expect(result.icon).toBeUndefined();
    });
  });
});
