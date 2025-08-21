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

describe("calculateGoalAchievements function", () => {
  it("should return no achievements for low percentage", () => {
    const result = calculateGoalAchievements(50);
    expect(result).toHaveLength(0);
  });

  it("should return nearly-perfect achievement for 90%", () => {
    const result = calculateGoalAchievements(90);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("nearly-perfect");
  });

  it("should return perfect achievement for 100%", () => {
    const result = calculateGoalAchievements(100);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.id).toBe("perfect-week");
  });

  it("should return exceeded achievement for 110%", () => {
    const result = calculateGoalAchievements(110);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.id).toBe("exceeded-week");
  });

  it("should return multiple achievements sorted by threshold", () => {
    const result = calculateGoalAchievements(120);
    expect(result.length).toBeGreaterThan(1);
    expect(result[0]?.id).toBe("exceeded-week");
    expect(result[1]?.id).toBe("perfect-week");
  });
});

describe("getBestGoalAchievement function", () => {
  it("should return null for low percentage", () => {
    const result = getBestGoalAchievement(50);
    expect(result).toBeNull();
  });

  it("should return the highest threshold achievement", () => {
    const result = getBestGoalAchievement(120);
    expect(result?.id).toBe("exceeded-week");
  });
});

describe("calculateStreakAchievements function", () => {
  it("should return no achievements for low streak", () => {
    const streakInfo: StreakInfo = { current: 2, longest: 2 };
    const result = calculateStreakAchievements(streakInfo);
    expect(result).toHaveLength(0);
  });

  it("should return hat trick for 3-day streak", () => {
    const streakInfo: StreakInfo = { current: 3, longest: 3 };
    const result = calculateStreakAchievements(streakInfo);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("streak-3");
  });

  it("should return multiple achievements for high streaks", () => {
    const streakInfo: StreakInfo = { current: 30, longest: 30 };
    const result = calculateStreakAchievements(streakInfo);
    expect(result.length).toBeGreaterThan(1);
    expect(result[0]?.id).toBe("streak-30");
  });
});

describe("getStreakBadge function", () => {
  it("should return null for low streak", () => {
    const streakInfo: StreakInfo = { current: 2, longest: 2 };
    const result = getStreakBadge(streakInfo);
    expect(result).toBeNull();
  });

  it("should return the highest streak achievement", () => {
    const streakInfo: StreakInfo = { current: 15, longest: 15 };
    const result = getStreakBadge(streakInfo);
    expect(result?.id).toBe("streak-14");
  });
});

describe("getProgressMilestone function", () => {
  it("should return first workout milestone", () => {
    const result = getProgressMilestone(1, 0);
    expect(result?.id).toBe("first-workout");
  });

  it("should return volume milestone for high volume with no workouts", () => {
    const result = getProgressMilestone(0, 10000);
    expect(result?.id).toBe("volume-milestone-10k");
  });

  it("should return higher volume milestone for very high volume with no workouts", () => {
    const result = getProgressMilestone(0, 50000);
    expect(result?.id).toBe("volume-milestone-50k");
  });

  it("should return null for no progress", () => {
    const result = getProgressMilestone(0, 0);
    expect(result).toBeNull();
  });
});

describe("calculateStreak function", () => {
  it("should return zero streak for empty dates", () => {
    const result = calculateStreak([]);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
  });

  it("should calculate current streak for consecutive dates", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const result = calculateStreak([today, yesterday, twoDaysAgo]);
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it("should handle broken streaks", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const result = calculateStreak([today, yesterday, threeDaysAgo]);
    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
  });

  it("should not count streak if last workout was more than 1 day ago", () => {
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const result = calculateStreak([twoDaysAgo]);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(1);
  });
});

describe("getAllAchievements function", () => {
  it("should return all achievements", () => {
    const result = getAllAchievements();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("description");
  });
});

describe("getAchievementById function", () => {
  it("should return achievement by id", () => {
    const result = getAchievementById("perfect-week");
    expect(result?.id).toBe("perfect-week");
    expect(result?.title).toBe("Perfect!");
  });

  it("should return undefined for non-existent id", () => {
    const result = getAchievementById("non-existent");
    expect(result).toBeUndefined();
  });
});

describe("createProgressReport function", () => {
  it("should create progress report with all achievements", () => {
    const streakInfo: StreakInfo = { current: 7, longest: 7 };
    const result = createProgressReport(100, 100, streakInfo, 10, 10000);

    expect(result.goalAchievement?.id).toBe("perfect-week");
    expect(result.streakAchievement?.id).toBe("streak-7");
    expect(result.progressMilestone?.id).toBe("first-workout"); // Prioritizes workout milestone
    expect(result.allUnlockedAchievements.length).toBeGreaterThan(0);
  });

  it("should handle no achievements", () => {
    const streakInfo: StreakInfo = { current: 0, longest: 0 };
    const result = createProgressReport(0, 0, streakInfo, 0, 0);

    expect(result.goalAchievement).toBeNull();
    expect(result.streakAchievement).toBeNull();
    expect(result.progressMilestone).toBeNull();
    expect(result.allUnlockedAchievements).toHaveLength(0);
  });
});

describe("formatAchievementBadge function", () => {
  it("should format achievement badge with icon", () => {
    const achievement: Achievement = {
      id: "perfect-week",
      title: "Perfect!",
      description: "Completed 100% of weekly goal",
      badgeColor: "gradient-stats-orange",
      threshold: 100,
      type: "goal",
    };

    const result = formatAchievementBadge(achievement, true);
    expect(result.text).toBe("Perfect!");
    expect(result.className).toContain("gradient-stats-orange");
    expect(result.icon).toBe("🎉");
  });

  it("should format achievement badge without icon", () => {
    const achievement: Achievement = {
      id: "perfect-week",
      title: "Perfect!",
      description: "Completed 100% of weekly goal",
      badgeColor: "gradient-stats-orange",
      threshold: 100,
      type: "goal",
    };

    const result = formatAchievementBadge(achievement, false);
    expect(result.text).toBe("Perfect!");
    expect(result.className).toContain("gradient-stats-orange");
    expect(result.icon).toBeUndefined();
  });
});
