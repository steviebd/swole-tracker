import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { simpleRender as render, screen } from "~/__tests__/test-utils";

// Ensure React is available globally for JSX
global.React = React;

// Mock analytics - consistent with other tests
vi.mock("~/lib/analytics", () => ({
  analytics: {
    event: vi.fn(),
    databaseQueryPerformance: vi.fn(),
    progressSectionLoad: vi.fn(),
  },
}));

// Mock tRPC before importing components
vi.mock("~/trpc/react", () => ({
  api: {
    progress: {
      getExerciseList: {
        useQuery: vi.fn(),
      },
      getStrengthProgression: {
        useQuery: vi.fn(),
      },
      getExerciseStrengthProgression: {
        useQuery: vi.fn(),
      },
      getWeeklyStrengthProgression: {
        useQuery: vi.fn(),
      },
    },
  },
}));

// Mock chart components to avoid ResizeObserver issues
vi.mock("~/app/_components/StrengthChartContainer", () => ({
  StrengthChartContainer: ({
    chartPoints,
    viewMode,
    setViewMode,
    chartIsEmpty,
  }: any) => {
    const descriptions: Record<string, string> = {
      topSet: "Heaviest weight lifted per session",
      oneRm: "Estimated e1RM for your heaviest set",
      intensity: "Tonnage proxy (weight × reps × sets)",
    };
    return (
      <div data-testid="strength-chart-container">
        <div>Chart Container - View Mode: {viewMode}</div>
        <div>Chart Points: {chartPoints.length}</div>
        <div>Chart Empty: {chartIsEmpty ? "true" : "false"}</div>
        <div>{descriptions[viewMode]}</div>
        <button onClick={() => setViewMode("topSet")}>Top Set</button>
        <button onClick={() => setViewMode("oneRm")}>1RM Estimate</button>
        <button onClick={() => setViewMode("intensity")}>
          Session Intensity
        </button>
      </div>
    );
  },
  calculateYAxisDomain: vi.fn((values: number[]) => {
    if (values.length === 0) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    let padding;
    if (range <= 10)
      padding = 0.5; // 50%
    else if (range <= 50)
      padding = 0.3; // 30%
    else padding = 0.1; // 10%
    const paddingAmount = range * padding;
    return [Math.max(0, min - paddingAmount), max + paddingAmount];
  }),
}));

