import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Ensure React is available globally for JSX
global.React = React;
import { StrengthAnalysisModal } from "~/app/_components/StrengthAnalysisModal";

// Mock tRPC before importing components
vi.mock("~/trpc/react", () => ({
  api: {
    progress: {
      getStrengthProgression: {
        useQuery: vi.fn(),
      },
    },
  },
}));

// Mock the ThemeProvider
vi.mock("~/providers/ThemeProvider", () => ({
  useTheme: () => ({
    theme: "dark",
    resolvedTheme: "dark",
    setTheme: vi.fn(),
  }),
}));

import { api } from "~/trpc/react";

const mockGetStrengthProgression = api.progress.getStrengthProgression
  .useQuery as any;

const mockStrengthData = [
  {
    workoutDate: "2024-01-15",
    weight: 110,
    reps: 8,
    sets: 3,
    oneRMEstimate: 132,
  },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  exerciseName: "Bench Press",
  templateExerciseId: 1 as number | null,
  timeRange: "month" as "week" | "month" | "year",
};

describe("StrengthAnalysisModal - Minimal Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStrengthProgression.mockReturnValue({
      data: { data: mockStrengthData },
      isLoading: false,
      isError: false,
      trpc: {
        path: undefined,
        type: "query",
      },
    });
  });

  it("should render without crashing", () => {
    // This is the most basic test - just see if it renders
    expect(() => {
      render(<StrengthAnalysisModal {...defaultProps} />);
    }).not.toThrow();
  });
});
