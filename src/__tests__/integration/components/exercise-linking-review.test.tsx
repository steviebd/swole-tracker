import React from "react";
import { render, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ExerciseLinkingReview,
  type MasterExercise,
  type TemplateExercise,
} from "~/components/exercise-linking-review";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Ensure DOM environment is available
if (typeof window === "undefined") {
  (global as any).window = {
    removeEventListener: vi.fn(),
    addEventListener: vi.fn(),
    matchMedia: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  };
}

// Fix screen import by creating a custom screen that works with our DOM setup
import { getQueriesForElement } from "@testing-library/dom";

const createScreen = () => {
  const container = document.body;
  return getQueriesForElement(container);
};

// Override screen with our custom implementation
const customScreen = createScreen();

describe("ExerciseLinkingReview", () => {
  let queryClient: QueryClient;
  let mockUseAllMasterExercises: ReturnType<typeof vi.fn>;

  const mockMasterExercises: MasterExercise[] = [
    {
      id: 1,
      name: "Bench Press",
      normalizedName: "bench press",
      tags: "chest,compound",
      muscleGroup: "Chest",
      createdAt: new Date(),
    },
    {
      id: 2,
      name: "Squat",
      normalizedName: "squat",
      tags: "legs,compound",
      muscleGroup: "Legs",
      createdAt: new Date(),
    },
    {
      id: 3,
      name: "Deadlift",
      normalizedName: "deadlift",
      tags: "back,compound",
      muscleGroup: "Back",
      createdAt: new Date(),
    },
  ];

  const templateExercises: TemplateExercise[] = [
    { name: "Bench Press", tempId: "temp1" },
    { name: "Squat", tempId: "temp2" },
    { name: "Unknown Exercise", tempId: "temp3" },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    mockUseAllMasterExercises = vi.fn(() => ({
      data: mockMasterExercises,
      isLoading: false,
    }));

    vi.doMock("~/lib/queries/exercises", () => ({
      useAllMasterExercises: mockUseAllMasterExercises,
    }));
  });

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof ExerciseLinkingReview>> = {},
  ) => {
    const defaultProps = {
      templateName: "Test Template",
      exercises: templateExercises,
      onDecisionsChange: vi.fn(),
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <ExerciseLinkingReview {...defaultProps} {...props} />
      </QueryClientProvider>,
    );
  };

  describe("Initial Loading and Auto-Selection", () => {
    it("should show loading state while fetching master exercises", () => {
      mockUseAllMasterExercises = vi.fn(() => ({
        data: [],
        isLoading: true,
      }));

      vi.doMock("~/lib/queries/exercises", () => ({
        useAllMasterExercises: mockUseAllMasterExercises,
      }));

      const { container } = renderComponent();

      expect(
        within(container).getByText("Loading exercises..."),
      ).toBeInTheDocument();
    });

    it("should auto-select exact matches", async () => {
      const onDecisionsChange = vi.fn();
      renderComponent({ onDecisionsChange });

      await waitFor(() => {
        expect(onDecisionsChange).toHaveBeenCalledWith({
          temp1: "1",
          temp2: "2",
        });
      });
    });

    it("should show correct summary statistics", async () => {
      renderComponent();

      await waitFor(() => {
        expect(customScreen.getByText("Total Exercises")).toBeInTheDocument();
        expect(customScreen.getByText("Auto-Linked")).toBeInTheDocument();
        expect(customScreen.getByText("Need Review")).toBeInTheDocument();
        expect(customScreen.getByText("Creating New")).toBeInTheDocument();
      });
    });
  });

  describe("Exercise Display and Interaction", () => {
    it("should display exercises with their match status", async () => {
      renderComponent();

      await waitFor(() => {
        expect(customScreen.getAllByText("Bench Press").length).toBeGreaterThan(
          0,
        );
        expect(customScreen.getAllByText("Squat").length).toBeGreaterThan(0);
        expect(
          customScreen.getAllByText("Unknown Exercise").length,
        ).toBeGreaterThan(0);
      });
    });

    it("should allow creating new exercises instead of linking", async () => {
      const onDecisionsChange = vi.fn();
      renderComponent({ onDecisionsChange });

      await waitFor(() => {
        expect(customScreen.getAllByText("Create New Instead")).toHaveLength(2);
      });

      const createNewButtons = customScreen.getAllByText("Create New Instead");
      if (createNewButtons[0]) {
        fireEvent.click(createNewButtons[0]);
      }

      await waitFor(() => {
        expect(onDecisionsChange).toHaveBeenCalledWith({
          temp2: "2",
        });
      });
    });

    it("should handle exercises with no matches", async () => {
      renderComponent();

      await waitFor(() => {
        expect(
          customScreen.getByText(
            "No similar exercises found - will create as new",
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty exercises array", () => {
      renderComponent({ exercises: [] });

      expect(customScreen.getByText("Total Exercises")).toBeInTheDocument();
      expect(customScreen.getByText("Auto-Linked")).toBeInTheDocument();
      expect(customScreen.getByText("Need Review")).toBeInTheDocument();
      expect(customScreen.getByText("Creating New")).toBeInTheDocument();
    });
  });
});
