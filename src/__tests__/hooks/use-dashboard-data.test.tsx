/// <reference types="vitest" />
import { renderHook } from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockedFunction,
} from "vitest";
import {
  useDashboardData,
  useDashboardLoadingState,
  type UseDashboardDataDependencies,
} from "~/hooks/use-dashboard-data";
import { type WorkoutStats } from "~/hooks/use-workout-stats";
import { type ProgressGoals } from "~/hooks/use-progress-goals";

type UseRecentWorkoutsQuery = NonNullable<
  UseDashboardDataDependencies["useRecentWorkoutsQuery"]
>;
type RecentWorkoutsResult = Awaited<ReturnType<UseRecentWorkoutsQuery>>;

const useWorkoutStatsMock: MockedFunction<() => WorkoutStats> = vi.fn();
const useProgressGoalsMock: MockedFunction<
  (options: { timeRange: "week" | "month"; customTargets?: Record<string, number | undefined> }) => ProgressGoals
> = vi.fn();
const useRecentWorkoutsMockFn = vi.fn(() => createRecentWorkouts());
const useRecentWorkoutsMock =
  useRecentWorkoutsMockFn as unknown as UseRecentWorkoutsQuery;

const dependencies = (): UseDashboardDataDependencies => ({
  useWorkoutStats: useWorkoutStatsMock,
  useProgressGoals: useProgressGoalsMock,
  useRecentWorkoutsQuery: useRecentWorkoutsMock,
});

const createStats = (overrides: Partial<WorkoutStats> = {}): WorkoutStats => ({
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
  ...overrides,
});

const createGoals = (
  timeRange: "week" | "month",
  overrides: Partial<ProgressGoals> = {},
): ProgressGoals => {
  const goals =
    overrides.goals ??
    [
      {
        id: `${timeRange}-workouts`,
        type: "workouts",
        label: `${timeRange === "week" ? "Weekly" : "Monthly"} Workouts`,
        current: 3,
        target: 3,
        unit: "",
        percentage: 100,
        status: "perfect" as const,
        message: "Perfect!",
        description: `${timeRange === "week" ? "Weekly" : "Monthly"} workout goal`,
      },
    ];

  return {
    goals,
    summary:
      overrides.summary ??
      {
        totalGoals: goals.length,
        achievedGoals: goals.filter((goal) => goal.percentage >= 100).length,
        exceededGoals: goals.filter((goal) => goal.status === "exceeded").length,
        overallProgress: Math.round(
          goals.reduce((sum, goal) => sum + goal.percentage, 0) / goals.length,
        ),
      },
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
  };
};

const createRecentWorkouts = (
  overrides: Partial<RecentWorkoutsResult> = {},
): RecentWorkoutsResult =>
  ({
    data:
      overrides.data ??
      [
        {
          id: 1,
          workoutDate: new Date(),
          templateId: null,
          createdAt: new Date(),
          exercises: [],
          template: null,
        },
        {
          id: 2,
          workoutDate: new Date(),
          templateId: null,
          createdAt: new Date(),
          exercises: [],
          template: null,
        },
      ],
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
    ...overrides,
  }) as RecentWorkoutsResult;

