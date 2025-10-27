import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { simpleRender as render, screen } from "~/__tests__/test-utils";

// Ensure React is available globally for JSX
global.React = React;

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
    },
  },
}));

// Import after mocking
import {
  StrengthProgressSection,
  calculateYAxisDomain,
} from "~/app/_components/StrengthProgressSection";
import { ProgressRangeProvider } from "~/contexts/progress-range-context";
import { api } from "~/trpc/react";

const mockGetExerciseList = api.progress.getExerciseList.useQuery as any;
const mockGetStrengthProgression = api.progress.getStrengthProgression
  .useQuery as any;
const mockGetExerciseStrengthProgression = api.progress
  .getExerciseStrengthProgression.useQuery as any;

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
      data: [],
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
        <ProgressRangeProvider defaults={{ strength: "year" }}>
          <StrengthProgressSection
            selectedExercise={{
              name: null,
              templateExerciseId: null,
            }}
            onExerciseChange={mockOnExerciseChange}
          />
        </ProgressRangeProvider>,
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
      <ProgressRangeProvider defaults={{ strength: "year" }}>
        <StrengthProgressSection
          selectedExercise={{
            name: null,
            templateExerciseId: null,
          }}
          onExerciseChange={mockOnExerciseChange}
        />
      </ProgressRangeProvider>,
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
      <ProgressRangeProvider defaults={{ strength: "year" }}>
        <StrengthProgressSection
          selectedExercise={{
            name: null,
            templateExerciseId: null,
          }}
          onExerciseChange={mockOnExerciseChange}
        />
      </ProgressRangeProvider>,
    );

    // Should auto-select the first exercise
    expect(mockOnExerciseChange).toHaveBeenCalledWith({
      name: "Bench Press",
      templateExerciseId: null, // Should default to null when undefined
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
