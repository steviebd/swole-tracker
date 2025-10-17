/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useWorkoutStats, formatWorkoutStats } from "~/hooks/use-workout-stats";
import { renderHook } from "@testing-library/react";

describe("useWorkoutStats", () => {
  it("should export the hook function", () => {
    expect(typeof useWorkoutStats).toBe("function");
  });

  it("should have proper TypeScript interface", () => {
    // Test that we can call formatWorkoutStats with mock data
    const mockStats = {
      workoutsThisWeek: 0,
      workoutsLastWeek: 0,
      weeklyChange: undefined,
      avgDuration: "0min",
      durationChange: undefined,
      currentStreak: 0,
      streakAchievement: undefined,
      weeklyGoal: { current: 0, target: 3, percentage: 0 },
      goalAchievement: undefined,
      isLoading: false,
      error: null,
    };

    const result = formatWorkoutStats(mockStats);
    expect(result).toHaveProperty("thisWeekDisplay");
    expect(result).toHaveProperty("durationDisplay");
    expect(result).toHaveProperty("streakDisplay");
    expect(result).toHaveProperty("goalDisplay");
  });
});

describe("formatWorkoutStats", () => {
  it("should format workout stats for display", () => {
    const stats = {
      workoutsThisWeek: 3,
      workoutsLastWeek: 2,
      weeklyChange: "+50.0%",
      avgDuration: "45min",
      durationChange: "+2%",
      currentStreak: 5,
      streakAchievement: "💪 Strong!",
      weeklyGoal: { current: 3, target: 3, percentage: 100 },
      goalAchievement: "🎯 Perfect!",
      isLoading: false,
      error: null,
    };

    const result = formatWorkoutStats(stats);

    expect(result.thisWeekDisplay.value).toBe("3");
    expect(result.thisWeekDisplay.change).toBe("+50.0%");
    expect(result.durationDisplay.value).toBe("45min");
    expect(result.durationDisplay.change).toBe("+2%");
    expect(result.streakDisplay.value).toBe("5 days");
    expect(result.streakDisplay.change).toBe("💪 Strong!");
    expect(result.goalDisplay.value).toBe("3/3");
    expect(result.goalDisplay.change).toBe("🎯 Perfect!");
    expect(result.goalDisplay.percentage).toBe(100);
  });

  it("should handle singular streak", () => {
    const stats = {
      workoutsThisWeek: 1,
      workoutsLastWeek: 0,
      weeklyChange: "New!",
      avgDuration: "30min",
      durationChange: undefined,
      currentStreak: 1,
      streakAchievement: undefined,
      weeklyGoal: { current: 1, target: 3, percentage: 33 },
      goalAchievement: "👍 Good start",
      isLoading: false,
      error: null,
    };

    const result = formatWorkoutStats(stats);

    expect(result.streakDisplay.value).toBe("1 day");
    expect(result.goalDisplay.percentage).toBe(33);
  });
});
