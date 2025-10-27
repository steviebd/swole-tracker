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
import { StrengthProgressSection } from "~/app/_components/StrengthProgressSection";
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
});
