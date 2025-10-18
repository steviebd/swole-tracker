/**
 * Example: Systematic Mocking for Complex Dependencies
 *
 * This demonstrates the progressive approach to testing components
 * with complex dependencies like database operations and external APIs.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  createDrizzleMock,
  createBrowserAPIMock,
  createTRPCMockContext,
  createWorkoutData,
  createUserData,
} from "../test-utils/mock-factories";
import { MockTRPCProvider } from "../test-utils";
import * as sharedWorkoutData from "~/hooks/use-shared-workout-data";
import { useWorkoutStats, formatWorkoutStats } from "~/hooks/use-workout-stats";

// Import the component/hook we want to test
// import { useWorkoutStats } from '~/hooks/use-workout-stats';
// import { WorkoutRepository } from '~/server/repositories/workout';

// =============================================================================
// APPROACH 1: Pure Function Testing (Easiest)
// =============================================================================

describe("Pure Functions - No Mocking Required", () => {
  // Test utility functions that have no external dependencies
  it("formats workout duration correctly", () => {
    const formatDuration = (seconds: number): string => {
      const minutes = Math.round(seconds / 60);
      return `${minutes}min`;
    };

    expect(formatDuration(3600)).toBe("60min");
    expect(formatDuration(1800)).toBe("30min");
  });
});

// =============================================================================
// APPROACH 2: Factory-Based Mocking (Moderate Complexity)
// =============================================================================

describe("Browser API Dependencies", () => {
  let browserMock: ReturnType<typeof createBrowserAPIMock>;

  beforeEach(() => {
    browserMock = createBrowserAPIMock();
    Object.defineProperty(window, "matchMedia", {
      value: browserMock.matchMedia,
      writable: true,
    });
  });

  it("responds to reduced motion preference", () => {
    // Configure mock behavior
    browserMock.matchMedia.mockImplementation((query) => {
      const base = {
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn().mockReturnValue(false),
      };
      return base;
    });

    // Test component logic
    const useReducedMotion = () => {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      return mediaQuery.matches;
    };

    expect(useReducedMotion()).toBe(true);
  });
});

// =============================================================================
// APPROACH 3: Layered Integration Testing (Complex but Valuable)
// =============================================================================

describe("Database Layer Integration", () => {
  let dbMock: ReturnType<typeof createDrizzleMock>;
  let ctx: ReturnType<typeof createTRPCMockContext>;

  beforeEach(() => {
    dbMock = createDrizzleMock();
    ctx = createTRPCMockContext();

    // Override the db in context
    ctx.db = dbMock;
  });

  it("saves workout with proper validation", async () => {
    // Arrange: Setup mock database response
    const savedWorkout = createWorkoutData({ id: "new-workout-id" });
    (
      dbMock.insert as unknown as { mockReturnValue: (value: unknown) => void }
    ).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([savedWorkout]),
      }),
      returning: vi.fn().mockResolvedValue([savedWorkout]),
      execute: vi.fn().mockResolvedValue([savedWorkout]),
    });

    // Act: Call the function under test
    const workoutRepository = {
      async save(workoutData: any) {
        const db = ctx.db as any;
        const result = await db.insert({}).values(workoutData).returning();

        return result[0];
      },
    };

    const result = await workoutRepository.save({
      user_id: ctx.user.id,
      start: new Date(),
      end: new Date(),
    });

    // Assert: Verify correct behavior
    expect(result.id).toBe("new-workout-id");
    expect(dbMock.insert).toHaveBeenCalledWith({});
  });
});

// =============================================================================
// APPROACH 4: Progressive Testing Strategy
// =============================================================================

describe("Progressive Testing - Hook with Complex Dependencies", () => {
  const sharedDataSpy = vi.spyOn(sharedWorkoutData, "useSharedWorkoutData");

  const makeDate = (offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() - offsetDays);
    return date.toISOString();
  };

  beforeEach(() => {
    sharedDataSpy.mockReset();
  });

  afterAll(() => {
    sharedDataSpy.mockRestore();
  });

  // Level 1: Test pure logic separately
  describe("Pure Logic (No Mocks)", () => {
    const calculateStreak = (dates: string[]): number => {
      if (dates.length === 0) return 0;

      const workoutDates = dates
        .map((date) => new Date(date))
        .sort((a, b) => b.getTime() - a.getTime());

      // Simplified streak calculation
      return workoutDates.length;
    };

    it("calculates current streak from dates", () => {
      expect(calculateStreak(["2024-01-01", "2024-01-02"])).toBe(2);
      expect(calculateStreak([])).toBe(0);
    });
  });

  // Level 2: Test with simple mocks
  describe("Hook Integration (Simple Mocks)", () => {
    it("calculates workout statistics with mocked data", () => {
      // Setup spy for this test
      const testSpy = vi.spyOn(sharedWorkoutData, "useSharedWorkoutData");
      testSpy.mockReturnValue({
        thisWeekWorkouts: [makeDate(0), makeDate(1), makeDate(2)],
        thisWeekVolume: [
          {
            workoutDate: new Date(makeDate(0)),
            totalVolume: 1000,
            totalSets: 16,
            totalReps: 32,
            uniqueExercises: 4,
          },
          {
            workoutDate: new Date(makeDate(1)),
            totalVolume: 900,
            totalSets: 14,
            totalReps: 28,
            uniqueExercises: 3,
          },
        ],
        lastWeekWorkouts: [makeDate(7), makeDate(8)],
        monthWorkouts: [makeDate(0), makeDate(1), makeDate(2)],
        consistencyData: undefined,
        strengthPulse: null,
        lastWeekVolume: [],
        isLoading: false,
        isCriticalLoading: false,
        isSecondaryLoading: false,
        isExtendedLoading: false,
        hasCriticalData: true,
        hasSecondaryData: true,
        hasExtendedData: true,
        error: null,
      });

      const { result } = renderHook(() => useWorkoutStats(), {
        wrapper: MockTRPCProvider,
      });

      expect(result.current.workoutsThisWeek).toBe(3);
      expect(result.current.workoutsLastWeek).toBe(2);
      expect(result.current.weeklyChange).toBe("+50.0%");
      expect(result.current.avgDuration).toBe("53min");
      expect(result.current.durationChange).toBe("+5%");
      expect(result.current.currentStreak).toBe(3);
      expect(result.current.streakAchievement).toBe("📈 Building!");
      expect(result.current.weeklyGoal).toEqual({
        current: 3,
        target: 3,
        percentage: 100,
      });
      expect(result.current.goalAchievement).toBe("🎯 Perfect!");
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      testSpy.mockRestore();
    });
  });

  // Level 3: Full integration test
  describe("Full Integration (Real Dependencies)", () => {
    it("end-to-end workout statistics flow", () => {
      const testSpy = vi.spyOn(sharedWorkoutData, "useSharedWorkoutData");
      testSpy.mockReturnValue({
        thisWeekWorkouts: [makeDate(0), makeDate(2)],
        thisWeekVolume: [
          {
            workoutDate: new Date(makeDate(0)),
            totalVolume: 800,
            totalSets: 12,
            totalReps: 24,
            uniqueExercises: 3,
          },
          {
            workoutDate: new Date(makeDate(2)),
            totalVolume: 800,
            totalSets: 12,
            totalReps: 24,
            uniqueExercises: 3,
          },
        ],
        lastWeekWorkouts: [makeDate(8), makeDate(9), makeDate(10)],
        monthWorkouts: [makeDate(0), makeDate(2), makeDate(6)],
        consistencyData: undefined,
        strengthPulse: null,
        lastWeekVolume: [],
        isLoading: false,
        isCriticalLoading: false,
        isSecondaryLoading: false,
        isExtendedLoading: false,
        hasCriticalData: true,
        hasSecondaryData: true,
        hasExtendedData: true,
        error: null,
      });

      const { result } = renderHook(() => useWorkoutStats(), {
        wrapper: MockTRPCProvider,
      });
      const summary = formatWorkoutStats(result.current);

      expect(summary.thisWeekDisplay).toEqual({
        value: "2",
        change: "-33.3%",
        label: "This Week",
      });
      expect(summary.durationDisplay).toEqual({
        value: "42min",
        change: "+2%",
        label: "Avg Duration",
      });
      expect(summary.streakDisplay.value).toMatch(/\d+ day/);
      expect(summary.goalDisplay.percentage).toBe(67);

      testSpy.mockRestore();
    });
  });
});

// =============================================================================
// APPROACH 5: Contract-Based Testing
// =============================================================================

describe("Contract-Based Testing", () => {
  interface WorkoutStatsContract {
    given: {
      thisWeekWorkouts: string[];
      lastWeekWorkouts: string[];
    };
    when: {
      calculateStats: boolean;
    };
    then: {
      workoutsThisWeek: number;
      weeklyChange: string | undefined;
    };
  }

  const testContracts: WorkoutStatsContract[] = [
    {
      given: {
        thisWeekWorkouts: ["2024-01-01", "2024-01-02", "2024-01-03"],
        lastWeekWorkouts: ["2023-12-25", "2023-12-26"],
      },
      when: { calculateStats: true },
      then: {
        workoutsThisWeek: 3,
        weeklyChange: "+50.0%",
      },
    },
    {
      given: {
        thisWeekWorkouts: [],
        lastWeekWorkouts: ["2023-12-25"],
      },
      when: { calculateStats: true },
      then: {
        workoutsThisWeek: 0,
        weeklyChange: "-100.0%",
      },
    },
  ];

  testContracts.forEach((contract, index) => {
    it(`satisfies contract ${index + 1}`, () => {
      // Pure function implementation
      const calculateStats = (thisWeek: string[], lastWeek: string[]) => {
        const workoutsThisWeek = thisWeek.length;
        const workoutsLastWeek = lastWeek.length;

        let weeklyChange: string | undefined;
        if (workoutsLastWeek > 0) {
          const change =
            ((workoutsThisWeek - workoutsLastWeek) / workoutsLastWeek) * 100;
          weeklyChange = `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
        }

        return { workoutsThisWeek, weeklyChange };
      };

      const result = calculateStats(
        contract.given.thisWeekWorkouts,
        contract.given.lastWeekWorkouts,
      );

      expect(result.workoutsThisWeek).toBe(contract.then.workoutsThisWeek);
      expect(result.weeklyChange).toBe(contract.then.weeklyChange);
    });
  });
});

// =============================================================================
// UTILITY: Mock Quality Assurance
// =============================================================================

describe("Mock Quality Assurance", () => {
  it("verifies mock contracts are maintained", () => {
    const mock = createDrizzleMock();

    // Ensure all expected methods exist
    expect(typeof mock.select).toBe("function");
    expect(typeof mock.insert).toBe("function");
    expect(typeof mock.update).toBe("function");
    expect(typeof mock.delete).toBe("function");

    // Ensure method chaining works
    const selectResult = mock.select();
    expect(typeof selectResult.from).toBe("function");

    const fromResult = selectResult.from();
    expect(typeof fromResult.where).toBe("function");

    const query = fromResult.where();
    expect(typeof query.limit).toBe("function");
    expect(typeof query.execute).toBe("function");
  });

  it("detects mock version mismatches", () => {
    // This would be part of a larger mock versioning system
    const MOCK_VERSION = "1.0.0";

    const validateMockVersion = (version: string) => {
      if (version !== MOCK_VERSION) {
        throw new Error(
          `Mock version mismatch. Expected ${MOCK_VERSION}, got ${version}`,
        );
      }
    };

    expect(() => validateMockVersion("1.0.0")).not.toThrow();
    expect(() => validateMockVersion("2.0.0")).toThrow("Mock version mismatch");
  });
});

export {};