const setupDefaults = () => {
  useWorkoutStatsMock.mockReturnValue(createStats());
  useProgressGoalsMock.mockImplementation(({ timeRange }) =>
    createGoals(timeRange),
  );
  useRecentWorkoutsMockFn.mockReturnValue(createRecentWorkouts());
};

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
  });

  it("returns combined dashboard data", () => {
    const { result } = renderHook(() =>
      useDashboardData(undefined, dependencies()),
    );

    expect(result.current.stats.workoutsThisWeek).toBe(3);
    expect(result.current.weeklyGoals.goals).toHaveLength(1);
    expect(result.current.monthlyGoals.goals).toHaveLength(1);
    expect(result.current.recentWorkouts.data).toHaveLength(2);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it("handles loading states", () => {
    useWorkoutStatsMock.mockReturnValue(createStats({ isLoading: true }));

    const { result } = renderHook(() =>
      useDashboardData(undefined, dependencies()),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.helpers.getLoadingState()).toBe("loading");
  });

  it("handles error states", () => {
    useWorkoutStatsMock.mockReturnValue(createStats({ error: "Stats error" }));

    const { result } = renderHook(() =>
      useDashboardData(undefined, dependencies()),
    );

    expect(result.current.hasError).toBe(true);
    expect(result.current.errorMessage).toBe("Stats error");
    expect(result.current.helpers.getLoadingState()).toBe("error");
  });

  it("disables goal loading when includeGoals is false", () => {
    const { result } = renderHook(() =>
      useDashboardData({ includeGoals: false }, dependencies()),
    );

    expect(useProgressGoalsMock).toHaveBeenCalledWith({
      timeRange: "week",
      customTargets: undefined,
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("disables recent workouts when includeRecentWorkouts is false", () => {
    useRecentWorkoutsMockFn.mockReturnValue(
      createRecentWorkouts({ data: undefined }),
    );

    const { result } = renderHook(() =>
      useDashboardData({ includeRecentWorkouts: false }, dependencies()),
    );

    expect(useRecentWorkoutsMockFn).toHaveBeenCalledWith(
      { limit: 5 },
      { enabled: false },
    );
    expect(result.current.recentWorkouts.isLoading).toBe(false);
  });

  it("shows celebration for exceeded goals", () => {
    useProgressGoalsMock.mockImplementation(({ timeRange }) => {
      if (timeRange === "week") {
        return createGoals(timeRange, {
          goals: [
            {
              id: "weekly",
              type: "workouts",
              label: "Weekly Workouts",
              current: 4,
              target: 3,
              unit: "",
              percentage: 133,
              status: "exceeded",
              message: "Exceeded!",
              description: "Weekly workout goal",
            },
          ],
          summary: {
            totalGoals: 1,
            achievedGoals: 1,
            exceededGoals: 1,
            overallProgress: 133,
          },
        });
      }
      return createGoals(timeRange);
    });

    const { result } = renderHook(() =>
      useDashboardData(undefined, dependencies()),
    );

    expect(result.current.helpers.shouldShowCelebration()).toBe(true);
    expect(result.current.helpers.getCelebrationMessage()).toBe(
      "🏆 All weekly goals exceeded! Outstanding!",
    );
  });

  it("shows celebration for great streaks", () => {
    useWorkoutStatsMock.mockReturnValue(createStats({ currentStreak: 7 }));
    useProgressGoalsMock.mockImplementation(({ timeRange }) => {
      if (timeRange === "week") {
        return createGoals(timeRange, {
          goals: [
            {
              id: "weekly",
              type: "workouts",
              label: "Weekly Workouts",
              current: 3,
              target: 3,
              unit: "",
              percentage: 100,
              status: "perfect",
              message: "Perfect!",
              description: "Weekly workout goal",
            },
          ],
          summary: {
            totalGoals: 1,
            achievedGoals: 1,
            exceededGoals: 0,
            overallProgress: 100,
          },
        });
      }
      return createGoals(timeRange);
    });
    
    const { result } = renderHook(() =>
      useDashboardData(undefined, dependencies()),
    );
    
    expect(result.current.helpers.shouldShowCelebration()).toBe(true);
    expect(result.current.helpers.getCelebrationMessage()).toBe(
      "🎯 Perfect week! All goals achieved!",
    );
  });

  it("returns workout metrics for a recent workout", () => {
    const { result } = renderHook(() =>
      useDashboardData(undefined, dependencies()),
    );

    const metrics = result.current.helpers.getRecentWorkoutMetrics({
      id: 1,
      name: "Test workout",
      createdAt: new Date(),
      exercises: [],
    });

    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics.length).toBeGreaterThan(0);
  });
});

describe("useDashboardLoadingState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
    useWorkoutStatsMock.mockReturnValue(
      createStats({
        workoutsThisWeek: 0,
        workoutsLastWeek: 0,
        weeklyChange: undefined,
        avgDuration: "0min",
        durationChange: undefined,
        currentStreak: 0,
        streakAchievement: undefined,
        weeklyGoal: { current: 0, target: 3, percentage: 0 },
        goalAchievement: undefined,
      }),
    );
    useProgressGoalsMock.mockImplementation(({ timeRange }) =>
      createGoals(timeRange, {
        goals: [],
        summary: {
          totalGoals: 0,
          achievedGoals: 0,
          exceededGoals: 0,
          overallProgress: 0,
        },
      }),
    );
  });

  it("returns loading state without goals and recent workouts", () => {
    useWorkoutStatsMock.mockReturnValue(
      createStats({
        workoutsThisWeek: 0,
        workoutsLastWeek: 0,
        weeklyGoal: { current: 0, target: 3, percentage: 0 },
        isLoading: true,
        goalAchievement: undefined,
        streakAchievement: undefined,
      }),
    );

    const { result } = renderHook(() =>
      useDashboardLoadingState(dependencies()),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