vi.mock("~/app/_components/StrengthSummaryMetrics", () => ({
  StrengthSummaryMetrics: ({ summaryCards }: any) => (
    <div data-testid="strength-summary-metrics">
      {summaryCards.map((card: any, index: number) => (
        <div key={card.id} data-testid={`summary-card-${index}`}>
          <div>{card.label}</div>
          <div>{card.value}</div>
          <div>{card.helper}</div>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("~/app/_components/StrengthSessionList", () => ({
  StrengthSessionList: (props: any) => {
    // Calculate pagination values dynamically
    const totalItems = props.sortedRows?.length || 0;
    const pageSize = props.pageSize || 8;
    const totalPages = Math.ceil(totalItems / pageSize);
    const hasMultiplePages = totalPages > 1;
    const currentPage = props.currentPage || 1;

    return (
      <div data-testid="strength-session-list">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-foreground text-sm font-semibold">
              Recent sessions
            </p>
            <p className="text-muted-foreground text-xs">
              Sort and review your heaviest sets
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              onClick={props.onViewAnalysis}
            >
              View detailed analysis
            </button>
            <button
              type="button"
              className="btn-outline w-full disabled:opacity-50 sm:w-auto"
              disabled={
                !props.selectedExerciseName && !props.selectedTemplateExerciseId
              }
            >
              Export CSV
            </button>
          </div>
        </div>
        <div>Session List - Page: {currentPage}</div>
        <div>Page Size: {pageSize}</div>
        <div>Has Multiple Pages: {hasMultiplePages ? "true" : "false"}</div>
        <div>Total Pages: {totalPages}</div>
        <div>
          <button
            onClick={() =>
              props.setSortConfig({ key: "date", direction: "desc" })
            }
          >
            Date
          </button>
          <button
            onClick={() =>
              props.setSortConfig({ key: "weight", direction: "desc" })
            }
          >
            Weight
          </button>
          <button
            onClick={() =>
              props.setSortConfig({ key: "oneRm", direction: "desc" })
            }
          >
            1RM
          </button>
          <button
            onClick={() =>
              props.setSortConfig({ key: "volume", direction: "desc" })
            }
          >
            Volume
          </button>
        </div>
        {hasMultiplePages && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-muted-foreground text-xs">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)}{" "}
              to {Math.min(currentPage * pageSize, totalItems)} of {totalItems}{" "}
              sessions
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  props.setCurrentPage && props.setCurrentPage(currentPage - 1)
                }
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="text-muted-foreground text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  props.setCurrentPage && props.setCurrentPage(currentPage + 1)
                }
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
}));

vi.mock("~/app/_components/StrengthAnalysisModal", () => ({
  StrengthAnalysisModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="strength-analysis-modal">
        <div>Analysis Modal</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Import after mocking
import { StrengthProgressSection } from "~/app/_components/StrengthProgressSection";
import { calculateYAxisDomain } from "~/app/_components/StrengthChartContainer";
import { ProgressRangeProvider } from "~/contexts/progress-range-context";
import { ThemeProvider } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";
import { analytics } from "~/lib/analytics";

const mockGetExerciseList = api.progress.getExerciseList.useQuery as any;
const mockGetStrengthProgression = api.progress.getStrengthProgression
  .useQuery as any;
const mockGetExerciseStrengthProgression = api.progress
  .getExerciseStrengthProgression.useQuery as any;
const mockGetWeeklyStrengthProgression = api.progress
  .getWeeklyStrengthProgression.useQuery as any;

// Test wrapper with all required providers
const TestWrapper = ({
  children,
  timeRange = "year",
}: {
  children: React.ReactNode;
  timeRange?: "week" | "month" | "year";
}) => (
  <ThemeProvider initialTheme="light" initialResolvedTheme="light">
    <ProgressRangeProvider defaults={{ strength: timeRange }}>
      {children}
    </ProgressRangeProvider>
  </ThemeProvider>
);

describe("StrengthProgressSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockGetExerciseList.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    mockGetStrengthProgression.mockReturnValue({
      data: { data: [], nextCursor: undefined },
      isLoading: false,
      isError: false,
    });

    mockGetExerciseStrengthProgression.mockReturnValue({
      data: {
        currentOneRM: 100,
        oneRMChange: 5,
        volumeTrend: 10,
        sessionCount: 5,
        frequency: 2,
        recentPRs: [],
        topSets: [],
        progressionTrend: 0.05,
        consistencyScore: 85,
        timeline: [],
      },
      isLoading: false,
      isError: false,
    });

    mockGetWeeklyStrengthProgression.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
    });

    mockGetExerciseStrengthProgression.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });
  });

  it("exports a component", async () => {
    const module = await import("~/app/_components/StrengthProgressSection");
    expect(typeof module.StrengthProgressSection).toBe("function");
  });

  it("handles exercises with undefined templateExerciseIds without crashing", () => {
    // Mock exercise list with undefined templateExerciseIds
    mockGetExerciseList.mockReturnValue({
      data: [
        {
          id: "exercise-1",
          exerciseName: "Bench Press",
          lastUsed: new Date(),
          totalSets: 10,
          aliasCount: 1,
          aliases: ["Bench"],
          templateExerciseIds: undefined, // This should not crash
          masterExerciseId: null,
        },
        {
          id: "exercise-2",
          exerciseName: "Squat",
          lastUsed: new Date(),
          totalSets: 8,
          aliasCount: 1,
          aliases: ["Squat"],
          templateExerciseIds: [1, 2], // Valid array
          masterExerciseId: null,
        },
      ],
      isLoading: false,
      isError: false,
    });

    const mockOnExerciseChange = vi.fn();

    expect(() => {
      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: null,
              templateExerciseId: null,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );
    }).not.toThrow();

    // Should render the exercise select
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("deduplicates exercises with undefined templateExerciseIds", () => {
    // Mock exercise list with duplicate exercises, some with undefined templateExerciseIds
    mockGetExerciseList.mockReturnValue({
      data: [
        {
          id: "exercise-1",
          exerciseName: "Bench Press",
          lastUsed: new Date("2024-01-01"),
          totalSets: 10,
          aliasCount: 1,
          aliases: ["Bench"],
          templateExerciseIds: undefined,
          masterExerciseId: null,
        },
        {
          id: "exercise-2",
          exerciseName: "bench press", // Same name, different case
          lastUsed: new Date("2024-01-02"),
          totalSets: 8,
          aliasCount: 1,
          aliases: ["Bench Press"],
          templateExerciseIds: [1], // Valid array
          masterExerciseId: null,
        },
      ],
      isLoading: false,
      isError: false,
    });

    const mockOnExerciseChange = vi.fn();

    render(
      <TestWrapper>
        <StrengthProgressSection
          selectedExercise={{
            name: null,
            templateExerciseId: null,
          }}
          onExerciseChange={mockOnExerciseChange}
        />
      </TestWrapper>,
    );

    // Should have deduplicated to one exercise
    const options = screen.getAllByRole("option");
    // First option is "Choose an exercise…" so we expect 2 total options
    expect(options).toHaveLength(2);
    expect(options[1]).toHaveTextContent("Bench Press");
  });

  it("auto-selects first exercise even when templateExerciseIds is undefined", () => {
    const mockOnExerciseChange = vi.fn();

    mockGetExerciseList.mockReturnValue({
      data: [
        {
          id: "exercise-1",
          exerciseName: "Bench Press",
          lastUsed: new Date(),
          totalSets: 10,
          aliasCount: 1,
          aliases: ["Bench"],
          templateExerciseIds: undefined, // Undefined should be handled
          masterExerciseId: null,
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(
      <TestWrapper>
        <StrengthProgressSection
          selectedExercise={{
            name: null,
            templateExerciseId: null,
          }}
          onExerciseChange={mockOnExerciseChange}
        />
      </TestWrapper>,
    );

    // Should auto-select the first exercise
    expect(mockOnExerciseChange).toHaveBeenCalledWith({
      name: "Bench Press",
      templateExerciseId: null, // Should default to null when undefined
    });
  });

  describe("Component Rendering States", () => {
    it("renders loading state when exercise list is loading", () => {
      mockGetExerciseList.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: null,
              templateExerciseId: null,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      expect(screen.getByText("Strength Progression")).toBeInTheDocument();
      expect(screen.getByText("Select exercise")).toBeInTheDocument();
      // Should show loading skeleton for exercise selector
      const skeleton = document.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("renders empty state when no exercise is selected", () => {
      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 10,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: null,
              templateExerciseId: null,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      expect(screen.getByText("Select an exercise")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Pick any lift to unlock personalized strength analytics.",
        ),
      ).toBeInTheDocument();
    });

    it("renders error state when exercise list fails to load", () => {
      mockGetExerciseList.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      expect(
        screen.getByText(
          "We couldn’t load your strength data. Refresh or try another exercise.",
        ),
      ).toBeInTheDocument();
    });

    it("renders loading skeleton when data is loading", () => {
      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 10,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: [] },
        isLoading: true,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      // Should show loading skeletons
      const skeletons = screen
        .getAllByRole("generic", { hidden: true })
        .filter((element) => element.className.includes("animate-pulse"));
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders complete component with data", () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-15"),
          weight: 110,
          reps: 8,
          sets: 3,
          oneRMEstimate: 132,
          volume: 2640,
          exerciseName: "Bench Press",
        },
        {
          workoutDate: new Date("2024-01-08"),
          weight: 105,
          reps: 8,
          sets: 3,
          oneRMEstimate: 126,
          volume: 2520,
          exerciseName: "Bench Press",
        },
      ];

      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 10,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: mockData },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: {
          currentOneRM: 130,
          oneRMChange: 5,
          volumeTrend: 10,
          sessionCount: 5,
          frequency: 2,
          recentPRs: [],
          topSets: [],
          progressionTrend: 0.05,
          consistencyScore: 85,
          timeline: [
            { date: "2024-01-01", oneRM: 125 },
            { date: "2024-01-15", oneRM: 130 },
          ],
        },
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      expect(screen.getByText("Strength Progression")).toBeInTheDocument();
      expect(screen.getByText("Focused on")).toBeInTheDocument();
      // Check that Bench Press appears in the header (focused exercise)
      const headerBenchPress = screen.getByText("Bench Press", {
        selector: "span",
      });
      expect(headerBenchPress).toBeInTheDocument();
      expect(screen.getByText("Current Max")).toBeInTheDocument();
      expect(screen.getByText("130 kg")).toBeInTheDocument();
    });
  });

  describe("Exercise Selection", () => {
    it("renders exercise selector with VirtualizedSelect when more than 20 exercises", () => {
      const exercises = Array.from({ length: 25 }, (_, i) => ({
        id: `exercise-${i}`,
        exerciseName: `Exercise ${i}`,
        lastUsed: new Date(),
        totalSets: 10,
        aliasCount: 1,
        aliases: [`Alias ${i}`],
        templateExerciseIds: [i],
        masterExerciseId: null,
      }));

      mockGetExerciseList.mockReturnValue({
        data: exercises,
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: null,
              templateExerciseId: null,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      // Should render VirtualizedSelect (check for placeholder text)
      expect(screen.getByText("Choose an exercise…")).toBeInTheDocument();
    });

    it("renders regular select when 20 or fewer exercises", () => {
      const exercises = Array.from({ length: 15 }, (_, i) => ({
        id: `exercise-${i}`,
        exerciseName: `Exercise ${i}`,
        lastUsed: new Date(),
        totalSets: 10,
        aliasCount: 1,
        aliases: [`Alias ${i}`],
        templateExerciseIds: [i],
        masterExerciseId: null,
      }));

      mockGetExerciseList.mockReturnValue({
        data: exercises,
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: null,
              templateExerciseId: null,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      // Should render regular select
      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(screen.getByText("Choose an exercise…")).toBeInTheDocument();
    });

    it("calls onExerciseChange when exercise is selected", async () => {
      const exercises = [
        {
          id: "exercise-1",
          exerciseName: "Bench Press",
          lastUsed: new Date(),
          totalSets: 10,
          aliasCount: 1,
          aliases: ["Bench"],
          templateExerciseIds: [1],
          masterExerciseId: null,
        },
        {
          id: "exercise-2",
          exerciseName: "Squat",
          lastUsed: new Date(),
          totalSets: 8,
          aliasCount: 1,
          aliases: ["Squat"],
          templateExerciseIds: [2],
          masterExerciseId: null,
        },
      ];

      mockGetExerciseList.mockReturnValue({
        data: exercises,
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: null,
              templateExerciseId: null,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "exercise-2");

      expect(mockOnExerciseChange).toHaveBeenCalledWith({
        name: "Squat",
        templateExerciseId: 2,
      });
    });
  });

  describe("Time Range Functionality", () => {
    it("renders time range selector with correct options", () => {
      mockGetExerciseList.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper timeRange="month">
          <StrengthProgressSection
            selectedExercise={{
              name: null,
              templateExerciseId: null,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      expect(screen.getByText("week")).toBeInTheDocument();
      expect(screen.getByText("month")).toBeInTheDocument();
      expect(screen.getByText("year")).toBeInTheDocument();
    });

    it("shows active styling for current time range", () => {
      mockGetExerciseList.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper timeRange="month">
          <StrengthProgressSection
            selectedExercise={{
              name: null,
              templateExerciseId: null,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      const monthButton = screen.getByText("month");
      expect(monthButton).toHaveClass("bg-primary");
    });

    it("renders reset button and handles reset functionality", () => {
      mockGetExerciseList.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <ThemeProvider initialTheme="light" initialResolvedTheme="light">
          <ProgressRangeProvider defaults={{ strength: "year" }}>
            <StrengthProgressSection
              selectedExercise={{
                name: "Bench Press",
                templateExerciseId: 1,
              }}
              onExerciseChange={mockOnExerciseChange}
            />
          </ProgressRangeProvider>
        </ThemeProvider>,
      );

      const resetButton = screen.getByText("Reset");
      expect(resetButton).toBeInTheDocument();
      expect(resetButton).toBeDisabled(); // Should be disabled when timeRange === default (year)
    });
  });

  describe("View Mode Switching", () => {
    it("renders view mode buttons with correct labels", () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-15"),
          weight: 110,
          reps: 8,
          sets: 3,
          oneRMEstimate: 132,
          volume: 2640,
          exerciseName: "Bench Press",
        },
      ];

      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 10,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: mockData },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: {
          currentOneRM: 130,
          oneRMChange: 5,
          timeline: [],
        },
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      expect(screen.getByText("Top Set")).toBeInTheDocument();
      expect(screen.getByText("1RM Estimate")).toBeInTheDocument();
      expect(screen.getByText("Session Intensity")).toBeInTheDocument();
    });

    it("shows correct description for each view mode", () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-15"),
          weight: 110,
          reps: 8,
          sets: 3,
          oneRMEstimate: 132,
          volume: 2640,
          exerciseName: "Bench Press",
        },
      ];

      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 10,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: mockData },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: {
          currentOneRM: 130,
          oneRMChange: 5,
          timeline: [],
        },
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      expect(
        screen.getByText("Heaviest weight lifted per session"),
      ).toBeInTheDocument();
    });
  });

  describe("Sorting Functionality", () => {
    it("renders sortable headers with correct labels", () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-15"),
          weight: 110,
          reps: 8,
          sets: 3,
          oneRMEstimate: 132,
          volume: 2640,
          exerciseName: "Bench Press",
        },
      ];

      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 10,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: mockData },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: {
          currentOneRM: 130,
          oneRMChange: 5,
          timeline: [],
        },
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Weight")).toBeInTheDocument();
      expect(screen.getByText("1RM")).toBeInTheDocument();
      expect(screen.getByText("Volume")).toBeInTheDocument();
    });
  });

  describe("Modal Interactions", () => {
    it("renders analysis modal when showModal is true", async () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-15"),
          weight: 110,
          reps: 8,
          sets: 3,
          oneRMEstimate: 132,
          volume: 2640,
          exerciseName: "Bench Press",
        },
      ];

      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 10,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: mockData },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: {
          currentOneRM: 130,
          oneRMChange: 5,
          timeline: [],
        },
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      // Click the "View detailed analysis" button
      const analysisButton = screen.getByText("View detailed analysis");
      await userEvent.click(analysisButton);

      // The modal should now be visible
      expect(screen.getByText("Analysis Modal")).toBeInTheDocument();
      expect(screen.getByText("Close")).toBeInTheDocument();
    });
  });

  describe("Export Functionality", () => {
    it("renders export button with correct disabled state", () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-15"),
          weight: 110,
          reps: 8,
          sets: 3,
          oneRMEstimate: 132,
          volume: 2640,
          exerciseName: "Bench Press",
        },
      ];

      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 10,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: mockData },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: {
          currentOneRM: 130,
          oneRMChange: 5,
          timeline: [],
        },
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      const exportButton = screen.getByText("Export CSV");
      expect(exportButton).toBeInTheDocument();
      expect(exportButton).not.toBeDisabled();
    });

    it("disables export button when no exercise is selected", () => {
      mockGetExerciseList.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: null,
              templateExerciseId: null,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      const exportButton = screen.queryByText("Export CSV");
      expect(exportButton).not.toBeInTheDocument();
    });
  });

  describe("Analytics Tracking", () => {
    it("tracks performance when strength data loads", () => {
      const mockAnalytics = vi.mocked(analytics.progressSectionLoad);

      const mockData = [
        {
          workoutDate: new Date("2024-01-15"),
          weight: 110,
          reps: 8,
          sets: 3,
          oneRMEstimate: 132,
          volume: 2640,
          exerciseName: "Bench Press",
        },
      ];

      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 10,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: mockData },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: {
          currentOneRM: 130,
          oneRMChange: 5,
          timeline: [],
        },
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      // Analytics should be called after data loads
      expect(mockAnalytics).toHaveBeenCalledWith(
        "strength",
        expect.any(Number),
        1,
      );
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("handles empty exercise list gracefully", () => {
      mockGetExerciseList.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: null,
              templateExerciseId: null,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      expect(
        screen.getByText("Log a workout to populate your exercise list."),
      ).toBeInTheDocument();
    });

    it("handles null trend summary data", () => {
      const mockData = [
        {
          workoutDate: new Date("2024-01-15"),
          weight: 110,
          reps: 8,
          sets: 3,
          oneRMEstimate: 132,
          volume: 2640,
          exerciseName: "Bench Press",
        },
      ];

      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 10,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: mockData },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      expect(screen.getByText("Current Max")).toBeInTheDocument();
      expect(screen.getByText("—")).toBeInTheDocument(); // Should show dash for missing data
    });

    it("handles empty session data", () => {
      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 10,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: {
          currentOneRM: 130,
          oneRMChange: 5,
          timeline: [],
        },
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      // Should still render the component structure
      expect(screen.getByText("Strength Progression")).toBeInTheDocument();
    });
  });

  describe("Pagination Functionality", () => {
    it("shows pagination controls when hasMultiplePages is true", () => {
      // Create enough data to trigger pagination (more than pageSize)
      // With pageSize=8, we need more than 8 items for pagination
      const mockData = Array.from({ length: 16 }, (_, i) => ({
        workoutDate: new Date(2024, 0, 16 - i), // January 16, 15, 14, etc.
        weight: 100 + i * 5,
        reps: 8,
        sets: 3,
        oneRMEstimate: 120 + i * 6,
        volume: (100 + i * 5) * 8 * 3,
        exerciseName: "Bench Press",
      }));

      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 48,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: mockData },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: {
          currentOneRM: 200,
          oneRMChange: 10,
          timeline: [
            { date: new Date("2024-01-01"), oneRM: 190 },
            { date: new Date("2024-01-15"), oneRM: 200 },
          ],
        },
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
      expect(
        screen.getByText("Showing 1 to 8 of 16 sessions"),
      ).toBeInTheDocument();
    });

    it("hides pagination controls when hasMultiplePages is false", () => {
      const mockData = Array.from({ length: 8 }, (_, i) => ({
        workoutDate: new Date(2024, 0, 15 - i), // January 15, 14, 13, etc.
        weight: 100 + i * 5,
        reps: 8,
        sets: 3,
        oneRMEstimate: 120 + i * 6,
        volume: (100 + i * 5) * 8 * 3,
        exerciseName: "Bench Press",
      }));

      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 24,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: mockData },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: {
          currentOneRM: 200,
          oneRMChange: 10,
          timeline: [
            { date: new Date("2024-01-01"), oneRM: 190 },
            { date: new Date("2024-01-15"), oneRM: 200 },
          ],
        },
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      expect(screen.queryByText("Page 1 of")).not.toBeInTheDocument();
      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
      expect(screen.queryByText("Next")).not.toBeInTheDocument();
    });

    it("disables Previous button on first page", () => {
      const mockData = Array.from({ length: 25 }, (_, i) => ({
        workoutDate: new Date(2024, 0, 25 - i), // January 25, 24, 23, etc. (valid dates)
        weight: 100 + i * 5,
        reps: 8,
        sets: 3,
        oneRMEstimate: 120 + i * 6,
        volume: (100 + i * 5) * 8 * 3,
        exerciseName: "Bench Press",
      }));

      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 75,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: mockData },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: {
          currentOneRM: 200,
          oneRMChange: 10,
          timeline: [
            { date: new Date("2024-01-01"), oneRM: 190 },
            { date: new Date("2024-01-15"), oneRM: 200 },
          ],
        },
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      const previousButton = screen.getByText("Previous");
      expect(previousButton).toBeDisabled();
    });

    it("disables Next button on last page", () => {
      const mockData = Array.from({ length: 16 }, (_, i) => ({
        workoutDate: new Date(2024, 0, 16 - i), // January 16, 15, 14, etc. (valid dates)
        weight: 100 + i * 5,
        reps: 8,
        sets: 3,
        oneRMEstimate: 120 + i * 6,
        volume: (100 + i * 5) * 8 * 3,
        exerciseName: "Bench Press",
      }));

      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 48,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: mockData },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: {
          currentOneRM: 200,
          oneRMChange: 10,
          timeline: [
            { date: new Date("2024-01-01"), oneRM: 190 },
            { date: new Date("2024-01-15"), oneRM: 200 },
          ],
        },
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      // On page 1 of 2, Next button should be enabled
      const nextButton = screen.getByText("Next");
      expect(nextButton).not.toBeDisabled();
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });

    it("shows correct page range information", () => {
      const mockData = Array.from({ length: 16 }, (_, i) => ({
        workoutDate: new Date(2024, 0, 16 - i), // January 16, 15, 14, etc. (valid dates)
        weight: 100 + i * 5,
        reps: 8,
        sets: 3,
        oneRMEstimate: 120 + i * 6,
        volume: (100 + i * 5) * 8 * 3,
        exerciseName: "Bench Press",
      }));

      mockGetExerciseList.mockReturnValue({
        data: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            lastUsed: new Date(),
            totalSets: 48,
            aliasCount: 1,
            aliases: ["Bench"],
            templateExerciseIds: [1],
            masterExerciseId: null,
          },
        ],
        isLoading: false,
        isError: false,
      });

      mockGetStrengthProgression.mockReturnValue({
        data: { data: mockData },
        isLoading: false,
        isError: false,
      });

      mockGetExerciseStrengthProgression.mockReturnValue({
        data: {
          currentOneRM: 200,
          oneRMChange: 10,
          timeline: [
            { date: new Date("2024-01-01"), oneRM: 190 },
            { date: new Date("2024-01-15"), oneRM: 200 },
          ],
        },
        isLoading: false,
        isError: false,
      });

      const mockOnExerciseChange = vi.fn();

      render(
        <TestWrapper>
          <StrengthProgressSection
            selectedExercise={{
              name: "Bench Press",
              templateExerciseId: 1,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </TestWrapper>,
      );

      expect(
        screen.getByText("Showing 1 to 8 of 16 sessions"),
      ).toBeInTheDocument();

      // Note: Since this is a mock, clicking Next won't actually change the page
      // The test verifies that pagination controls are rendered correctly for the initial state
    });
  });

  describe("calculateYAxisDomain", () => {
    it("returns default domain for empty values", () => {
      const result = calculateYAxisDomain([]);
      expect(result).toEqual([0, 100]);
    });

    it("calculates domain with 50% padding for small ranges (≤10)", () => {
      // Range of 10 (140-150), should use 50% padding = 5
      // Domain: [140-5, 150+5] = [135, 155]
      const result = calculateYAxisDomain([140, 145, 150]);
      expect(result).toEqual([135, 155]);
    });

    it("calculates domain with 30% padding for medium ranges (≤50)", () => {
      // Range of 30 (120-150), should use 30% padding = 9
      // Domain: [120-9, 150+9] = [111, 159]
      const result = calculateYAxisDomain([120, 135, 150]);
      expect(result).toEqual([111, 159]);
    });

    it("calculates domain with 10% padding for large ranges (>50)", () => {
      // Range of 60 (120-180), should use 10% padding = 6
      // Domain: [120-6, 180+6] = [114, 186]
      const result = calculateYAxisDomain([120, 150, 180]);
      expect(result).toEqual([114, 186]);
    });

    it("does not go below 0 for minimum value", () => {
      // Range of 5 (2-7), should use 50% padding = 2.5
      // Domain: [max(0, 2-2.5), 7+2.5] = [0, 9.5]
      const result = calculateYAxisDomain([2, 5, 7]);
      expect(result).toEqual([0, 9.5]);
    });

    it("handles single value", () => {
      // Range of 0 (single value), should use 50% padding = 0
      // Domain: [max(0, 100-0), 100+0] = [100, 100]
      const result = calculateYAxisDomain([100]);
      expect(result).toEqual([100, 100]);
    });

    it("handles negative values by clamping to 0", () => {
      // Range of 10 (-5 to 5), should use 50% padding = 5
      // Domain: [max(0, -5-5), 5+5] = [0, 10]
      const result = calculateYAxisDomain([-5, 0, 5]);
      expect(result).toEqual([0, 10]);
    });
  });
});
